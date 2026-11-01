'use client';

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  product: string;
  budget: string;
  message: string;
  status: 'Yeni' | 'İnceleniyor' | 'Teklif Gönderildi' | 'Tamamlandı';
  date: string;
}

export interface Appointment {
  id: string;
  name: string;
  company: string;
  email: string;
  topic: string;
  dateStr: string;
  timeStr: string;
  status: 'Onaylandı' | 'Beklemede' | 'Tamamlandı';
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'accounting' | 'sales' | 'engineer';
  roleTitle: string;
  status: 'Aktif' | 'İzinde' | 'Pasif';
  lastLogin: string;
  permissions: string[];
}

export interface InvoiceRecord {
  id: string;
  invoiceNo: string;
  client: string;
  taxNumber: string;
  product: string;
  amount: number;
  taxRate: number;
  totalAmount: number;
  status: 'Ödendi' | 'Beklemede' | 'Vadesi Geçti' | 'İptal';
  issueDate: string;
  dueDate: string;
  paymentType: 'Havale / EFT' | 'Sanal POS' | 'Çek';
}

export interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  secure: boolean;
}

export interface SystemSettings {
  companyName: string;
  companyPhone: string;
  whatsappNumber: string;
  supportEmail: string;
  infoEmail: string;
  notificationEmail: string;
  address: string;
  mersisNo: string;
  ticaretSicilNo: string;
}

export const PRESET_ADMIN_USERS = [
  {
    email: 'yasin@ysnsoft.com',
    name: 'Yasin Yıldırım',
    role: 'superadmin',
    roleTitle: 'Super Admin & Kurucu Çözüm Mimarı',
    password: 'Deniz2026?!',
    avatar: '👨‍💼',
    permissions: ['Tüm Sistem Yetkisi', 'Muhasebe & Finans', 'Teklif Onayı', 'Rol & Ekip Yönetimi', 'Canlı Siteler & DNS', 'Yapay Zeka Mimarisi']
  },
  {
    email: 'destek@ysnsoft.com',
    name: 'YSNSOFT Destek Ekibi',
    role: 'engineer',
    roleTitle: 'Teknik Destek & Sistem Mühendisliği',
    password: 'Deniz2026?!',
    avatar: '🛠️',
    permissions: ['Teknik Destek', 'Canlı Sistem Sağlığı & Uptime', 'Hata Logları', 'Müşteri Ticketları']
  },
  {
    email: 'info@ysnsoft.com',
    name: 'YSNSOFT Kurumsal İletişim',
    role: 'sales',
    roleTitle: 'Kurumsal İletişim & Satış Direktörü',
    password: 'Deniz2026?!',
    avatar: '💼',
    permissions: ['Teklif Talepleri (Leads)', 'Resmi PDF Teklif Mektubu', 'Google Meet Randevuları', 'Müşteri CRM']
  },
  {
    email: 'noreply@ysnsoft.com',
    name: 'Sistem & E-Posta Bildirimleri',
    role: 'accounting',
    roleTitle: 'Sistem Otomasyonu & E-Fatura Botu',
    password: 'Deniz2026?!',
    avatar: '⚡',
    permissions: ['E-Fatura & E-Arşiv (GİB)', 'Otomatik SMTP Bildirimleri', 'Banka Entegrasyonları']
  }
];

export const DEFAULT_SMTP_SETTINGS: SmtpSettings = {
  host: 'mail.ysnsoft.com',
  port: 587,
  user: 'noreply@ysnsoft.com',
  pass: 'Deniz2026?!',
  fromName: 'YSNSOFT Bilişim Teknolojileri',
  fromEmail: 'noreply@ysnsoft.com',
  secure: true
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  companyName: 'YSNSOFT Bilişim Teknolojileri A.Ş.',
  companyPhone: '+90 532 725 50 98',
  whatsappNumber: '+90 532 725 50 98',
  supportEmail: 'destek@ysnsoft.com',
  infoEmail: 'info@ysnsoft.com',
  notificationEmail: 'noreply@ysnsoft.com',
  address: 'Pendik / İstanbul • Türkiye',
  mersisNo: '0987654321000015',
  ticaretSicilNo: '348291-5'
};

const DEFAULT_LEADS: Lead[] = [
  {
    id: 'LEAD-101',
    name: 'Av. Zeynep Kaya',
    company: 'Kaya & Ortakları Hukuk Bürosu',
    email: 'zeynep@kayahukuk.com',
    phone: '0532 725 50 98',
    product: 'KGLEX LegalTech (Hukuk & UYAP)',
    budget: '₺100.000 - ₺300.000',
    message: 'Ofisimizde 8 avukat var. UYAP robotu ve süreli duruşma takibi için acil demo ve teklif istiyoruz.',
    status: 'Yeni',
    date: '31.10.2026 21:40'
  },
  {
    id: 'LEAD-102',
    name: 'Müh. Ahmet Eren',
    company: 'Eren Harita ve Şehir Planlama Ltd.',
    email: 'ahmet@erenharita.com',
    phone: '0532 725 50 98',
    product: 'HaritaPlan (3D CBS & İmar Md. 18)',
    budget: '₺50.000 - ₺100.000',
    message: 'Netcad (.ncn) dosyalarını doğrudan okuyup DOP dağıtım cetveli çıkaran modülünüzü belediye projemizde kullanmak istiyoruz.',
    status: 'İnceleniyor',
    date: '31.10.2026 19:15'
  },
  {
    id: 'LEAD-103',
    name: 'Canan Güneş',
    company: 'Lumiere Beauty Cosmetics',
    email: 'canan@lumiere.com.tr',
    phone: '0532 725 50 98',
    product: 'Flamantyou Kozmetik (E-Ticaret & AI)',
    budget: '₺300.000 - ₺750.000',
    message: 'Kamerayla AI cilt analizi yapan sistemi kendi e-ticaret sitemize ve mobil uygulamamıza entegre etmek istiyoruz.',
    status: 'Teklif Gönderildi',
    date: '30.10.2026 14:02'
  },
  {
    id: 'LEAD-104',
    name: 'Hakan Şentürk',
    company: 'Şentürk Gayrimenkul Yatırım A.Ş.',
    email: 'hakan@senturkemlak.com',
    phone: '0532 725 50 98',
    product: 'Panelde Multi-Tenant Portalı',
    budget: '₺750.000+',
    message: '42 şubemizin tüm ilan ve müşteri portföyünü tek merkezden yönetecek multi-tenant altyapı için görüşmek istiyoruz.',
    status: 'Tamamlandı',
    date: '29.10.2026 11:20'
  }
];

const DEFAULT_APPOINTMENTS: Appointment[] = [
  {
    id: 'APT-201',
    name: 'Av. Kemal Güler',
    company: 'Güler Hukuk',
    email: 'kemal@gulerhukuk.com',
    topic: 'KGLEX UYAP Robotu Demo Oturumu',
    dateStr: '3 Kasım Pazartesi',
    timeStr: '11:30',
    status: 'Onaylandı'
  },
  {
    id: 'APT-202',
    name: 'Harun Çetinkaya',
    company: 'Çetinkaya Harita',
    email: 'harun@cetinkayaharita.com',
    topic: 'HaritaPlan 3194 Md. 18 DOP Stüdyosu',
    dateStr: '4 Kasım Salı',
    timeStr: '14:00',
    status: 'Onaylandı'
  },
  {
    id: 'APT-203',
    name: 'Selin Aksoy',
    company: 'Velo Moda & Kozmetik',
    email: 'selin@veloretail.com',
    topic: 'Flamantyou AI Cilt Analiz Motoru',
    dateStr: '5 Kasım Çarşamba',
    timeStr: '15:30',
    status: 'Beklemede'
  }
];

const DEFAULT_TEAM_MEMBERS: TeamMember[] = PRESET_ADMIN_USERS.map((u, i) => ({
  id: `USR-0${i + 1}`,
  name: u.name,
  email: u.email,
  role: u.role as any,
  roleTitle: u.roleTitle,
  status: 'Aktif',
  lastLogin: i === 0 ? 'Şimdi (Çevrimiçi)' : 'Bugün',
  permissions: u.permissions
}));

const DEFAULT_INVOICES: InvoiceRecord[] = [
  {
    id: 'INV-001',
    invoiceNo: 'GIB202600000142',
    client: 'Güler Hukuk & Danışmanlık A.Ş.',
    taxNumber: '4280918291',
    product: 'KGLEX Yıllık Kurumsal Lisans & UYAP Robotu',
    amount: 145000,
    taxRate: 20,
    totalAmount: 174000,
    status: 'Ödendi',
    issueDate: '24.10.2026',
    dueDate: '24.10.2026',
    paymentType: 'Havale / EFT'
  },
  {
    id: 'INV-002',
    invoiceNo: 'GIB202600000143',
    client: 'Çetinkaya Harita Mühendislik Ltd.',
    taxNumber: '1982049182',
    product: 'HaritaPlan 3D CBS & 3194 Md. 18 Kurulumu',
    amount: 85000,
    taxRate: 20,
    totalAmount: 102000,
    status: 'Ödendi',
    issueDate: '26.10.2026',
    dueDate: '26.10.2026',
    paymentType: 'Sanal POS'
  },
  {
    id: 'INV-003',
    invoiceNo: 'GIB202600000144',
    client: 'Flamantyou Kozmetik ve Sağlık Ürünleri',
    taxNumber: '7361928371',
    product: 'AI Cilt Analizi Motoru Sprint 1 Kabulü',
    amount: 180000,
    taxRate: 20,
    totalAmount: 216000,
    status: 'Beklemede',
    issueDate: '29.10.2026',
    dueDate: '05.11.2026',
    paymentType: 'Havale / EFT'
  },
  {
    id: 'INV-004',
    invoiceNo: 'GIB202600000145',
    client: 'Marmara Emlak & Yatırım Ağı',
    taxNumber: '9182049182',
    product: 'Panelde Multi-Tenant SaaS Aylık Bakım & SLA',
    amount: 45000,
    taxRate: 20,
    totalAmount: 54000,
    status: 'Beklemede',
    issueDate: '30.10.2026',
    dueDate: '07.11.2026',
    paymentType: 'Sanal POS'
  },
  {
    id: 'INV-005',
    invoiceNo: 'GIB202600000146',
    client: 'Tarihi Samatya Mezecisi Gıda Ltd.',
    taxNumber: '3819204918',
    product: 'Restoran QR Menü & Mutfak Yazıcı Entegrasyonu',
    amount: 32000,
    taxRate: 20,
    totalAmount: 38400,
    status: 'Ödendi',
    issueDate: '20.10.2026',
    dueDate: '20.10.2026',
    paymentType: 'Sanal POS'
  }
];

export function getStoredLeads(): Lead[] {
  if (typeof window === 'undefined') return DEFAULT_LEADS;
  const data = localStorage.getItem('ysn_admin_leads_v2');
  if (!data) {
    localStorage.setItem('ysn_admin_leads_v2', JSON.stringify(DEFAULT_LEADS));
    return DEFAULT_LEADS;
  }
  try { return JSON.parse(data); } catch { return DEFAULT_LEADS; }
}

export function saveLead(lead: Omit<Lead, 'id' | 'status' | 'date'>) {
  if (typeof window === 'undefined') return;
  const current = getStoredLeads();
  const newLead: Lead = {
    ...lead,
    id: `LEAD-${Math.floor(100 + Math.random() * 900)}`,
    status: 'Yeni',
    date: new Date().toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  };
  localStorage.setItem('ysn_admin_leads_v2', JSON.stringify([newLead, ...current]));
  try {
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newLead.name,
        email: newLead.email,
        phone: newLead.phone,
        company: newLead.company,
        budget: newLead.budget,
        projectType: newLead.product,
        message: newLead.message,
        source: 'Website Form'
      })
    }).catch(() => {});
  } catch(e) {}
}

export function updateLeadStatus(id: string, newStatus: Lead['status']) {
  if (typeof window === 'undefined') return;
  const current = getStoredLeads();
  const updated = current.map(l => l.id === id ? { ...l, status: newStatus } : l);
  localStorage.setItem('ysn_admin_leads_v2', JSON.stringify(updated));
}

export function getStoredAppointments(): Appointment[] {
  if (typeof window === 'undefined') return DEFAULT_APPOINTMENTS;
  const data = localStorage.getItem('ysn_admin_appointments');
  if (!data) {
    localStorage.setItem('ysn_admin_appointments', JSON.stringify(DEFAULT_APPOINTMENTS));
    return DEFAULT_APPOINTMENTS;
  }
  try { return JSON.parse(data); } catch { return DEFAULT_APPOINTMENTS; }
}

export function saveAppointment(apt: Omit<Appointment, 'id' | 'status'>) {
  if (typeof window === 'undefined') return;
  const current = getStoredAppointments();
  const newApt: Appointment = {
    ...apt,
    id: `APT-${Math.floor(200 + Math.random() * 800)}`,
    status: 'Onaylandı'
  };
  localStorage.setItem('ysn_admin_appointments', JSON.stringify([newApt, ...current]));
  try {
    fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newApt.name,
        email: newApt.email,
        phone: '',
        date: newApt.dateStr,
        time: newApt.timeStr,
        projectFocus: newApt.topic,
        notes: newApt.company,
        status: 'confirmed'
      })
    }).catch(() => {});
  } catch(e) {}
}

export function getStoredTeamMembers(): TeamMember[] {
  if (typeof window === 'undefined') return DEFAULT_TEAM_MEMBERS;
  const data = localStorage.getItem('ysn_admin_team_v2');
  if (!data) {
    localStorage.setItem('ysn_admin_team_v2', JSON.stringify(DEFAULT_TEAM_MEMBERS));
    return DEFAULT_TEAM_MEMBERS;
  }
  try { return JSON.parse(data); } catch { return DEFAULT_TEAM_MEMBERS; }
}

export function saveTeamMember(member: Omit<TeamMember, 'id' | 'lastLogin'>) {
  if (typeof window === 'undefined') return;
  const current = getStoredTeamMembers();
  const newMember: TeamMember = {
    ...member,
    id: `USR-${Math.floor(10 + Math.random() * 90)}`,
    lastLogin: 'Henüz giriş yapmadı'
  };
  localStorage.setItem('ysn_admin_team_v2', JSON.stringify([newMember, ...current]));
}

export function getStoredInvoices(): InvoiceRecord[] {
  if (typeof window === 'undefined') return DEFAULT_INVOICES;
  const data = localStorage.getItem('ysn_admin_invoices');
  if (!data) {
    localStorage.setItem('ysn_admin_invoices', JSON.stringify(DEFAULT_INVOICES));
    return DEFAULT_INVOICES;
  }
  try { return JSON.parse(data); } catch { return DEFAULT_INVOICES; }
}

export function saveInvoice(inv: Omit<InvoiceRecord, 'id' | 'invoiceNo'>) {
  if (typeof window === 'undefined') return;
  const current = getStoredInvoices();
  const nextNo = `GIB202600000${140 + current.length + 1}`;
  const newInv: InvoiceRecord = {
    ...inv,
    id: `INV-${Math.floor(100 + Math.random() * 900)}`,
    invoiceNo: nextNo
  };
  localStorage.setItem('ysn_admin_invoices', JSON.stringify([newInv, ...current]));
}

export function updateInvoiceStatus(id: string, newStatus: InvoiceRecord['status']) {
  if (typeof window === 'undefined') return;
  const current = getStoredInvoices();
  const updated = current.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv);
  localStorage.setItem('ysn_admin_invoices', JSON.stringify(updated));
}

// SMTP Settings Storage
export function getStoredSmtpSettings(): SmtpSettings {
  if (typeof window === 'undefined') return DEFAULT_SMTP_SETTINGS;
  const data = localStorage.getItem('ysn_smtp_settings');
  if (!data) {
    localStorage.setItem('ysn_smtp_settings', JSON.stringify(DEFAULT_SMTP_SETTINGS));
    return DEFAULT_SMTP_SETTINGS;
  }
  try { return JSON.parse(data); } catch { return DEFAULT_SMTP_SETTINGS; }
}

export function saveSmtpSettings(settings: SmtpSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ysn_smtp_settings', JSON.stringify(settings));
}

import { PRODUCTS, Product } from '@/data/products';

export interface GeoSettings {
  city: string;
  district: string;
  regionCode: string;
  position: string;
  icbm: string;
  postalCode: string;
  phone: string;
  companyName: string;
}

export const DEFAULT_GEO_SETTINGS: GeoSettings = {
  city: 'İstanbul',
  district: 'Pendik',
  regionCode: 'TR-34',
  position: '40.8795;29.2578',
  icbm: '40.8795, 29.2578',
  postalCode: '34890',
  phone: '+90 532 725 50 98',
  companyName: 'YSNSOFT Bilişim Teknolojileri A.Ş.'
};

// Site & Product Storage Functions
export function getStoredProducts(): Product[] {
  if (typeof window === 'undefined') return PRODUCTS;
  const data = localStorage.getItem('ysn_admin_products');
  if (!data) {
    localStorage.setItem('ysn_admin_products', JSON.stringify(PRODUCTS));
    return PRODUCTS;
  }
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : PRODUCTS;
  } catch {
    return PRODUCTS;
  }
}

export function saveProduct(product: Product) {
  if (typeof window === 'undefined') return;
  const current = getStoredProducts();
  const exists = current.some(p => p.id === product.id);
  const updated = exists 
    ? current.map(p => p.id === product.id ? product : p)
    : [product, ...current];
  localStorage.setItem('ysn_admin_products', JSON.stringify(updated));
}

export function deleteProduct(id: string) {
  if (typeof window === 'undefined') return;
  const current = getStoredProducts();
  const filtered = current.filter(p => p.id !== id);
  localStorage.setItem('ysn_admin_products', JSON.stringify(filtered));
}

export function resetProductsToDefault() {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ysn_admin_products', JSON.stringify(PRODUCTS));
}

// Geo Settings Storage
export function getStoredGeoSettings(): GeoSettings {
  if (typeof window === 'undefined') return DEFAULT_GEO_SETTINGS;
  const data = localStorage.getItem('ysn_geo_settings');
  if (!data) {
    localStorage.setItem('ysn_geo_settings', JSON.stringify(DEFAULT_GEO_SETTINGS));
    return DEFAULT_GEO_SETTINGS;
  }
  try { return JSON.parse(data); } catch { return DEFAULT_GEO_SETTINGS; }
}

export function saveGeoSettings(geo: GeoSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ysn_geo_settings', JSON.stringify(geo));
}

// System Settings Storage
export function getStoredSystemSettings(): SystemSettings {
  if (typeof window === 'undefined') return DEFAULT_SYSTEM_SETTINGS;
  const data = localStorage.getItem('ysn_system_settings');
  if (!data) {
    localStorage.setItem('ysn_system_settings', JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
    return DEFAULT_SYSTEM_SETTINGS;
  }
  try { return JSON.parse(data); } catch { return DEFAULT_SYSTEM_SETTINGS; }
}

export function saveSystemSettings(settings: SystemSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ysn_system_settings', JSON.stringify(settings));
}
