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
              b.status, b.notes, b.lat, b.lon, b.visit_date, b.visit_order,
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
const MET_OUTCOMES = ['talked', 'demo_shown', 'offer_requested', 'not_interested', 'won'];

const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysSince = (sqlUtc, now = Date.now()) => (sqlUtc ? Math.floor((now - Date.parse(sqlUtc.replace(' ', 'T') + 'Z')) / 86400000) : null);

export function funnelReport(db, { country, city, areaId, categories, minScore = 40 } = {}) {
  const region = regionWhere({ country, city, areaId, categories });
  const metList = MET_OUTCOMES.map((o) => `'${o}'`).join(',');
  // Kapsam: teklif verilebilir adaylar + üzerinde çalışılmış (durumu değişmiş ya da ziyaret kaydı olan) her işletme
  const rows = all(db, `SELECT b.id, b.status, b.visit_date, ${KIND_SQL} AS kind,
        EXISTS (SELECT 1 FROM visits v WHERE v.business_id = b.id AND v.outcome IN (${metList})) AS met,
        EXISTS (SELECT 1 FROM visits v WHERE v.business_id = b.id AND v.outcome = 'offer_requested') AS asked,
        EXISTS (SELECT 1 FROM visits v WHERE v.business_id = b.id AND v.outcome = 'demo_shown') AS demo_shown,
        (SELECT d.token FROM drafts d WHERE d.business_id = b.id) AS token
      ${FROM_SQL}
      WHERE ${region.where.join(' AND ')} AND (${KIND_SQL} IN ('no_site','redesign') OR b.status != 'new'
        OR EXISTS (SELECT 1 FROM visits v WHERE v.business_id = b.id))`, { ...region.params, minScore });

  const reach = [0, 0, 0, 0, 0];
  let lost = 0, dnc = 0, drafts = 0, viewed = 0, shown = 0;
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
  }
  const stages = FUNNEL_STAGES.map((st, i) => ({ ...st, n: reach[i], rate: i && reach[i - 1] ? Math.round((reach[i] / reach[i - 1]) * 100) : null }));

  // Son 8 haftanın saha hareketi (aynı bölge süzgeciyle)
  const weeks = all(db, `SELECT strftime('%Y-%W', v.at, 'localtime') AS week, MIN(date(v.at, 'localtime')) AS first_day,
        COUNT(*) AS visits, SUM(v.outcome IN (${metList})) AS met, SUM(v.outcome = 'won') AS won
      FROM visits v JOIN businesses b ON b.id = v.business_id
      WHERE ${region.where.join(' AND ')} AND v.at >= datetime('now', '-56 days')
      GROUP BY 1 ORDER BY 1`, region.params);

  return { stages, side: { lost, dnc, drafts, viewed, shown }, weeks, reminders: reminders(db) };
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
