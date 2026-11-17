// İşletmenin kayıtlı web adresi gerçekten ONA mı ait?
// OSM'deki adres bazen başka bir firmaya yönlenir (devralma, satılmış alan adı, yanlış kayıt). Örnek: "Busch
// Bauelemente" → gehlings.com; sitede "Busch" hiç geçmiyor. Böyle bir sitenin taslağı başka firmanın logosu,
// metni ve adresiyle çıkar — müşteriye gösterilemez. Kural bilerek temkinli: yalnızca BAŞKA bir alan adına
// yönlenen ve işletme adının ayırt edici sözcüklerinden hiçbirini içermeyen siteler işaretlenir.

// Ad içinde ayırt edici olmayan sözcükler (tür, hukuki biçim, unvan, bağlaç)
const GENERIC = new Set(`gmbh mbh ug kg ohg gbr ag co e.k ek inh inhaber und the der die das des den dem fur für von am an im in zum zur bei
praxis zahnarztpraxis zahnarzt zahnärzte zahnaerzte zahnmedizin arzt ärzte aerzte arztpraxis dr med dent dipl ing
restaurant gaststätte gaststaette cafe café bistro imbiss grill pizzeria bar hotel pension bäckerei baeckerei konditorei metzgerei
friseur friseursalon salon studio hair haar beauty kosmetik barber barbershop
tischlerei schreinerei glaserei malerbetrieb maler dachdecker bedachungen elektro sanitär sanitaer heizung bau bauelemente
meisterbetrieb fachbetrieb service team haus werkstatt autohaus kfz duisburg essen düsseldorf duesseldorf`.split(/\s+/));

const fold = (s) => String(s ?? '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** İşletme adının ayırt edici sözcükleri (en az 4 harf, genel olmayan). */
export function nameTokens(name) {
  return [...new Set(String(name ?? '').split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 4 && !GENERIC.has(w.toLowerCase()))
    .map(fold))];
}

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
// Kayıtlı alan adı kökü: "shop.firma.de" → "firma.de" (iki parçalı Almanya/AB alan adları için yeterli)
const rootOf = (h) => h.split('.').slice(-2).join('.');

/**
 * @param {{name: string, website?: string|null}} biz
 * @param {object} site  Seviye 2 profilindeki site nesnesi
 * @returns {{host: string, owner: string|null} | null}  başka firmaya aitse ayrıntı, değilse null
 */
export function siteMismatch(biz, site) {
  if (!site?.ok || !biz?.website || !site.finalUrl) return null;
  const from = hostOf(biz.website), to = hostOf(site.finalUrl);
  if (!from || !to || rootOf(from) === rootOf(to)) return null;
  const tokens = nameTokens(biz.name);
  if (!tokens.length) return null; // ad tamamen genel: karar verilemez
  const hay = fold([
    to,
    ...Object.values(site.content?.excerpts ?? {}),
    ...(site.impressum?.owners ?? []).map((o) => o.name),
  ].join(' '));
  if (tokens.some((t) => hay.includes(t))) return null;
  return { host: to, owner: site.impressum?.owners?.[0]?.name ?? null };
}
