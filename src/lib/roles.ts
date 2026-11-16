/**
 * Yönetim paneli rolleri ve yetki matrisi.
 *
 * İstemci ve sunucu ortak kullanır; gizli değer içermez. Menüdeki gizleme yalnızca
 * görünümdür — asıl kontrol her API rotasında `requireRole` ile sunucuda yapılır.
 */

export const ADMIN_ROLES = ['superadmin', 'admin', 'marketing', 'accounting', 'hr', 'engineer'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_MODULES = [
  'overview',
  'leads',
  'prospects',
  'appointments',
  'muhasebe',
  'roller',
  'domains',
  'seo-geo',
  'glm',
  'settings',
] as const;
export type AdminModule = (typeof ADMIN_MODULES)[number];

export type AccessLevel = 'read' | 'write';

export const ROLE_INFO: Record<AdminRole, { label: string; desc: string }> = {
  superadmin: { label: 'Süper Admin', desc: 'Her şey; kullanıcı, rol ve sistem ayarları yalnızca bu rolde.' },
  admin: { label: 'Admin', desc: 'Tüm iş ekranları. Kullanıcı yönetimi ve sistem ayarları hariç.' },
  marketing: { label: 'Pazarlama', desc: 'Müşteri adayları, teklif talepleri, randevular, SEO & GEO, yapay zekâ.' },
  accounting: { label: 'Muhasebe', desc: 'Muhasebe & finans; teklif taleplerini yalnızca görür.' },
  hr: { label: 'İnsan Kaynakları', desc: 'Ekip listesi ve randevular (yalnızca okuma).' },
  engineer: { label: 'Teknik', desc: 'Site kontrol merkezi, SEO & GEO, yapay zekâ stüdyosu.' },
};

export const MODULE_LABELS: Record<AdminModule, string> = {
  overview: 'Genel Bakış',
  leads: 'Teklif Talepleri',
  prospects: 'Müşteri Adayları',
  appointments: 'Randevular',
  muhasebe: 'Muhasebe & Finans',
  roller: 'Roller & Yetkiler',
  domains: 'Site Kontrol Merkezi',
  'seo-geo': 'SEO & GEO',
  glm: 'Yapay Zekâ Stüdyosu',
  settings: 'Sistem Ayarları',
};

const ALL_WRITE = Object.fromEntries(ADMIN_MODULES.map((m) => [m, 'write'])) as Record<AdminModule, AccessLevel>;

const MATRIX: Record<AdminRole, Partial<Record<AdminModule, AccessLevel>>> = {
  superadmin: ALL_WRITE,
  admin: {
    overview: 'read',
    leads: 'write',
    prospects: 'write',
    appointments: 'write',
    muhasebe: 'write',
    roller: 'read',
    domains: 'write',
    'seo-geo': 'write',
    glm: 'write',
  },
  marketing: {
    overview: 'read',
    leads: 'write',
    prospects: 'write',
    appointments: 'write',
    'seo-geo': 'write',
    glm: 'write',
  },
  accounting: { overview: 'read', muhasebe: 'write', leads: 'read' },
  hr: { overview: 'read', roller: 'read', appointments: 'read' },
  engineer: { overview: 'read', domains: 'write', 'seo-geo': 'write', glm: 'write' },
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && (ADMIN_ROLES as readonly string[]).includes(value);
}

export function accessLevel(role: string, module: AdminModule): AccessLevel | null {
  return isAdminRole(role) ? MATRIX[role][module] ?? null : null;
}

export function can(role: string, module: AdminModule, level: AccessLevel = 'read'): boolean {
  const granted = accessLevel(role, module);
  return granted === 'write' || (granted === 'read' && level === 'read');
}
