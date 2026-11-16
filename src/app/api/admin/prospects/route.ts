import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/admin-auth';
import { readWebscoutShot, runWebscout, startWebscoutJob, webscoutAvailability } from '@/lib/webscout';

/**
 * Müşteri adayları (prospects) — WebScout'un bulduğu, BİZİM gideceğimiz işletmeler.
 * Siteden gelen talepler ("leads", /api/leads) ile karıştırılmamalıdır.
 */

const NO_STORE = { 'Cache-Control': 'no-store' };
// İlk karakter harf/rakam olmalı: "--" ile başlayan değer araç seçeneği sanılmasın
const PLACE_RE = /^[\p{L}\p{N}][\p{L}\p{N} .,'()/-]{1,79}$/u;
const KEY_RE = /^[a-z_]{2,30}$/;

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
    args.push('--limit', '500');

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

    // Seviye 3: tek aday için şablon taslağı (gizli /demo/<belirteç> sayfası) üret ya da yenile
    if (body.action === 'draft') {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return fail('Geçersiz kayıt.');
      const current = await runWebscout<{ job: { state?: string } | null }>(['job-status']);
      if (current.job?.state === 'running') return fail('Zaten çalışan bir tarama var; bitmesini bekleyin.', 409);

      startWebscoutJob(['--id', String(id)], 'job-draft');
      return NextResponse.json({ success: true, started: true }, { headers: NO_STORE });
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
