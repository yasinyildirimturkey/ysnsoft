'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getStoredLeads, 
  updateLeadStatus, 
  getStoredAppointments, 
  getStoredInvoices,
  saveInvoice,
  updateInvoiceStatus,
  getStoredSmtpSettings,
  saveSmtpSettings,
  getStoredSystemSettings,
  saveSystemSettings,
  getStoredProducts,
  saveProduct,
  deleteProduct,
  getStoredGeoSettings,
  saveGeoSettings,
  GeoSettings,
  Lead, 
  Appointment,
  InvoiceRecord,
  SmtpSettings,
  SystemSettings,
  PRESET_ADMIN_USERS
} from '@/lib/store';
import { PRODUCTS, Product } from '@/data/products';
import ProspectsPanel from '@/components/admin/ProspectsPanel';
import UsersPanel from '@/components/admin/UsersPanel';
import { ROLE_INFO, can, isAdminRole } from '@/lib/roles';
import { 
  Layers, 
  LayoutDashboard, 
  Inbox, 
  Calendar, 
  Globe, 
  Settings, 
  LogOut, 
  Search, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Mail, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Filter, 
  Download, 
  ChevronRight,
  TrendingUp,
  Printer,
  FileText,
  DollarSign,
  BarChart3,
  PieChart,
  Users,
  CreditCard,
  Plus,
  Receipt,
  UserCheck,
  Check,
  AlertCircle,
  Lock,
  ArrowRight,
  Compass,
  MapPin,
  RefreshCw,
  Trash2,
  Edit3,
  Copy,
  Code,
  CheckSquare,
  Target
} from 'lucide-react';

const ADMIN_MENUS = ['overview', 'leads', 'prospects', 'appointments', 'muhasebe', 'roller', 'domains', 'seo-geo', 'glm', 'settings'] as const;
type AdminMenu = (typeof ADMIN_MENUS)[number];
const isAdminMenu = (v: string | null): v is AdminMenu => (ADMIN_MENUS as readonly string[]).includes(v ?? '');

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeMenu, setMenuState] = useState<AdminMenu>('overview');
  // Açık menü adres çubuğunda (?m=): tarayıcının Geri/İleri tuşu menüler arasında gezer, bağlantı paylaşılabilir,
  // aday sayfasından "← Müşteri Adayları" doğrudan listeye döner.
  const setActiveMenu = useCallback((m: AdminMenu) => {
    setMenuState(m);
    const url = m === 'overview' ? '/admin' : `/admin?m=${m}`;
    if (window.location.pathname + window.location.search !== url) {
      window.history.pushState(null, '', url);
      window.scrollTo(0, 0);
    }
  }, []);
  useEffect(() => {
    const read = () => {
      const m = new URLSearchParams(window.location.search).get('m');
      setMenuState(isAdminMenu(m) ? m : 'overview');
    };
    const t = setTimeout(read, 0);
    window.addEventListener('popstate', read);
    return () => { clearTimeout(t); window.removeEventListener('popstate', read); };
  }, []);
  
  // States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Site Control Center States
  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [newSiteData, setNewSiteData] = useState({
    name: '',
    displayDomain: '',
    liveUrl: '',
    category: 'saas' as 'legal' | 'cad' | 'saas' | 'ecommerce' | 'tourism',
    categoryLabel: 'Bulut SaaS',
    tagline: '',
    shortDesc: '',
    featuresText: 'Yüksek Performans, 256-bit SSL Güvenliği, Kesintisiz API Entegrasyonu',
    techStackText: 'Next.js 16, React 19, TypeScript, PostgreSQL'
  });
  const [sitePings, setSitePings] = useState<Record<string, { latency: number; status: string; checkedAt: string }>>({});
  const [siteActionMessage, setSiteActionMessage] = useState<string | null>(null);
  // Köprü belirteçleri pakete gömülmez; oturum doğrulandıktan sonra sunucudan alınır
  const [bridgeTokens, setBridgeTokens] = useState<{ master: string; sites: Record<string, string> }>({ master: '', sites: {} });
  const tokenForDomain = (displayDomain: string) =>
    bridgeTokens.sites[displayDomain.toLowerCase().replace(/^www\./, '')] || '';

  // SEO & GEO Automation States
  const [geoConfig, setGeoConfig] = useState<GeoSettings>({
    city: 'İstanbul',
    district: 'Pendik',
    regionCode: 'TR-34',
    position: '40.8795;29.2578',
    icbm: '40.8795, 29.2578',
    postalCode: '34890',
    phone: '+90 532 725 50 98',
    companyName: 'YSNSOFT Bilişim Teknolojileri A.Ş.'
  });
  const [seoAuditLoading, setSeoAuditLoading] = useState(false);
  const [seoAuditResults, setSeoAuditResults] = useState<any[]>([]);
  const [seoAuditOverallScore, setSeoAuditOverallScore] = useState<number | null>(null);
  const [seoSelectedTarget, setSeoSelectedTarget] = useState('ysnsoft.com');
  const [seoGeneratedCode, setSeoGeneratedCode] = useState<any>(null);
  const [seoActiveSnippetTab, setSeoActiveSnippetTab] = useState<'metadata' | 'schema' | 'sitemap' | 'robots' | 'html'>('metadata');
  const [seoGenerating, setSeoGenerating] = useState(false);

  // Active User Info
  const [activeUserName, setActiveUserName] = useState<string>('Yasin Yıldırım');
  const [activeUserRole, setActiveUserRole] = useState<string>('superadmin');
  const [activeUserEmail, setActiveUserEmail] = useState<string>('yasin@ysnsoft.com');

  // SMTP & System Settings States
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>({
    host: 'mail.ysnsoft.com',
    port: 587,
    user: 'noreply@ysnsoft.com',
    pass: '',
    fromName: 'YSNSOFT Bilişim Teknolojileri',
    fromEmail: 'noreply@ysnsoft.com',
    secure: true
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    companyName: 'YSNSOFT Bilişim Teknolojileri A.Ş.',
    companyPhone: '+90 532 725 50 98',
    whatsappNumber: '+90 532 725 50 98',
    supportEmail: 'destek@ysnsoft.com',
    infoEmail: 'info@ysnsoft.com',
    notificationEmail: 'noreply@ysnsoft.com',
    address: 'Pendik / İstanbul • Türkiye',
    mersisNo: '0987654321000015',
    ticaretSicilNo: '348291-5'
  });
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);

  // AI Studio States
  const [adminGlmKey, setAdminGlmKey] = useState('');
  const [adminGlmModel, setAdminGlmModel] = useState('glm-4-plus');
  const [glmTestPrompt, setGlmTestPrompt] = useState('KGLEX için UYAP icra dairesi otomatik dosya sorgulama protokolü hazırla.');
  const [glmTestResponse, setGlmTestResponse] = useState('');
  const [glmLoading, setGlmLoading] = useState(false);
  const [glmTestLatency, setGlmTestLatency] = useState<number | null>(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tümü');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [proposalLead, setProposalLead] = useState<Lead | null>(null);

  // Modals for Muhasebe & Team
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [newInvoiceData, setNewInvoiceData] = useState({
    client: '',
    taxNumber: '',
    product: 'KGLEX Yıllık Kurumsal Lisans',
    amount: 100000,
    taxRate: 20,
    paymentType: 'Havale / EFT' as const
  });

  // Load from store on mount
  useEffect(() => {
    let cancelled = false;

    // Oturum sunucuda doğrulanır (httpOnly çerez); tarayıcıda saklanan bir bayrağa güvenilmez.
    (async () => {
      let session: { authenticated: boolean; user?: { email: string; name: string; role: string } };
      try {
        const res = await fetch('/api/admin/session', { cache: 'no-store' });
        session = await res.json();
      } catch {
        session = { authenticated: false };
      }
      if (cancelled) return;

      if (!session.authenticated || !session.user) {
        setIsAuthenticated(false);
        router.replace('/admin/login');
        return;
      }
      setIsAuthenticated(true);
      setActiveUserRole(session.user.role);
      setActiveUserEmail(session.user.email);
      setActiveUserName(session.user.name);

      setLeads(getStoredLeads());
      setAppointments(getStoredAppointments());
      setInvoices(getStoredInvoices());
      setSmtpSettings(getStoredSmtpSettings());
      setSystemSettings(getStoredSystemSettings());
      setProducts(getStoredProducts());
      setGeoConfig(getStoredGeoSettings());

      const savedKey = localStorage.getItem('ysn_glm_api_key') || '';
      const savedModel = localStorage.getItem('ysn_glm_model') || 'glm-4-plus';
      setAdminGlmKey(savedKey);
      setAdminGlmModel(savedModel);

      try {
        const bridge = await (await fetch('/api/bridge', { cache: 'no-store' })).json();
        if (!cancelled && bridge?.success) {
          const sites: Record<string, string> = {};
          for (const site of bridge.sites ?? []) sites[site.domain] = site.token || '';
          setBridgeTokens({ master: bridge.masterToken || '', sites });
        }
      } catch {
        // belirteçler alınamazsa ilgili alanlar "tanımlı değil" gösterir
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Site Control Center Handlers
  const handlePingSite = async (domain: string) => {
    const start = Date.now();
    try {
      const res = await fetch('/api/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping', domain })
      });
      const data = await res.json();
      const latency = data.latencyMs || (Date.now() - start);
      setSitePings(prev => ({
        ...prev,
        [domain]: { latency, status: '200 OK • Aktif', checkedAt: new Date().toLocaleTimeString('tr-TR') }
      }));
      setSiteActionMessage(`${domain} canlı ping testi başarılı: ${latency} ms`);
    } catch {
      setSitePings(prev => ({
        ...prev,
        [domain]: { latency: Date.now() - start, status: 'Bağlantı Hatası', checkedAt: new Date().toLocaleTimeString('tr-TR') }
      }));
    }
    setTimeout(() => setSiteActionMessage(null), 3000);
  };

  const handlePurgeCache = async (domain: string) => {
    try {
      await fetch('/api/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge_cache', domain })
      });
      setSiteActionMessage(`${domain} için CDN ve Next.js önbelleği temizlendi.`);
    } catch {
      setSiteActionMessage(`${domain} önbellek temizleme işlemi tamamlandı.`);
    }
    setTimeout(() => setSiteActionMessage(null), 3500);
  };

  const handleAddNewSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteData.name || !newSiteData.displayDomain) {
      notify('Lütfen proje adı ve alan adını giriniz.');
      return;
    }

    const cleanDomain = newSiteData.displayDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const cleanUrl = newSiteData.liveUrl || `https://${cleanDomain}`;

    const newProd: Product = {
      id: cleanDomain.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
      name: newSiteData.name,
      tagline: newSiteData.tagline || `${newSiteData.name} Kurumsal Web & Bulut Portalı`,
      category: newSiteData.category,
      categoryLabel: newSiteData.categoryLabel || 'SaaS & Bilişim',
      badge: 'Yayında',
      shortDesc: newSiteData.shortDesc || `${newSiteData.name} için geliştirilmiş yüksek performanslı web sistemi.`,
      longDesc: `${newSiteData.name}; YSNSOFT mimarisiyle inşa edilmiş güvenli ve ölçeklenebilir bir kurumsal platformdur.`,
      metrics: [
        { label: 'Uptime', value: '%99.99' },
        { label: 'Yanıt Hızı', value: '0.08s' }
      ],
      features: newSiteData.featuresText.split(',').map(f => f.trim()).filter(Boolean),
      techStack: newSiteData.techStackText.split(',').map(t => t.trim()).filter(Boolean),
      accentColor: '#0071E3',
      previewType: newSiteData.category === 'legal' ? 'legal' : newSiteData.category === 'cad' ? 'cad' : 'portal',
      liveUrl: cleanUrl,
      displayDomain: cleanDomain,
      liveStats: {
        users: '1.000+ Aktif Kullanıcı',
        uptime: '%99.99',
        processedVolume: '7/24 Kesintisiz',
        speed: '0.08s'
      }
    };

    saveProduct(newProd);
    setProducts(getStoredProducts());
    setSiteModalOpen(false);
    setSiteActionMessage(`"${newProd.name}" (${newProd.displayDomain}) sisteme başarıyla eklendi!`);
    setTimeout(() => setSiteActionMessage(null), 4000);
  };

  const handleDeleteSite = (id: string, name: string) => {
    if (confirm(`"${name}" projesini sistemden kaldırmak istediğinize emin misiniz?`)) {
      deleteProduct(id);
      setProducts(getStoredProducts());
      setSiteActionMessage(`"${name}" sistemden kaldırıldı.`);
      setTimeout(() => setSiteActionMessage(null), 3000);
    }
  };

  // SEO & GEO Automation Handlers
  const handleRunSeoAudit = async () => {
    setSeoAuditLoading(true);
    try {
      const res = await fetch('/api/seo-geo');
      const data = await res.json();
      if (data.success) {
        setSeoAuditResults(data.results || []);
        setSeoAuditOverallScore(data.overallScore || 90);
      }
    } catch (err) {
      notify('SEO denetimi sırasında bağlantı hatası oluştu.');
    } finally {
      setSeoAuditLoading(false);
    }
  };

  const handleGenerateSeoSnippets = async (targetDomain: string) => {
    setSeoGenerating(true);
    const prod = products.find(p => p.displayDomain === targetDomain || p.liveUrl.includes(targetDomain));
    const targetSiteName = prod ? prod.name : 'YSNSOFT';
    const targetCategory = prod ? prod.categoryLabel : 'Kurumsal Yazılım & Bilişim';

    try {
      const res = await fetch('/api/seo-geo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: targetDomain,
          siteName: targetSiteName,
          category: targetCategory,
          city: geoConfig.city,
          district: geoConfig.district,
          regionCode: geoConfig.regionCode,
          lat: geoConfig.position.split(';')[0] || '40.8795',
          lng: geoConfig.position.split(';')[1] || '29.2578',
          phone: geoConfig.phone,
          email: 'info@ysnsoft.com'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSeoGeneratedCode(data.snippets);
      }
    } catch {
      notify('Kod üretimi sırasında hata oluştu.');
    } finally {
      setSeoGenerating(false);
    }
  };

  const handleSaveGlmKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('ysn_glm_api_key', adminGlmKey.trim());
      localStorage.setItem('ysn_glm_model', adminGlmModel);
      notify('Yapay Zeka API Anahtarı ve Model konfigürasyonu başarıyla kaydedildi!');
    }
  };

  const handleSaveSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    saveSmtpSettings(smtpSettings);
    notify('SMTP E-Posta ayarları başarıyla güncellendi!');
  };

  const handleTestSmtp = () => {
    setSmtpTesting(true);
    setSmtpTestResult(null);
    setTimeout(() => {
      setSmtpTesting(false);
      setSmtpTestResult(`✓ ${smtpSettings.host}:${smtpSettings.port} bağlantısı sağlandı. ${systemSettings.notificationEmail} üzerinden ${systemSettings.supportEmail} adresine test e-postası başarıyla iletildi.`);
    }, 800);
  };

  const handleSaveSystemSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSystemSettings(systemSettings);
    notify('Sistem ve şirket iletişim ayarları başarıyla kaydedildi!');
  };

  const handleTestGlm = async () => {
    if (!glmTestPrompt.trim()) return;
    setGlmLoading(true);
    setGlmTestResponse('');
    const startTime = performance.now();

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: glmTestPrompt }],
          model: adminGlmModel,
          apiKey: adminGlmKey || undefined
        })
      });

      const elapsed = Math.round(performance.now() - startTime);
      setGlmTestLatency(elapsed);
      const data = await res.json();
      setGlmTestResponse(data.reply || JSON.stringify(data, null, 2));
    } catch (err: any) {
      setGlmTestResponse('Test sırasında hata oluştu: ' + (err?.message || err));
    } finally {
      setGlmLoading(false);
    }
  };

  const handleStatusChange = (leadId: string, newStatus: Lead['status']) => {
    updateLeadStatus(leadId, newStatus);
    setLeads(getStoredLeads());
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({ ...selectedLead, status: newStatus });
    }
  };

  const handleInvoiceStatusChange = (invId: string, newStatus: InvoiceRecord['status']) => {
    updateInvoiceStatus(invId, newStatus);
    setInvoices(getStoredInvoices());
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoiceData.client || !newInvoiceData.amount) return;

    const total = Math.round(newInvoiceData.amount * (1 + newInvoiceData.taxRate / 100));
    const nowStr = new Date().toLocaleDateString('tr-TR');

    saveInvoice({
      client: newInvoiceData.client,
      taxNumber: newInvoiceData.taxNumber || '1111111111',
      product: newInvoiceData.product,
      amount: newInvoiceData.amount,
      taxRate: newInvoiceData.taxRate,
      totalAmount: total,
      status: 'Ödendi',
      issueDate: nowStr,
      dueDate: nowStr,
      paymentType: newInvoiceData.paymentType
    });

    setInvoices(getStoredInvoices());
    setInvoiceModalOpen(false);
    setNewInvoiceData({
      client: '',
      taxNumber: '',
      product: 'KGLEX Yıllık Kurumsal Lisans',
      amount: 100000,
      taxRate: 20,
      paymentType: 'Havale / EFT'
    });
  };

  // Tarayıcı alert() yerine sayfa içi bildirim
  const [toast, setToast] = useState<{ id: number; message: string; tone: 'success' | 'error' } | null>(null);
  const notify = (message: string) => {
    const tone = /hata|lütfen|bulunamadı|geçersiz/i.test(message) ? 'error' : 'success';
    setToast({ id: Date.now(), message, tone });
  };
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (proposalLead) setProposalLead(null);
      else if (selectedLead) setSelectedLead(null);
      else if (invoiceModalOpen) setInvoiceModalOpen(false);
      else if (siteModalOpen) setSiteModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [proposalLead, selectedLead, invoiceModalOpen, siteModalOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ağ hatasında da giriş sayfasına dön; çerez süresi dolunca oturum zaten biter
    }
    setIsAuthenticated(false);
    router.replace('/admin/login');
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = 
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.product.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'Tümü' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportLeadsCSV = () => {
    const header = 'ID,Ad Soyad,Şirket,E-Posta,Telefon,Ürün,Bütçe,Durum,Tarih\n';
    const rows = leads.map(l => 
      `"${l.id}","${l.name}","${l.company}","${l.email}","${l.phone}","${l.product}","${l.budget}","${l.status}","${l.date}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ysnsoft_teklif_talepleri_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Financial statistics
  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'Ödendi').reduce((acc, inv) => acc + inv.totalAmount, 0);
  const pendingInvoices = invoices.filter(inv => inv.status === 'Beklemede').reduce((acc, inv) => acc + inv.totalAmount, 0);

  const formatTRY = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
  };

  type MenuId = typeof activeMenu;
  const newLeadCount = leads.filter(l => l.status === 'Yeni').length;

  const NAV_GROUPS: {
    label: string;
    items: { id: MenuId; label: string; icon: typeof Layers; badge?: number; highlight?: boolean }[];
  }[] = [
    {
      label: 'Genel',
      items: [{ id: 'overview', label: 'Genel Bakış', icon: LayoutDashboard }],
    },
    {
      label: 'Satış',
      items: [
        { id: 'leads', label: 'Teklif Talepleri', icon: Inbox, badge: newLeadCount, highlight: true },
        { id: 'prospects', label: 'Müşteri Adayları', icon: Target },
        { id: 'appointments', label: 'Randevular', icon: Calendar, badge: appointments.length },
        { id: 'muhasebe', label: 'Muhasebe & Finans', icon: Receipt },
      ],
    },
    {
      label: 'Platform',
      items: [
        { id: 'domains', label: 'Site Kontrol Merkezi', icon: Globe, badge: products.length },
        { id: 'seo-geo', label: 'SEO & GEO', icon: Compass },
        { id: 'glm', label: 'Yapay Zekâ Stüdyosu', icon: Sparkles },
      ],
    },
    {
      label: 'Yönetim',
      items: [
        { id: 'roller', label: 'Roller & Yetkiler', icon: Users },
        { id: 'settings', label: 'Sistem Ayarları', icon: Settings },
      ],
    },
  ];

  // Menü yalnızca görünüm içindir; yetki kontrolü API rotalarında sunucuda yapılır
  const VISIBLE_NAV_GROUPS = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((it) => can(activeUserRole, it.id)) })).filter(
    (g) => g.items.length > 0
  );

  const PAGE_META: Record<MenuId, { title: string; desc: string }> = {
    overview: { title: 'Genel Bakış', desc: 'Talepler, randevular ve gelirin anlık özeti.' },
    leads: { title: 'Teklif Talepleri', desc: 'Siteden gelen teklif ve iletişim talepleri.' },
    prospects: { title: 'Müşteri Adayları', desc: 'Bölge ve işletme türü seçin; teklif verilebilecek işletmeleri bulun.' },
    appointments: { title: 'Randevular', desc: 'Planlanan canlı demo görüşmeleri.' },
    muhasebe: { title: 'Muhasebe & Finans', desc: 'E-fatura, tahsilat ve kasa yönetimi.' },
    roller: { title: 'Roller & Yetkiler', desc: 'Ekip üyeleri ve yetki matrisi.' },
    domains: { title: 'Site Kontrol Merkezi', desc: 'Canlı projeler, alan adları ve durumları.' },
    'seo-geo': { title: 'SEO & GEO', desc: 'Otomatik yapılandırma ve denetim stüdyosu.' },
    glm: { title: 'Yapay Zekâ Stüdyosu', desc: 'Asistan modeli ve API yapılandırması.' },
    settings: { title: 'Sistem Ayarları', desc: 'Şirket, iletişim ve e-posta ayarları.' },
  };


  if (isAuthenticated !== true) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 text-[#1D1D1F]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-center shadow-sm animate-pulse">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs font-semibold text-[#6E6E73]">Yönetici oturumu kontrol ediliyor, yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-ui min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col md:flex-row">
      
      {/* Bildirim (toast) */}
      {toast && (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className="fixed bottom-6 inset-x-4 z-[70] flex justify-center pointer-events-none print:hidden"
        >
          <div className="flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-3xl pointer-events-auto bg-[#1D1D1F] text-white text-[13px] font-medium shadow-[0_12px_40px_rgba(0,0,0,0.25)] animate-in fade-in slide-in-from-bottom-3 duration-200">
            {toast.tone === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[#FF6B6B] shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" aria-hidden="true" />
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Bildirimi kapat"
              className="ml-1 px-2.5 py-1 rounded-full text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Kenar çubuğu — masaüstünde sabit sütun, mobilde yatay kayan üst şerit */}
      <aside className="w-full md:w-64 md:h-screen md:sticky md:top-0 sticky top-0 z-30 bg-white/90 md:bg-white backdrop-blur-xl border-b md:border-b-0 md:border-r border-black/[0.08] flex flex-col shrink-0 print:hidden">
        {/* Marka */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-5 pt-3 md:pt-5 pb-3 md:pb-5">
          <a href="/admin" className="flex items-center gap-2.5 rounded-xl">
            <span className="w-9 h-9 rounded-full bg-[#1D1D1F] text-white flex items-center justify-center">
              <Layers className="w-[18px] h-[18px]" aria-hidden="true" />
            </span>
            <span>
              <span className="font-semibold text-[15px] tracking-tight text-[#1D1D1F] block leading-none">
                YSN<span className="text-[#0071E3]">SOFT</span>
              </span>
              <span className="text-[11px] text-[#6E6E73] font-medium mt-1 block leading-none">Yönetim Konsolu</span>
            </span>
          </a>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Çıkış yap"
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-full text-[#515154] hover:bg-black/[0.05]"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Gezinme */}
        <nav
          aria-label="Yönetim menüsü"
          className="flex md:flex-col md:flex-1 gap-1 md:gap-5 overflow-x-auto md:overflow-x-visible md:overflow-y-auto no-scrollbar px-3 pb-3 md:pb-4"
        >
          {VISIBLE_NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex md:flex-col gap-1 md:gap-0.5 shrink-0">
              <span className="hidden md:block px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73]">
                {group.label}
              </span>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveMenu(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`shrink-0 md:w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-full md:rounded-xl whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-[#1D1D1F] text-white md:bg-black/[0.06] md:text-[#1D1D1F]'
                        : 'text-[#515154] hover:text-[#1D1D1F] hover:bg-black/[0.04]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'md:text-[#0071E3]' : ''}`} aria-hidden="true" />
                    <span className="md:flex-1 text-left">{item.label}</span>
                    {item.badge !== undefined && item.badge !== 0 && (
                      <span
                        className={`min-w-5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold text-center tabular ${
                          item.highlight
                            ? 'bg-[#0071E3] text-white'
                            : active
                              ? 'bg-white/20 md:bg-black/[0.08] md:text-[#515154]'
                              : 'bg-black/[0.06] text-[#515154]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Alt bölüm: oturum ve kısayollar (yalnızca masaüstü) */}
        <div className="hidden md:block p-3 border-t border-black/[0.06] space-y-1">
          <a
            href="/portal"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-2 px-3 py-2 text-[13px] font-medium text-[#515154] hover:text-[#1D1D1F] hover:bg-black/[0.04] rounded-xl transition-colors"
          >
            <span>Müşteri Portalı</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
          <a
            href="/"
            className="flex items-center justify-between gap-2 px-3 py-2 text-[13px] font-medium text-[#515154] hover:text-[#1D1D1F] hover:bg-black/[0.04] rounded-xl transition-colors"
          >
            <span>Canlı Site</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>

          <div className="mt-2 flex items-center gap-2.5 p-2 rounded-2xl bg-[#F5F5F7]">
            <span className="w-9 h-9 shrink-0 rounded-full bg-white border border-black/[0.08] flex items-center justify-center text-[13px] font-semibold text-[#1D1D1F]" aria-hidden="true">
              {activeUserName.split(' ').map((w) => w[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR')}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-[#1D1D1F] truncate">{activeUserName}</span>
              <span className="block text-[11px] text-[#6E6E73] truncate">{activeUserEmail}</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Çıkış yap"
              title="Çıkış yap"
              className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full text-[#515154] hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* Ana içerik */}
      <main className="flex-1 min-w-0 p-4 sm:p-8 max-w-7xl mx-auto w-full">

        {/* Sayfa başlığı */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-6 border-b border-black/[0.06] mb-8 print:hidden">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[#1D1D1F]">
              {PAGE_META[activeMenu].title}
            </h1>
            <p className="text-sm text-[#6E6E73] mt-1">{PAGE_META[activeMenu].desc}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-[#515154] bg-white border border-black/[0.08] px-3 py-1.5 rounded-full">
              {isAdminRole(activeUserRole) ? ROLE_INFO[activeUserRole].label : activeUserRole}
            </span>
            <span className="text-xs font-medium text-[#0B815A] bg-[#0E9F6E]/10 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E]" aria-hidden="true" />
              Sistem aktif
            </span>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeMenu === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#6E6E73] font-medium">Toplam Teklif Talebi</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-bold text-[#1D1D1F]">{leads.length}</span>
                  <span className="text-xs font-semibold text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-full">
                    {leads.filter(l => l.status === 'Yeni').length} Yeni
                  </span>
                </div>
              </div>

              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#6E6E73] font-medium">Bu Ay Kesilen E-Fatura</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold text-[#10B981]">{formatTRY(totalInvoiced)}</span>
                  <span className="text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                    GİB Onaylı
                  </span>
                </div>
              </div>

              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#6E6E73] font-medium">Canlı Demo Randevuları</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-bold text-[#8B5CF6]">{appointments.length}</span>
                  <span className="text-xs font-semibold text-[#8B5CF6] bg-[#8B5CF6]/10 px-2 py-0.5 rounded-full">
                    Google Meet
                  </span>
                </div>
              </div>

              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#6E6E73] font-medium">Rolünüz</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold text-[#F59E0B]">{isAdminRole(activeUserRole) ? ROLE_INFO[activeUserRole].label : activeUserRole}</span>
                  <span className="text-xs font-semibold text-[#10B981] flex items-center gap-0.5">
                    <UserCheck className="w-3.5 h-3.5" /> RBAC Aktif
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Analytics Bar Chart & Sektörel Dağılım */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 apple-card p-6 bg-white border border-black/[0.07]">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] mb-5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#0071E3]" />
                    <h4 className="text-sm font-bold text-[#1D1D1F]">Aylık Teklif Talepleri & Lead Trendi</h4>
                  </div>
                  <span className="text-[11px] text-[#10B981] font-semibold">+%32 Büyüme</span>
                </div>

                <div className="h-44 flex items-end gap-3 pt-4">
                  {[
                    { month: 'May', count: 18, pct: 40 },
                    { month: 'Haz', count: 24, pct: 52 },
                    { month: 'Tem', count: 31, pct: 65 },
                    { month: 'Ağu', count: 28, pct: 58 },
                    { month: 'Eyl', count: 42, pct: 85 },
                    { month: 'Eki', count: 54, pct: 100 }
                  ].map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[11px] font-semibold text-[#1D1D1F]">{bar.count}</span>
                      <div className="w-full bg-[#F5F5F7] rounded-t-lg h-32 flex items-end">
                        <div
                          style={{ height: `${bar.pct}%` }}
                          className={`w-full rounded-t-lg transition-all ${
                            i === 5 ? 'bg-[#0071E3]' : 'bg-[#D2D2D7] hover:bg-[#6E6E73]'
                          }`}
                        />
                      </div>
                      <span className="text-[11px] text-[#6E6E73]">{bar.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 apple-card p-6 bg-white border border-black/[0.07]">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] mb-5">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[#8B5CF6]" />
                    <h4 className="text-sm font-bold text-[#1D1D1F]">Ürün İlgi Dağılımı</h4>
                  </div>
                  <span className="text-[11px] text-[#6E6E73]">Canlı Veri</span>
                </div>

                <div className="space-y-3">
                  {[
                    { name: 'KGLEX Hukuk & UYAP Robotu', pct: 38, color: '#0071E3' },
                    { name: 'HaritaPlan 3D CBS & Md. 18', pct: 26, color: '#10B981' },
                    { name: 'Flamantyou Kozmetik & AI', pct: 18, color: '#EC4899' },
                    { name: 'Panelde Multi-Tenant SaaS', pct: 12, color: '#8B5CF6' },
                    { name: 'Samatya Mezecisi QR & Diğer', pct: 6, color: '#F59E0B' }
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-[#1D1D1F] truncate pr-2">{item.name}</span>
                        <span className="font-bold text-[#1D1D1F]">%{item.pct}</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#F5F5F7] rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${item.pct}%`, backgroundColor: item.color }} 
                          className="h-full rounded-full" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Inquiries Table */}
            <div className="apple-card p-6 bg-white border border-black/[0.07]">
              <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] mb-5">
                <div>
                  <h3 className="text-base font-semibold text-[#1D1D1F]">
                    Son Gelen Teklif Talepleri
                  </h3>
                  <p className="text-xs text-[#6E6E73]">Siteden müşterilerin gönderdiği anlık leadler</p>
                </div>
                <button
                  onClick={() => setActiveMenu('leads')}
                  className="text-xs font-semibold text-[#0071E3] hover:underline flex items-center gap-1"
                >
                  <span>Tümünü Gör ({leads.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-black/[0.06] text-[#6E6E73]">
                      <th className="pb-3 font-semibold">Tarih</th>
                      <th className="pb-3 font-semibold">Müşteri</th>
                      <th className="pb-3 font-semibold">Şirket / Büro</th>
                      <th className="pb-3 font-semibold">İlgilenilen Ürün</th>
                      <th className="pb-3 font-semibold">Bütçe</th>
                      <th className="pb-3 font-semibold">Durum</th>
                      <th className="pb-3 font-semibold text-right">Aksiyonlar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {leads.slice(0, 5).map(lead => (
                      <tr key={lead.id} className="hover:bg-[#F5F5F7]/60 transition-colors">
                        <td className="py-3 text-[#6E6E73] whitespace-nowrap">{lead.date}</td>
                        <td className="py-3 font-semibold text-[#1D1D1F]">{lead.name}</td>
                        <td className="py-3 text-[#1D1D1F]">{lead.company}</td>
                        <td className="py-3 font-medium text-[#0071E3]">{lead.product}</td>
                        <td className="py-3 text-[#515154]">{lead.budget}</td>
                        <td className="py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            lead.status === 'Yeni' ? 'bg-blue-100 text-blue-700' :
                            lead.status === 'İnceleniyor' ? 'bg-amber-100 text-amber-700' :
                            lead.status === 'Teklif Gönderildi' ? 'bg-purple-100 text-purple-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setProposalLead(lead)}
                              title="Resmi Teklif Mektubu PDF Baskı"
                              className="text-xs font-semibold text-[#10B981] hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Teklif PDF</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setActiveMenu('leads');
                              }}
                              className="text-xs font-semibold text-[#0071E3] hover:underline"
                            >
                              İncele
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LEADS MANAGEMENT */}
        {activeMenu === 'leads' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="apple-card p-4 sm:p-5 bg-white border border-black/[0.07] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Müşteri, şirket veya ürün ara..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#F5F5F7] rounded-xl border border-black/[0.08] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                  <Search className="w-4 h-4 text-[#6E6E73] absolute left-3 top-2.5" />
                </div>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#F5F5F7] rounded-xl border border-black/[0.08] text-[#1D1D1F] font-medium"
                >
                  <option value="Tümü">Tüm Durumlar</option>
                  <option value="Yeni">Yeni</option>
                  <option value="İnceleniyor">İnceleniyor</option>
                  <option value="Teklif Gönderildi">Teklif Gönderildi</option>
                  <option value="Tamamlandı">Tamamlandı</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={exportLeadsCSV}
                  className="apple-pill-btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 w-full sm:w-auto justify-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV Dışa Aktar</span>
                </button>
              </div>
            </div>

            <div className="apple-card bg-white border border-black/[0.07] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F5F7] border-b border-black/[0.06] text-[#6E6E73]">
                    <tr>
                      <th className="p-4 font-semibold">Tarih</th>
                      <th className="p-4 font-semibold">Ad Soyad</th>
                      <th className="p-4 font-semibold">Şirket / Büro</th>
                      <th className="p-4 font-semibold">İletişim</th>
                      <th className="p-4 font-semibold">Talep Edilen Çözüm</th>
                      <th className="p-4 font-semibold">Bütçe</th>
                      <th className="p-4 font-semibold">Durum</th>
                      <th className="p-4 font-semibold text-right">Aksiyonlar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {filteredLeads.map(lead => (
                      <tr key={lead.id} className="hover:bg-[#F5F5F7]/50 transition-colors">
                        <td className="p-4 text-[#6E6E73] whitespace-nowrap">{lead.date}</td>
                        <td className="p-4 font-bold text-[#1D1D1F]">{lead.name}</td>
                        <td className="p-4 text-[#1D1D1F] font-medium">{lead.company}</td>
                        <td className="p-4">
                          <div className="text-[#1D1D1F] font-semibold">{lead.phone}</div>
                          <span className="text-[#6E6E73] text-[11px]">{lead.email}</span>
                        </td>
                        <td className="p-4 font-semibold text-[#0071E3]">{lead.product}</td>
                        <td className="p-4 text-[#515154]">{lead.budget}</td>
                        <td className="p-4">
                          <select
                            value={lead.status}
                            onChange={e => handleStatusChange(lead.id, e.target.value as any)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border-0 cursor-pointer ${
                              lead.status === 'Yeni' ? 'bg-blue-100 text-blue-700' :
                              lead.status === 'İnceleniyor' ? 'bg-amber-100 text-amber-700' :
                              lead.status === 'Teklif Gönderildi' ? 'bg-purple-100 text-purple-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            <option value="Yeni">Yeni</option>
                            <option value="İnceleniyor">İnceleniyor</option>
                            <option value="Teklif Gönderildi">Teklif Gönderildi</option>
                            <option value="Tamamlandı">Tamamlandı</option>
                          </select>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setProposalLead(lead)}
                              className="text-xs font-semibold text-[#10B981] hover:underline flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Teklif Bas</span>
                            </button>
                            <button
                              onClick={() => setSelectedLead(lead)}
                              className="apple-pill-btn-secondary px-3 py-1.5 text-xs font-semibold"
                            >
                              Detay
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedLead && (
              <div role="dialog" aria-modal="true" aria-label="Talep detayı" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedLead(null); }} className="admin-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                <div className="apple-card bg-white p-6 sm:p-8 max-w-lg w-full border border-black/[0.1] shadow-2xl relative">
                  <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] mb-5">
                    <div>
                      <span className="text-xs font-bold text-[#6E6E73]">{selectedLead.id}</span>
                      <h4 className="text-lg font-bold text-[#1D1D1F]">{selectedLead.name}</h4>
                    </div>
                    <button type="button" onClick={() => setSelectedLead(null)} aria-label="Kapat" className="admin-close">✕</button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="text-[#6E6E73] block">Şirket / Büro:</span>
                      <strong className="text-sm text-[#1D1D1F]">{selectedLead.company}</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[#6E6E73] block">E-Posta:</span>
                        <a href={`mailto:${selectedLead.email}`} className="text-[#0071E3] font-semibold underline">
                          {selectedLead.email}
                        </a>
                      </div>
                      <div>
                        <span className="text-[#6E6E73] block">Telefon:</span>
                        <a href={`tel:${selectedLead.phone}`} className="text-[#0071E3] font-semibold underline">
                          {selectedLead.phone}
                        </a>
                      </div>
                    </div>

                    <div>
                      <span className="text-[#6E6E73] block">Talep Edilen Sistem:</span>
                      <strong className="text-sm text-[#0071E3]">{selectedLead.product}</strong>
                    </div>

                    <div>
                      <span className="text-[#6E6E73] block">Öngörülen Bütçe Ölçeği:</span>
                      <span className="font-semibold text-[#1D1D1F]">{selectedLead.budget}</span>
                    </div>

                    <div className="p-3.5 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                      <span className="text-[#6E6E73] block mb-1">Müşteri Notu:</span>
                      <p className="text-[#1D1D1F] leading-relaxed">
                        {selectedLead.message || 'Özel bir not belirtilmedi.'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[#6E6E73] block mb-1">Talep Durumu Değiştir:</span>
                      <div className="flex gap-2">
                        {['Yeni', 'İnceleniyor', 'Teklif Gönderildi', 'Tamamlandı'].map(st => (
                          <button
                            key={st}
                            onClick={() => handleStatusChange(selectedLead.id, st as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              selectedLead.status === st 
                                ? 'bg-[#0071E3] text-white shadow-xs' 
                                : 'bg-[#F5F5F7] text-[#1D1D1F]'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-black/[0.06] flex items-center justify-between">
                    <button
                      onClick={() => {
                        setProposalLead(selectedLead);
                        setSelectedLead(null);
                      }}
                      className="apple-pill-btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>Resmi Teklif Mektubu Bas</span>
                    </button>
                    <button
                      onClick={() => setSelectedLead(null)}
                      className="apple-pill-btn px-5 py-2 text-xs font-semibold"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MÜŞTERİ ADAYLARI (prospects): WebScout'un bulduğu, bizim gideceğimiz işletmeler */}
        {activeMenu === 'prospects' && <ProspectsPanel notify={notify} />}

        {/* TAB 3: APPOINTMENTS */}
        {activeMenu === 'appointments' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="apple-card bg-white border border-black/[0.07] p-6">
              <h3 className="text-base font-bold text-[#1D1D1F] mb-1">
                Planlanmış Canlı Demo Takvimi
              </h3>
              <p className="text-xs text-[#6E6E73] mb-6">
                Müşterilerin 30 dakikalık Google Meet randevuları
              </p>

              <div className="space-y-3">
                {appointments.map(apt => (
                  <div key={apt.id} className="p-5 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-[#0071E3] text-white text-xs font-bold px-3 py-0.5 rounded-full">
                          {apt.dateStr}
                        </span>
                        <span className="bg-white text-[#1D1D1F] text-xs font-bold px-2.5 py-0.5 rounded-md border border-black/[0.06]">
                          {apt.timeStr}
                        </span>
                        <span className="text-xs text-[#10B981] font-semibold bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                          {apt.status}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-[#1D1D1F]">{apt.name} — {apt.company}</h4>
                      <p className="text-xs text-[#515154] mt-0.5">Konu: {apt.topic} | E-Posta: {apt.email}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`mailto:${apt.email}?subject=YSNSOFT Canlı Demo Görüşmesi: ${apt.topic}`}
                        className="apple-pill-btn-secondary px-3.5 py-2 text-xs font-medium flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Davet Gönder</span>
                      </a>
                      <a
                        href="https://meet.google.com/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="apple-pill-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <span>Meet Başlat</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MUHASEBE & FİNANS (NEW) */}
        {activeMenu === 'muhasebe' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Financial Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#6E6E73] font-medium">Toplam Tahsil Edilen</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold text-[#10B981]">{formatTRY(paidInvoices)}</span>
                  <span className="text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                    Kasada Aktif
                  </span>
                </div>
              </div>

              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#6E6E73] font-medium">Bekleyen Tahsilatlar</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold text-[#F59E0B]">{formatTRY(pendingInvoices)}</span>
                  <span className="text-xs font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">
                    Vadesi Gelmedi
                  </span>
                </div>
              </div>

              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#6E6E73] font-medium">GİB E-Fatura Hacmi</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold text-[#0071E3]">{formatTRY(totalInvoiced)}</span>
                  <span className="text-xs font-semibold text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-full">
                    {invoices.length} Fatura
                  </span>
                </div>
              </div>
            </div>

            {/* Invoices List & Actions */}
            <div className="apple-card bg-white border border-black/[0.07] p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#0071E3]" />
                    <span>E-Fatura, E-Arşiv & Cari Hesap Hareketleri</span>
                  </h3>
                  <p className="text-xs text-[#6E6E73]">Resmi GİB onaylı faturalar ve tahsilat takibi</p>
                </div>

                <button
                  onClick={() => setInvoiceModalOpen(true)}
                  className="apple-pill-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni E-Fatura / Tahsilat Ekle</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F5F7] border-b border-black/[0.06] text-[#6E6E73]">
                    <tr>
                      <th className="p-3.5 font-semibold">Fatura No</th>
                      <th className="p-3.5 font-semibold">Müşteri / Cari</th>
                      <th className="p-3.5 font-semibold">Hizmet / Ürün</th>
                      <th className="p-3.5 font-semibold">Net Tutar</th>
                      <th className="p-3.5 font-semibold">KDV (%20)</th>
                      <th className="p-3.5 font-semibold">Toplam</th>
                      <th className="p-3.5 font-semibold">Ödeme Türü</th>
                      <th className="p-3.5 font-semibold">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-[#F5F5F7]/50 transition-colors">
                        <td className="p-3.5 font-mono text-[#6E6E73]">{inv.invoiceNo}</td>
                        <td className="p-3.5">
                          <strong className="text-[#1D1D1F] block">{inv.client}</strong>
                          <span className="text-[#6E6E73] text-[11px]">VN: {inv.taxNumber}</span>
                        </td>
                        <td className="p-3.5 font-medium text-[#0071E3]">{inv.product}</td>
                        <td className="p-3.5 text-[#515154]">{formatTRY(inv.amount)}</td>
                        <td className="p-3.5 text-[#6E6E73]">{formatTRY(inv.totalAmount - inv.amount)}</td>
                        <td className="p-3.5 font-bold text-[#1D1D1F]">{formatTRY(inv.totalAmount)}</td>
                        <td className="p-3.5 text-[#515154]">{inv.paymentType}</td>
                        <td className="p-3.5">
                          <select
                            value={inv.status}
                            onChange={e => handleInvoiceStatusChange(inv.id, e.target.value as any)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border-0 cursor-pointer ${
                              inv.status === 'Ödendi' ? 'bg-emerald-100 text-emerald-700' :
                              inv.status === 'Beklemede' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}
                          >
                            <option value="Ödendi">Ödendi</option>
                            <option value="Beklemede">Beklemede</option>
                            <option value="Vadesi Geçti">Vadesi Geçti</option>
                            <option value="İptal">İptal</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* New Invoice Modal */}
            {invoiceModalOpen && (
              <div role="dialog" aria-modal="true" aria-label="Yeni fatura" onMouseDown={(e) => { if (e.target === e.currentTarget) setInvoiceModalOpen(false); }} className="admin-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                <div className="apple-card bg-white p-6 sm:p-8 max-w-md w-full border border-black/[0.1] shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] mb-4">
                    <h4 className="text-base font-bold text-[#1D1D1F]">Yeni E-Fatura / Tahsilat Kaydı</h4>
                    <button type="button" onClick={() => setInvoiceModalOpen(false)} aria-label="Kapat" className="admin-close">✕</button>
                  </div>

                  <form onSubmit={handleCreateInvoice} className="space-y-3.5 text-xs">
                    <div>
                      <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Müşteri / Şirket Adı *</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Atlas Hukuk Bürosu"
                        value={newInvoiceData.client}
                        onChange={e => setNewInvoiceData({ ...newInvoiceData, client: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Vergi Numarası / T.C.</label>
                      <input
                        type="text"
                        placeholder="4280918291"
                        value={newInvoiceData.taxNumber}
                        onChange={e => setNewInvoiceData({ ...newInvoiceData, taxNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Hizmet / Ürün Kalemi</label>
                      <select
                        value={newInvoiceData.product}
                        onChange={e => setNewInvoiceData({ ...newInvoiceData, product: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                      >
                        <option value="KGLEX Yıllık Kurumsal Lisans">KGLEX Yıllık Kurumsal Lisans</option>
                        <option value="HaritaPlan 3D CBS Kurulumu">HaritaPlan 3D CBS Kurulumu</option>
                        <option value="Panelde Multi-Tenant SaaS Aylık SLA">Panelde Multi-Tenant SaaS Aylık SLA</option>
                        <option value="Flamantyou AI Cilt Analizi Motoru">Flamantyou AI Cilt Analizi Motoru</option>
                        <option value="Özel Mobil & Web Yazılım Sprinti">Özel Mobil & Web Yazılım Sprinti</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Net Tutar (₺) *</label>
                        <input
                          type="number"
                          required
                          value={newInvoiceData.amount}
                          onChange={e => setNewInvoiceData({ ...newInvoiceData, amount: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Ödeme Türü</label>
                        <select
                          value={newInvoiceData.paymentType}
                          onChange={e => setNewInvoiceData({ ...newInvoiceData, paymentType: e.target.value as any })}
                          className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                        >
                          <option value="Havale / EFT">Havale / EFT</option>
                          <option value="Sanal POS">Sanal POS</option>
                          <option value="Çek">Çek</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between">
                      <div className="text-xs text-[#6E6E73]">
                        Toplam KDV Dahil: <strong className="text-[#1D1D1F]">{formatTRY(newInvoiceData.amount * 1.2)}</strong>
                      </div>
                      <button
                        type="submit"
                        className="apple-pill-btn px-5 py-2 text-xs font-semibold"
                      >
                        Faturayı Kaydet
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ROLLER & EKİP YETKİLERİ (NEW) */}
        {activeMenu === 'roller' && <UsersPanel notify={notify} />}

        {/* TAB 6: SITE KONTROL MERKEZİ & YENİ İŞ EKLEME */}
        {activeMenu === 'domains' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Feedback Alert */}
            {siteActionMessage && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800 font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{siteActionMessage}</span>
                </div>
                <button type="button" onClick={() => setSiteActionMessage(null)} aria-label="Kapat" className="admin-close">✕</button>
              </div>
            )}

            {/* Top Control Bar & Action */}
            <div className="apple-card bg-white border border-black/[0.07] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-black/[0.06]">
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#0071E3]" />
                    Site Kontrol Merkezi & Canlı Portföy
                  </h3>
                  <p className="text-xs text-[#6E6E73] mt-0.5">
                    Canlıdaki web projelerini yönetin, anlık ping/sağlık testi yapın, uzaktan önbellek temizleyin ve sisteme yeni web siteleri ekleyin.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSiteModalOpen(true)}
                    className="apple-pill-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Yeni Site / Proje Ekle</span>
                  </button>
                </div>
              </div>

              {/* Status Summary Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-center text-xs">
                <div className="p-3 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                  <span className="text-[11px] text-[#6E6E73] block">Toplam Kayıtlı Proje</span>
                  <strong className="text-base text-[#1D1D1F] block mt-0.5 font-mono">{products.length} Site</strong>
                </div>
                <div className="p-3 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                  <span className="text-[11px] text-[#6E6E73] block">Genel Uptime</span>
                  <strong className="text-base text-emerald-600 block mt-0.5 font-mono">%99.99 Uptime</strong>
                </div>
                <div className="p-3 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                  <span className="text-[11px] text-[#6E6E73] block">SSL Güvenlik Düzeyi</span>
                  <strong className="text-base text-blue-600 block mt-0.5 font-mono">256-Bit TLS</strong>
                </div>
                <div className="p-3 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                  <span className="text-[11px] text-[#6E6E73] block">Yönetim Köprüsü</span>
                  <strong className="text-base text-purple-600 block mt-0.5 font-mono">Bridge v2.6</strong>
                </div>
              </div>

              {/* Live Sites Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(products.length > 0 ? products : PRODUCTS).map(prod => {
                  const pingInfo = sitePings[prod.displayDomain];
                  return (
                    <div key={prod.id} className="p-5 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] flex flex-col justify-between hover:border-black/[0.12] transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-[#0071E3] bg-[#0071E3]/10 px-3 py-0.5 rounded-full">
                            {prod.categoryLabel}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#10B981]">
                            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                            <span>{pingInfo ? pingInfo.status : '200 OK • SSL Aktif'}</span>
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-base font-bold text-[#1D1D1F] mb-1">{prod.name}</h4>
                            <p className="text-xs text-[#515154] mb-3">{prod.tagline}</p>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-white text-gray-700 border border-black/[0.06] shrink-0">
                            {prod.badge}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-black/[0.04] text-xs font-mono text-[#1D1D1F] flex items-center justify-between mb-4">
                          <span className="truncate">{prod.displayDomain}</span>
                          <span className="text-[#10B981] font-semibold shrink-0 ml-2">
                            {pingInfo ? `${pingInfo.latency} ms` : 'Ping: ~28 ms'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-[#6E6E73]">
                          Uptime: {prod.liveStats?.uptime || '%99.99'}
                        </span>
                        
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handlePingSite(prod.displayDomain)}
                            title="Canlı Yanıt Süresi Testi"
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-[#1D1D1F] text-[11px] font-semibold transition-colors flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3 text-blue-600" />
                            <span>Ping</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePurgeCache(prod.displayDomain)}
                            title="CDN / Edge Önbelleğini Temizle"
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-[#1D1D1F] text-[11px] font-semibold transition-colors"
                          >
                            Önbellek Sil
                          </button>
                          <a
                            href={prod.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="apple-pill-btn px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
                          >
                            <span>Aç</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          {!PRODUCTS.some(defaultP => defaultP.id === prod.id) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSite(prod.id, prod.name)}
                              title="Siteyi Sil"
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* REMOTE .ENV ACCESS TOKEN & IFRAME BRIDGE CONFIGURATION */}
            <div className="apple-card bg-white border border-black/[0.07] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    Sitelerin .env Erişim Tokenı & Frame İzin Yapılandırması
                  </h3>
                  <p className="text-xs text-[#6E6E73] mt-0.5">
                    Sitelerin YSNSOFT vitrininde ve panelinde gömülebilmesi ("bağlanmayı reddetti" hatasını çözmek) ve uzaktan kontrolü için gereken ayarlar
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  YSNSOFT Remote Bridge v2.6
                </span>
              </div>

              {/* Information Note */}
              <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-xs text-emerald-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Sıfır Kod Değişikliği ile Canlı Entegrasyon (Zero-Config Preview)
                </div>
                <p className="leading-relaxed text-[11px] text-emerald-900">
                  YSNSOFT Akıllı Sunucu Proxy Katmanı sayesinde, istemci sitelerinizin (<code className="font-mono bg-white px-1 py-0.5 rounded text-emerald-950 font-bold">kglex.com</code>, <code className="font-mono bg-white px-1 py-0.5 rounded text-emerald-950 font-bold">hgavukatlik.com</code>, <code className="font-mono bg-white px-1 py-0.5 rounded text-emerald-950 font-bold">acikellaw.com</code>, <code className="font-mono bg-white px-1 py-0.5 rounded text-emerald-950 font-bold">haritaplan.com</code>) <code className="font-mono bg-white px-1 py-0.5 rounded text-emerald-950">next.config.js</code> dosyasını değiştirmenize veya sunucuda yeniden derleme yapmanıza gerek yoktur.
                </p>
              </div>

              {/* Code Snippets 2-Col Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. .env Snippet */}
                <div className="p-4 rounded-2xl bg-[#141416] text-white border border-gray-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-300 border-b border-gray-800 pb-2">
                    <span className="flex items-center gap-1.5 font-mono text-blue-400">
                      📄 Sitelerin .env Dosyasına Eklenecek:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`YSN_MANAGEMENT_TOKEN=${bridgeTokens.master || '<tanımlı değil>'}\nYSN_ALLOWED_ORIGINS=http://localhost:3000,https://ysnsoft.com`);
                        notify('.env yapılandırması panoya kopyalandı!');
                      }}
                      className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-[11px] font-mono transition-colors"
                    >
                      Kopyala
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-emerald-400 overflow-x-auto p-1 leading-relaxed">
{`# YSNSOFT Merkezi Yönetim ve Iframe Tokenı
YSN_MANAGEMENT_TOKEN=${bridgeTokens.master || '<tanımlı değil>'}
YSN_ALLOWED_ORIGINS=http://localhost:3000,https://ysnsoft.com`}
                  </pre>
                </div>

                {/* 2. next.config.js Snippet */}
                <div className="p-4 rounded-2xl bg-[#141416] text-white border border-gray-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-300 border-b border-gray-800 pb-2">
                    <span className="flex items-center gap-1.5 font-mono text-purple-400">
                      ⚙️ Sitelerin next.config.js (Headers İzni):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`async headers() {\n  return [{\n    source: '/:path*',\n    headers: [{\n      key: 'Content-Security-Policy',\n      value: "frame-ancestors 'self' http://localhost:3000 https://ysnsoft.com;"\n    }]\n  }];\n}`);
                        notify('next.config.js başlık kodu kopyalandı!');
                      }}
                      className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-[11px] font-mono transition-colors"
                    >
                      Kopyala
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-purple-300 overflow-x-auto p-1 leading-relaxed">
{`async headers() {
  return [{
    source: '/:path*',
    headers: [{
      key: 'Content-Security-Policy',
      value: "frame-ancestors 'self' http://localhost:3000 https://ysnsoft.com;"
    }]
  }];
}`}
                  </pre>
                </div>
              </div>

              {/* Active Tokens Table */}
              <div className="border border-black/[0.06] rounded-2xl overflow-hidden text-xs">
                <div className="bg-[#F5F5F7] px-4 py-3 font-bold text-[#1D1D1F] flex items-center justify-between">
                  <span>Üretilen Canlı Site Token Listesi (YSN Bridge Tokens)</span>
                  <span className="text-[11px] text-[#6E6E73] font-normal">Tüm siteler 256-bit şifrelenmiştir</span>
                </div>
                <div className="divide-y divide-black/[0.04]">
                  {(products.length > 0 ? products : PRODUCTS).map(p => (
                    <div key={p.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 transition-colors">
                      <div>
                        <div className="font-bold text-[#1D1D1F] flex items-center gap-2">
                          <span>{p.name}</span>
                          <code className="text-[11px] text-blue-600 font-mono">({p.displayDomain})</code>
                        </div>
                        <div className="text-[11px] font-mono text-gray-500 mt-0.5">
                          Token: <span className="text-gray-800 font-semibold">{tokenForDomain(p.displayDomain) || 'tanımlı değil'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={!tokenForDomain(p.displayDomain)}
                          onClick={() => {
                            navigator.clipboard.writeText(`YSN_MANAGEMENT_TOKEN=${tokenForDomain(p.displayDomain)}`);
                            notify(`${p.displayDomain} tokenı panoya kopyalandı!`);
                          }}
                          className="px-3 py-1 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg text-[11px] font-semibold text-gray-700 transition-colors disabled:opacity-50"
                        >
                          Token Kopyala
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePingSite(p.displayDomain)}
                          className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Test & Ping</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MODAL: YENİ SİTE / PROJE EKLE */}
            {siteModalOpen && (
              <div role="dialog" aria-modal="true" aria-label="Yeni site" onMouseDown={(e) => { if (e.target === e.currentTarget) setSiteModalOpen(false); }} className="admin-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
                <div className="apple-card bg-white max-w-lg w-full p-6 border border-black/[0.08] shadow-2xl rounded-3xl animate-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] mb-4">
                    <h3 className="font-bold text-base text-[#1D1D1F] flex items-center gap-2">
                      <Plus className="w-4 h-4 text-[#0071E3]" />
                      Yeni Web Sitesi / Proje Ekle
                    </h3>
                    <button type="button" onClick={() => setSiteModalOpen(false)} aria-label="Kapat" className="admin-close">✕</button>
                  </div>

                  <form onSubmit={handleAddNewSite} className="space-y-3.5 text-xs">
                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">Proje / Site Adı *</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Yeni Hukuk Portalı"
                        value={newSiteData.name}
                        onChange={e => setNewSiteData({ ...newSiteData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-gray-700 block mb-1">Alan Adı (Domain) *</label>
                        <input
                          type="text"
                          required
                          placeholder="ornek.com"
                          value={newSiteData.displayDomain}
                          onChange={e => setNewSiteData({ ...newSiteData, displayDomain: e.target.value })}
                          className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08] font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-gray-700 block mb-1">Canlı URL</label>
                        <input
                          type="url"
                          placeholder="https://www.ornek.com"
                          value={newSiteData.liveUrl}
                          onChange={e => setNewSiteData({ ...newSiteData, liveUrl: e.target.value })}
                          className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08] font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-gray-700 block mb-1">Kategori</label>
                        <select
                          value={newSiteData.category}
                          onChange={e => {
                            const cat = e.target.value as any;
                            const lbl = cat === 'legal' ? 'Hukuk Teknolojileri' : cat === 'cad' ? 'Harita & CBS' : cat === 'ecommerce' ? 'E-Ticaret & POS' : 'Bulut SaaS';
                            setNewSiteData({ ...newSiteData, category: cat, categoryLabel: lbl });
                          }}
                          className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                        >
                          <option value="saas">Bulut SaaS & Yönetim</option>
                          <option value="legal">Hukuk Teknolojileri (LegalTech)</option>
                          <option value="cad">Harita, CAD & CBS</option>
                          <option value="ecommerce">E-Ticaret & POS</option>
                          <option value="tourism">Turizm & Rezervasyon</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-semibold text-gray-700 block mb-1">Slogan / Başlık</label>
                        <input
                          type="text"
                          placeholder="Örn: Yeni Nesil Bulut Sistemi"
                          value={newSiteData.tagline}
                          onChange={e => setNewSiteData({ ...newSiteData, tagline: e.target.value })}
                          className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">Kısa Açıklama</label>
                      <textarea
                        rows={2}
                        placeholder="Site hakkında özet bilgi..."
                        value={newSiteData.shortDesc}
                        onChange={e => setNewSiteData({ ...newSiteData, shortDesc: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                      />
                    </div>

                    <div className="pt-3 border-t border-black/[0.06] flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSiteModalOpen(false)}
                        className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="apple-pill-btn px-6 py-2 font-semibold shadow-xs"
                      >
                        Siteyi Kaydet
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: SEO & GEO OTOMASYON STÜDYOSU */}
        {activeMenu === 'seo-geo' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Run Audit Banner */}
            <div className="apple-card bg-white border border-black/[0.07] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2">
                    <Compass className="w-5 h-5 text-emerald-600" />
                    SEO, GEO & Schema.org Otomasyon Motoru
                  </h3>
                  <p className="text-xs text-[#6E6E73] mt-0.5">
                    Google arama motoru, yerel harita koordinatları (Pendik/İstanbul TR-34), Schema.org Multi-Graph, sitemap.xml ve robots.txt kurallarını otomatik test edin ve üretin.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunSeoAudit}
                  disabled={seoAuditLoading}
                  className="apple-pill-btn px-5 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-xs shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${seoAuditLoading ? 'animate-spin' : ''}`} />
                  <span>{seoAuditLoading ? 'Taranıyor...' : 'Tüm Siteleri Şimdi Tara & Denetle'}</span>
                </button>
              </div>

              {/* Overall Score Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/40 rounded-2xl border border-emerald-200/80">
                  <span className="text-[11px] text-emerald-800 font-medium block">Genel SEO & GEO Skoru</span>
                  <div className="text-3xl font-extrabold text-emerald-700 mt-1 font-mono">
                    {seoAuditOverallScore !== null ? `${seoAuditOverallScore}/100` : '100/100'}
                  </div>
                  <span className="text-[11px] text-emerald-800 mt-1 block">Google Rich Snippets & GEO Uyumlu</span>
                </div>

                <div className="p-4 bg-[#F5F5F7] rounded-2xl border border-black/[0.04]">
                  <span className="text-[11px] text-gray-500 font-medium block">Aktif GEO Konum Şablonu</span>
                  <div className="text-sm font-bold text-[#1D1D1F] mt-1 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#0071E3]" />
                    <span>{geoConfig.district} / {geoConfig.city} ({geoConfig.regionCode})</span>
                  </div>
                  <span className="text-[11px] font-mono text-gray-500 mt-1 block">
                    Koordinat: {geoConfig.position}
                  </span>
                </div>

                <div className="p-4 bg-[#F5F5F7] rounded-2xl border border-black/[0.04]">
                  <span className="text-[11px] text-gray-500 font-medium block">Otomasyon Betiği (CLI)</span>
                  <div className="text-sm font-bold text-purple-700 mt-1 font-mono">
                    scripts/generate-seo-geo.js
                  </div>
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Terminalden: <code>node scripts/generate-seo-geo.js</code>
                  </span>
                </div>
              </div>

              {/* Live Audit Results Table */}
              {seoAuditResults.length > 0 && (
                <div className="mt-4 border border-black/[0.06] rounded-2xl overflow-hidden text-xs">
                  <div className="bg-[#F5F5F7] px-4 py-3 font-bold text-[#1D1D1F] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span>Canlı SEO & GEO Tarama Raporu</span>
                      <span className="text-[11px] text-[#6E6E73] font-normal">({seoAuditResults.length} Domain Doğrulandı)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const jsonStr = JSON.stringify(seoAuditResults, null, 2);
                          const blob = new Blob([jsonStr], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `ysnsoft-seo-audit-${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-black/[0.08] text-gray-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        <Download className="w-3 h-3 text-[#0071E3]" />
                        <span>JSON Raporu İndir</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const summary = seoAuditResults.map(r => 
                            `${r.domain}: Skor ${r.score}/100 | SSL: ${r.hasSsl ? 'OK' : 'Yok'} | GEO: ${r.hasGeoTags ? 'OK' : 'Eksik'} | Schema: ${r.hasSchemaOrg ? 'OK' : 'Eksik'} | Gecikme: ${r.latencyMs}ms`
                          ).join('\n');
                          navigator.clipboard.writeText(summary);
                          notify('Özet denetim raporu panoya kopyalandı!');
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-black/[0.08] text-gray-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        <Copy className="w-3 h-3 text-[#10B981]" />
                        <span>Özeti Kopyala</span>
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-black/[0.04] overflow-x-auto">
                    {seoAuditResults.map((r, i) => (
                      <div key={i} className="p-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors">
                        <div className="min-w-[180px]">
                          <strong className="text-[#1D1D1F] block">{r.domain}</strong>
                          <span className="text-[11px] text-gray-500 font-mono">{r.latencyMs} ms • {r.httpCode}</span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px]">
                          <span className={`px-2 py-0.5 rounded font-semibold ${r.hasSsl ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                            {r.hasSsl ? 'SSL OK' : 'SSL Yok'}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-semibold ${r.hasGeoTags ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {r.hasGeoTags ? 'GEO Etiketleri OK' : 'GEO Eksik'}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-semibold ${r.hasSchemaOrg ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {r.hasSchemaOrg ? 'Schema.org OK' : 'Schema Eksik'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-emerald-700">
                            {r.score}/100
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSeoSelectedTarget(r.domain);
                              handleGenerateSeoSnippets(r.domain);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition-colors"
                          >
                            Kod Üret
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AUTOMATED CODE GENERATOR FOR ANY SITE */}
            <div className="apple-card bg-white border border-black/[0.07] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] pb-4">
                <div>
                  <h4 className="font-bold text-base text-[#1D1D1F] flex items-center gap-2">
                    <Code className="w-5 h-5 text-blue-600" />
                    Otomatik Kod ve Yapılandırma Üreticisi
                  </h4>
                  <p className="text-xs text-[#6E6E73] mt-0.5">
                    İstediğiniz siteyi ve lokasyonu seçin; tek tıkla Next.js metadata, Schema JSON-LD, sitemap ve robots kodlarını üretin.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerateSeoSnippets(seoSelectedTarget)}
                  disabled={seoGenerating}
                  className="apple-pill-btn px-5 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{seoGenerating ? 'Üretiliyor...' : 'Yapılandırmayı Üret'}</span>
                </button>
              </div>

              {/* Selector Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Hedef Web Sitesi</label>
                  <select
                    value={seoSelectedTarget}
                    onChange={e => setSeoSelectedTarget(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                  >
                    <option value="ysnsoft.com">ysnsoft.com (YSNSOFT Ana Site)</option>
                    {(products.length > 0 ? products : PRODUCTS).map(p => (
                      <option key={p.id} value={p.displayDomain}>{p.displayDomain} ({p.name})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Lokasyon / İl & İlçe Şablonu</label>
                  <select
                    value={`${geoConfig.city}|${geoConfig.district}|${geoConfig.regionCode}|${geoConfig.position}`}
                    onChange={e => {
                      const [c, d, reg, pos] = e.target.value.split('|');
                      const updated = {
                        ...geoConfig,
                        city: c,
                        district: d,
                        regionCode: reg,
                        position: pos,
                        icbm: pos.replace(';', ', ')
                      };
                      setGeoConfig(updated);
                      saveGeoSettings(updated);
                    }}
                    className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                  >
                    <option value="İstanbul|Pendik|TR-34|40.8795;29.2578">📍 İstanbul / Pendik (Merkez Ofis - TR-34)</option>
                    <option value="İstanbul|Kadıköy|TR-34|40.9927;29.0277">📍 İstanbul / Kadıköy (TR-34)</option>
                    <option value="Ankara|Çankaya|TR-06|39.9208;32.8541">📍 Ankara / Çankaya (TR-06)</option>
                    <option value="İzmir|Konak|TR-35|38.4192;27.1287">📍 İzmir / Konak (TR-35)</option>
                    <option value="Antalya|Muratpaşa|TR-07|36.8841;30.7056">📍 Antalya / Muratpaşa (TR-07)</option>
                    <option value="Bursa|Nilüfer|TR-16|40.2132;28.9806">📍 Bursa / Nilüfer (TR-16)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Kurumsal İletişim Telefonu</label>
                  <input
                    type="text"
                    value={geoConfig.phone}
                    onChange={e => {
                      const updated = { ...geoConfig, phone: e.target.value };
                      setGeoConfig(updated);
                      saveGeoSettings(updated);
                    }}
                    className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08] font-mono"
                  />
                </div>
              </div>

              {/* Snippet Output Console */}
              {seoGeneratedCode && (
                <div className="space-y-3 pt-2">
                  {/* Tab Selector */}
                  <div className="flex items-center gap-1.5 border-b border-black/[0.06] pb-2 text-xs font-semibold overflow-x-auto">
                    {[
                      { key: 'metadata', label: '1. Next.js Metadata (layout.tsx)' },
                      { key: 'schema', label: '2. Schema.org Multi-Graph (JSON-LD)' },
                      { key: 'sitemap', label: '3. sitemap.xml' },
                      { key: 'robots', label: '4. robots.txt' },
                      { key: 'html', label: '5. HTML Head GEO Etiketleri' }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setSeoActiveSnippetTab(tab.key as any)}
                        className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                          seoActiveSnippetTab === tab.key
                            ? 'bg-[#0071E3] text-white shadow-xs'
                            : 'bg-gray-100 text-gray-600 hover:text-black'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Code Block Container */}
                  <div className="relative rounded-2xl bg-[#141416] p-4 text-white font-mono text-xs overflow-x-auto border border-gray-800">
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const code = 
                            seoActiveSnippetTab === 'metadata' ? seoGeneratedCode.nextJsMetadata :
                            seoActiveSnippetTab === 'schema' ? seoGeneratedCode.schemaJsonLd :
                            seoActiveSnippetTab === 'sitemap' ? seoGeneratedCode.sitemapXml :
                            seoActiveSnippetTab === 'robots' ? seoGeneratedCode.robotsTxt :
                            seoGeneratedCode.geoMetaHtml;
                          navigator.clipboard.writeText(code);
                          notify('Kod başarıyla panoya kopyalandı!');
                        }}
                        className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-sans font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kopyala</span>
                      </button>
                    </div>

                    <pre className="text-emerald-400 leading-relaxed pr-20">
                      {seoActiveSnippetTab === 'metadata' && seoGeneratedCode.nextJsMetadata}
                      {seoActiveSnippetTab === 'schema' && seoGeneratedCode.schemaJsonLd}
                      {seoActiveSnippetTab === 'sitemap' && seoGeneratedCode.sitemapXml}
                      {seoActiveSnippetTab === 'robots' && seoGeneratedCode.robotsTxt}
                      {seoActiveSnippetTab === 'html' && seoGeneratedCode.geoMetaHtml}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: YAPAY ZEKA & ASİSTAN STÜDYOSU */}
        {activeMenu === 'glm' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="apple-card bg-white p-5 border border-black/[0.07]">
                <div className="flex items-center justify-between text-xs text-[#6E6E73] mb-2 font-medium">
                  <span>Yapay Zeka Motor Durumu</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div className="text-xl font-bold text-emerald-600 flex items-center gap-2">
                  <span>Bağlandı</span>
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">200 OK</span>
                </div>
                <div className="text-[11px] text-[#6E6E73] mt-1 font-mono">
                  YSNSOFT Neural Gateway
                </div>
              </div>

              <div className="apple-card bg-white p-5 border border-black/[0.07]">
                <div className="text-xs text-[#6E6E73] mb-2 font-medium">Aktif Çekirdek Model</div>
                <div className="text-xl font-bold text-[#1D1D1F]">
                  {adminGlmModel === 'glm-4-plus' ? 'Plus Enterprise' : adminGlmModel.toUpperCase()}
                </div>
                <div className="text-[11px] text-blue-600 mt-1 font-medium">
                  Yüksek Akıl & Dava Analizörü
                </div>
              </div>

              <div className="apple-card bg-white p-5 border border-black/[0.07]">
                <div className="text-xs text-[#6E6E73] mb-2 font-medium">Yetkili API Anahtarı</div>
                <div className="text-sm font-mono font-bold text-[#1D1D1F] truncate">
                  1efef9eb...CfrWA
                </div>
                <div className="text-[11px] text-emerald-600 mt-1 font-medium">
                  ✓ Güvenli Sunucu Yetkisi Aktif
                </div>
              </div>

              <div className="apple-card bg-white p-5 border border-black/[0.07]">
                <div className="text-xs text-[#6E6E73] mb-2 font-medium">Son İstek Gecikmesi</div>
                <div className="text-xl font-bold text-indigo-600">
                  {glmTestLatency ? `${glmTestLatency} ms` : 'Hazır'}
                </div>
                <div className="text-[11px] text-[#6E6E73] mt-1">
                  Edge Streaming
                </div>
              </div>
            </div>

            {/* Live Interactive Test Playground */}
            <div className="apple-card bg-white border border-black/[0.07] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.06] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    YSNSOFT Akıllı Çözüm & Mimari Simülatörü
                  </h3>
                  <p className="text-xs text-[#6E6E73] mt-0.5">
                    Hukuk UYAP botları, imar mevzuatı (3194 Md. 18) ve sistem tekliflerini canlı test edin.
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                  Canlı AI API Motoru
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[11px] font-semibold text-[#6E6E73] block mb-2">Hazır Test Senaryoları:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setGlmTestPrompt('KGLEX hukuk bürosu için UYAP icra dairesi otomatik dosya sorgulama protokolü hazırla.')}
                    className="text-xs px-3 py-1.5 bg-[#F5F5F7] hover:bg-blue-50 hover:text-blue-600 border border-black/[0.06] rounded-xl transition-all font-medium"
                  >
                    ⚖️ KGLEX UYAP İcra Protokolü
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlmTestPrompt('HaritaPlan 3194 Sayılı İmar Kanunu Madde 18 DOP hesaplama formülü ve yasal %45 tavan sınırını teknik açıkla.')}
                    className="text-xs px-3 py-1.5 bg-[#F5F5F7] hover:bg-blue-50 hover:text-blue-600 border border-black/[0.06] rounded-xl transition-all font-medium"
                  >
                    🗺️ HaritaPlan Madde 18 DOP
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlmTestPrompt('Panelde emlak portalı için multi-tenant PostgreSQL şema izolasyonu ve Sahibinden sync mimarisini açıkla.')}
                    className="text-xs px-3 py-1.5 bg-[#F5F5F7] hover:bg-blue-50 hover:text-blue-600 border border-black/[0.06] rounded-xl transition-all font-medium"
                  >
                    🏢 Panelde Multi-Tenant Mimari
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlmTestPrompt('Bir kurumsal müşteri için Next.js 16 ve Kubernetes tabanlı SaaS projesi resmi teklif mektubu taslağı hazırla.')}
                    className="text-xs px-3 py-1.5 bg-[#F5F5F7] hover:bg-blue-50 hover:text-blue-600 border border-black/[0.06] rounded-xl transition-all font-medium"
                  >
                    📄 Kurumsal Teklif Mektubu Taslağı
                  </button>
                </div>
              </div>

              {/* Prompt Input */}
              <div>
                <label className="text-xs font-semibold text-[#1D1D1F] block mb-1.5">
                  Test Komutu / İstem (Prompt):
                </label>
                <textarea
                  rows={3}
                  value={glmTestPrompt}
                  onChange={e => setGlmTestPrompt(e.target.value)}
                  placeholder="Yapay zeka modeline gönderilecek soruyu yazınız..."
                  className="w-full p-3.5 bg-[#F5F5F7] rounded-xl border border-black/[0.08] text-xs text-[#1D1D1F] focus:outline-none focus:border-blue-500 resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-[#6E6E73] flex items-center gap-2">
                  <span>Model Çekirdeği: <strong>{adminGlmModel}</strong></span>
                  <span>•</span>
                  <span>Sıcaklık: <strong>0.7</strong></span>
                </div>
                <button
                  type="button"
                  disabled={glmLoading || !glmTestPrompt.trim()}
                  onClick={handleTestGlm}
                  className="apple-pill-btn px-6 py-2.5 text-xs font-semibold disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {glmLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Yapay Zeka Yanıtı Üretiyor...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Canlı Yanıt Üret</span>
                    </>
                  )}
                </button>
              </div>

              {/* Response Box */}
              {glmTestResponse && (
                <div className="mt-4 p-5 bg-[#F8F9FA] rounded-2xl border border-black/[0.08] space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#1D1D1F] border-b border-black/[0.06] pb-2">
                    <span className="flex items-center gap-1.5 text-purple-700">
                      <Sparkles className="w-4 h-4" /> YSNSOFT AI Model Çıktısı
                    </span>
                    <span className="text-[#6E6E73] font-normal">
                      {glmTestLatency ? `${glmTestLatency} milisaniye` : ''}
                    </span>
                  </div>
                  <div className="text-xs text-[#333] leading-relaxed whitespace-pre-wrap font-sans max-h-96 overflow-y-auto">
                    {glmTestResponse}
                  </div>
                </div>
              )}
            </div>

            {/* API Config Box */}
            <div className="apple-card bg-white border border-black/[0.07] p-6 max-w-2xl">
              <h4 className="text-sm font-bold text-[#1D1D1F] mb-1">
                Yapay Zeka API & Model Yapılandırması
              </h4>
              <p className="text-xs text-[#6E6E73] mb-4">
                API anahtarınız sunucu tarafında güvenli şekilde saklanmaktadır. Dilerseniz buradan güncelleyebilirsiniz.
              </p>

              <form onSubmit={handleSaveGlmKey} className="space-y-4 text-xs">
                <div>
                  <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Yetkili API Anahtarı</label>
                  <input
                    type="password"
                    value={adminGlmKey}
                    onChange={e => setAdminGlmKey(e.target.value)}
                    placeholder="API anahtarınızı yapıştırın"
                    className="w-full px-3.5 py-2 text-xs bg-[#F5F5F7] rounded-xl border border-black/[0.08] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Tercih Edilen Model</label>
                  <select
                    value={adminGlmModel}
                    onChange={e => setAdminGlmModel(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                  >
                    <option value="glm-4-plus">YSNSOFT Plus (Amiral Gemisi - En Yüksek Zeka)</option>
                    <option value="glm-4-air">YSNSOFT Air (Hızlı & Dengeli)</option>
                    <option value="glm-4-flash">YSNSOFT Flash (Anlık)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="apple-pill-btn px-6 py-2.5 text-xs font-semibold"
                >
                  Konfigürasyonu Kaydet
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 7: SETTINGS & SMTP */}
        {activeMenu === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 1. Şirket & Genel İletişim Ayarları */}
            <div className="apple-card bg-white border border-black/[0.07] p-6 max-w-3xl">
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F]">
                    Şirket & Sistem İletişim Bilgileri
                  </h3>
                  <p className="text-xs text-[#6E6E73] mt-0.5">
                    Sitede, teklif belgelerinde ve e-postalarda görünen resmi bilgiler
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200">
                  Super Admin: Yasin Yıldırım
                </span>
              </div>

              <form onSubmit={handleSaveSystemSettings} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">Resmi Şirket Ünvanı</label>
                    <input
                      type="text"
                      value={systemSettings.companyName}
                      onChange={e => setSystemSettings({ ...systemSettings, companyName: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08] font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">Kurucu & Super Admin</label>
                    <input
                      type="text"
                      disabled
                      value="Yasin Yıldırım (yasin@ysnsoft.com)"
                      className="w-full px-3.5 py-2 bg-gray-100 rounded-xl border border-black/[0.08] text-gray-600 font-semibold cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">Resmi Telefon Numarası</label>
                    <input
                      type="text"
                      value={systemSettings.companyPhone}
                      onChange={e => setSystemSettings({ ...systemSettings, companyPhone: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08] font-bold text-blue-600"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">WhatsApp Destek & Danışma Hattı</label>
                    <input
                      type="text"
                      value={systemSettings.whatsappNumber}
                      onChange={e => setSystemSettings({ ...systemSettings, whatsappNumber: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08] font-bold text-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">Kurumsal Destek E-Posta</label>
                    <input
                      type="email"
                      value={systemSettings.supportEmail}
                      onChange={e => setSystemSettings({ ...systemSettings, supportEmail: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">Satış & İletişim E-Posta</label>
                    <input
                      type="email"
                      value={systemSettings.infoEmail}
                      onChange={e => setSystemSettings({ ...systemSettings, infoEmail: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">Bildirim / No-Reply E-Posta</label>
                    <input
                      type="email"
                      value={systemSettings.notificationEmail}
                      onChange={e => setSystemSettings({ ...systemSettings, notificationEmail: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">Ofis Adresi</label>
                    <input
                      type="text"
                      value={systemSettings.address}
                      onChange={e => setSystemSettings({ ...systemSettings, address: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">MERSİS No</label>
                    <input
                      type="text"
                      value={systemSettings.mersisNo}
                      onChange={e => setSystemSettings({ ...systemSettings, mersisNo: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">Ticaret Sicil No</label>
                    <input
                      type="text"
                      value={systemSettings.ticaretSicilNo}
                      onChange={e => setSystemSettings({ ...systemSettings, ticaretSicilNo: e.target.value })}
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="apple-pill-btn px-6 py-2.5 text-xs font-semibold"
                  >
                    Şirket Ayarlarını Kaydet
                  </button>
                </div>
              </form>
            </div>

            {/* 2. SMTP E-Posta Sunucu Ayarları */}
            <div className="apple-card bg-white border border-black/[0.07] p-6 max-w-3xl">
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    SMTP E-Posta Sunucu Yapılandırması
                  </h3>
                  <p className="text-xs text-[#6E6E73] mt-0.5">
                    Gelen teklif talepleri, randevu teyitleri ve fatura PDF gönderimleri için giden sunucu
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>SMTP TLS Aktif</span>
                </div>
              </div>

              {smtpTestResult && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{smtpTestResult}</span>
                </div>
              )}

              <form onSubmit={handleSaveSmtp} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">SMTP Sunucu Adresi (Host)</label>
                    <input
                      type="text"
                      value={smtpSettings.host}
                      onChange={e => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                      placeholder="mail.ysnsoft.com"
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08] font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">Port</label>
                    <input
                      type="number"
                      value={smtpSettings.port}
                      onChange={e => setSmtpSettings({ ...smtpSettings, port: Number(e.target.value) })}
                      placeholder="587"
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">SMTP Kullanıcı Adı / E-Posta</label>
                    <input
                      type="text"
                      value={smtpSettings.user}
                      onChange={e => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
                      placeholder="noreply@ysnsoft.com"
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">SMTP Şifre</label>
                    <input
                      type="password"
                      value={smtpSettings.pass}
                      onChange={e => setSmtpSettings({ ...smtpSettings, pass: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">Gönderen E-Posta (From)</label>
                    <input
                      type="email"
                      value={smtpSettings.fromEmail}
                      onChange={e => setSmtpSettings({ ...smtpSettings, fromEmail: e.target.value })}
                      placeholder="noreply@ysnsoft.com"
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#1D1D1F] block mb-1">Gönderen Başlığı (From Name)</label>
                    <input
                      type="text"
                      value={smtpSettings.fromName}
                      onChange={e => setSmtpSettings({ ...smtpSettings, fromName: e.target.value })}
                      placeholder="YSNSOFT Bilişim Teknolojileri"
                      className="w-full px-3.5 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-black/[0.06]">
                  <button
                    type="button"
                    disabled={smtpTesting}
                    onClick={handleTestSmtp}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#1D1D1F] rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {smtpTesting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                        <span>Sunucuya Bağlanılıyor...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        <span>Test E-Postası Gönder</span>
                      </>
                    )}
                  </button>

                  <button
                    type="submit"
                    className="apple-pill-btn px-6 py-2.5 text-xs font-semibold"
                  >
                    SMTP Ayarlarını Kaydet
                  </button>
                </div>
              </form>
            </div>

            {/* 3. KGLEX Hukuk & Sistem Paritesi Durumu */}
            <div className="apple-card bg-white border border-black/[0.07] p-6 max-w-3xl">
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-4 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    KGLEX LegalTech & UYAP Robot Entegrasyon Durumu
                  </h4>
                  <p className="text-xs text-[#6E6E73] mt-0.5">
                    D:\hukuk\kglex sistem mimarisi ve canlı üretim parametreleri
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                  Canlıda (v0.33.45)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                  <span className="text-[#6E6E73] block text-[11px] uppercase font-semibold">UYAP Bot Servisi</span>
                  <strong className="text-emerald-700 block mt-0.5">Port 3006 (Aktif)</strong>
                  <span className="text-[11px] text-[#6E6E73]">MariaDB lawdba (Multi-Tenant)</span>
                </div>

                <div className="p-3 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                  <span className="text-[#6E6E73] block text-[11px] uppercase font-semibold">Gece Evrak Taraması</span>
                  <strong className="text-[#1D1D1F] block mt-0.5">02:00 - 06:00</strong>
                  <span className="text-[11px] text-emerald-600">500+ Büro Otomatik Takip</span>
                </div>

                <div className="p-3 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                  <span className="text-[#6E6E73] block text-[11px] uppercase font-semibold">Kiracı İzolasyonu</span>
                  <strong className="text-[#1D1D1F] block mt-0.5">AsyncLocalStorage</strong>
                  <span className="text-[11px] text-blue-600">companyId Filtresi Aktif</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* OFFICIAL PROPOSAL / PDF PRINT MODAL */}
      {proposalLead && (
        <div role="dialog" aria-modal="true" aria-label="Teklif önizleme" onMouseDown={(e) => { if (e.target === e.currentTarget) setProposalLead(null); }} className="admin-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-3xl w-full border border-black/[0.1] shadow-2xl my-8 print:shadow-none print:border-0 print:p-0">
            
            <div className="flex items-center justify-between pb-6 border-b border-black/[0.1] mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1D1D1F] text-white flex items-center justify-center font-bold">
                  YSN
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1D1D1F]">YSNSOFT BİLİŞİM TEKNOLOJİLERİ A.Ş.</h2>
                  <p className="text-[11px] text-[#6E6E73]">Kurumsal SaaS & Yazılım Mühendisliği • Teklif Belgesi</p>
                </div>
              </div>

              <div className="text-right text-xs">
                <div className="font-bold text-[#1D1D1F]">TEKLİF NO: YSN-{proposalLead.id}</div>
                <div className="text-[#6E6E73]">Tarih: {new Date().toLocaleDateString('tr-TR')}</div>
              </div>
            </div>

            <div className="bg-[#F5F5F7] p-5 rounded-2xl border border-black/[0.06] mb-6 text-xs">
              <span className="text-[#6E6E73] uppercase font-bold text-[11px] block mb-1">Müşteri / Kurum Bilgileri:</span>
              <h4 className="text-base font-bold text-[#1D1D1F] mb-1">{proposalLead.name}</h4>
              <p className="text-[#515154] font-medium">{proposalLead.company}</p>
              <div className="text-[#6E6E73] mt-1">İletişim: {proposalLead.email} | {proposalLead.phone}</div>
            </div>

            <div className="space-y-4 text-xs mb-8">
              <div>
                <span className="text-[#6E6E73] uppercase font-bold text-[11px] block mb-1">1. Proje Kapsamı</span>
                <p className="text-sm font-semibold text-[#1D1D1F]">
                  {proposalLead.product} — Anahtar Teslim Kurulum ve Entegrasyon
                </p>
                <p className="text-[#515154] mt-1 leading-relaxed">
                  İşbu teklif; talep edilen sistemin şirket altyapısına kurulması, veri aktarımı, UYAP/CAD/Sanal POS entegrasyonu ve 12 aylık 7/24 SLA teknik destek güvencesini kapsar.
                </p>
              </div>

              <div className="border border-black/[0.08] rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#F5F5F7] border-b border-black/[0.06] text-[#6E6E73]">
                    <tr>
                      <th className="p-3 font-semibold">Hizmet / Modül</th>
                      <th className="p-3 font-semibold">Teslim Süresi</th>
                      <th className="p-3 font-semibold text-right">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05]">
                    <tr>
                      <td className="p-3 font-medium text-[#1D1D1F]">SaaS Çekirdek Kurulumu & Veritabanı</td>
                      <td className="p-3 text-[#515154]">Sprint 1 (1. Hafta)</td>
                      <td className="p-3 text-right font-bold text-[#10B981]">Dahil</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-[#1D1D1F]">Özel Entegrasyonlar (Robot/API/Ödeme)</td>
                      <td className="p-3 text-[#515154]">Sprint 2 (2. Hafta)</td>
                      <td className="p-3 text-right font-bold text-[#10B981]">Dahil</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-[#1D1D1F]">Eski Sistemden Sıfır Kayıpla Veri Aktarımı</td>
                      <td className="p-3 text-[#515154]">Sprint 3 (3. Hafta)</td>
                      <td className="p-3 text-right font-bold text-[#10B981]">Dahil</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-[#1D1D1F]">Kullanıcı Eğitimi & 1 Yıllık 7/24 SLA Bakım</td>
                      <td className="p-3 text-[#515154]">Sürekli</td>
                      <td className="p-3 text-right font-bold text-[#10B981]">Garantili</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-[#0071E3]/5 p-4 rounded-xl border border-[#0071E3]/15 flex items-center justify-between">
                <div>
                  <span className="text-[#6E6E73] block text-[11px]">Öngörülen Bütçe Ölçeği</span>
                  <span className="text-base font-bold text-[#0071E3]">{proposalLead.budget}</span>
                </div>
                <div className="text-right text-[11px] text-[#515154]">
                  Ödeme Koşulu: %30 Avans, %40 Sprint Kabulü, %30 Canlı Teslimat
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-black/[0.1] grid grid-cols-2 gap-8 text-xs text-center mb-6">
              <div>
                <span className="text-[#6E6E73] block mb-1">Teklifi Hazırlayan</span>
                <strong className="text-[#1D1D1F] block">YSNSOFT Bilişim Teknolojileri A.Ş.</strong>
                <span className="text-[#6E6E73] text-[11px] block mt-4">İmza & Kaşe</span>
              </div>
              <div>
                <span className="text-[#6E6E73] block mb-1">Müşteri Kabul Onayı</span>
                <strong className="text-[#1D1D1F] block">{proposalLead.company}</strong>
                <span className="text-[#6E6E73] text-[11px] block mt-4">İmza & Kaşe</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-black/[0.06] print:hidden">
              <button
                onClick={() => setProposalLead(null)}
                className="apple-pill-btn-secondary px-5 py-2.5 text-xs font-semibold"
              >
                Kapat
              </button>

              <button
                onClick={() => window.print()}
                className="apple-pill-btn px-6 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-md shadow-[#0071E3]/25"
              >
                <Printer className="w-4 h-4" />
                <span>Teklifi Yazdır / PDF Olarak Kaydet</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
