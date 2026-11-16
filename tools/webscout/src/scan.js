// Tek bir web sitesini tek bir GET ile açar, bulguları çıkarır ve 0-100 arası "kötü site" puanı verir.
// Yüksek puan = daha çok sorun = daha iyi müşteri adayı.
// Bulgular teknik göstergedir; hukuki değerlendirme DEĞİLDİR.

const UA = process.env.WEBSCOUT_UA || 'WebScout/0.1 (website quality survey)';
const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 15_000;

const SOCIAL_HOST =
  /(^|\.)(facebook\.com|instagram\.com|linktr\.ee|tiktok\.com|twitter\.com|x\.com|youtube\.com|wa\.me|business\.site|google\.com|maps\.app\.goo\.gl)$/i;

const TRACKERS =
  /google-analytics\.com|googletagmanager\.com|gtag\(|connect\.facebook\.net|fbq\(|static\.hotjar\.com|snap\.licdn\.com/i;
const CONSENT_BANNERS =
  /cookiebot|usercentrics|borlabs|complianz|cookie-?consent|cookieconsent|onetrust|consentmanager|iubenda|real-cookie-banner|cookie-notice|cookiefirst|klaro|osano|cmplz|didomi|consent\.js|eRecht24/i;

function currentYear() {
  return new Date().getFullYear();
}

// Her kontrol: kod, puan, Almanca ve Türkçe açıklama, test fonksiyonu.
const CHECKS = [
  {
    code: 'no_https', pts: 25,
    de: 'Keine HTTPS-Verschlüsselung', tr: 'HTTPS yok',
    test: (c) => c.url.protocol === 'http:',
  },
  {
    code: 'no_viewport', pts: 25,
    de: 'Nicht für Smartphones optimiert (kein Viewport-Tag)', tr: 'Mobil uyumlu değil',
    test: (c) => !/<meta[^>]+name\s*=\s*["']viewport["']/i.test(c.html),
  },
  {
    code: 'no_impressum', pts: 15,
    de: 'Kein Impressum-Link gefunden', tr: 'Impressum bağlantısı bulunamadı',
    test: (c) => !/impressum|anbieterkennung|legal[- ]notice/i.test(c.html),
  },
  {
    code: 'no_datenschutz', pts: 10,
    de: 'Keine Datenschutzerklärung gefunden', tr: 'Datenschutz sayfası bulunamadı',
    test: (c) => !/datenschutz|privacy/i.test(c.html),
  },
  {
    code: 'google_fonts_extern', pts: 10,
    de: 'Google Fonts von externem Server geladen (Abmahn-Risiko)', tr: 'Google Fonts dışarıdan yükleniyor (Abmahnung riski)',
    test: (c) => /fonts\.(googleapis|gstatic)\.com/i.test(c.html),
  },
  {
    code: 'tracking_ohne_consent', pts: 10,
    de: 'Tracking ohne erkennbaren Cookie-Banner', tr: 'Çerez uyarısı olmadan izleme (tracking)',
    test: (c) => TRACKERS.test(c.html) && !CONSENT_BANNERS.test(c.html),
  },
  {
    code: 'table_layout', pts: 10,
    de: 'Veraltetes Tabellen-Layout', tr: 'Eski tablo tabanlı tasarım',
    test: (c) => {
      const tables = (c.lower.match(/<table\b/g) || []).length;
      const divs = (c.lower.match(/<div\b/g) || []).length;
      return tables >= 3 && divs < tables * 2;
    },
  },
  {
    code: 'legacy_markup', pts: 10,
    de: 'Veraltete HTML-Elemente oder Flash', tr: 'Eski HTML etiketleri veya Flash',
    test: (c) => {
      const old = (c.lower.match(/<(font|center)\b/g) || []).length;
      return old >= 5 || /<(marquee|blink|frameset|applet)\b/.test(c.lower) || /\.swf\b/.test(c.lower);
    },
  },
  {
    code: 'old_copyright', pts: 10,
    de: 'Veraltetes Copyright-Jahr', tr: 'Eski telif yılı',
    test: (c) => c.info.copyrightYear !== null && c.info.copyrightYear <= currentYear() - 3,
  },
  {
    code: 'old_jquery', pts: 5,
    de: 'Sehr alte jQuery-Version (1.x/2.x)', tr: 'Çok eski jQuery sürümü',
    test: (c) =>
      /jquery[-./]?(?:min[-.])?v?(?:1|2)\.\d+(?:\.\d+)?/i.test(c.html) ||
      /jquery[^"']*\?ver=(?:1|2)\.\d/i.test(c.html),
  },
  {
    code: 'slow', pts: 5,
    de: 'Sehr langsame Antwortzeit (> 4 s)', tr: 'Çok yavaş yanıt (> 4 sn)',
    test: (c) => c.ms > 4000,
  },
  {
    code: 'no_meta_description', pts: 5,
    de: 'Keine Meta-Beschreibung (schlecht für Google)', tr: 'Meta açıklaması yok (Google için kötü)',
    test: (c) => !/<meta[^>]+name\s*=\s*["']description["']/i.test(c.html),
  },
];

// Park edilmiş alan adı, "yapım aşamasında" ya da barındırıcının boş sayfası: fiilen site yok.
const PLACEHOLDER_STRONG =
  /domain (?:is )?not available|domain nicht verf(?:ü|&uuml;)gbar|data-i18n="?domain-only|sedoparking|parkingcrew|domain (?:steht|ist) zum verkauf|this domain (?:is|may be) for sale|diese domain (?:wurde|ist) (?:registriert|geparkt|reserviert)|hier entsteht (?:eine|in k(?:ü|&uuml;)rze)|domain (?:is now )?reserved|domain wurde soeben freigeschaltet|location\.href\s*=\s*["']\/lander|class="cm-offline-content"/i;
const PLACEHOLDER_WEAK =
  /in bearbeitung|im aufbau|under construction|comm?ing soon|(?:web)?seite ist derzeit nicht verf(?:ü|&uuml;)gbar|wartungsmodus|wartungsarbeiten|maintenance mode|tut uns leid|bald (?:wieder )?(?:verf(?:ü|&uuml;)gbar|online|erreichbar)|website (?:ist )?(?:nicht|derzeit nicht) erreichbar|wird (?:derzeit |gerade )?(?:ü|&uuml;)berarbeitet|erwartet sie bald|^\s*maintenance\s*$/i;

export function visibleText(html) {
  return html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Gövdesi boş sayfadaki <meta http-equiv="refresh"> hedefini döner (yoksa null). */
export function metaRefreshTarget(html, base) {
  const m = /<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["']?\s*\d+\s*;\s*url\s*=\s*([^"'>\s]+)/i.exec(html);
  if (!m) return null;
  try {
    return new URL(m[1], base).href;
  } catch {
    return null;
  }
}

export function detectPlaceholder(html) {
  if (PLACEHOLDER_STRONG.test(html)) return true;
  const text = visibleText(html);
  // Çerçeve (frameset/iframe) kullanan eski siteler boş görünür ama gerçektir: onları puanlamaya bırak
  if (text.length < 40 && !/<i?frame\b/i.test(html)) return true;
  // Zayıf ifadeler yalnızca sayfa neredeyse boşsa sayılır (gerçek sitede "im Aufbau" bir alt başlık olabilir)
  return text.length < 600 && PLACEHOLDER_WEAK.test(html.slice(0, 20000));
}

function detectTech(html) {
  const l = html.toLowerCase();
  if (l.includes('wixstatic.com') || l.includes('wix.com')) return 'Wix';
  if (l.includes('jimdo')) return 'Jimdo';
  if (l.includes('squarespace')) return 'Squarespace';
  if (l.includes('weebly')) return 'Weebly';
  if (l.includes('wp-content') || l.includes('wp-includes')) return 'WordPress';
  if (l.includes('typo3')) return 'TYPO3';
  if (l.includes('joomla')) return 'Joomla';
  if (l.includes('shopify')) return 'Shopify';
  return null;
}

function extractInfo(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const years = [
    ...html.matchAll(/(?:©|&copy;|&#169;|copyright)[^0-9]{0,20}(?:(?:19|20)\d{2}\s*[-–—]\s*)?((?:19|20)\d{2})/gi),
  ].map((m) => Number(m[1]));
  return {
    title,
    tech: detectTech(html),
    copyrightYear: years.length ? Math.max(...years) : null,
  };
}

function toFinding(check, note) {
  return { code: check.code, points: check.pts, de: check.de, tr: check.tr, ...(note ? { note } : {}) };
}

function special(code, points, de, tr, note) {
  return { code, points, de, tr, ...(note ? { note } : {}) };
}

export function analyzeHtml(html, url, ms) {
  const ctx = { html, lower: html.toLowerCase(), url, ms, info: extractInfo(html) };
  const items = CHECKS.filter((c) => c.test(ctx)).map((c) => toFinding(c));
  const score = Math.min(100, items.reduce((s, f) => s + f.points, 0));
  return { score, items, info: ctx.info };
}

function classifyError(e) {
  const code = e?.cause?.code || e?.code || '';
  const msg = `${e?.cause?.message ?? ''} ${e?.message ?? ''}`;
  if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY|HOSTNAME_MISMATCH/i.test(code) || /certificate/i.test(msg)) return 'cert';
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return 'timeout';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns';
  return 'network';
}

async function readCapped(res) {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  reader.cancel().catch(() => {});
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  const ct = res.headers.get('content-type') || '';
  // Karakter kümesi: önce HTTP başlığı, sonra <meta charset>; ikisi de yoksa UTF-8 dene,
  // geçersizse windows-1252 (eski Alman sitelerinde başlıksız ISO-8859-1 çok yaygın: "Gastst�tte" olmasın)
  const charset = (/charset=([\w-]+)/i.exec(ct)?.[1] ?? /<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i.exec(buf.subarray(0, 4096).toString('latin1'))?.[1])?.toLowerCase();
  try {
    if (charset && charset !== 'utf8' && charset !== 'utf-8') return new TextDecoder(charset).decode(buf);
  } catch { /* bilinmeyen karakter kümesi adı: aşağıdaki sezgiye düş */ }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

export async function get(url) {
  const t0 = Date.now();
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': UA,
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'de-DE,de;q=0.9',
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const html = await readCapped(res);
  return { res, html, ms: Date.now() - t0 };
}

/**
 * @returns {{ok:boolean, error?:string, finalUrl?:string, status?:number, ms?:number, score:number|null, findings:object}}
 */
export async function scanSite(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: 'invalid_url', score: null, findings: { items: [], info: {} } };
  }

  // Sadece sosyal medya / Google sayfası varsa: gerçek bir web sitesi yok
  if (SOCIAL_HOST.test(url.hostname)) {
    return {
      ok: true, finalUrl: url.href, score: 60,
      findings: {
        items: [special('social_only', 60, 'Nur Social-Media-/Google-Profil statt eigener Website', 'Kendi sitesi yok, sadece sosyal medya/Google profili')],
        info: {},
      },
    };
  }

  const candidates = [url.href];
  if (url.protocol === 'https:') candidates.push(url.href.replace(/^https:/i, 'http:'));

  let lastKind = 'network';
  for (const candidate of candidates) {
    try {
      let { res, html, ms } = await get(candidate);
      // Boş gövde + meta refresh: asıl sayfa yönlendirilen adreste (en çok 2 adım izle)
      for (let hop = 0; hop < 2 && res.status < 400 && visibleText(html).length < 40; hop++) {
        const target = metaRefreshTarget(html, res.url || candidate);
        if (!target || target === res.url) break;
        const next = await get(target);
        res = next.res; html = next.html; ms += next.ms;
      }
      const status = res.status;
      const finalUrl = new URL(res.url || candidate);
      const ctype = res.headers.get('content-type') || '';

      // Bot engelleme / izin yok: bilmiyoruz, puan verme
      if (status === 401 || status === 403 || status === 429) {
        return { ok: false, error: `blocked_${status}`, finalUrl: finalUrl.href, status, ms, score: null, findings: { items: [], info: {} } };
      }
      if (status >= 400) {
        return {
          ok: true, finalUrl: finalUrl.href, status, ms, score: 30,
          findings: {
            items: [special('http_error', 30, `Website liefert Fehler (HTTP ${status})`, `Site hata veriyor (HTTP ${status}) – elle kontrol et`)],
            info: {},
          },
        };
      }
      if (!/html|xml/i.test(ctype) && html.trimStart().slice(0, 1) !== '<') {
        return { ok: false, error: 'not_html', finalUrl: finalUrl.href, status, ms, score: null, findings: { items: [], info: {} } };
      }
      // Boş gövde + JavaScript yönlendirmesi: tek istekle içeriği göremeyiz, puan verme
      if (visibleText(html).length < 40 && /location(?:\.href)?\s*=|location\.replace\(/i.test(html) && !PLACEHOLDER_STRONG.test(html)) {
        return { ok: false, error: 'js_redirect', finalUrl: finalUrl.href, status, ms, score: null, findings: { items: [], info: {} } };
      }
      if (detectPlaceholder(html)) {
        return {
          ok: true, finalUrl: finalUrl.href, status, ms, score: 70,
          findings: {
            items: [special('placeholder', 70, 'Website nicht in Betrieb (Platzhalter- oder Parkseite)', 'Site yayında değil (park edilmiş / yapım aşamasında sayfası)')],
            info: {},
          },
        };
      }
      const { score, items, info } = analyzeHtml(html, finalUrl, ms);
      return { ok: true, finalUrl: finalUrl.href, status, ms, score, findings: { items, info } };
    } catch (e) {
      lastKind = classifyError(e);
      if (lastKind === 'cert') {
        return {
          ok: true, finalUrl: candidate, score: 40,
          findings: {
            items: [special('cert_invalid', 40, 'Ungültiges oder abgelaufenes SSL-Zertifikat', 'Geçersiz veya süresi dolmuş SSL sertifikası')],
            info: {},
          },
        };
      }
      // https açılmadıysa sıradaki aday (http) denenir
    }
  }

  return {
    ok: true, finalUrl: url.href, score: 30,
    findings: {
      items: [special('unreachable', 30, 'Website nicht erreichbar', 'Site açılmıyor – elle kontrol et', lastKind)],
      info: {},
    },
  };
}
