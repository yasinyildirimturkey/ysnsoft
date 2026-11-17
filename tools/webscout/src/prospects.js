// Yönetim panelinin "Müşteri Adayları" (prospects) ekranı için sorgular.
import { byAppointment, osmWeek } from './hours.js';
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

export function queryProspects(db, { country, city, areaId, categories, kind, status, q, visitDay, minScore = 40, limit = 500 } = {}) {
  const region = regionWhere({ country, city, areaId, categories });

  // Özet: bölge + kategori seçimine göre (tür/durum/arama süzgeçlerinden bağımsız)
  const counts = all(db, `SELECT ${KIND_SQL} AS kind, COUNT(*) AS n ${FROM_SQL} WHERE ${region.where.join(' AND ')} GROUP BY 1`, { ...region.params, minScore });
  const summary = { total: 0, no_site: 0, redesign: 0, unscanned: 0, ok: 0, chain: 0, drafts: 0 };
  for (const c of counts) { summary[c.kind] = c.n; summary.total += c.n; }
  summary.drafts = all(db, `SELECT COUNT(*) AS n ${FROM_SQL} WHERE ${region.where.join(' AND ')} AND ${HAS_DRAFT_SQL}`, region.params)[0].n;

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
  else if (kind === 'draft') where.push(HAS_DRAFT_SQL);
  else if (kind && kind !== 'all') { where.push(`${KIND_SQL} = @kind`); params.kind = kind; }
  if (status) { where.push('b.status = @status'); params.status = status; }
  else if (!visitDay) where.push("b.status != 'do_not_contact'");
  // Saha listesi: o güne planlananlar + o gün ziyaret kaydı girilenler (ertelenen de listede kalır)
  if (visitDay) {
    where.push("(b.visit_date = @visitDay OR EXISTS (SELECT 1 FROM visits v WHERE v.business_id = b.id AND date(v.at, 'localtime') = @visitDay))");
    params.visitDay = visitDay;
  }
  if (q) {
    where.push("(b.name LIKE @q ESCAPE '\\' OR b.address LIKE @q ESCAPE '\\' OR b.website LIKE @q ESCAPE '\\')");
    params.q = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
  }

  const matched = all(db, `SELECT COUNT(*) AS n ${FROM_SQL} WHERE ${where.join(' AND ')}`, params)[0].n;
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
              (SELECT d.token FROM drafts d WHERE d.business_id = b.id) AS draft_token,
              (SELECT d.expires_at FROM drafts d WHERE d.business_id = b.id) AS draft_expires,
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

  return {
    summary,
    breakdown,
    matched,
    rows: rows.map((r) => {
      let findings = { items: [], info: {} };
      try { if (r.findings) findings = JSON.parse(r.findings); } catch { /* bozuk kayıt: boş göster */ }
      // Seviye 2 doğrulaması varsa her bulguya işlenir: 'refuted' (yanlış alarm) olanlar müşteriye söylenmez
      let verification = {};
      try { if (r.verification) verification = JSON.parse(r.verification) ?? {}; } catch { /* bozuk kayıt */ }
      const items = (findings.items ?? []).map((f) => (verification[f.code] ? { ...f, verified: verification[f.code].status } : f));
      let lastVisit = null;
      try { if (r.last_visit) lastVisit = JSON.parse(r.last_visit); } catch { /* bozuk kayıt */ }
      // Haftalık açılış aralıkları (dakika); anlaşılmayan biçimde null → "saat bilinmiyor"
      const row = { ...r, findings: items, tech: findings.info?.tech ?? null, last_visit: lastVisit, week: osmWeek(r.opening_hours),
        appointment: byAppointment(r.opening_hours) };
      delete row.verification; // ham JSON panele gitmesin; bilgi bulguların içinde
      return row;
    }),
  };
}
