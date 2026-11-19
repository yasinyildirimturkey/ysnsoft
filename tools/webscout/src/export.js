// Kazanılan demodan YAYIN PAKETİ (zip) üretir: data/exports/<id>-<ad>.zip
//
// Taslağa özgü her şey çıkarılır (Entwurf bandı, noindex, "Beispielfoto" etiketleri, Vorher/Nachher satış bölümü,
// çalışmayan formlar ve "Im Entwurf nicht aktiv" notları). Formların yerine telefonla arama düğmesi konur: formun
// hangi adrese/sisteme bağlanacağı müşteriyle karar verilecek bir konudur. Impressum ve Datenschutz Almanya'da zorunludur;
// pakette doldurulması gereken alanları açıkça işaretlenmiş taslak sayfalar olarak gelir ve kontrol listesi bunu yazar.
// Hiçbir hukuki metin "hazır/uygun" diye sunulmaz: içerik müşteriyle ve gerekirse bir uzmanla kontrol edilmelidir.
import { deflateRawSync, crc32 } from 'node:zlib';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from './db.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Basit zip yazıcı (deflate). Dosya adları ASCII. */
function zip(files) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const comp = deflateRawSync(data);
    const crc = crc32(data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8);
    h.writeUInt32LE(0, 10); h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(nameBuf.length, 26); h.writeUInt16LE(0, 28);
    local.push(h, nameBuf, comp);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt32LE(0, 12); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(nameBuf.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, nameBuf);
    offset += h.length + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, cd, end]);
}

/** Taslak HTML'ini yayın sürümüne çevirir; ne yapıldığını ve elde kalan işleri döner. */
export function toLiveHtml(html, { token, name, phone }) {
  const notes = [];
  let h = html;
  const before = h.length;
  h = h.replace(/<meta name="robots"[^>]*>\s*/i, '');
  h = h.replace(/(<title>[^<]*?)\s*\(Entwurf\)(<\/title>)/i, '$1$2');
  h = h.replace(/<div class="draft">[\s\S]*?<\/div>\s*/i, '');
  h = h.split(`/demo/${token}/a/`).join('');
  const stock = (h.match(/<span class="tag[^"]*">Beispielfoto<\/span>/g) ?? []).length;
  h = h.replace(/<span class="tag[^"]*">Beispielfoto<\/span>/g, '');
  if (stock) notes.push(`${stock} örnek (stok) fotoğraf kullanılıyor: müşterinin kendi fotoğraflarıyla değiştirilmesi önerilir.`);
  h = h.replace(/<section id="vorher-nachher"[\s\S]*?<\/section>\s*/i, '');
  h = h.replace(/<a[^>]*href="#vorher-nachher"[^>]*>[\s\S]*?<\/a>/gi, '');
  // Formlar: gönderilecek yer henüz belli değil → telefon düğmesi
  const tel = phone ? `tel:${String(phone).replace(/[^+\d]/g, '')}` : '';
  const call = tel ? `<div class="book-form"><a class="btn" href="${esc(tel)}"><span>Jetzt anrufen</span></a></div>` : '';
  const forms = (h.match(/<form\b/gi) ?? []).length;
  h = h.replace(/<form class="book-form"[\s\S]*?<\/form>/i, call);
  // Yalnız "Nachricht schreiben" paneli (başlık etiketi içinde kalınır; önceki paneller — saatler, adres — korunur)
  h = h.replace(/<div class="panel reveal">\s*<h3>(?:(?!<\/h3>)[\s\S])*?Nachricht schreiben<\/h3>\s*<form class="msg"[\s\S]*?<\/form>\s*<\/div>/i, '');
  h = h.replace(/<p class="demo-note">[\s\S]*?<\/p>/gi, '');
  if (forms) notes.push(`${forms} form çıkarıldı (taslakta çalışmıyordu); yerine ${tel ? 'telefon düğmesi' : 'hiçbir şey'} kondu. Form isteniyorsa nereye gideceği (e-posta / takvim) müşteriyle kararlaştırılmalı.`);
  h = h.replace('Impressum und Datenschutz folgen in der fertigen Website', '<a href="impressum.html">Impressum</a> · <a href="datenschutz.html">Datenschutz</a>');
  h = h.replace('Entwurf: YSNSOFT', 'Webdesign: YSNSOFT');
  // Taslaktaki "burada ... olacak" ipuçları yayında görünmez; ilgili iş kontrol listesine yazılır
  if (/<p class="note">Hier stehen in der fertigen Website[^<]*<\/p>/i.test(h)) {
    h = h.replace(/<p class="note">Hier stehen in der fertigen Website[^<]*<\/p>/gi, '');
    notes.push('Açılış saatleri bilinmiyor (sayfada "telefonla öğrenin" yazıyor): müşteriden alıp eklenmeli.');
  }
  const body = h.replace(/<style[\s\S]*?<\/style>/gi, '');
  if (/Entwurf|demo-note|noindex/i.test(body)) notes.push('Sayfada hâlâ "Entwurf"/taslak izi olabilir: yayından önce sayfayı baştan sona kontrol edin.');
  if (/Hier stehen in der fertigen Website|Platzhalter|Hier stellen Sie/i.test(body)) notes.push('Sayfada yer tutucu metin var (ör. açılış saatleri / tanıtım): gerçek bilgilerle doldurulmalı.');
  return { html: h, notes, changed: before !== h.length, name };
}

const legalPage = (title, name, body) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} – ${esc(name)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:46em;margin:0 auto;padding:32px 20px;line-height:1.6;color:#1d1d1f}mark{background:#fff3b0;padding:0 .2em}a{color:#0071e3}</style></head>
<body><p><a href="index.html">← Zurück</a></p><h1>${esc(title)}</h1>${body}</body></html>`;

function impressum(name, address, phone) {
  return legalPage('Impressum', name, `
<p><mark>[BITTE AUSFÜLLEN UND PRÜFEN LASSEN – Angaben gemäß § 5 DDG]</mark></p>
<p>${esc(name)}<br><mark>[Inhaber/in bzw. Vertretungsberechtigte/r]</mark><br>${esc(address || '[Straße, PLZ Ort]')}</p>
<p>Telefon: ${esc(phone || '[Telefon]')}<br>E-Mail: <mark>[E-Mail]</mark></p>
<p><mark>[ggf. Registergericht und -nummer, USt-IdNr., Berufsbezeichnung/Kammer]</mark></p>`);
}

function datenschutz(name) {
  return legalPage('Datenschutzerklärung', name, `
<p><mark>[BITTE ERSTELLEN UND PRÜFEN LASSEN]</mark> Diese Seite ist ein Platzhalter. Die Datenschutzerklärung muss zu den
tatsächlich eingesetzten Diensten passen (Hosting, Kontaktwege, Karten, ggf. Formulare) und vor der Veröffentlichung geprüft werden.</p>
<p>Hinweis zur Karte: Die Kartenausschnitte sind lokal gespeicherte Bilder aus OpenStreetMap (© OpenStreetMap-Mitwirkende); beim Aufruf
der Seite werden keine Daten an OpenStreetMap übertragen.</p>`);
}

function checklist(name, notes, files) {
  return [
    `YAYIN PAKETİ — ${name}`,
    `Oluşturma: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    '',
    'İçerik:',
    ...files.map((f) => `  - ${f}`),
    '',
    'YAYINDAN ÖNCE (hepsi kontrol edilmeli):',
    '  [ ] Alan adı ve barındırma kararlaştırıldı; dosyalar sunucuya yüklendi (statik site, sunucu kodu gerekmez).',
    '  [ ] impressum.html — işaretli alanlar dolduruldu ve kontrol edildi (Almanya\'da zorunlu; hukuki değerlendirme değildir).',
    '  [ ] datenschutz.html — kullanılan hizmetlere göre yazıldı ve kontrol edildi.',
    '  [ ] Açılış saatleri, adres, telefon müşteriyle doğrulandı (OpenStreetMap verisi eksik/eski olabilir).',
    '  [ ] Metinler müşteriyle birlikte okundu ve onaylandı.',
    '  [ ] Arama motorları için: sayfa artık noindex DEĞİL; yayına alınca Google\'da görünür.',
    ...notes.map((n) => `  [ ] ${n}`),
    '',
    'Harita görselleri OpenStreetMap\'tendir: sayfadaki "© OpenStreetMap-Mitwirkende" atfı kaldırılmamalıdır.',
  ].join('\r\n');
}

/** id'li işletmenin taslağından yayın paketi üretir. */
export function exportSite(db, id) {
  const biz = db.prepare('SELECT id, name, address, postcode, city, phone FROM businesses WHERE id=?').get(id);
  if (!biz) throw new Error(`#${id} bulunamadı`);
  const d = db.prepare('SELECT token FROM drafts WHERE business_id=?').get(id);
  if (!d?.token) throw new Error('Bu adayın taslağı yok; önce taslak üretin.');
  const dir = join(DATA_DIR, 'drafts', d.token);
  if (!existsSync(join(dir, 'index.html'))) throw new Error('Taslak dosyası bulunamadı; taslağı yeniden üretin.');
  const live = toLiveHtml(readFileSync(join(dir, 'index.html'), 'utf8'), { token: d.token, name: biz.name, phone: biz.phone });
  const assets = readdirSync(dir).filter((f) => /^(logo|foto[1-9]|karte[1-9])\.(jpg|png|gif|webp)$/.test(f) && live.html.includes(f));
  const big = assets.filter((f) => statSync(join(dir, f)).size > 800_000);
  if (big.length) live.notes.push(`${big.length} görsel 800 KB'tan büyük (${big.join(', ')}): yayından önce sıkıştırılması (ör. WebP/JPG, ~200 KB) sayfayı hızlandırır.`);
  const address = [biz.address, [biz.postcode, biz.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const files = [
    { name: 'index.html', data: Buffer.from(live.html, 'utf8') },
    ...assets.map((f) => ({ name: f, data: readFileSync(join(dir, f)) })),
    { name: 'impressum.html', data: Buffer.from(impressum(biz.name, address, biz.phone), 'utf8') },
    { name: 'datenschutz.html', data: Buffer.from(datenschutz(biz.name), 'utf8') },
  ];
  const list = files.map((f) => f.name);
  files.push({ name: 'YAYIN-KONTROL-LISTESI.txt', data: Buffer.from(checklist(biz.name, live.notes, list), 'utf8') });
  const out = join(DATA_DIR, 'exports');
  mkdirSync(out, { recursive: true });
  const slug = biz.name.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'site';
  const file = join(out, `${id}-${slug}.zip`);
  writeFileSync(file, zip(files));
  return { file, name: `${id}-${slug}.zip`, files: files.length, notes: live.notes };
}
