import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT_DIR } from './db.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function loadLeads(db, { minScore = 0, city, category } = {}) {
  const where = ['s.score IS NOT NULL', 's.score >= ?', "b.status != 'do_not_contact'"];
  const params = [minScore];
  if (city) { where.push('b.city = ?'); params.push(city); }
  if (category) { where.push('b.category = ?'); params.push(category); }
  const rows = db
    .prepare(
      `SELECT b.id, b.name, b.category, b.city, b.address, b.website, b.phone, b.status, b.notes,
              s.score, s.findings, s.final_url, s.scanned_at
         FROM businesses b
         JOIN scans s ON s.id = (SELECT MAX(id) FROM scans WHERE business_id = b.id)
        WHERE ${where.join(' AND ')}
        ORDER BY s.score DESC, b.name`,
    )
    .all(...params);
  return rows.map((r) => ({ ...r, findings: JSON.parse(r.findings || '{"items":[],"info":{}}') }));
}

export function summary(db) {
  return db
    .prepare(
      `SELECT b.city, b.category,
              COUNT(*) AS total,
              SUM(b.website IS NOT NULL) AS with_site,
              SUM(s.id IS NOT NULL) AS scanned,
              ROUND(AVG(s.score), 1) AS avg_score,
              SUM(s.score >= 50) AS bad_sites
         FROM businesses b
         LEFT JOIN scans s ON s.id = (SELECT MAX(id) FROM scans WHERE business_id = b.id)
        GROUP BY b.city, b.category
        ORDER BY b.city, b.category`,
    )
    .all();
}

function scoreClass(score) {
  if (score >= 70) return 'hi';
  if (score >= 45) return 'mid';
  return 'lo';
}

function renderHtml(leads, sums, opts) {
  const generated = new Date().toLocaleString('de-DE');
  const sumRows = sums
    .map(
      (r) =>
        `<tr><td>${esc(r.city)}</td><td>${esc(r.category)}</td><td>${r.total}</td><td>${r.with_site}</td><td>${r.scanned}</td><td>${r.avg_score ?? '–'}</td><td>${r.bad_sites ?? 0}</td></tr>`,
    )
    .join('');
  const rows = leads
    .map((l) => {
      const chips = l.findings.items
        .map((f) => `<span class="chip" title="${esc(f.tr)}">${esc(f.de)} <b>+${f.points}</b></span>`)
        .join('');
      const tech = l.findings.info?.tech ? ` · ${esc(l.findings.info.tech)}` : '';
      return `<tr data-city="${esc(l.city)}" data-cat="${esc(l.category)}">
  <td><span class="score ${scoreClass(l.score)}">${l.score}</span></td>
  <td><b>${esc(l.name)}</b><br><small>${esc(l.category)} · ${esc(l.city)}${tech}</small></td>
  <td><a href="${esc(l.final_url || l.website)}" target="_blank" rel="noopener noreferrer">${esc(l.website)}</a></td>
  <td>${esc(l.address)}<br><small>${esc(l.phone ?? '')}</small></td>
  <td>${chips || '<small>–</small>'}</td>
  <td><small>#${l.id} · ${esc(l.status)}</small></td>
</tr>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>WebScout – Müşteri adayları</title>
<style>
  :root { --bg:#fff; --fg:#1b1f24; --muted:#667085; --line:#e4e7ec; --hi:#c0392b; --mid:#d98a00; --lo:#2e7d32; --chip:#f2f4f7; }
  @media (prefers-color-scheme: dark) { :root { --bg:#14181d; --fg:#e7eaee; --muted:#98a2b3; --line:#2b323b; --chip:#222932; } }
  body { margin:0; padding:24px 16px; background:var(--bg); color:var(--fg); font:14px/1.45 system-ui, sans-serif; }
  h1 { font-size:20px; margin:0 0 4px; } .meta { color:var(--muted); margin-bottom:20px; }
  table { border-collapse:collapse; width:100%; } th,td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--muted); font-weight:600; font-size:12px; text-transform:uppercase; }
  .wrap { overflow-x:auto; margin-bottom:28px; }
  .score { display:inline-block; min-width:34px; text-align:center; padding:3px 6px; border-radius:6px; color:#fff; font-weight:700; }
  .score.hi { background:var(--hi); } .score.mid { background:var(--mid); } .score.lo { background:var(--lo); }
  .chip { display:inline-block; background:var(--chip); border-radius:999px; padding:2px 8px; margin:0 4px 4px 0; font-size:12px; }
  small { color:var(--muted); } a { color:inherit; }
  .note { max-width:70ch; color:var(--muted); font-size:12px; margin-top:20px; }
</style></head><body>
<h1>WebScout – Müşteri adayları</h1>
<div class="meta">${leads.length} işletme · min. puan ${opts.minScore} · oluşturuldu ${esc(generated)}</div>
<div class="wrap"><table>
<thead><tr><th>Şehir</th><th>Kategori</th><th>İşletme</th><th>Siteli</th><th>Taranan</th><th>Ort. puan</th><th>Puan ≥ 50</th></tr></thead>
<tbody>${sumRows}</tbody></table></div>
<div class="wrap"><table>
<thead><tr><th>Puan</th><th>İşletme</th><th>Website</th><th>Adres / Telefon</th><th>Bulgular</th><th>Durum</th></tr></thead>
<tbody>
${rows}
</tbody></table></div>
<p class="note">Puan = otomatik teknik göstergeler (yüksek = daha çok sorun). Bunlar hukuki değerlendirme değildir; özellikle Impressum, Datenschutz ve tracking bulguları bir avukat görüşünün yerini tutmaz. Müşteriye "hukuka aykırı" demeden, yalnızca "kontrol edilmeli" diye sun.</p>
</body></html>`;
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function writeReports(db, { minScore = 0, city, category, outDir = OUT_DIR } = {}) {
  mkdirSync(outDir, { recursive: true });
  const leads = loadLeads(db, { minScore, city, category });
  const sums = summary(db);

  const htmlPath = join(outDir, 'report.html');
  writeFileSync(htmlPath, renderHtml(leads, sums, { minScore }), 'utf8');

  const header = ['id', 'puan', 'isim', 'kategori', 'sehir', 'website', 'adres', 'telefon', 'durum', 'bulgular'];
  const lines = [header.join(';')];
  for (const l of leads) {
    lines.push(
      [l.id, l.score, l.name, l.category, l.city, l.website, l.address, l.phone, l.status, l.findings.items.map((f) => f.de).join(' | ')]
        .map(csvCell)
        .join(';'),
    );
  }
  const csvPath = join(outDir, 'leads.csv');
  writeFileSync(csvPath, '﻿' + lines.join('\r\n'), 'utf8'); // BOM: Excel Türkçe/Almanca karakterleri doğru açsın

  return { htmlPath, csvPath, count: leads.length };
}
