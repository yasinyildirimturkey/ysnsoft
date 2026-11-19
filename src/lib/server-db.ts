import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filename: string, defaultData: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
    } catch (e) {
      console.error(`Failed to write initial ${filename}:`, e);
    }
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Error reading ${filename}:`, e);
    return defaultData;
  }
}

function writeJsonFile<T>(filename: string, data: T): boolean {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
    return true;
  } catch (e) {
    console.error(`Error writing ${filename}:`, e);
    return false;
  }
}

// Interfaces
export interface SiteItem {
  id: string;
  name: string;
  tagline: string;
  category: string;
  domain: string;
  liveUrl: string;
  status: 'active' | 'in-progress' | 'planned';
  stats: {
    users?: string;
    queries?: string;
    uptime?: string;
    latency?: string;
  };
  features: string[];
  description: string;
  bridgeEnabled?: boolean;
}

export interface LeadItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  budget?: string;
  projectType: string;
  message?: string;
  source?: string;
  createdAt: string;
  status?: 'new' | 'contacted' | 'proposal_sent' | 'closed';
}

export interface AppointmentItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  projectFocus: string;
  notes?: string;
  meetingLink?: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

/**
 * İç fatura / tahsilat kaydı. Bu bir RESMİ e-Fatura değildir: GİB'e hiçbir şey gönderilmez.
 * (Eskiden kayıtlar "GİB İletildi" ve rastgele üretilmiş ETTN ile gösteriliyordu.)
 */
export interface InvoiceItem {
  id: string;
  /** İç kayıt numarası: YSN-2026-0001 */
  invoiceNo: string;
  client: string;
  taxNumber: string;
  product: string;
  /** KDV hariç */
  amount: number;
  taxRate: number;
  /** KDV dahil */
  totalAmount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  /** YYYY-AA-GG */
  issueDate: string;
  dueDate: string;
  paymentType: 'Havale / EFT' | 'Sanal POS' | 'Çek' | 'Nakit';
  createdAt: string;
  /** Para birimi; eski kayıtlarda yok = TRY */
  currency?: 'TRY' | 'EUR';
  /** Kazanılan adaydan otomatik açıldıysa WebScout işletme id (aynı aday için ikinci kayıt açılmaz) */
  prospectId?: number;
}

export interface GeoSettingsItem {
  city: string;
  district: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  phone: string;
  address: string;
  country: string;
}

// Default Seeds
const DEFAULT_SITES: SiteItem[] = [
  {
    id: 'kglex',
    name: 'KGLEX Hukuk Otomasyonu',
    tagline: 'Yeni Nesil Hukuk & Dava Yönetim Platformu',
    category: 'LegalTech SaaS',
    domain: 'kglex.com',
    liveUrl: 'https://www.kglex.com',
    status: 'active',
    stats: { users: '500+ Büro', uptime: '%99.98', latency: '42ms' },
    features: ['UYAP Otomasyonu', 'Yapay Zeka Dilekçe Botu', 'Duruşma Takvimi', 'İcra Dosya Takibi'],
    description: 'Bürolar, avukatlar ve hukuk departmanları için uçtan uca dosya, icra ve müvekkil yönetim sistemi.',
    bridgeEnabled: true
  },
  {
    id: 'haritaplan',
    name: 'HaritaPlan CBS & İmar',
    tagline: '3D Harita ve Parsel Yönetim Motoru',
    category: 'GIS & Mühendislik',
    domain: 'haritaplan.com',
    liveUrl: 'https://www.haritaplan.com',
    status: 'active',
    stats: { users: '45+ Belediye/Firma', queries: '1.2M Parsel', uptime: '%99.95' },
    features: ['3194 Madde 18 Otomasyonu', '3D Kent Modeli', 'DOP Hesaplama', 'TKGM Entegrasyonu'],
    description: 'Harita mühendisleri, belediyeler ve gayrimenkul geliştiriciler için gelişmiş CBS ve parsel hesaplama platformu.',
    bridgeEnabled: true
  },
  {
    id: 'hgavukatlik',
    name: 'HG Avukatlık Ortaklığı',
    tagline: 'Kurumsal Hukuk & Danışmanlık Portalı',
    category: 'Kurumsal Hukuk',
    domain: 'hgavukatlik.com',
    liveUrl: 'https://www.hgavukatlik.com',
    status: 'active',
    stats: { users: '1000+ Müvekkil', uptime: '%99.99' },
    features: ['Müvekkil Portalı', 'Şifreli Belge Kasası', 'KVKK Uyum Denetimi', 'Online Randevu'],
    description: 'Ticaret hukuku, birleşme devralmalar ve uluslararası tahkim odaklı modern hukuk platformu.',
    bridgeEnabled: true
  },
  {
    id: 'acikellaw',
    name: 'Açıkel Hukuk Bürosu',
    tagline: 'Dijital Hukuk ve Arabuluculuk',
    category: 'Hukuk Bürosu',
    domain: 'acikellaw.com',
    liveUrl: 'https://www.acikellaw.com',
    status: 'active',
    stats: { uptime: '%99.99', latency: '35ms' },
    features: ['Arabuluculuk Takip', 'Sözleşme Analiz Motoru', 'Online Vekalet Süreçleri'],
    description: 'İş hukuku, gayrimenkul ve ticari arabuluculuk süreçlerinde uzmanlaşmış dijital hukuk platformu.',
    bridgeEnabled: true
  },
  {
    id: 'panelde',
    name: 'Panelde Emlak & CRM',
    tagline: 'Multi-Tenant Portföy Dağıtım Portalı',
    category: 'PropTech SaaS',
    domain: 'panelde.com',
    liveUrl: 'https://www.panelde.com',
    status: 'active',
    stats: { users: '250+ Ofis', queries: '80K+ İlan', uptime: '%99.92' },
    features: ['Çoklu Ofis Mimarisi', 'Otomatik Portal Entegrasyonu', 'WhatsApp Botu', 'Sanal Tur'],
    description: 'Gayrimenkul ofisleri ve acenteler için bulut tabanlı portföy, müşteri ve sözleşme yönetim platformu.',
    bridgeEnabled: true
  },
  {
    id: 'flamantyou',
    name: 'Flamant You',
    tagline: 'Lüks Moda & Butik E-Ticaret',
    category: 'E-Ticaret & Retail',
    domain: 'flamantyou.com',
    liveUrl: 'https://www.flamantyou.com',
    status: 'active',
    stats: { uptime: '%99.94', latency: '68ms' },
    features: ['Headless Checkout', 'Iyzico & Stripe Entegrasyonu', 'Akıllı Beden Asistanı'],
    description: 'Özel tasarım kadın giyim ve aksesuar koleksiyonları için tasarlanmış yüksek hızlı e-ticaret altyapısı.',
    bridgeEnabled: false
  },
  {
    id: 'tarihisamatyamezecisi',
    name: 'Tarihi Samatya Mezecisi',
    tagline: 'Gastronomi & Gurme Rezervasyon',
    category: 'Gastronomi & Rezervasyon',
    domain: 'tarihisamatyamezecisi.com',
    liveUrl: 'https://www.tarihisamatyamezecisi.com',
    status: 'active',
    stats: { uptime: '%99.95' },
    features: ['QR Menü Motoru', 'Masa Rezervasyon', 'Özel Sipariş Portalı'],
    description: 'İstanbul gastronomisinin köklü lezzet durağı için geliştirilmiş dijital masa ve sipariş yönetim portalı.',
    bridgeEnabled: false
  }
];

const DEFAULT_LEADS: LeadItem[] = [];

const DEFAULT_APPOINTMENTS: AppointmentItem[] = [];

const DEFAULT_INVOICES: InvoiceItem[] = [];

const DEFAULT_GEO_SETTINGS: GeoSettingsItem = {
  city: 'İstanbul',
  district: 'Pendik',
  postalCode: '34890',
  latitude: 40.8795,
  longitude: 29.2578,
  phone: '+90 532 725 50 98',
  address: 'Batı Mah. Erol Kaya Cad. No: 124 Pendik / İstanbul',
  country: 'TR'
};

// Site Functions
export function getStoredSites(): SiteItem[] {
  return readJsonFile<SiteItem[]>('sites.json', DEFAULT_SITES);
}

export function saveSite(site: SiteItem): SiteItem[] {
  const current = getStoredSites();
  const index = current.findIndex(s => s.id === site.id || s.domain === site.domain);
  if (index >= 0) {
    current[index] = { ...current[index], ...site };
  } else {
    current.push(site);
  }
  writeJsonFile('sites.json', current);
  return current;
}

export function deleteSite(idOrDomain: string): SiteItem[] {
  const current = getStoredSites();
  const filtered = current.filter(s => s.id !== idOrDomain && s.domain !== idOrDomain);
  writeJsonFile('sites.json', filtered);
  return filtered;
}

// Lead Functions
// Eski sürümlerin sunucuya yazdığı uydurma örnek kayıtlar (gerçek müşteri değil): panelde gösterilmez, silinmez.
const SEED_LEAD_IDS = new Set(['lead-1', 'lead-2']);
const SEED_APPOINTMENT_IDS = new Set(['apt-1', 'apt-2']);

/** Panel için: yalnız gerçek talepler, en yeni üstte. */
export function getRealLeads(): LeadItem[] {
  return getStoredLeads().filter((l) => !SEED_LEAD_IDS.has(l.id)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
export function getRealAppointments(): AppointmentItem[] {
  return getStoredAppointments().filter((a) => !SEED_APPOINTMENT_IDS.has(a.id)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
export function updateLeadStatus(id: string, status: LeadItem['status']): boolean {
  const current = getStoredLeads();
  const i = current.findIndex((l) => l.id === id);
  if (i < 0) return false;
  current[i] = { ...current[i], status };
  if (!writeJsonFile('leads.json', current)) throw new Error('Kaydedilemedi');
  return true;
}
export function updateAppointmentStatus(id: string, status: AppointmentItem['status']): boolean {
  const current = getStoredAppointments();
  const i = current.findIndex((a) => a.id === id);
  if (i < 0) return false;
  current[i] = { ...current[i], status };
  if (!writeJsonFile('appointments.json', current)) throw new Error('Kaydedilemedi');
  return true;
}

export function getStoredLeads(): LeadItem[] {
  return readJsonFile<LeadItem[]>('leads.json', DEFAULT_LEADS);
}

export function saveLead(lead: LeadItem): LeadItem[] {
  const current = getStoredLeads();
  const index = current.findIndex(l => l.id === lead.id);
  if (index >= 0) {
    current[index] = { ...current[index], ...lead };
  } else {
    current.unshift(lead);
  }
  if (!writeJsonFile('leads.json', current)) throw new Error('Talep kaydedilemedi');
  return current;
}

export function deleteLead(id: string): LeadItem[] {
  const current = getStoredLeads();
  const filtered = current.filter(l => l.id !== id);
  writeJsonFile('leads.json', filtered);
  return filtered;
}

// Appointment Functions
export function getStoredAppointments(): AppointmentItem[] {
  return readJsonFile<AppointmentItem[]>('appointments.json', DEFAULT_APPOINTMENTS);
}

export function saveAppointment(appointment: AppointmentItem): AppointmentItem[] {
  const current = getStoredAppointments();
  const index = current.findIndex(a => a.id === appointment.id);
  if (index >= 0) {
    current[index] = { ...current[index], ...appointment };
  } else {
    current.unshift(appointment);
  }
  if (!writeJsonFile('appointments.json', current)) throw new Error('Randevu kaydedilemedi');
  return current;
}

export function deleteAppointment(id: string): AppointmentItem[] {
  const current = getStoredAppointments();
  const filtered = current.filter(a => a.id !== id);
  writeJsonFile('appointments.json', filtered);
  return filtered;
}

// Invoice Functions
export function getStoredInvoices(): InvoiceItem[] {
  return readJsonFile<InvoiceItem[]>('invoices.json', DEFAULT_INVOICES);
}

// Eski sürümün örnek kayıtları (inv-101, inv-102; farklı şekilde) panelde gösterilmez
const isInvoiceRecord = (i: unknown): i is InvoiceItem =>
  !!i && typeof i === 'object' && typeof (i as InvoiceItem).client === 'string' && typeof (i as InvoiceItem).totalAmount === 'number';

/** Panel için: yalnız gerçek kayıtlar, en yeni üstte. */
export function getRealInvoices(): InvoiceItem[] {
  return getStoredInvoices().filter(isInvoiceRecord).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/** Sıradaki iç kayıt numarası: YSN-<yıl>-<4 hane>, yıl başında 0001'den başlar. */
export function nextInvoiceNo(year = new Date().getFullYear()): string {
  const prefix = `YSN-${year}-`;
  const max = getRealInvoices().reduce((m, i) => (i.invoiceNo.startsWith(prefix) ? Math.max(m, Number(i.invoiceNo.slice(prefix.length)) || 0) : m), 0);
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

export function saveInvoice(invoice: InvoiceItem): InvoiceItem[] {
  const current = getStoredInvoices();
  current.unshift(invoice);
  if (!writeJsonFile('invoices.json', current)) throw new Error('Fatura kaydı yazılamadı');
  return current;
}

export function updateInvoiceStatus(id: string, status: InvoiceItem['status']): boolean {
  const current = getStoredInvoices();
  const i = current.findIndex((x) => isInvoiceRecord(x) && x.id === id);
  if (i < 0) return false;
  current[i] = { ...current[i], status };
  return writeJsonFile('invoices.json', current);
}

// Geo Settings Functions
export function getStoredGeoSettings(): GeoSettingsItem {
  return readJsonFile<GeoSettingsItem>('geo-settings.json', DEFAULT_GEO_SETTINGS);
}

export function saveGeoSettings(settings: GeoSettingsItem): GeoSettingsItem {
  writeJsonFile('geo-settings.json', settings);
  return settings;
}
