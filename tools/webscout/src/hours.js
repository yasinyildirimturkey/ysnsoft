// OSM opening_hours → gün gün dakika aralıkları (ziyaret rotası için).
// Yalnızca sık görülen yalın biçimler anlaşılır ("Mo-Fr 09:00-18:00; Sa 10:00-14:00; Su off").
// Anlaşılmayan kural varsa null döner: yanlış "kapalı" demektense "saat bilinmiyor" demek daha güvenlidir.

const DAY_KEYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const DAYS_RE = String.raw`(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)(?:\s*[-,]\s*(?:Mo|Tu|We|Th|Fr|Sa|Su|PH))*`;

function days(spec) {
  const out = new Set();
  for (const part of spec.replace(/\s+/g, '').split(',')) {
    const [a, b] = part.split('-');
    if (a === 'PH') continue; // resmi tatil kuralı: gün planına etkisi yok
    const i = DAY_KEYS.indexOf(a);
    if (i < 0) return null;
    if (!b) { out.add(i); continue; }
    const j = DAY_KEYS.indexOf(b);
    if (j < 0) return null;
    for (let k = i; ; k = (k + 1) % 7) { out.add(k); if (k === j) break; }
  }
  return [...out];
}

const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/**
 * @param {string|null} value  OSM opening_hours
 * @returns {(number[][]|null)[] | null}  7 gün (Pazartesi=0); her gün [[başlangıç, bitiş], …] dakika,
 *   [] = kapalı, null = o gün için bilgi yok. Tümü anlaşılmazsa null.
 */
export function osmWeek(value) {
  const v = String(value ?? '').trim();
  if (!v) return null;
  if (v === '24/7') return Array.from({ length: 7 }, () => [[0, 1440]]);
  const week = Array(7).fill(null);
  for (const rule of v.split(';').map((r) => r.trim()).filter(Boolean)) {
    // "Mo-Fr 08:00-12:00, Mo-Th 13:00-17:00": virgülden sonraki kural OSM'de ektir, öncekinin üzerine yazmaz
    // Yalnızca bir saat ya da "off" sonrasındaki virgül böler; "Mo,We-Su 11:30-21:00" gün listesidir
    for (const [n, p] of rule.split(new RegExp(String.raw`(?<=\d|off|closed),\s*(?=${DAYS_RE}\s)`)).entries()) {
      const m = new RegExp(String.raw`^(${DAYS_RE})\s+(.+)$`).exec(p.trim());
      const ds = m ? days(m[1]) : [0, 1, 2, 3, 4, 5, 6];
      const time = (m ? m[2] : p).trim();
      if (!ds) return null;
      let ranges;
      if (/^(off|closed)$/i.test(time)) ranges = [];
      else if (/^\d\d:\d\d(-\d\d:\d\d)?\+?(\s*,\s*\d\d:\d\d(-\d\d:\d\d)?\+?)*$/.test(time)) {
        ranges = time.split(',').map((r) => {
          const [a, b] = r.trim().replace(/\+$/, '').split('-').map(mins);
          // "18:00+" açık uçlu: gece yarısına kadar say. "18:00-02:00" gece yarısını aşar.
          if (b === undefined) return [a, 1440];
          return [a, b <= a ? b + 1440 : b];
        });
      } else return null;
      for (const d of ds) week[d] = n > 0 && ranges.length && week[d]?.length ? [...week[d], ...ranges].sort((a, b) => a[0] - b[0]) : ranges;
    }
  }
  if (week.every((d) => d === null)) return null;
  // Kural koyan sette adı geçmeyen günler OSM'de kapalı sayılır
  return week.map((d) => d ?? []);
}

/** "nach Vereinbarung" / "by appointment": sabit saat yok, önceden aranmalı. */
export const byAppointment = (value) => /vereinbarung|appointment|termin/i.test(String(value ?? ''));
