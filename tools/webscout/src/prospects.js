// Yönetim panelinin "Müşteri Adayları" (prospects) ekranı için sorgular.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from './db.js';
import { byAppointment, osmWeek } from './hours.js';

// Demo açılma sayacı: Next rotası yazar (data/views/<token>.json); yalnızca sayı ve zaman
function demoViews(token) {
  if (!token || !/^[A-Za-z0-9_-]{16}$/.test(token)) return null;
  try {
    const v = JSON.parse(readFileSync(join(DATA_DIR, 'views', `${token}.json`), 'utf8'));
    return v.count > 0 ? { count: v.count, last: v.last } : null;
  } catch { return null; }
}
// Prospect = bizim gideceğimiz işletme. (ysnsoft'taki "leads" = bize gelen talepler; karıştırma.)

export const STATUS_LABELS = {
  new: 'Yeni',
  visit_planned: 'Ziyaret planlandı',
  visited: 'Ziyaret edildi',
  offer_sent: 'Teklif verildi',
  won: 'Kazanıldı',
  lost: 'Kaybedildi',
  do_not_contact: 'İletişime geçme',
};

// Aday türü:
//   no_site   → OSM'de site kaydı yok, yalnızca sosyal medya/Google profili var ya da alan adı park edilmiş → YENİ SİTE teklifi
//   redesign  → sitesi var ve "kötü site" puanı eşiğin üstünde → YENİLEME teklifi
//   unscanned → sitesi var ama henüz taranmadı
//   ok        → sitesi var, puanı düşük (öncelikli değil)
//   chain     → zincir/marka şubesi (OSM brand etiketi): aday değil, yalnızca "Tümü"nde görünür
const KIND_SQL = `CASE
  WHEN b.brand IS NOT NULL THEN 'chain'
  WHEN b.website IS NULL OR s.findings LIKE '%"social_only"%' OR s.findings LIKE '%"placeholder"%' THEN 'no_site'
  WHEN s.id IS NULL OR s.score IS NULL THEN 'unscanned'
  WHEN COALESCE(p.adjusted_score, s.score) >= @minScore THEN 'redesign'
  ELSE 'ok' END`;

// Geçerli puan: Seviye 2 doğrulaması yapıldıysa yanlış alarmlar düşülmüş puan, yoksa ilk tarama puanı.
const SCORE_SQL = 'COALESCE(p.adjusted_score, s.score)';

// Seviye 3 taslağı üretilmiş aday ("Taslak hazır" süzgeci; süresi dolmuş olanlar da sayılır, yeniden üretilebilir)
const HAS_DRAFT_SQL = 'EXISTS (SELECT 1 FROM drafts d WHERE d.business_id = b.id)';

const FROM_SQL = `FROM businesses b
  LEFT JOIN scans s ON s.id = (SELECT MAX(id) FROM scans WHERE business_id = b.id)
  LEFT JOIN profiles p ON p.business_id = b.id`;

// node:sqlite, SQL'de geçmeyen adlandırılmış parametreyi reddeder: yalnızca kullanılanları geçir.
const pick = (sql, params) => Object.fromEntries(Object.entries(params).filter(([k]) => sql.includes('@' + k)));
const all = (db, sql, params) => db.prepare(sql).all(pick(sql, params));

function regionWhere({ country, city, areaId, categories }) {
  const where = ['1=1'];
  const params = {};
  if (country) { where.push('b.country = @country'); params.country = country; }
  if (city) { where.push('b.city = @city'); params.city = city; }
  if (areaId) {
    where.push('EXISTS (SELECT 1 FROM business_areas ba WHERE ba.business_id = b.id AND ba.area_id = @areaId)');
    params.areaId = areaId;
  }
  if (categories?.length) {
    const keys = categories.map((_, i) => `@cat${i}`);
    where.push(`b.category IN (${keys.join(',')})`);
    categories.forEach((c, i) => { params[`cat${i}`] = c; });
  }
  return { where, params };
}

export function queryProspects(db, { country, city, areaId, categories, kind, status, q, visitDay, id, minScore = 40, limit = 500 } = {}) {
  const region = regionWhere({ country, city, areaId, categories });

  // Özet: bölge + kategori seçimine göre (tür/durum/arama süzgeçlerinden bağımsız)
  const counts = all(db, `SELECT ${KIND_SQL} AS kind, COUNT(*) AS n ${FROM_SQL} WHERE ${region.where.join(' AND ')} GROUP BY 1`, { ...region.params, minScore });
  const summary = { total: 0, no_site: 0, redesign: 0, unscanned: 0, ok: 0, chain: 0, drafts: 0 };
  for (const c of counts) { summary[c.kind] = c.n; summary.total += c.n; }
  summary.drafts = all(db, `SELECT COUNT(*) AS n ${FROM_SQL} WHERE ${region.where.join(' AND ')} AND ${HAS_DRAFT_SQL}`, region.params)[0].n;
  summary.viewed = all(db, `SELECT d.token ${FROM_SQL} JOIN drafts d ON d.business_id = b.id WHERE ${region.where.join(' AND ')}`, region.params)
    .filter((r) => demoViews(r.token)).length;

  const breakdown = all(
    db,
      `SELECT b.city, b.category,
              COUNT(*) AS total,
              SUM(${KIND_SQL} = 'no_site') AS no_site,
              SUM(${KIND_SQL} = 'redesign') AS redesign,
              SUM(${KIND_SQL} = 'unscanned') AS unscanned
         ${FROM_SQL} WHERE ${region.where.join(' AND ')}
        GROUP BY b.city, b.category ORDER BY b.city, b.category`,
    { ...region.params, minScore },
  );

  const where = [...region.where];
  const params = { ...region.params, minScore };
  if (kind === 'offer') where.push(`${KIND_SQL} IN ('no_site','redesign')`);
  else if (kind === 'draft' || kind === 'viewed') where.push(HAS_DRAFT_SQL);
  else if (kind && kind !== 'all') { where.push(`${KIND_SQL} = @kind`); params.kind = kind; }
  if (id) { where.push('b.id = @id'); params.id = id; }
  if (status) { where.push('b.status = @status'); params.status = status; }
  else if (!visitDay && !id) where.push("b.status != 'do_not_contact'");
  // Saha listesi: o güne planlananlar + o gün ziyaret kaydı girilenler (ertelenen de listede kalır)
  if (visitDay) {
    where.push("(b.visit_date = @visitDay OR EXISTS (SELECT 1 FROM visits v WHERE v.business_id = b.id AND date(v.at, 'localtime') = @visitDay))");
    params.visitDay = visitDay;
  }
  if (q) {
    where.push("(b.name LIKE @q ESCAPE '\\' OR b.address LIKE @q ESCAPE '\\' OR b.website LIKE @q ESCAPE '\\')");
    params.q = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
  }

  let matched = all(db, `SELECT COUNT(*) AS n ${FROM_SQL} WHERE ${where.join(' AND ')}`, params)[0].n;
  const rows = all(
    db,
      `SELECT b.id, b.name, b.category, b.country, b.city, b.address, b.postcode, b.suburb, b.website, b.phone,
              b.status, b.notes, b.lat, b.lon, b.visit_date, b.visit_order, b.offer_package, b.offer_setup, b.offer_monthly, b.offer_at,
              COALESCE(NULLIF(b.opening_hours, ''), json_extract(p.profile, '$.osm.tags.opening_hours')) AS opening_hours,
              (SELECT json_object('outcome', v.outcome, 'at', v.at, 'note', v.note, 'next_at', v.next_at)
                 FROM visits v WHERE v.business_id = b.id ORDER BY v.id DESC LIMIT 1) AS last_visit,
              ${SCORE_SQL} AS score, s.score AS raw_score, s.findings, s.final_url, s.scanned_at, s.error AS scan_error,
              ${KIND_SQL} AS kind,
              p.activity, p.enriched_at,
              json_extract(p.profile, '$.site.verification') AS verification,
              json_extract(p.profile, '$.mismatch') AS site_mismatch,
              (SELECT d.token FROM drafts d WHERE d.business_id = b.id) AS draft_token,
              (SELECT d.expires_at FROM drafts d WHERE d.business_id = b.id) AS draft_expires,
              (SELECT json_object('stock', json_extract(d.kit, '$.stockPhotos'), 'photos', json_array_length(json_extract(d.kit, '$.photos')),
                      'uploads', json_extract(d.kit, '$.uploads'), 'logo', json_extract(d.kit, '$.logo'), 'hours', json_extract(d.kit, '$.hours') IS NOT NULL,
                      'placeholder', json_extract(d.kit, '$.copy.placeholder'), 'suggested', json_extract(d.kit, '$.copy.suggested'),
                      'conflicts', json_extract(d.kit, '$.copy.name_conflicts'), 'before', json_extract(d.kit, '$.before.shot') IS NOT NULL,
                      'owner', json_extract(d.kit, '$.owner.name'))
                 FROM drafts d WHERE d.business_id = b.id) AS draft_quality,
              (SELECT group_concat(a.name, ' · ') FROM business_areas ba JOIN areas a ON a.id = ba.area_id WHERE ba.business_id = b.id) AS districts
         ${FROM_SQL}
        WHERE ${where.join(' AND ')}
        ORDER BY ${visitDay ? "CASE WHEN b.visit_date = @visitDay THEN 0 ELSE 1 END, COALESCE(b.visit_order, 999)," : ''}
                 ${kind === 'draft' ? '(SELECT d.created_at FROM drafts d WHERE d.business_id = b.id) DESC,' : ''}
                 CASE ${KIND_SQL} WHEN 'redesign' THEN 0 WHEN 'no_site' THEN 1 WHEN 'unscanned' THEN 2 ELSE 3 END,
                 ${SCORE_SQL} DESC, b.name
        LIMIT @limit`,
    { ...params, limit },
  );

  let out = rows.map((r) => {
      let findings = { items: [], info: {} };
      try { if (r.findings) findings = JSON.parse(r.findings); } catch { /* bozuk kayıt: boş göster */ }
      // Seviye 2 doğrulaması varsa her bulguya işlenir: 'refuted' (yanlış alarm) olanlar müşteriye söylenmez
      let verification = {};
      try { if (r.verification) verification = JSON.parse(r.verification) ?? {}; } catch { /* bozuk kayıt */ }
      const items = (findings.items ?? []).map((f) => (verification[f.code] ? { ...f, verified: verification[f.code].status } : f));
      let draftQuality = null;
      try { if (r.draft_quality) draftQuality = JSON.parse(r.draft_quality); } catch { /* bozuk kayıt */ }
      let mismatch = null;
      try { if (r.site_mismatch) mismatch = JSON.parse(r.site_mismatch); } catch { /* bozuk kayıt */ }
      let lastVisit = null;
      try { if (r.last_visit) lastVisit = JSON.parse(r.last_visit); } catch { /* bozuk kayıt */ }
      // Haftalık açılış aralıkları (dakika); anlaşılmayan biçimde null → "saat bilinmiyor"
      const views = demoViews(r.draft_token);
      const row = { ...r, findings: items, tech: findings.info?.tech ?? null, last_visit: lastVisit, week: osmWeek(r.opening_hours),
        appointment: byAppointment(r.opening_hours), demo_views: views?.count ?? 0, demo_last_view: views?.last ?? null, site_mismatch: mismatch, draft_quality: draftQuality };
      delete row.verification; // ham JSON panele gitmesin; bilgi bulguların içinde
      return row;
  });
  // "Demo açıldı": en son açılan üstte
  if (kind === 'viewed') {
    out = out.filter((r) => r.demo_views > 0).sort((a, b) => String(b.demo_last_view).localeCompare(String(a.demo_last_view)));
    matched = out.length;
  }
  return { summary, breakdown, matched, rows: out };
}

// ── Satış hunisi + hatırlatmalar ─────────────────────────────

// Huni basamakları: her aday ulaştığı en ileri basamakta sayılır, basamak sayısı = o basamağa EN AZ ulaşanlar.
export const FUNNEL_STAGES = [
  { key: 'lead', label: 'Teklif verilebilir aday' },
  { key: 'planned', label: 'Ziyaret planlandı' },
  { key: 'visited', label: 'Görüşüldü' },
  { key: 'offer', label: 'Teklif aşaması' },
  { key: 'won', label: 'Kazanıldı' },
];
const CLOSED_STATUSES = ['won', 'lost', 'do_not_contact'];
// Saha kaydında "görüşüldü" sayılan sonuçlar (kapalıydı/tekrar gel sayılmaz)
const MET_OUTCOMES = ['talked', 'demo_shown', 'offer_requested', 'not_interested', 'won', 'demo_sent'];

const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysSince = (sqlUtc, now = Date.now()) => (sqlUtc ? Math.floor((now - Date.parse(sqlUtc.replace(' ', 'T') + 'Z')) / 86400000) : null);

export function funnelReport(db, { country, city, areaId, categories, minScore = 40 } = {}) {
  const region = regionWhere({ country, city, areaId, categories });
  const metList = MET_OUTCOMES.map((o) => `'${o}'`).join(',');
  // Kapsam: teklif verilebilir adaylar + üzerinde çalışılmış (durumu değişmiş ya da ziyaret kaydı olan) her işletme
  const rows = all(db, `SELECT b.id, b.status, b.visit_date, b.offer_setup, b.offer_monthly, b.offer_package, b.category, ${KIND_SQL} AS kind,
        EXISTS (SELECT 1 FROM visits v WHERE v.business_id = b.id AND v.outcome IN (${metList})) AS met,
        EXISTS (SELECT 1 FROM visits v WHERE v.business_id = b.id AND v.outcome = 'offer_requested') AS asked,
        EXISTS (SELECT 1 FROM visits v WHERE v.business_id = b.id AND v.outcome = 'demo_shown') AS demo_shown,
        (SELECT d.token FROM drafts d WHERE d.business_id = b.id) AS token
      ${FROM_SQL}
      WHERE ${region.where.join(' AND ')} AND (${KIND_SQL} IN ('no_site','redesign') OR b.status != 'new'
        OR EXISTS (SELECT 1 FROM visits v WHERE v.business_id = b.id))`, { ...region.params, minScore });

  const reach = [0, 0, 0, 0, 0];
  let lost = 0, dnc = 0, drafts = 0, viewed = 0, shown = 0;
  // Ciro: açık teklifler (henüz kazanılmamış/kaybedilmemiş) ve kazanılanlar; ilk yıl değeri = kurulum + 12 × aylık
  const money = { open: { n: 0, setup: 0, monthly: 0 }, won: { n: 0, setup: 0, monthly: 0 } };
  // Kazanma oranı: sektöre göre (görüşülenlerden kaçı kazanıldı) ve pakete göre (teklif verilenlerden kaçı kazanıldı)
  const sector = new Map();
  const pkg = new Map();
  for (const r of rows) {
    let s = 0;
    if (r.status === 'won') s = 4;
    else if (r.status === 'offer_sent' || r.asked) s = 3;
    else if (r.met || r.status === 'visited') s = 2;
    else if (r.status === 'visit_planned' || r.visit_date) s = 1;
    if (r.status === 'lost') { lost++; s = Math.max(s, r.met ? 2 : 0); }
    if (r.status === 'do_not_contact') dnc++;
    for (let i = 0; i <= s; i++) reach[i]++;
    if (r.token) { drafts++; if (demoViews(r.token)) viewed++; }
    if (r.demo_shown) shown++;
    const met = r.met || ['visited', 'offer_sent', 'won', 'lost'].includes(r.status);
    if (met) {
      const k = r.category || 'diger';
      const e = sector.get(k) ?? { category: k, met: 0, offers: 0, won: 0 };
      e.met++;
      if (r.offer_setup != null || r.status === 'offer_sent') e.offers++;
      if (r.status === 'won') e.won++;
      sector.set(k, e);
    }
    if (r.offer_package) {
      const e = pkg.get(r.offer_package) ?? { package: r.offer_package, offered: 0, won: 0 };
      e.offered++;
      if (r.status === 'won') e.won++;
      pkg.set(r.offer_package, e);
    }
    if (r.offer_setup !== null && r.offer_setup !== undefined) {
      const m = r.status === 'won' ? money.won : ['lost', 'do_not_contact'].includes(r.status) ? null : money.open;
      if (m) { m.n++; m.setup += r.offer_setup; m.monthly += r.offer_monthly ?? 0; }
    }
  }
  const stages = FUNNEL_STAGES.map((st, i) => ({ ...st, n: reach[i], rate: i && reach[i - 1] ? Math.round((reach[i] / reach[i - 1]) * 100) : null }));

  // Son 8 haftanın saha hareketi (aynı bölge süzgeciyle)
  const weeks = all(db, `SELECT strftime('%Y-%W', v.at, 'localtime') AS week, MIN(date(v.at, 'localtime')) AS first_day,
        COUNT(*) AS visits, SUM(v.outcome IN (${metList})) AS met, SUM(v.outcome = 'won') AS won
      FROM visits v JOIN businesses b ON b.id = v.business_id
      WHERE ${region.where.join(' AND ')} AND v.at >= datetime('now', '-56 days')
      GROUP BY 1 ORDER BY 1`, region.params);

  const rate = (a, b) => (b ? Math.round((a / b) * 100) : null);
  const winRates = {
    sectors: [...sector.values()].map((e) => ({ ...e, rate: rate(e.won, e.met) })).sort((a, b) => b.met - a.met),
    packages: [...pkg.values()].map((e) => ({ ...e, rate: rate(e.won, e.offered) })).sort((a, b) => b.offered - a.offered),
  };
  return { stages, side: { lost, dnc, drafts, viewed, shown }, money, winRates, weeks, reminders: reminders(db) };
}

/** Bugün yapılması gerekenler (tüm şehirler): kaçan ziyaret, sıcak demo, bekleyen teklif, sessiz kalan aday. */
export function reminders(db) {
  const today = localDay();
  const closed = CLOSED_STATUSES.map((s) => `'${s}'`).join(',');
  const rows = all(db, `SELECT b.id, b.name, b.city, b.phone, b.status, b.status_at, b.visit_date,
        (SELECT d.token FROM drafts d WHERE d.business_id = b.id) AS token,
        (SELECT json_object('outcome', v.outcome, 'at', v.at, 'next_at', v.next_at)
           FROM visits v WHERE v.business_id = b.id ORDER BY v.id DESC LIMIT 1) AS last_visit
      FROM businesses b
      WHERE b.status NOT IN (${closed}) AND (b.visit_date IS NOT NULL OR b.status IN ('visited','offer_sent')
        OR EXISTS (SELECT 1 FROM drafts d WHERE d.business_id = b.id)
        OR EXISTS (SELECT 1 FROM visits v WHERE v.business_id = b.id))`, {});

  const out = [];
  for (const r of rows) {
    let last = null;
    try { last = r.last_visit ? JSON.parse(r.last_visit) : null; } catch { /* bozuk kayıt */ }
    const lastDay = last ? localDay(new Date(last.at.replace(' ', 'T') + 'Z')) : null;
    const base = { id: r.id, name: r.name, city: r.city, phone: r.phone, status: r.status };
    const views = demoViews(r.token);
    // 1) Demo, son görüşmeden sonra açıldı → en sıcak aday
    if (views && (!last || views.last > new Date(last.at.replace(' ', 'T') + 'Z').toISOString())) {
      out.push({ ...base, type: 'hot_demo', prio: 0, at: views.last, count: views.count });
      continue;
    }
    // 2) Planlanan ziyaret tarihi geçti, o günden beri kayıt yok
    if (r.visit_date && r.visit_date < today && (!lastDay || lastDay < r.visit_date)) {
      out.push({ ...base, type: 'missed_visit', prio: 1, at: r.visit_date });
      continue;
    }
    // 3) Teklif istendi ama durum hâlâ "Teklif verildi" değil
    if (last?.outcome === 'offer_requested' && r.status !== 'offer_sent') {
      out.push({ ...base, type: 'offer_due', prio: 1, at: last.at, days: daysSince(last.at) });
      continue;
    }
    // 4) Teklif verildi, 7 gündür hareket yok
    if (r.status === 'offer_sent') {
      const since = Math.min(...[daysSince(r.status_at), daysSince(last?.at)].filter((d) => d !== null), 999);
      if (since >= 7) out.push({ ...base, type: 'offer_silent', prio: 2, at: r.status_at ?? last?.at ?? null, days: since === 999 ? null : since });
      continue;
    }
    // 5) Görüşüldü, sonraki adım yazılmadı ve 14 gündür hareket yok
    if (r.status === 'visited' && last && !last.next_at && !r.visit_date) {
      const d = daysSince(last.at);
      if (d >= 14) out.push({ ...base, type: 'stale', prio: 3, at: last.at, days: d });
    }
  }
  out.sort((a, b) => a.prio - b.prio || String(b.at).localeCompare(String(a.at)));
  const today_planned = all(db, 'SELECT COUNT(*) AS n FROM businesses WHERE visit_date = @today', { today })[0].n;
  return { today, today_planned, items: out.slice(0, 60), total: out.length };
}

/**
 * Bölgedeki iyi örnekler: aynı şehir + kategoride, sitesi taranmış ve sorun puanı en düşük (en iyi) işletmeler.
 * Görüşmede "sizin sektörde iyi bir site böyle görünüyor" diye gösterilir. Zincir şubeleri ve adayın kendisi hariç.
 */
// Geniş kategorilerde (zanaat, doktor, lokanta…) aynı meslekten örnek: adındaki meslek sözcüğüne göre
const TRADES = [
  /glas/i, /maler|lackier/i, /dach|bedach/i, /elektr/i, /sanit|heizung|klempner|install/i, /tischler|schreiner|holz/i,
  /fliese/i, /garten|landschaft/i, /schlüssel|schloss/i, /bau(?!m)|maurer/i, /metall|schlosser|stahl/i,
  /zahn|dental|kiefer|implant/i, /augen|optik/i, /haut|derma/i, /kinder|pädiat|paediat/i, /frauen|gyn/i, /ortho/i, /physio|therap|massage|krankengymn/i, /tier/i,
  /pizz/i, /döner|doner|kebab|grill/i, /sushi|asia|wok|thai|vietnam|china|japan/i, /café|cafe|kaffee|coffee|bistro/i, /eis/i, /burger/i, /steak/i, /griech|grill|taverna/i, /ital|trattoria|osteria/i, /bäck|backstube|konditor/i, /metzger|fleisch/i,
  /barber|herren/i, /kosmetik|beauty|nail|nagel/i, /friseur|hair|haar/i,
];
const tradeOf = (name) => TRADES.find((re) => re.test(String(name ?? ''))) ?? null;

export function goodExamples(db, id, limit = 3) {
  const biz = db.prepare('SELECT id, name, city, category, lat, lon FROM businesses WHERE id=?').get(id);
  if (!biz) return [];
  const rows = db.prepare(`SELECT b.id, b.name, b.suburb, b.lat, b.lon, s.final_url, ${SCORE_SQL} AS score
      FROM businesses b
      JOIN scans s ON s.id = (SELECT MAX(id) FROM scans WHERE business_id = b.id)
      LEFT JOIN profiles p ON p.business_id = b.id
      WHERE b.city = ? AND b.category = ? AND b.id != ? AND b.brand IS NULL AND s.ok = 1 AND s.final_url IS NOT NULL
        AND ${SCORE_SQL} IS NOT NULL AND ${SCORE_SQL} <= 15
        AND s.findings NOT LIKE '%"social_only"%' AND s.findings NOT LIKE '%"placeholder"%'
      ORDER BY ${SCORE_SQL} ASC, b.name LIMIT 30`).all(biz.city, biz.category, biz.id);
  // Eşit puanda yakın olan önce (aynı semtteki örnek daha ikna edici)
  const dist = (r) => (biz.lat !== null && r.lat !== null ? Math.hypot(biz.lat - r.lat, (biz.lon - r.lon) * 0.62) : 9);
  // Aynı meslekten örnek varsa yalnızca onlar; yoksa kategorinin en iyileri
  const trade = tradeOf(biz.name);
  const same = trade ? rows.filter((r) => trade.test(r.name)) : [];
  return (same.length ? same : rows)
    .sort((a, b) => a.score - b.score || dist(a) - dist(b))
    .slice(0, limit)
    .map((r) => ({ id: r.id, name: r.name, suburb: r.suburb, url: r.final_url, score: r.score, sameTrade: same.length > 0, km: dist(r) === 9 ? null : Math.round(dist(r) * 111 * 10) / 10 }));
}

/**
 * Yarının planı önerisi: o gün kapalı olmayan, henüz gidilmemiş, iyi puanlı ve birbirine yakın N aday.
 * Şehir verilmezse son 14 günde en çok ziyaret yapılan şehir (yoksa en çok adayı olan şehir) seçilir.
 * Önce demosunu açan (sıcak) adaylar, sonra en yüksek puanlıdan başlayıp yakın ve puanı yüksek olanlar eklenir (≤ 5 km).
 */
export function suggestDay(db, { date, n = 8, city, minScore = 40 } = {}) {
  const day = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
  const R = 6371;
  const km = (a, b) => {
    const dLat = ((b.lat - a.lat) * Math.PI) / 180, dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  if (!city) {
    city = all(db, `SELECT b.city, COUNT(*) AS n FROM visits v JOIN businesses b ON b.id = v.business_id
      WHERE v.at >= datetime('now', '-14 days') GROUP BY 1 ORDER BY 2 DESC LIMIT 1`, {})[0]?.city
      ?? all(db, `SELECT b.city, COUNT(*) AS n ${FROM_SQL} WHERE b.status = 'new' AND b.lat IS NOT NULL AND ${KIND_SQL} IN ('no_site','redesign')
        GROUP BY 1 ORDER BY 2 DESC LIMIT 1`, { minScore })[0]?.city;
  }
  if (!city) return { date, city: null, stops: [] };
  const openThatDay = (r) => {
    const week = osmWeek(r.opening_hours);
    return !week || (week[day] ?? []).length > 0;
  };
  const cands = all(db, `SELECT b.id, b.name, b.category, b.lat, b.lon, b.opening_hours, ${SCORE_SQL} AS score, ${KIND_SQL} AS kind
      ${FROM_SQL}
      WHERE b.city = @city AND b.status = 'new' AND b.visit_date IS NULL AND b.lat IS NOT NULL AND b.brand IS NULL
        AND ${KIND_SQL} IN ('no_site','redesign')`, { city, minScore })
    .filter(openThatDay)
    .map((r) => ({ ...r, score: r.kind === 'no_site' ? Math.max(r.score ?? 0, 60) : (r.score ?? 0) }));
  // Sıcak adaylar (demosunu son görüşmeden sonra açanlar), aynı şehirde ve konumu biliniyorsa önce
  const hotIds = new Set(reminders(db).items.filter((it) => it.type === 'hot_demo' && it.city === city).map((it) => it.id));
  const hot = hotIds.size
    ? all(db, `SELECT id, name, category, lat, lon, opening_hours FROM businesses WHERE id IN (${[...hotIds].join(',')}) AND lat IS NOT NULL AND visit_date IS NULL`, {})
      .filter(openThatDay).map((r) => ({ ...r, score: 100, kind: 'hot' }))
    : [];
  const chosen = [];
  const pool = [...hot, ...cands.sort((a, b) => b.score - a.score)];
  if (!pool.length) return { date, city, stops: [] };
  chosen.push(pool.shift());
  while (chosen.length < n && pool.length) {
    let best = -1, bestCost = Infinity;
    pool.forEach((c, i) => {
      const d = Math.min(...chosen.map((x) => km(x, c)));
      if (d > 5) return;
      const cost = d - c.score / 40 - (c.kind === 'hot' ? 5 : 0);
      if (cost < bestCost) { bestCost = cost; best = i; }
    });
    if (best < 0) break;
    chosen.push(pool.splice(best, 1)[0]);
  }
  return { date, city, stops: chosen.map((c) => ({ id: c.id, name: c.name, category: c.category, kind: c.kind, score: Math.round(c.score) })) };
}
