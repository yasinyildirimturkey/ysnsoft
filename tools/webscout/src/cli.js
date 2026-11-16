import { writeFileSync, readFileSync, existsSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { openDb, BUSINESS_STATUSES, PARTNER_STATUSES, DATA_DIR } from './db.js';
import {
  COUNTRIES, LEAD_CATEGORIES, PARTNER_CATEGORIES, DEFAULT_CITIES, DEFAULT_COUNTRY,
  fetchPlaces, resolveCity, listDistricts, assertPlaceName,
} from './osm.js';
import { scanSite } from './scan.js';
import { writeReports, summary } from './report.js';
import { queryProspects, STATUS_LABELS } from './prospects.js';
import { enrichBusiness } from './enrich.js';
import { buildDraft, newToken } from './draft.js';

const HELP = `WebScout – yerel işletme sitelerini tara, puanla, takip et

Kullanım:  node --no-warnings src/cli.js <komut> [seçenekler]

  fetch    --city <Şehir|all> --category <kat|all> [--country DE] [--area <id>] [--target partners]
           OpenStreetMap'ten işletme/aracı listesi çeker (sitesi olmayanlar dahil).
           Müşteri kategorileri : ${Object.keys(LEAD_CATEGORIES).join(', ')}
           Aracı kategorileri   : ${Object.keys(PARTNER_CATEGORIES).join(', ')}  (--target partners ile)
  districts --city X [--country DE] [--refresh]   Şehrin ilçe/mahallelerini listeler (--area için id).
  scan     [--limit 50] [--city X] [--category Y] [--concurrency 4] [--rescan [--min-score N]]
           Henüz taranmamış siteleri tarar (site başına tek istek).
  report   [--min-score 40] [--city X] [--category Y]
           out/report.html ve out/leads.csv üretir.
  stats    Şehir/kategori özeti.
  enrich   --id <n[,n...]> | --top 10 [--city X] [--category Y] [--country DE] [--area <id>] [--min-score 40]
           Seviye 2 derin profil: siteyi birkaç sayfa gezer, bulguları doğrular, OSM/Wayback/PageSpeed ekler.
           --top: puanı en yüksek, henüz profili olmayan yenileme adayları.
  draft    --id <n>
           Seviye 3 şablon taslağı: profilden tek dosyalık demo sitesi üretir (data/drafts/<token>/, adres /demo/<token>).
           Profil yoksa önce Seviye 2 çalışır. Yeniden üretimde adres aynı kalır.
  status   <işletme-id> <${BUSINESS_STATUSES.join('|')}> [not...]
  partners [--city X] [--status Y]       Aracı listesini göster.
  snapshot <hedef.db>                    Veritabanının tutarlı kopyasını yazar (yedek / deploy).
  partner-set <aracı-id> <${PARTNER_STATUSES.join('|')}> [not...]

  Yönetim paneli için (JSON çıktı):
  meta | query | job | job-enrich | job-draft | job-status | prospect-set | profile
`;

function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const n = argv[i + 1];
      if (n === undefined || n.startsWith('--')) opt[k] = true;
      else { opt[k] = n; i++; }
    } else pos.push(a);
  }
  return { pos, opt };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const str = (v) => (typeof v === 'string' && v.length ? v : undefined);
const printJson = (v) => process.stdout.write(JSON.stringify(v));

// ── Çekim ────────────────────────────────────────────────────

function areaById(db, id) {
  const row = db.prepare('SELECT * FROM areas WHERE id=?').get(Number(id));
  if (!row) throw new Error(`Bilinmeyen bölge kimliği: ${id} (önce: districts --city ...)`);
  return row;
}

/** Bir bölge + kategori çeker ve veritabanına yazar. */
async function fetchOne(db, area, cat, toPartners) {
  const places = await fetchPlaces(area, cat);
  const upsertBiz = db.prepare(
    `INSERT INTO businesses (osm_id,name,category,country,city,address,postcode,suburb,website,phone,lat,lon,brand,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
     ON CONFLICT(osm_id) DO UPDATE SET name=excluded.name, country=excluded.country, address=excluded.address,
       postcode=excluded.postcode, suburb=excluded.suburb, website=COALESCE(excluded.website, businesses.website),
       phone=COALESCE(excluded.phone, businesses.phone), lat=excluded.lat, lon=excluded.lon, brand=excluded.brand, updated_at=datetime('now')`,
  );
  const upsertPartner = db.prepare(
    `INSERT INTO partners (osm_id,name,type,country,city,address,website,phone) VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(osm_id) DO UPDATE SET name=excluded.name, address=excluded.address,
       website=COALESCE(excluded.website, partners.website), phone=COALESCE(excluded.phone, partners.phone)`,
  );
  const idOf = db.prepare('SELECT id FROM businesses WHERE osm_id=?');
  const link = db.prepare('INSERT OR IGNORE INTO business_areas (business_id, area_id) VALUES (?,?)');

  db.exec('BEGIN');
  try {
    for (const p of places) {
      if (toPartners) {
        upsertPartner.run(p.osm_id, p.name, p.category, p.country, p.city, p.address, p.website, p.phone);
      } else {
        upsertBiz.run(p.osm_id, p.name, p.category, p.country, p.city, p.address, p.postcode, p.suburb, p.website, p.phone, p.lat, p.lon, p.brand);
        if (area.kind === 'district') link.run(idOf.get(p.osm_id).id, area.id);
      }
    }
    const noSite = places.filter((p) => !p.website).length;
    if (!toPartners) {
      db.prepare('INSERT INTO fetches (country, city, area_id, category, found, no_site) VALUES (?,?,?,?,?,?)')
        .run(area.country, area.city, area.kind === 'district' ? area.id : null, cat, places.length, noSite);
    }
    db.exec('COMMIT');
    return { found: places.length, noSite };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

async function cmdFetch(db, opt) {
  const toPartners = opt.target === 'partners';
  const pool = toPartners ? PARTNER_CATEGORIES : LEAD_CATEGORIES;
  if (!opt.city || !opt.category) { console.log(HELP); process.exit(1); }
  const country = str(opt.country) ?? DEFAULT_COUNTRY;
  const cities = opt.city === 'all' ? DEFAULT_CITIES : [opt.city];
  const cats = opt.category === 'all' ? Object.keys(pool) : String(opt.category).split(',');

  let first = true;
  for (const city of cities) {
    let area;
    try {
      area = opt.area ? areaById(db, opt.area) : await resolveCity(db, country, city);
    } catch (e) {
      console.log(`${city}: HATA: ${e.message}`);
      continue;
    }
    for (const cat of cats) {
      if (!pool[cat]) { console.error(`Bu hedef için geçersiz kategori: ${cat}`); continue; }
      if (!first) await sleep(5000); // Overpass'a nazik davran
      first = false;
      process.stdout.write(`${area.name} / ${cat} ... `);
      try {
        const r = await fetchOne(db, area, cat, toPartners);
        console.log(`${r.found} kayıt (${r.noSite} sitesiz)`);
      } catch (e) {
        console.log(`HATA: ${e.message}`);
      }
    }
  }
}

async function cmdDistricts(db, opt) {
  if (!opt.city) { console.log(HELP); process.exit(1); }
  const rows = await listDistricts(db, str(opt.country) ?? DEFAULT_COUNTRY, opt.city, { refresh: Boolean(opt.refresh) });
  if (opt.json) printJson({ ok: true, districts: rows });
  else console.table(rows);
}

// ── Tarama ───────────────────────────────────────────────────

function scanTodo(db, { city, category, categories, areaId, country, rescan, minScore, limit }) {
  const where = ['b.website IS NOT NULL', 'b.brand IS NULL', "b.status != 'do_not_contact'"];
  const params = [];
  if (!rescan) where.push('NOT EXISTS (SELECT 1 FROM scans s WHERE s.business_id = b.id)');
  // --rescan --min-score N: yalnızca son puanı N ve üstü olanları yeniden tara
  if (rescan && minScore !== undefined) {
    where.push('(SELECT s.score FROM scans s WHERE s.business_id = b.id ORDER BY s.id DESC LIMIT 1) >= ?');
    params.push(minScore);
  }
  if (country) { where.push('b.country = ?'); params.push(country); }
  if (city) { where.push('b.city = ?'); params.push(city); }
  if (category) { where.push('b.category = ?'); params.push(category); }
  if (categories?.length) { where.push(`b.category IN (${categories.map(() => '?').join(',')})`); params.push(...categories); }
  if (areaId) { where.push('EXISTS (SELECT 1 FROM business_areas ba WHERE ba.business_id = b.id AND ba.area_id = ?)'); params.push(Number(areaId)); }
  return db
    .prepare(`SELECT b.id, b.name, b.website FROM businesses b WHERE ${where.join(' AND ')} ORDER BY b.id LIMIT ?`)
    .all(...params, limit);
}

async function runScan(db, todo, concurrency, onProgress) {
  const insert = db.prepare(
    `INSERT INTO scans (business_id, ok, error, final_url, http_status, response_ms, score, findings) VALUES (?,?,?,?,?,?,?,?)`,
  );
  let idx = 0;
  let done = 0;
  async function worker() {
    while (idx < todo.length) {
      const b = todo[idx++];
      const r = await scanSite(b.website);
      insert.run(b.id, r.ok ? 1 : 0, r.error ?? null, r.finalUrl ?? null, r.status ?? null, r.ms ?? null, r.score, JSON.stringify(r.findings));
      done++;
      onProgress(done, todo.length, b, r);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

async function cmdScan(db, opt) {
  const limit = Number(opt.limit ?? 50);
  const concurrency = Math.max(1, Math.min(10, Number(opt.concurrency ?? 4)));
  const todo = scanTodo(db, { city: str(opt.city), category: str(opt.category), rescan: Boolean(opt.rescan), minScore: opt['min-score'] !== undefined ? Number(opt['min-score']) : undefined, limit });
  if (!todo.length) { console.log('Taranacak site yok.'); return; }
  console.log(`${todo.length} site taranacak (eşzamanlı: ${concurrency})`);
  await runScan(db, todo, concurrency, (done, total, b, r) => {
    const tag = r.score === null ? '  ?' : String(r.score).padStart(3);
    console.log(`[${done}/${total}] ${tag}  ${b.name}  ${r.error ? `(${r.error})` : ''}`);
  });
}

// ── Seviye 2: derin profil ───────────────────────────────────

const ENRICH_COLS = 'b.id, b.name, b.category, b.city, b.website, b.osm_id';

function enrichByIds(db, ids) {
  const get = db.prepare(`SELECT ${ENRICH_COLS} FROM businesses b WHERE b.id=? AND b.status != 'do_not_contact'`);
  return ids.map((id) => get.get(id)).filter(Boolean);
}

/** Puanı en yüksek, gerçek sitesi olan ve henüz profili çıkarılmamış yenileme adayları. */
function enrichTop(db, { country, city, categories, areaId, minScore = 40, limit }) {
  const where = [
    'b.website IS NOT NULL', 'b.brand IS NULL', "b.status != 'do_not_contact'",
    'NOT EXISTS (SELECT 1 FROM profiles p WHERE p.business_id = b.id)',
    's.score >= ?', `s.findings NOT LIKE '%"social_only"%'`, `s.findings NOT LIKE '%"placeholder"%'`,
  ];
  const params = [minScore];
  if (country) { where.push('b.country = ?'); params.push(country); }
  if (city) { where.push('b.city = ?'); params.push(city); }
  if (categories?.length) { where.push(`b.category IN (${categories.map(() => '?').join(',')})`); params.push(...categories); }
  if (areaId) { where.push('EXISTS (SELECT 1 FROM business_areas ba WHERE ba.business_id = b.id AND ba.area_id = ?)'); params.push(Number(areaId)); }
  return db
    .prepare(`SELECT ${ENRICH_COLS} FROM businesses b
              JOIN scans s ON s.id = (SELECT MAX(id) FROM scans WHERE business_id = b.id)
              WHERE ${where.join(' AND ')} ORDER BY s.score DESC, b.name LIMIT ?`)
    .all(...params, limit);
}

/**
 * Doğrulamadan sonraki puan: Seviye 2'nin "yanlış alarm" (refuted) dediği bulguların puanı düşülür.
 * Site gezilemediyse ya da ilk taramada puan yoksa null (ilk puan geçerli kalır).
 */
function adjustedScore(scan, profile) {
  if (!scan || scan.score === null || !profile.site?.ok) return null;
  let items = [];
  try { items = JSON.parse(scan.findings)?.items ?? []; } catch { return null; }
  const v = profile.site.verification ?? {};
  return Math.min(100, items.filter((f) => v[f.code]?.status !== 'refuted').reduce((s, f) => s + f.points, 0));
}

/** İşletmeleri SIRAYLA zenginleştirir (aynı anda tek site: dış servislere ve siteye nazik). */
async function runEnrich(db, todo, auto, onProgress) {
  const lastScan = db.prepare('SELECT final_url, findings, score FROM scans WHERE business_id=? ORDER BY id DESC LIMIT 1');
  const save = db.prepare(
    `INSERT INTO profiles (business_id, enriched_at, activity, auto, profile, adjusted_score) VALUES (?, datetime('now'), ?, ?, ?, ?)
     ON CONFLICT(business_id) DO UPDATE SET enriched_at=excluded.enriched_at, activity=excluded.activity, auto=excluded.auto,
       profile=excluded.profile, adjusted_score=excluded.adjusted_score`,
  );
  const insertScan = db.prepare(
    `INSERT INTO scans (business_id, ok, error, final_url, http_status, response_ms, score, findings) VALUES (?,?,?,?,?,?,?,?)`,
  );
  for (let i = 0; i < todo.length; i++) {
    const b = todo[i];
    onProgress(i, todo.length, b, null);
    const scan = lastScan.get(b.id) ?? null;
    const profile = await enrichBusiness(b, scan);
    const adjusted = adjustedScore(scan, profile);
    // Derin tarama "aslında site yok" dediyse Seviye 1 kaydını yenile: aday "Yenileme"den "Yeni site"ye geçer
    if (profile.site?.error === 'placeholder') {
      const r = await scanSite(b.website);
      // Seviye 1 sertifika hatası yüzünden sayfayı hiç göremediyse (ör. https'te yalnızca veritabanı hatası) yer tutucuyu
      // Seviye 2 bulmuştur: kayda eklenir ki aday "Yeni site" teklifine geçsin; sertifika bulgusu da kalır.
      if (!JSON.stringify(r.findings ?? {}).includes('"placeholder"')) {
        r.findings = { info: {}, ...r.findings, items: [
          { code: 'placeholder', points: 70, de: 'Website nicht in Betrieb (Fehler- oder Platzhalterseite)', tr: 'Site çalışmıyor (hata ya da yer tutucu sayfası)' },
          ...(r.findings?.items ?? []),
        ] };
      }
      insertScan.run(b.id, r.ok ? 1 : 0, r.error ?? null, r.finalUrl ?? null, r.status ?? null, r.ms ?? null, r.score, JSON.stringify(r.findings));
    }
    save.run(b.id, profile.activity.verdict, auto ? 1 : 0, JSON.stringify(profile), adjusted);
    onProgress(i + 1, todo.length, b, profile);
  }
}

const parseIds = (v) => String(v ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 50);

function enrichSelection(db, opt) {
  if (opt.id) return enrichByIds(db, parseIds(opt.id));
  return enrichTop(db, {
    country: str(opt.country), city: str(opt.city), categories: str(opt.category)?.split(','), areaId: opt.area,
    minScore: Number(opt['min-score'] ?? 40), limit: Math.max(1, Math.min(50, Number(opt.top ?? 10))),
  });
}

async function cmdEnrich(db, opt) {
  const todo = enrichSelection(db, opt);
  if (!todo.length) { console.log('Zenginleştirilecek aday yok.'); return; }
  await runEnrich(db, todo, false, (done, total, b, p) => {
    if (!p) return;
    const site = p.site ? (p.site.ok ? `${p.site.pages.length} sayfa` : `site: ${p.site.error}`) : 'site yok';
    console.log(`[${done}/${total}] ${b.name} — ${site}, ${p.activity.verdict}`);
  });
}

function cmdProfile(db, opt) {
  const row = db.prepare('SELECT enriched_at, activity, auto, profile FROM profiles WHERE business_id=?').get(Number(opt.id));
  if (!row) { printJson({ ok: true, profile: null }); return; }
  printJson({ ok: true, enriched_at: row.enriched_at, auto: Boolean(row.auto), profile: JSON.parse(row.profile) });
}

// ── Seviye 3: şablon taslağı ─────────────────────────────────

/** Tek işletme için taslak üretir; profil yoksa önce Seviye 2'yi çalıştırır. */
async function runDraft(db, id, onStep = () => {}) {
  const biz = db.prepare("SELECT id, name, category, city, address, phone, website, osm_id FROM businesses WHERE id=? AND status != 'do_not_contact'").get(id);
  if (!biz) throw new Error(`#${id} bulunamadı (ya da "iletişime geçme" olarak işaretli)`);
  const readProfile = db.prepare('SELECT profile FROM profiles WHERE business_id=?');
  if (!readProfile.get(id)) {
    onStep(`Derin profil: ${biz.name}…`);
    await runEnrich(db, [biz], false, () => {});
  }
  const profile = JSON.parse(readProfile.get(id).profile);
  onStep(`Şablon taslağı: ${biz.name}…`);
  const token = db.prepare('SELECT token FROM drafts WHERE business_id=?').get(id)?.token ?? newToken();
  const { kit, expiresAt } = await buildDraft(biz, profile, token);
  db.prepare(
    `INSERT INTO drafts (business_id, token, template, created_at, expires_at, kit) VALUES (?, ?, ?, datetime('now'), ?, ?)
     ON CONFLICT(business_id) DO UPDATE SET template=excluded.template, created_at=excluded.created_at, expires_at=excluded.expires_at, kit=excluded.kit`,
  ).run(id, token, kit.template, expiresAt, JSON.stringify(kit));
  return { biz, token, kit, expiresAt };
}

async function cmdDraft(db, opt) {
  const [id] = parseIds(opt.id);
  if (!id) { console.log('Kullanım: draft --id <n>'); process.exit(1); }
  const r = await runDraft(db, id, (m) => console.log(m));
  console.log(`${r.biz.name}: /demo/${r.token}  (şablon: ${r.kit.template}, ${r.kit.photos.length} görsel (${r.kit.uploads} saha), saatler: ${r.kit.hours?.source ?? 'yok'}, metin: ${r.kit.copy.placeholder ? `yer tutucu${r.kit.copy.llmError ? ` — ${r.kit.copy.llmError}` : ''}` : r.kit.copy.model})`);
}

/**
 * Toplu taslak için en iyi adaylar: gerçek sitesi olan (metin ve görsel oradan gelir), zincir olmayan,
 * henüz taslağı olmayan yenileme adayları; geçerli puana (doğrulama sonrası) göre.
 */
function draftTop(db, { country, city, categories, areaId, minScore = 40, limit }) {
  const where = [
    'b.website IS NOT NULL', 'b.brand IS NULL', "b.status NOT IN ('do_not_contact','won','lost')",
    'NOT EXISTS (SELECT 1 FROM drafts d WHERE d.business_id = b.id)',
    'COALESCE(p.adjusted_score, s.score) >= ?', `s.findings NOT LIKE '%"social_only"%'`, `s.findings NOT LIKE '%"placeholder"%'`,
  ];
  const params = [minScore];
  if (country) { where.push('b.country = ?'); params.push(country); }
  if (city) { where.push('b.city = ?'); params.push(city); }
  if (categories?.length) { where.push(`b.category IN (${categories.map(() => '?').join(',')})`); params.push(...categories); }
  if (areaId) { where.push('EXISTS (SELECT 1 FROM business_areas ba WHERE ba.business_id = b.id AND ba.area_id = ?)'); params.push(Number(areaId)); }
  return db
    .prepare(`SELECT b.id FROM businesses b
              JOIN scans s ON s.id = (SELECT MAX(id) FROM scans WHERE business_id = b.id)
              LEFT JOIN profiles p ON p.business_id = b.id
              WHERE ${where.join(' AND ')} ORDER BY COALESCE(p.adjusted_score, s.score) DESC, b.name LIMIT ?`)
    .all(...params, limit)
    .map((r) => r.id);
}

async function cmdJobDraft(db, opt) {
  const running = readJob();
  if (running?.state === 'running' && running.pid !== process.pid) {
    printJson({ ok: false, error: 'Zaten çalışan bir tarama var; bitmesini bekleyin.' });
    process.exit(1);
  }
  const ids = opt.id
    ? parseIds(opt.id).slice(0, 25)
    : draftTop(db, {
      country: str(opt.country), city: str(opt.city), categories: str(opt.category)?.split(','), areaId: opt.area,
      minScore: Number(opt['min-score'] ?? 40), limit: Math.max(1, Math.min(25, Number(opt.top ?? 10))),
    });
  const job = {
    id: Date.now(), pid: process.pid, state: 'running', startedAt: new Date().toISOString(),
    params: { draft: true, ids },
    step: 'draft', message: 'Şablon taslağı başlıyor…', progress: { done: 0, total: ids.length },
    results: [], errors: [],
  };
  writeJob(job);
  try {
    if (!ids.length) throw new Error(opt.id ? 'Geçersiz kayıt.' : 'Bu seçimde taslağı üretilecek yeni aday yok.');
    let made = 0;
    let last = null;
    // Sırayla: her taslak siteyi gezer ve GLM'e gider; bir aday hata verirse diğerleri sürer
    for (let i = 0; i < ids.length; i++) {
      try {
        last = await runDraft(db, ids[i], (m) => { job.message = ids.length > 1 ? `[${i + 1}/${ids.length}] ${m}` : m; writeJob(job); });
        made++;
      } catch (e) {
        job.errors.push(`#${ids[i]}: ${String(e.message).slice(0, 160)}`);
      }
      job.progress = { done: i + 1, total: ids.length };
      writeJob(job);
    }
    if (!made) throw new Error(job.errors[0] ?? 'Taslak üretilemedi.');
    job.state = 'done';
    job.step = 'done';
    job.drafted = made;
    job.message = ids.length === 1 ? `${last.biz.name}: şablon taslağı hazır.` : `${made} adayın şablon taslağı hazır${job.errors.length ? ` (${job.errors.length} hata)` : ''}.`;
  } catch (e) {
    job.state = 'error';
    job.message = e.message;
  }
  job.finishedAt = new Date().toISOString();
  writeJob(job);
  if (job.state === 'error') process.exit(1);
}

// ── Arka plan işi (yönetim panelinden başlatılır) ────────────

const JOB_FILE = join(DATA_DIR, 'job.json');

function readJob() {
  if (!existsSync(JOB_FILE)) return null;
  try {
    const job = JSON.parse(readFileSync(JOB_FILE, 'utf8'));
    if (job.state === 'running') {
      let alive = true;
      try { process.kill(job.pid, 0); } catch { alive = false; }
      if (!alive) return { ...job, state: 'error', message: 'İş yarıda kesildi (süreç artık çalışmıyor).' };
    }
    return job;
  } catch {
    return null;
  }
}

function writeJob(job) {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = JOB_FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify({ ...job, updatedAt: new Date().toISOString() }), 'utf8');
  renameSync(tmp, JOB_FILE);
}

async function cmdJob(db, opt) {
  const running = readJob();
  if (running?.state === 'running' && running.pid !== process.pid) {
    printJson({ ok: false, error: 'Zaten çalışan bir tarama var; bitmesini bekleyin.' });
    process.exit(1);
  }
  const country = str(opt.country) ?? DEFAULT_COUNTRY;
  const city = assertPlaceName(String(opt.city ?? ''));
  const categories = String(opt.category ?? '').split(',').filter((c) => LEAD_CATEGORIES[c]);
  if (!COUNTRIES[country] || !categories.length) { printJson({ ok: false, error: 'Ülke veya kategori geçersiz.' }); process.exit(1); }
  const doScan = !opt['no-scan'];
  const scanLimit = Math.max(1, Math.min(1000, Number(opt['scan-limit'] ?? 400)));

  const job = {
    id: Date.now(), pid: process.pid, state: 'running', startedAt: new Date().toISOString(),
    params: { country, city, areaId: opt.area ? Number(opt.area) : null, categories, scan: doScan },
    step: 'resolve', message: `${city} sınırı çözümleniyor…`, progress: { done: 0, total: categories.length },
    results: [], errors: [],
  };
  writeJob(job);

  try {
    const area = opt.area ? areaById(db, opt.area) : await resolveCity(db, country, city);
    job.params.areaName = area.name;

    job.step = 'fetch';
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      job.message = `${area.name} / ${LEAD_CATEGORIES[cat].label} çekiliyor…`;
      job.progress = { done: i, total: categories.length };
      writeJob(job);
      if (i > 0) await sleep(4000);
      try {
        const r = await fetchOne(db, area, cat, false);
        job.results.push({ category: cat, ...r });
      } catch (e) {
        job.errors.push(`${LEAD_CATEGORIES[cat].label}: ${e.message}`);
      }
    }

    if (doScan) {
      const todo = scanTodo(db, { country, city: area.city, categories, areaId: area.kind === 'district' ? area.id : null, limit: scanLimit });
      job.step = 'scan';
      job.progress = { done: 0, total: todo.length };
      job.message = `${todo.length} web sitesi taranıyor…`;
      writeJob(job);
      let last = 0;
      await runScan(db, todo, 4, (done, total) => {
        job.progress = { done, total };
        if (Date.now() - last > 1500 || done === total) { last = Date.now(); writeJob(job); }
      });
    }

    // Seviye 2: taramadan çıkan en iyi adayları otomatik zenginleştir (istenmişse)
    const enrichN = doScan ? Math.max(0, Math.min(25, Number(opt['enrich-top'] ?? 0) || 0)) : 0;
    if (enrichN) {
      const top = enrichTop(db, { country, city: area.city, categories, areaId: area.kind === 'district' ? area.id : null, limit: enrichN });
      job.step = 'enrich';
      await runEnrich(db, top, true, (done, total, b) => {
        job.progress = { done, total };
        job.message = done < total ? `Derin profil: ${b.name}…` : 'Derin profiller tamamlandı.';
        writeJob(job);
      });
      job.enriched = top.length;
    }

    const found = job.results.reduce((s, r) => s + r.found, 0);
    const noSite = job.results.reduce((s, r) => s + r.noSite, 0);
    job.state = job.errors.length && !job.results.length ? 'error' : 'done';
    job.step = 'done';
    job.message = job.state === 'error'
      ? `Çekim başarısız: ${job.errors[0]}`
      : `${area.name}: ${found} işletme bulundu, ${noSite} tanesinin kayıtlı sitesi yok.`
        + (job.enriched ? ` ${job.enriched} adayın derin profili çıkarıldı.` : '')
        + (job.errors.length ? ` (${job.errors.length} kategori hata verdi)` : '');
    job.finishedAt = new Date().toISOString();
    writeJob(job);
  } catch (e) {
    job.state = 'error';
    job.message = e.message;
    job.finishedAt = new Date().toISOString();
    writeJob(job);
    process.exit(1);
  }
}

/** Yalnızca Seviye 2: seçilen kayıtlar (--id) ya da süzgece uyan en iyi N aday (--top) için arka plan işi. */
async function cmdJobEnrich(db, opt) {
  const running = readJob();
  if (running?.state === 'running' && running.pid !== process.pid) {
    printJson({ ok: false, error: 'Zaten çalışan bir tarama var; bitmesini bekleyin.' });
    process.exit(1);
  }
  const todo = enrichSelection(db, opt);
  const job = {
    id: Date.now(), pid: process.pid, state: 'running', startedAt: new Date().toISOString(),
    params: { enrich: true, ids: todo.map((b) => b.id) },
    step: 'enrich', message: 'Derin profil başlıyor…', progress: { done: 0, total: todo.length },
    results: [], errors: [],
  };
  writeJob(job);
  try {
    await runEnrich(db, todo, false, (done, total, b) => {
      job.progress = { done, total };
      job.message = `Derin profil: ${b.name}…`;
      writeJob(job);
    });
    job.state = 'done';
    job.step = 'done';
    job.enriched = todo.length;
    job.message = todo.length ? `${todo.length} adayın derin profili çıkarıldı.` : 'Bu seçimde derin profili çıkarılacak yeni aday yok.';
  } catch (e) {
    job.state = 'error';
    job.message = e.message;
  }
  job.finishedAt = new Date().toISOString();
  writeJob(job);
  if (job.state === 'error') process.exit(1);
}

// ── Yönetim paneli sorguları ─────────────────────────────────

function cmdMeta(db) {
  const cities = db
    .prepare('SELECT country, city, COUNT(*) AS total FROM businesses GROUP BY country, city ORDER BY country, city')
    .all();
  const districts = db
    .prepare("SELECT id, country, city, name, admin_level FROM areas WHERE kind='district' ORDER BY admin_level, name")
    .all();
  printJson({
    ok: true,
    countries: Object.entries(COUNTRIES).map(([code, c]) => ({ code, label: c.label, pilot: Boolean(c.pilot), cities: c.cities })),
    categories: Object.entries(LEAD_CATEGORIES).map(([key, c]) => ({ key, label: c.label })),
    statuses: BUSINESS_STATUSES.map((key) => ({ key, label: STATUS_LABELS[key] ?? key })),
    cities,
    districts,
    job: readJob(),
  });
}

function cmdQuery(db, opt) {
  printJson({
    ok: true,
    ...queryProspects(db, {
      country: str(opt.country),
      city: str(opt.city),
      areaId: opt.area ? Number(opt.area) : undefined,
      categories: str(opt.category)?.split(','),
      kind: str(opt.kind),
      status: str(opt.status),
      q: str(opt.q),
      minScore: Number(opt['min-score'] ?? 40),
      limit: Math.max(1, Math.min(2000, Number(opt.limit ?? 500))),
    }),
  });
}

function cmdProspectSet(db, opt) {
  const id = Number(opt.id);
  const row = db.prepare('SELECT id FROM businesses WHERE id=?').get(id);
  if (!row) { printJson({ ok: false, error: `#${opt.id} bulunamadı` }); process.exit(1); }
  if (opt.status !== undefined) {
    if (!BUSINESS_STATUSES.includes(opt.status)) { printJson({ ok: false, error: 'Geçersiz durum' }); process.exit(1); }
    db.prepare('UPDATE businesses SET status=? WHERE id=?').run(opt.status, id);
  }
  if (opt['notes-b64'] !== undefined) {
    const notes = opt['notes-b64'] === true ? '' : Buffer.from(String(opt['notes-b64']), 'base64').toString('utf8');
    db.prepare('UPDATE businesses SET notes=? WHERE id=?').run(notes.slice(0, 4000), id);
  }
  if (opt['website-b64'] !== undefined) {
    // Elle düzeltme: OSM'de olmayan site adresi sahada/Google'da bulunduysa
    const raw = opt['website-b64'] === true ? '' : Buffer.from(String(opt['website-b64']), 'base64').toString('utf8').trim();
    let site = null;
    if (raw) {
      try { site = new URL(/^https?:\/\//i.test(raw) ? raw : 'http://' + raw).href; } catch { printJson({ ok: false, error: 'Geçersiz web adresi' }); process.exit(1); }
    }
    db.prepare('UPDATE businesses SET website=? WHERE id=?').run(site, id);
  }
  printJson({ ok: true });
}

/** Veritabanının tutarlı tek dosyalık kopyasını çıkarır (deploy tohumu / yedek için). */
function cmdSnapshot(db, pos) {
  const target = pos[1];
  if (!target) { console.log('Kullanım: snapshot <hedef.db>'); process.exit(1); }
  if (existsSync(target)) { console.error(`HATA: ${target} zaten var`); process.exit(1); }
  mkdirSync(dirname(target), { recursive: true });
  db.prepare('VACUUM INTO ?').run(target);
  console.log(`Kopya yazıldı: ${target}`);
}

// ── Eski komutlar ────────────────────────────────────────────

function cmdReport(db, opt) {
  const r = writeReports(db, {
    minScore: Number(opt['min-score'] ?? 40),
    city: str(opt.city),
    category: str(opt.category),
  });
  console.log(`${r.count} aday → ${r.htmlPath}  ve  ${r.csvPath}`);
}

function cmdStats(db) {
  const rows = summary(db);
  if (!rows.length) { console.log('Veri yok. Önce: fetch'); return; }
  console.table(rows);
}

function setStatus(db, table, allowed, pos) {
  const [, id, status, ...note] = pos;
  if (!id || !allowed.includes(status)) { console.log(HELP); process.exit(1); }
  const sql = note.length
    ? `UPDATE ${table} SET status=?, notes = notes || ? WHERE id=?`
    : `UPDATE ${table} SET status=? WHERE id=?`;
  const args = note.length ? [status, `\n[${new Date().toISOString().slice(0, 10)}] ${note.join(' ')}`, Number(id)] : [status, Number(id)];
  const r = db.prepare(sql).run(...args);
  console.log(r.changes ? `#${id} → ${status}` : `#${id} bulunamadı`);
}

function cmdPartners(db, opt) {
  const where = ['1=1'];
  const params = [];
  if (opt.city) { where.push('city=?'); params.push(opt.city); }
  if (opt.status) { where.push('status=?'); params.push(opt.status); }
  const rows = db
    .prepare(`SELECT id, status, type, city, name, phone, website FROM partners WHERE ${where.join(' AND ')} ORDER BY city, type, name`)
    .all(...params);
  console.table(rows);
}

const { pos, opt } = parseArgs(process.argv.slice(2));
const cmd = pos[0];
if (!cmd || opt.help) { console.log(HELP); process.exit(cmd ? 0 : 1); }

const JSON_COMMANDS = new Set(['meta', 'query', 'job', 'job-enrich', 'job-draft', 'job-status', 'prospect-set', 'profile']);
try {
  const db = openDb();
  switch (cmd) {
    case 'fetch': await cmdFetch(db, opt); break;
    case 'districts': await cmdDistricts(db, opt); break;
    case 'scan': await cmdScan(db, opt); break;
    case 'report': cmdReport(db, opt); break;
    case 'stats': cmdStats(db); break;
    case 'status': setStatus(db, 'businesses', BUSINESS_STATUSES, pos); break;
    case 'partners': cmdPartners(db, opt); break;
    case 'partner-set': setStatus(db, 'partners', PARTNER_STATUSES, pos); break;
    case 'meta': cmdMeta(db); break;
    case 'query': cmdQuery(db, opt); break;
    case 'job': await cmdJob(db, opt); break;
    case 'job-enrich': await cmdJobEnrich(db, opt); break;
    case 'enrich': await cmdEnrich(db, opt); break;
    case 'draft': await cmdDraft(db, opt); break;
    case 'job-draft': await cmdJobDraft(db, opt); break;
    case 'profile': cmdProfile(db, opt); break;
    case 'job-status': printJson({ ok: true, job: readJob() }); break;
    case 'prospect-set': cmdProspectSet(db, opt); break;
    case 'snapshot': cmdSnapshot(db, pos); break;
    default: console.log(HELP); process.exit(1);
  }
} catch (e) {
  if (JSON_COMMANDS.has(cmd) || opt.json) printJson({ ok: false, error: e.message });
  else console.error(`HATA: ${e.message}`);
  process.exit(1);
}
