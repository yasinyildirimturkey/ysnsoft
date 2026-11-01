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

export interface InvoiceItem {
  id: string;
  invoiceNo: string;
  clientName: string;
  clientVknTckn: string;
  issueDate: string;
  dueDate: string;
  items: { description: string; qty: number; unitPrice: number; total: number }[];
  subtotal: number;
  kdvRate: number;
  kdvAmount: number;
  grandTotal: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  gibStatus: 'GİB Onaylandı' | 'GİB İletildi' | 'Taslak';
  ettn: string;
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

const DEFAULT_LEADS: LeadItem[] = [
  {
    id: 'lead-1',
    name: 'Av. Mehmet Yılmaz',
    email: 'mehmet@yilmazhukuk.com',
    phone: '+90 532 100 2030',
    company: 'Yılmaz Hukuk & Danışmanlık',
    budget: '₺100.000 - ₺250.000',
    projectType: 'LegalTech (KGLEX Benzeri)',
    message: 'UYAP entegrasyonu ve icra dosyası otomatik sorgulama altyapısı talep ediyoruz.',
    source: 'Hero Form',
    createdAt: new Date().toISOString(),
    status: 'new'
  },
  {
    id: 'lead-2',
    name: 'Harita Müh. Selin Aktaş',
    email: 'selin@aktasharita.com',
    phone: '+90 544 200 4050',
    company: 'Aktaş Harita Planlama',
    budget: '₺250.000 - ₺500.000',
    projectType: '3D Harita / GIS (HaritaPlan)',
    message: '3194 sayılı kanun madde 18 parselasyon hesaplama motorunu belediyemiz için özelleştirmek istiyoruz.',
    source: 'Scope Calculator',
    createdAt: new Date().toISOString(),
    status: 'contacted'
  }
];

const DEFAULT_APPOINTMENTS: AppointmentItem[] = [
  {
    id: 'apt-1',
    name: 'Av. Deniz Kaya',
    email: 'deniz@kayalaw.com',
    phone: '+90 533 111 2233',
    date: '2026-11-04',
    time: '14:30',
    projectFocus: 'KGLEX Hukuk Otomasyonu',
    notes: 'Büromuzdaki 12 avukat için UYAP bot ve arşiv entegrasyonu demosu.',
    meetingLink: 'https://meet.google.com/ysn-demo-law',
    status: 'confirmed',
    createdAt: new Date().toISOString()
  },
  {
    id: 'apt-2',
    name: 'Burak Demir',
    email: 'burak@panelde.com',
    phone: '+90 535 444 5566',
    date: '2026-11-05',
    time: '11:00',
    projectFocus: 'Panelde Emlak Portalı V2',
    notes: 'Multi-tenant mimari ölçekleme ve mobil uygulama entegrasyonu.',
    meetingLink: 'https://meet.google.com/ysn-panelde-arch',
    status: 'confirmed',
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_INVOICES: InvoiceItem[] = [
  {
    id: 'inv-101',
    invoiceNo: 'YSN2026000000142',
    clientName: 'Açıkel Hukuk & Arabuluculuk Bürosu',
    clientVknTckn: '1230495861',
    issueDate: '2026-10-15',
    dueDate: '2026-11-15',
    items: [
      { description: 'KGLEX SaaS Yıllık Lisans & UYAP Bot Entegrasyonu', qty: 1, unitPrice: 120000, total: 120000 },
      { description: 'Cloud SLA & 7/24 Kesintisiz Bakım Desteği', qty: 1, unitPrice: 30000, total: 30000 }
    ],
    subtotal: 150000,
    kdvRate: 20,
    kdvAmount: 30000,
    grandTotal: 180000,
    currency: 'TRY',
    status: 'paid',
    gibStatus: 'GİB Onaylandı',
    ettn: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  },
  {
    id: 'inv-102',
    invoiceNo: 'YSN2026000000143',
    clientName: 'HaritaPlan CBS & Mühendislik Ltd. Şti.',
    clientVknTckn: '9870123456',
    issueDate: '2026-10-22',
    dueDate: '2026-11-22',
    items: [
      { description: '3194 Madde 18 DOP Hesaplama Motoru Modül Geliştirme (Sprint 3)', qty: 1, unitPrice: 200000, total: 200000 },
      { description: '3D Kent Modelleri WebGL Render Motoru Optimizasyonu', qty: 1, unitPrice: 40000, total: 40000 }
    ],
    subtotal: 240000,
    kdvRate: 20,
    kdvAmount: 48000,
    grandTotal: 288000,
    currency: 'TRY',
    status: 'pending',
    gibStatus: 'GİB İletildi',
    ettn: 'e28bb32c-69dd-4483-b678-1f13c3d4e580'
  }
];

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
  writeJsonFile('leads.json', current);
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
  writeJsonFile('appointments.json', current);
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

export function saveInvoice(invoice: InvoiceItem): InvoiceItem[] {
  const current = getStoredInvoices();
  const index = current.findIndex(i => i.id === invoice.id || i.invoiceNo === invoice.invoiceNo);
  if (index >= 0) {
    current[index] = { ...current[index], ...invoice };
  } else {
    current.unshift(invoice);
  }
  writeJsonFile('invoices.json', current);
  return current;
}

// Geo Settings Functions
export function getStoredGeoSettings(): GeoSettingsItem {
  return readJsonFile<GeoSettingsItem>('geo-settings.json', DEFAULT_GEO_SETTINGS);
}

export function saveGeoSettings(settings: GeoSettingsItem): GeoSettingsItem {
  writeJsonFile('geo-settings.json', settings);
  return settings;
}
