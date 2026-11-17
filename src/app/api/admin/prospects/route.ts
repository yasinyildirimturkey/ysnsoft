import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/admin-auth';
import {
  deleteWebscoutUpload,
  listWebscoutUploads,
  makeWebscoutUploadCover,
  readWebscoutShot,
  readWebscoutUpload,
  runWebscout,
  saveWebscoutUpload,
  startWebscoutJob,
  UPLOAD_MAX_BYTES,
  webscoutAvailability,
} from '@/lib/webscout';

/**
 * Müşteri adayları (prospects) — WebScout'un bulduğu, BİZİM gideceğimiz işletmeler.
 * Siteden gelen talepler ("leads", /api/leads) ile karıştırılmamalıdır.
 */

const NO_STORE = { 'Cache-Control': 'no-store' };
// İlk karakter harf/rakam olmalı: "--" ile başlayan değer araç seçeneği sanılmasın
const PLACE_RE = /^[\p{L}\p{N}][\p{L}\p{N} .,'()/-]{1,79}$/u;
const KEY_RE = /^[a-z_]{2,30}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const VISIT_OUTCOMES = ['talked', 'demo_shown', 'offer_requested', 'come_back', 'closed', 'not_interested', 'won'];
const b64 = (v: string) => Buffer.from(v, 'utf8').toString('base64');

function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status, headers: NO_STORE });
}

function unavailable(reason?: string) {
  return NextResponse.json({ success: true, available: false, reason }, { headers: NO_STORE });
}

/** İstekten gelen bölge/kategori seçimini doğrulayıp araç argümanlarına çevirir. */
function regionArgs(src: { get(name: string): unknown }, requireCity: boolean): string[] | string {
  const args: string[] = [];
  const country = src.get('country');
  const city = src.get('city');
  const area = src.get('area');
  const category = src.get('category');

  if (country) {
    if (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country)) return 'Geçersiz ülke.';
    args.push('--country', country);
  }
  if (city) {
    if (typeof city !== 'string' || !PLACE_RE.test(city)) return 'Geçersiz şehir adı.';
    args.push('--city', city.trim());
  } else if (requireCity) return 'Şehir zorunludur.';
  if (area) {
    if (!/^\d{1,12}$/.test(String(area))) return 'Geçersiz bölge.';
    args.push('--area', String(area));
  }
  if (category) {
    const keys = String(category).split(',').filter(Boolean);
    if (!keys.length || keys.some((k) => !KEY_RE.test(k))) return 'Geçersiz kategori.';
    args.push('--category', keys.join(','));
  }
  return args;
}

export async function GET(request: Request) {
  const denied = requireRole(request, 'prospects', 'read');
  if (denied) return denied;

  const status = webscoutAvailability();
  if (!status.available) return unavailable(status.reason);

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') ?? 'list';

  try {
    if (view === 'meta') {
      const meta = await runWebscout(['meta']);
      return NextResponse.json({ success: true, available: true, ...meta }, { headers: NO_STORE });
    }

    if (view === 'job') {
      const job = await runWebscout(['job-status']);
      return NextResponse.json({ success: true, available: true, ...job }, { headers: NO_STORE });
    }

    // Saha fotoğrafları (taslakta kullanılır)
    if (view === 'uploads' || view === 'upload') {
      const id = Number(searchParams.get('id'));
      if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz kayıt.');
      if (view === 'uploads') return NextResponse.json({ success: true, uploads: listWebscoutUploads(id) }, { headers: NO_STORE });
      const file = readWebscoutUpload(id, String(searchParams.get('name') ?? ''));
      if (!file) return fail('Fotoğraf yok.', 404);
      return new NextResponse(new Uint8Array(file.data), { headers: { 'Content-Type': file.type, 'Cache-Control': 'private, max-age=300' } });
    }

    // Seviye 2 derin profil (tek aday)
    if (view === 'profile' || view === 'shot') {
      const id = Number(searchParams.get('id'));
      if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz kayıt.');
      if (view === 'shot') {
        const shot = readWebscoutShot(id);
        if (!shot) return fail('Ekran görüntüsü yok.', 404);
        return new NextResponse(new Uint8Array(shot.data), { headers: { 'Content-Type': shot.type, 'Cache-Control': 'private, no-store' } });
      }
      const res = await runWebscout(['profile', '--id', String(id)]);
      return NextResponse.json({ success: true, available: true, ...res }, { headers: NO_STORE });
    }

    // Saha kayıtları (tek aday)
    if (view === 'visits') {
      const id = Number(searchParams.get('id'));
      if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz kayıt.');
      const res = await runWebscout(['visits', '--id', String(id)]);
      return NextResponse.json({ success: true, available: true, ...res }, { headers: NO_STORE });
    }

    // Saha listesi: o günün planı + o gün ziyaret kaydı girilenler (bölge/tür süzgeci yok)
    if (view === 'day') {
      const day = String(searchParams.get('date') ?? '');
      if (!DAY_RE.test(day)) return fail('Geçersiz tarih.');
      const res = await runWebscout(['query', '--visit-day', day, '--kind', 'all', '--limit', '60']);
      return NextResponse.json({ success: true, available: true, ...res }, { headers: NO_STORE });
    }

    // Satış hunisi (seçili bölge) + hatırlatmalar (tüm şehirler)
    if (view === 'funnel') {
      const args = regionArgs(searchParams, false);
      if (typeof args === 'string') return fail(args);
      const res = await runWebscout(['funnel', ...args]);
      return NextResponse.json({ success: true, available: true, ...res }, { headers: NO_STORE });
    }

    if (view === 'districts') {
      const args = regionArgs(searchParams, true);
      if (typeof args === 'string') return fail(args);
      if (searchParams.get('refresh') === '1') args.push('--refresh');
      // İlk seferde Overpass'a gider; yoğunken birkaç deneme sürebilir
      const res = await runWebscout(['districts', ...args, '--json'], 240_000);
      return NextResponse.json({ success: true, available: true, ...res }, { headers: NO_STORE });
    }

    const args = regionArgs(searchParams, false);
    if (typeof args === 'string') return fail(args);
    const kind = searchParams.get('kind');
    if (kind) {
      if (!KEY_RE.test(kind)) return fail('Geçersiz tür.');
      args.push('--kind', kind);
    }
    // Tek aday (hatırlatmadan detay açmak için)
    const one = searchParams.get('id');
    if (one) {
      if (!/^\d{1,9}$/.test(one)) return fail('Geçersiz kayıt.');
      args.push('--id', one);
    }
    const st = searchParams.get('status');
    if (st) {
      if (!KEY_RE.test(st)) return fail('Geçersiz durum.');
      args.push('--status', st);
    }
    const minScore = Number(searchParams.get('minScore') ?? 40);
    args.push('--min-score', String(Number.isFinite(minScore) ? Math.max(0, Math.min(100, Math.round(minScore))) : 40));
    const q = (searchParams.get('q') ?? '').trim().slice(0, 80);
    // "--" ile başlayan arama metni araç seçeneği sanılmasın
    if (q && !q.startsWith('--')) args.push('--q', q);
    // Liste 500 satır gösterir; harita görünümü bölgenin tamamını ister (en çok 2000)
  const limit = Number(searchParams.get('limit') ?? 500);
  args.push('--limit', String(Number.isInteger(limit) ? Math.max(1, Math.min(2000, limit)) : 500));

    const res = await runWebscout(['query', ...args]);
    return NextResponse.json({ success: true, available: true, ...res }, { headers: NO_STORE });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Sunucu hatası', 500);
  }
}

export async function POST(request: Request) {
  const denied = requireRole(request, 'prospects', 'write');
  if (denied) return denied;

  const status = webscoutAvailability();
  if (!status.available) return unavailable(status.reason);

  // Saha fotoğrafı yükleme: multipart/form-data { id, file }
  if ((request.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
    const length = Number(request.headers.get('content-length') ?? 0);
    if (length > UPLOAD_MAX_BYTES + 64 * 1024) return fail('Fotoğraf en fazla 8 MB olabilir.', 413);
    try {
      const form = await request.formData();
      const id = Number(form.get('id'));
      const file = form.get('file');
      if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz kayıt.');
      if (!(file instanceof File) || !file.size) return fail('Fotoğraf seçilmedi.');
      if (file.size > UPLOAD_MAX_BYTES) return fail('Fotoğraf en fazla 8 MB olabilir.', 413);
      const name = saveWebscoutUpload(id, Buffer.from(await file.arrayBuffer()));
      return NextResponse.json({ success: true, name, uploads: listWebscoutUploads(id) }, { headers: NO_STORE });
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Fotoğraf yüklenemedi.');
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail('Geçersiz istek gövdesi.');
  }

  try {
    // Bölge + kategori çekimini (ve site taramasını) arka planda başlat
    if (body.action === 'start') {
      const args = regionArgs({ get: (k) => body[k] }, true);
      if (typeof args === 'string') return fail(args);
      if (!args.includes('--category')) return fail('En az bir kategori seçin.');
      if (body.scan === false) args.push('--no-scan');
      // Taramadan sonra en iyi N adayın derin profilini de çıkar (Seviye 2)
      const enrichTop = Number(body.enrichTop ?? 0);
      if (Number.isInteger(enrichTop) && enrichTop > 0) args.push('--enrich-top', String(Math.min(25, enrichTop)));

      const current = await runWebscout<{ job: { state?: string } | null }>(['job-status']);
      if (current.job?.state === 'running') return fail('Zaten çalışan bir tarama var; bitmesini bekleyin.', 409);

      startWebscoutJob(args);
      return NextResponse.json({ success: true, started: true }, { headers: NO_STORE });
    }

    // Seviye 2: seçilen adaylar (ids) ya da süzgece uyan en iyi N aday (top) için derin profil
    if (body.action === 'enrich') {
      let args: string[];
      if (Array.isArray(body.ids)) {
        const ids = body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 25);
        if (!ids.length) return fail('Geçersiz kayıt.');
        args = ['--id', ids.join(',')];
      } else {
        const region = regionArgs({ get: (k) => body[k] }, false);
        if (typeof region === 'string') return fail(region);
        const top = Number(body.top ?? 10);
        const minScore = Number(body.minScore ?? 40);
        args = [
          ...region,
          '--top', String(Number.isInteger(top) ? Math.max(1, Math.min(25, top)) : 10),
          '--min-score', String(Number.isFinite(minScore) ? Math.max(0, Math.min(100, Math.round(minScore))) : 40),
        ];
      }
      const current = await runWebscout<{ job: { state?: string } | null }>(['job-status']);
      if (current.job?.state === 'running') return fail('Zaten çalışan bir tarama var; bitmesini bekleyin.', 409);

      startWebscoutJob(args, 'job-enrich');
      return NextResponse.json({ success: true, started: true }, { headers: NO_STORE });
    }

    // Seviye 3: şablon taslağı (gizli /demo/<belirteç> sayfası) — tek aday (id) ya da süzgeçteki en iyi N aday (top)
    if (body.action === 'draft') {
      let args: string[];
      if (body.id !== undefined) {
        const id = Number(body.id);
        if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz kayıt.');
        args = ['--id', String(id)];
      } else {
        const region = regionArgs({ get: (k) => body[k] }, false);
        if (typeof region === 'string') return fail(region);
        const top = Number(body.top ?? 10);
        const minScore = Number(body.minScore ?? 40);
        args = [
          ...region,
          '--top', String(Number.isInteger(top) ? Math.max(1, Math.min(25, top)) : 10),
          '--min-score', String(Number.isFinite(minScore) ? Math.max(0, Math.min(100, Math.round(minScore))) : 40),
        ];
      }
      const current = await runWebscout<{ job: { state?: string } | null }>(['job-status']);
      if (current.job?.state === 'running') return fail('Zaten çalışan bir tarama var; bitmesini bekleyin.', 409);

      startWebscoutJob(args, 'job-draft');
      return NextResponse.json({ success: true, started: true }, { headers: NO_STORE });
    }

    // Saha fotoğrafını sil ya da kapak yap
    if (body.action === 'delete-upload' || body.action === 'cover-upload') {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz kayıt.');
      const name = String(body.name ?? '');
      const done = body.action === 'delete-upload' ? deleteWebscoutUpload(id, name) : makeWebscoutUploadCover(id, name);
      if (!done) return fail('Fotoğraf bulunamadı.', 404);
      return NextResponse.json({ success: true, uploads: listWebscoutUploads(id) }, { headers: NO_STORE });
    }

    // Sahadan ziyaret sonucu: durum otomatik güncellenir, "tekrar gel" o güne planlanır
    if (body.action === 'visit') {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz kayıt.');
      if (!VISIT_OUTCOMES.includes(String(body.outcome))) return fail('Geçersiz ziyaret sonucu.');
      const args = ['visit-add', '--id', String(id), '--outcome', String(body.outcome)];
      const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : '';
      if (note) args.push('--note-b64', b64(note));
      if (body.next) {
        if (typeof body.next !== 'string' || !DAY_RE.test(body.next)) return fail('Geçersiz tarih.');
        args.push('--next', body.next);
      }
      const who = getAdminSession(request);
      if (who) args.push('--user-b64', b64(String(who.name || who.email).slice(0, 120)));
      const res = await runWebscout(args);
      return NextResponse.json({ success: true, ...res }, { headers: NO_STORE });
    }

    // Rotayı bir güne ziyaret planı olarak kaydet (telefondaki saha listesi bunu okur)
    if (body.action === 'plan') {
      const day = String(body.date ?? '');
      if (!DAY_RE.test(day)) return fail('Geçersiz tarih.');
      const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
      if (ids.length > 30 || ids.some((n: number) => !Number.isInteger(n) || n <= 0)) return fail('Geçersiz aday listesi.');
      // Boş liste = o günün planını temizle
      const res = await runWebscout(['plan-visits', '--date', day, ...(ids.length ? ['--ids', ids.join(',')] : [])]);
      return NextResponse.json({ success: true, ...res }, { headers: NO_STORE });
    }

    // Durum / not / elle bulunan site adresi güncelle
    if (body.action === 'update') {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz kayıt.');
      const args = ['prospect-set', '--id', String(id)];
      if (typeof body.status === 'string') {
        if (!KEY_RE.test(body.status)) return fail('Geçersiz durum.');
        args.push('--status', body.status);
      }
      // Serbest metin base64 ile geçer: tire/tırnak içeren notlar seçenek sanılmasın
      if (typeof body.notes === 'string') {
        const b64 = Buffer.from(body.notes.slice(0, 4000), 'utf8').toString('base64');
        args.push('--notes-b64', ...(b64 ? [b64] : [])); // değersiz bayrak = notu temizle
      }
      if (typeof body.website === 'string') {
        const b64 = Buffer.from(body.website.trim().slice(0, 300), 'utf8').toString('base64');
        args.push('--website-b64', ...(b64 ? [b64] : []));
      }
      await runWebscout(args);
      return NextResponse.json({ success: true }, { headers: NO_STORE });
    }

    return fail('Bilinmeyen işlem.');
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Sunucu hatası', 500);
  }
}
