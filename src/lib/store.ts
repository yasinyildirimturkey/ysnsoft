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
  paymentType: 'Havale / EFT' | 'Sanal POS' | 'Çek' | 'Nakit';
  currency?: 'TRY' | 'EUR';
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
    avatar: '👨‍💼',
    permissions: ['Tüm Sistem Yetkisi', 'Muhasebe & Finans', 'Teklif Onayı', 'Rol & Ekip Yönetimi', 'Canlı Siteler & DNS', 'Yapay Zeka Mimarisi']
  },
  {
    email: 'destek@ysnsoft.com',
    name: 'YSNSOFT Destek Ekibi',
    role: 'engineer',
    roleTitle: 'Teknik Destek & Sistem Mühendisliği',
    avatar: '🛠️',
    permissions: ['Teknik Destek', 'Canlı Sistem Sağlığı & Uptime', 'Hata Logları', 'Müşteri Ticketları']
  },
  {
    email: 'info@ysnsoft.com',
    name: 'YSNSOFT Kurumsal İletişim',
    role: 'sales',
    roleTitle: 'Kurumsal İletişim & Satış Direktörü',
    avatar: '💼',
    permissions: ['Teklif Talepleri (Leads)', 'Resmi PDF Teklif Mektubu', 'Google Meet Randevuları', 'Müşteri CRM']
  },
  {
    email: 'noreply@ysnsoft.com',
    name: 'Sistem & E-Posta Bildirimleri',
    role: 'accounting',
    roleTitle: 'Sistem Otomasyonu & E-Fatura Botu',
    avatar: '⚡',
    permissions: ['E-Fatura & E-Arşiv (GİB)', 'Otomatik SMTP Bildirimleri', 'Banka Entegrasyonları']
  }
];

export const DEFAULT_SMTP_SETTINGS: SmtpSettings = {
  host: 'mail.ysnsoft.com',
  port: 587,
  user: 'noreply@ysnsoft.com',
  pass: '',
  fromName: 'YSNSOFT',
  fromEmail: 'noreply@ysnsoft.com',
  secure: true
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  companyName: 'YSNSOFT',
  companyPhone: '+90 532 725 50 98',
  whatsappNumber: '+90 532 725 50 98',
  supportEmail: 'destek@ysnsoft.com',
  infoEmail: 'info@ysnsoft.com',
  notificationEmail: 'noreply@ysnsoft.com',
  address: 'Pendik / İstanbul • Türkiye',
  mersisNo: '',
  ticaretSicilNo: ''
};

// Talepler, randevular ve faturalar artık sunucuda (src/lib/crm-client.ts). Eski tarayıcı-içi kopyalar ve
// uydurma örnek kayıtlar 2026-11-18 kaldırıldı.

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
  companyName: 'YSNSOFT'
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

  // Sync to server-side DB
  fetch('/api/sites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  }).catch(() => {});
}

export function deleteProduct(id: string) {
  if (typeof window === 'undefined') return;
  const current = getStoredProducts();
  const filtered = current.filter(p => p.id !== id);
  localStorage.setItem('ysn_admin_products', JSON.stringify(filtered));

  // Sync to server-side DB
  fetch(`/api/sites?id=${encodeURIComponent(id)}`, {
    method: 'DELETE'
  }).catch(() => {});
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
  try {
    const parsed = { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(data) } as SystemSettings;
    if (parsed.mersisNo === '0987654321000015') parsed.mersisNo = '';
    if (parsed.ticaretSicilNo === '348291-5') parsed.ticaretSicilNo = '';
    if (parsed.companyName === 'YSNSOFT Bilişim Teknolojileri A.Ş.') parsed.companyName = 'YSNSOFT';
    return parsed;
  } catch { return DEFAULT_SYSTEM_SETTINGS; }
}

export function saveSystemSettings(settings: SystemSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ysn_system_settings', JSON.stringify(settings));
}
