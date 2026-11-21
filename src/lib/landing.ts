/**
 * Şehir + sektör tanıtım sayfaları (/de/webdesign/<sektör>/<şehir>): yalnız sahada çalıştığımız şehirler.
 * Metinler Almanca; ölçülmemiş rakam, uydurma referans ve hukuki iddia YOK.
 * Arama motorlarına yalnız LANDING_INDEX=true ve Impressum + Datenschutz adresleri tanımlıysa açılır.
 */
export interface Sector {
  key: string; slug: string; title: string; plural: string; dative: string;
  intro: string; shows: string[]; search: string[]; faq: [string, string][];
}

export const CITIES = [
  { slug: 'duesseldorf', name: 'Düsseldorf' },
  { slug: 'essen', name: 'Essen' },
  { slug: 'duisburg', name: 'Duisburg' },
] as const;

const COMMON_FAQ: [string, string][] = [
  ['Was kostet eine Website?', 'Die Preise unserer Pakete stehen weiter oben auf dieser Seite – einmalige Einrichtung plus ein monatlicher Betrag für Hosting, Wartung und kleine Änderungen. Vorab erhalten Sie ein schriftliches Angebot.'],
  ['Wie lange dauert es?', 'Einen ersten Entwurf zeigen wir Ihnen in der Regel nach dem Kennenlernen. Wie schnell die Seite online ist, hängt vor allem davon ab, wann Texte, Fotos und Ihre Rückmeldungen vorliegen.'],
  ['Muss ich mich um Technik kümmern?', 'Nein. Hosting, Sicherheitsupdates und Domain-Verwaltung übernehmen wir. Änderungswünsche schicken Sie uns einfach.'],
];

export const SECTORS: Sector[] = [
  {
    key: 'gastro', slug: 'restaurant', title: 'Restaurant & Café', plural: 'Restaurants und Cafés', dative: 'Ihr Restaurant oder Café',
    intro: 'Gäste schauen vor dem Besuch online nach: Ist heute geöffnet? Wie sieht die Karte aus? Kann ich reservieren? Eine eigene Website beantwortet diese Fragen – auch dann, wenn gerade niemand ans Telefon gehen kann.',
    shows: ['Speise- und Getränkekarte, jederzeit aktualisierbar', 'Öffnungszeiten inklusive Feiertage und Ruhetage', 'Tischreservierung oder Anfrage per Formular', 'Anfahrt mit Karte und Routen-Button', 'Fotos von Ihren Gerichten und Räumen (eigene Fotos)', 'Anruf-Button für Bestellungen und Reservierungen'],
    search: ['Aktuelle Öffnungszeiten', 'Speisekarte und Preise', 'Reservierungsmöglichkeit'],
    faq: [['Kann ich die Speisekarte selbst ändern?', 'Sie schicken uns die Änderungen, wir pflegen sie ein. Mit dem Zusatzmodul „Digitale Speisekarte“ ist die Karte auch per QR-Code am Tisch abrufbar.'], ...COMMON_FAQ],
  },
  {
    key: 'friseur', slug: 'friseur', title: 'Friseur & Kosmetik', plural: 'Friseure und Kosmetikstudios', dative: 'Ihren Salon',
    intro: 'Viele Kundinnen und Kunden suchen ihren Salon online und möchten Leistungen, Preise und freie Termine sehen. Eine eigene Website zeigt, was Ihren Salon ausmacht – und nimmt Terminanfragen auch nach Feierabend an.',
    shows: ['Leistungen mit Preisliste', 'Online-Terminanfrage oder Terminbuchung', 'Team und Spezialisierungen', 'Galerie mit eigenen Arbeiten', 'Öffnungszeiten und Anfahrt', 'Link zu Ihren Google-Bewertungen'],
    search: ['Preise für Schnitt, Farbe, Behandlung', 'Freie Termine', 'Bilder von Arbeiten'],
    faq: [['Geht auch Online-Terminbuchung?', 'Ja, als Zusatzmodul „Online-Terminbuchung“. Alternativ gibt es eine einfache Terminanfrage per Formular, die in jedem Paket ab „Business“ enthalten ist.'], ...COMMON_FAQ],
  },
  {
    key: 'handwerk', slug: 'handwerker', title: 'Handwerk', plural: 'Handwerksbetriebe', dative: 'Ihren Handwerksbetrieb',
    intro: 'Wer einen Handwerker sucht, vergleicht online: Welche Leistungen, welches Einzugsgebiet, wie schnell erreichbar? Eine klare Website mit Referenzen aus Ihrer eigenen Arbeit schafft Vertrauen, bevor der erste Anruf kommt.',
    shows: ['Leistungen und Einzugsgebiet', 'Referenzprojekte mit eigenen Fotos', 'Anfrageformular, auf Wunsch mit Foto-Upload', 'Notdienst- oder Erreichbarkeitszeiten', 'Ansprechpartner und Meisterbetrieb-Angaben', 'Anruf- und Routen-Button'],
    search: ['Leistungen im eigenen Ort', 'Referenzen', 'Schnelle Kontaktmöglichkeit'],
    faq: [['Können Kunden Fotos vom Schaden mitschicken?', 'Ja, das Anfrageformular kann einen Foto-Upload enthalten. So können Sie Aufträge besser einschätzen, bevor Sie anfahren.'], ...COMMON_FAQ],
  },
  {
    key: 'baeckerei', slug: 'baeckerei', title: 'Bäckerei & Café', plural: 'Bäckereien', dative: 'Ihre Bäckerei',
    intro: 'Sortiment, Filialen, Öffnungszeiten an Sonn- und Feiertagen: Genau das wird bei Bäckereien am häufigsten gesucht. Eine schlanke, schnelle Website beantwortet es auf einen Blick.',
    shows: ['Sortiment und Spezialitäten', 'Filialen mit Öffnungszeiten', 'Sonntags- und Feiertagszeiten', 'Vorbestellung für Torten und Brötchen per Formular', 'Anfahrt und Karte', 'Eigene Fotos aus Backstube und Laden'],
    search: ['Öffnungszeiten am Sonntag', 'Nächste Filiale', 'Vorbestellung'],
    faq: [['Lohnt sich eine Website für eine kleine Bäckerei?', 'Schon eine einseitige Website mit Sortiment, Öffnungszeiten und Anfahrt beantwortet die häufigsten Fragen. Dafür ist unser Paket „Start“ gedacht.'], ...COMMON_FAQ],
  },
  {
    key: 'kfz', slug: 'kfz-werkstatt', title: 'Kfz-Werkstatt', plural: 'Kfz-Werkstätten', dative: 'Ihre Werkstatt',
    intro: 'Autofahrer suchen eine Werkstatt meist dann, wenn es eilt. Leistungen, Preise für typische Arbeiten und eine einfache Terminanfrage helfen, dass sie bei Ihnen anrufen – und nicht beim Nächsten.',
    shows: ['Leistungen (z. B. Inspektion, Reifenwechsel, HU-Vorbereitung)', 'Terminanfrage für die Werkstatt', 'Marken und Spezialisierungen', 'Öffnungszeiten und Anfahrt', 'Anruf-Button', 'Eigene Fotos von Werkstatt und Team'],
    search: ['Leistungen und Preise', 'Freie Werkstatttermine', 'Erreichbarkeit'],
    faq: [['Kann ich Preise für Standardarbeiten zeigen?', 'Ja. Viele Werkstätten zeigen Richtpreise für Inspektion oder Reifenwechsel – das entscheiden Sie.'], ...COMMON_FAQ],
  },
  {
    key: 'einzelhandel', slug: 'einzelhandel', title: 'Einzelhandel', plural: 'Geschäfte im Einzelhandel', dative: 'Ihr Geschäft',
    intro: 'Bevor Kundschaft in den Laden kommt, schaut sie oft kurz online: Was gibt es hier, welche Marken, wann ist geöffnet, wo kann ich parken? Eine eigene Website bringt Ihr Geschäft in diese Suche.',
    shows: ['Sortiment und Marken', 'Öffnungszeiten und Sonderöffnungen', 'Anfahrt, Parkmöglichkeiten, Karte', 'Aktionen und Neuheiten', 'Eigene Fotos vom Laden', 'Kontakt und Anruf-Button'],
    search: ['Sortiment', 'Öffnungszeiten', 'Anfahrt und Parken'],
    faq: [['Brauche ich einen Onlineshop?', 'Nicht unbedingt. Viele Geschäfte möchten vor allem gefunden werden und Sortiment sowie Öffnungszeiten zeigen. Einen Shop besprechen wir bei Bedarf separat.'], ...COMMON_FAQ],
  },
  {
    key: 'gesundheit', slug: 'praxis-therapie', title: 'Gesundheit & Therapie', plural: 'Praxen für Physiotherapie, Ergotherapie und Gesundheit', dative: 'Ihre Praxis',
    intro: 'Patientinnen und Patienten möchten vorab wissen, welche Leistungen angeboten werden, wer im Team ist und wie sie einen Termin bekommen. Eine übersichtliche Website beantwortet das und entlastet das Telefon.',
    shows: ['Leistungen und Behandlungsschwerpunkte', 'Team mit Qualifikationen', 'Terminanfrage per Formular', 'Öffnungszeiten und Erreichbarkeit', 'Anfahrt und Barrierefreiheit', 'Hinweise für Erstbesuche'],
    search: ['Angebotene Leistungen', 'Terminmöglichkeit', 'Anfahrt'],
    faq: [['Was gilt für Gesundheitswerbung?', 'Für Praxen gelten besondere Werberegeln. Die Inhalte Ihrer Website stimmen wir mit Ihnen ab; ob sie den für Sie geltenden Regeln entsprechen, sollte geprüft werden (keine Rechtsberatung).'], ...COMMON_FAQ],
  },
  {
    key: 'arzt', slug: 'arztpraxis', title: 'Arztpraxis', plural: 'Arzt- und Zahnarztpraxen', dative: 'Ihre Praxis',
    intro: 'Sprechzeiten, Vertretung im Urlaub, Leistungen und Sprachen im Team: Das sind die häufigsten Fragen an eine Praxis. Eine klare Website beantwortet sie, bevor das Telefon klingelt.',
    shows: ['Sprechzeiten und Urlaubsvertretung', 'Leistungen und Schwerpunkte', 'Team und gesprochene Sprachen', 'Hinweise für neue Patientinnen und Patienten', 'Anfahrt, Parken, Barrierefreiheit', 'Kontakt und Rezeptbestellung per Formular (auf Wunsch)'],
    search: ['Sprechzeiten', 'Vertretung', 'Leistungen'],
    faq: [['Was gilt für Praxis-Websites?', 'Für Arztpraxen gelten berufsrechtliche Regeln zu Werbung und Pflichtangaben. Die Inhalte stimmen wir mit Ihnen ab; ob sie den Regeln entsprechen, sollte geprüft werden (keine Rechtsberatung).'], ...COMMON_FAQ],
  },
  {
    key: 'hotel', slug: 'hotel-pension', title: 'Hotel & Pension', plural: 'Hotels und Pensionen', dative: 'Ihr Haus',
    intro: 'Gäste vergleichen Zimmer, Lage und Preise. Mit einer eigenen Website zeigen Sie Ihr Haus so, wie Sie es möchten, und Gäste können Sie direkt anfragen.',
    shows: ['Zimmer mit eigenen Fotos', 'Lage, Anfahrt und Umgebung', 'Anfrageformular für Buchungen', 'Ausstattung und Hausregeln', 'Mehrsprachig (z. B. Deutsch und Englisch)', 'Kontakt und Anruf-Button'],
    search: ['Zimmer und Preise', 'Lage', 'Direkte Anfrage'],
    faq: [['Ist eine Direktbuchung möglich?', 'Wir richten ein Anfrageformular ein. Eine Anbindung an ein Buchungssystem besprechen wir bei Bedarf separat.'], ...COMMON_FAQ],
  },
];

export const sectorBySlug = (s: string) => SECTORS.find((x) => x.slug === s) ?? null;
export const cityBySlug = (s: string) => CITIES.find((x) => x.slug === s) ?? null;

/** Arama motoruna açık mı: yalnız açıkça istenmişse ve Impressum + Datenschutz adresleri varsa */
export function landingIndexable() {
  return process.env.LANDING_INDEX === 'true' && Boolean(process.env.LANDING_IMPRESSUM_URL) && Boolean(process.env.LANDING_DATENSCHUTZ_URL);
}
