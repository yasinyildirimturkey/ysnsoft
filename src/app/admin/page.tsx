'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getStoredGeoSettings,
  saveGeoSettings,
  GeoSettings,
  Lead, 
  Appointment,
  InvoiceRecord,
  SystemSettings,
  PRESET_ADMIN_USERS
} from '@/lib/store';
import { PRODUCTS, Product } from '@/data/products';
import { addSite, createInvoice, fetchAppointments, fetchInvoices, fetchLeads, fetchSettings, fetchSites, removeSite, saveSettings, setAppointmentStatus, setInvoiceStatus, setLeadStatus } from '@/lib/crm-client';
import ProspectsPanel from '@/components/admin/ProspectsPanel';
import SystemMailPanel from '@/components/admin/SystemMailPanel';
import TestimonialsPanel from '@/components/admin/TestimonialsPanel';
import ProposalDocument from '@/components/admin/ProposalDocument';
import NotificationBell from '@/components/admin/NotificationBell';
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
    featuresText: '',
    techStackText: 'Next.js 16, React 19, TypeScript, PostgreSQL'
  });
  const [sitePings, setSitePings] = useState<Record<string, { latency: number; status: string; checkedAt: string; ok: boolean }>>({});
  const [pingingAll, setPingingAll] = useState(false);
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
    companyName: 'YSNSOFT'
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
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    companyName: 'YSNSOFT',
    companyPhone: '+90 532 725 50 98',
    whatsappNumber: '+90 532 725 50 98',
    supportEmail: 'destek@ysnsoft.com',
    infoEmail: 'info@ysnsoft.com',
    notificationEmail: 'noreply@ysnsoft.com',
    address: 'Pendik / İstanbul • Türkiye',
    mersisNo: '',
    ticaretSicilNo: ''
  });

  // AI Studio States
  const [adminGlmModel, setAdminGlmModel] = useState('glm-4.7-flash');
  // Sunucudaki gerçek yapılandırma (anahtarın kendisi tarayıcıya hiç gelmez)
  const [aiConfig, setAiConfig] = useState<{ configured: boolean; model: string; models: string[] } | null>(null);
  const [glmTestOk, setGlmTestOk] = useState<boolean | null>(null);
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
  const blankInvoiceShape = { client: '', taxNumber: '', product: '', amount: 0, taxRate: 20, paymentType: 'Havale / EFT' as InvoiceRecord['paymentType'], status: 'Beklemede' as InvoiceRecord['status'], issueDate: '', dueDate: '' };
  const blankInvoice = () => {
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const now = new Date();
    return {
      client: '',
      taxNumber: '',
      product: '',
      amount: 0,
      taxRate: 20,
      paymentType: 'Havale / EFT' as InvoiceRecord['paymentType'],
      status: 'Beklemede' as InvoiceRecord['status'],
      issueDate: iso(now),
      dueDate: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14)),
    };
  };
  // Tarih ön-render sırasında okunmaz (Next 16); form açılırken doldurulur
  const [newInvoiceData, setNewInvoiceData] = useState(() => ({ ...blankInvoiceShape }));
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  // "Bugün" yalnız tarayıcıda okunur (ön-render sırasında tarih okunamaz); grafikler oturum doğrulanınca hesaplanır
  const [todayAt, setTodayAt] = useState<number | null>(null);

  // Tarayıcı alert() yerine sayfa içi bildirim
  const [toast, setToast] = useState<{ id: number; message: string; tone: 'success' | 'error' } | null>(null);
  const notify = (message: string) => {
    const tone = /hata|lütfen|bulunamadı|geçersiz/i.test(message) ? 'error' : 'success';
    setToast({ id: Date.now(), message, tone });
  };

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

      setTodayAt(Date.now());
      // Talepler ve randevular sunucudan (eskiden yalnız bu tarayıcıda + uydurma örnekler vardı)
      try { localStorage.removeItem('ysn_admin_leads_v2'); localStorage.removeItem('ysn_admin_appointments'); } catch { /* yok say */ }
      void fetchLeads().then((l) => { if (!cancelled) setLeads(l); }).catch(() => notify('Hata: teklif talepleri yüklenemedi.'));
      void fetchAppointments().then((a) => { if (!cancelled) setAppointments(a); }).catch(() => notify('Hata: randevular yüklenemedi.'));
      // Fatura kayıtları sunucudan (eskiden tarayıcıda 5 uydurma "GİB onaylı" fatura vardı)
      try { localStorage.removeItem('ysn_admin_invoices'); } catch { /* yok say */ }
      void fetchInvoices().then((i) => { if (!cancelled) setInvoices(i); }).catch(() => { /* yetkisi olmayan rol için sekme boş kalır */ });
      // Eski sürüm SMTP ayarlarını (şifre dahil) tarayıcıda tutuyordu: artık sunucuda; tarayıcıdaki kopya silinir
      try { localStorage.removeItem('ysn_smtp_settings'); } catch { /* yok say */ }
      // Şirket ayarları ve site listesi sunucudan (eskiden yalnız bu tarayıcıdaydı); eski tarayıcı kopyaları silinir
      void fetchSettings().then((s) => { if (!cancelled) setSystemSettings(s); }).catch(() => { /* yetkisi olmayan rol */ });
      void (async () => {
        // Bu tarayıcıda daha önce panelden eklenmiş (ama sunucuya hiç ulaşmamış) siteler bir kez sunucuya taşınır
        let local: Product[] = [];
        try { local = JSON.parse(localStorage.getItem('ysn_admin_products') || '[]'); } catch { /* bozuk kayıt */ }
        const custom = Array.isArray(local) ? local.filter(p => p?.displayDomain && !PRODUCTS.some(d => d.id === p.id)) : [];
        let migrated = 0;
        for (const p of custom) {
          try {
            await addSite({ name: p.name, domain: p.displayDomain, liveUrl: p.liveUrl, category: p.categoryLabel, tagline: p.tagline, description: p.shortDesc, features: p.features || [] });
            migrated++;
          } catch { /* geçersiz alan adı vb.: atlanır */ }
        }
        if (migrated === custom.length) {
          try { localStorage.removeItem('ysn_admin_products'); localStorage.removeItem('ysn_system_settings'); } catch { /* yok say */ }
        }
        if (migrated > 0) notify(`${migrated} site bu tarayıcıdan sunucuya taşındı.`);
        try { const p = await fetchSites(); if (!cancelled) setProducts(p); } catch { if (!cancelled) setProducts(PRODUCTS); }
      })();
      setGeoConfig(getStoredGeoSettings());

      // Eski sürüm GLM anahtarını tarayıcıda tutuyordu (sunucu kullanmasa da "kaydedildi" diyordu): silinir
      try { localStorage.removeItem('ysn_glm_api_key'); localStorage.removeItem('ysn_glm_model'); } catch { /* yok say */ }
      void fetch('/api/ai/chat', { cache: 'no-store' }).then((r) => r.json()).then((j) => {
        if (cancelled || !j?.success) return;
        setAiConfig({ configured: j.configured, model: j.model, models: j.models });
        setAdminGlmModel(j.model);
      }).catch(() => {});

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
  // Gerçek kontrol: sunucu siteye HTTPS isteği atar (eskiden rastgele "20-45 ms · 200 OK" üretiliyordu)
  const handlePingSite = async (domain: string, quiet = false) => {
    const checkedAt = () => new Date().toLocaleTimeString('tr-TR');
    try {
      const res = await fetch('/api/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping', domain })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      const status = data.ok ? `${data.httpStatus} OK` : data.httpStatus ? `HTTP ${data.httpStatus}` : (data.error || 'Yanıt yok');
      setSitePings(prev => ({ ...prev, [domain]: { latency: data.latencyMs, status, ok: Boolean(data.ok), checkedAt: checkedAt() } }));
      if (!quiet) setSiteActionMessage(data.ok ? `${domain} yanıt verdi: HTTP ${data.httpStatus}, ${data.latencyMs} ms` : `${domain} sorunlu: ${status}`);
    } catch (err) {
      setSitePings(prev => ({ ...prev, [domain]: { latency: 0, status: err instanceof Error ? err.message : 'Kontrol edilemedi', ok: false, checkedAt: checkedAt() } }));
      if (!quiet) setSiteActionMessage(`${domain} kontrol edilemedi.`);
    }
    if (!quiet) setTimeout(() => setSiteActionMessage(null), 4000);
  };

  const handlePingAll = async (domains: string[]) => {
    setPingingAll(true);
    for (const d of domains) await handlePingSite(d, true);
    setPingingAll(false);
  };

  // Siteler sunucuda (data/sites.json): eklenen/silinen site sitedeki vitrine de yansır.
  // Eskiden yalnız bu tarayıcıya yazılıyordu ve vitrinde hiç görünmüyordu.
  const reloadSites = () => fetchSites().then(setProducts).catch(() => notify('Hata: site listesi yüklenemedi.'));

  const handleAddNewSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteData.name || !newSiteData.displayDomain) {
      notify('Lütfen proje adı ve alan adını giriniz.');
      return;
    }
    try {
      const res = await addSite({
        name: newSiteData.name,
        domain: newSiteData.displayDomain,
        liveUrl: newSiteData.liveUrl,
        category: newSiteData.categoryLabel,
        tagline: newSiteData.tagline,
        description: newSiteData.shortDesc,
        features: newSiteData.featuresText.split(',').map(f => f.trim()).filter(Boolean),
      });
      await reloadSites();
      setSiteModalOpen(false);
      setSiteActionMessage(res.message);
      setTimeout(() => setSiteActionMessage(null), 4000);
    } catch (err) {
      notify(`Hata: ${err instanceof Error ? err.message : 'site eklenemedi.'}`);
    }
  };

  const handleDeleteSite = async (id: string, name: string) => {
    if (!confirm(`"${name}" projesini listeden ve sitedeki vitrinden kaldırmak istediğinize emin misiniz?`)) return;
    try {
      await removeSite(id);
      await reloadSites();
      setSiteActionMessage(`"${name}" kaldırıldı.`);
      setTimeout(() => setSiteActionMessage(null), 3000);
    } catch (err) {
      notify(`Hata: ${err instanceof Error ? err.message : 'site kaldırılamadı.'}`);
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
        setSeoAuditOverallScore(typeof data.overallScore === 'number' ? data.overallScore : null);
      } else {
        notify(`Hata: ${data.error || 'SEO denetimi yapılamadı.'}`);
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

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSystemSettings(await saveSettings(systemSettings));
      notify('Şirket ayarları sunucuya kaydedildi.');
    } catch (err) {
      notify(`Hata: ${err instanceof Error ? err.message : 'ayarlar kaydedilemedi.'}`);
    }
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
          model: adminGlmModel
        })
      });

      const elapsed = Math.round(performance.now() - startTime);
      setGlmTestLatency(elapsed);
      const data = await res.json().catch(() => null);
      const ok = res.ok && data?.success && typeof data.reply === 'string';
      setGlmTestOk(Boolean(ok));
      setGlmTestResponse(ok ? data.reply : `HATA (HTTP ${res.status}): ${data?.error || 'yanıt alınamadı'}`);
    } catch (err) {
      setGlmTestOk(false);
      setGlmTestResponse('Test sırasında hata oluştu: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGlmLoading(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    const before = leads;
    setLeads((cur) => cur.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
    if (selectedLead && selectedLead.id === leadId) setSelectedLead({ ...selectedLead, status: newStatus });
    try {
      await setLeadStatus(leadId, newStatus);
    } catch (err) {
      setLeads(before);
      if (selectedLead && selectedLead.id === leadId) setSelectedLead(selectedLead);
      notify(`Hata: ${err instanceof Error ? err.message : 'durum kaydedilemedi.'}`);
    }
  };

  const handleAppointmentStatus = async (aptId: string, newStatus: Appointment['status']) => {
    const before = appointments;
    setAppointments((cur) => cur.map((a) => (a.id === aptId ? { ...a, status: newStatus } : a)));
    try {
      await setAppointmentStatus(aptId, newStatus);
    } catch (err) {
      setAppointments(before);
      notify(`Hata: ${err instanceof Error ? err.message : 'randevu durumu kaydedilemedi.'}`);
    }
  };

  const handleInvoiceStatusChange = async (invId: string, newStatus: InvoiceRecord['status']) => {
    const before = invoices;
    setInvoices((cur) => cur.map((i) => (i.id === invId ? { ...i, status: newStatus } : i)));
    try {
      await setInvoiceStatus(invId, newStatus);
    } catch (err) {
      setInvoices(before);
      notify(`Hata: ${err instanceof Error ? err.message : 'durum kaydedilemedi.'}`);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoiceData.client.trim() || !(newInvoiceData.amount > 0) || invoiceSaving) return;
    setInvoiceSaving(true);
    try {
      const { record, message } = await createInvoice(newInvoiceData);
      setInvoices((cur) => [record, ...cur]);
      setInvoiceModalOpen(false);
      setNewInvoiceData(blankInvoice());
      notify(message);
    } catch (err) {
      notify(`Hata: ${err instanceof Error ? err.message : 'kayıt eklenemedi.'}`);
    } finally {
      setInvoiceSaving(false);
    }
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
  // Kayıtlar ₺ ya da € olabilir (kazanılan Alman müşteriler €): toplamlar para birimine göre ayrı gösterilir
  const totalInvoiced = invoices;

  // Genel Bakış grafikleri GERÇEK taleplerden hesaplanır (eskiden sabit yazılmış örnek rakamlardı)
  const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const leadMonthKey = (d: string) => { const m = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(d); return m ? `${m[3]}-${m[2]}` : null; };
  const monthlyLeads = (() => {
    const counts = new Map<string, number>();
    for (const l of leads) { const k = leadMonthKey(l.date); if (k) counts.set(k, (counts.get(k) ?? 0) + 1); }
    if (todayAt === null) return [];
    const now = new Date(todayAt);
    const out: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({ month: MONTHS_TR[d.getMonth()], count: counts.get(key) ?? 0 });
    }
    const max = Math.max(1, ...out.map(o => o.count));
    return out.map(o => ({ ...o, pct: Math.round((o.count / max) * 100) }));
  })();
  const productInterest = (() => {
    const counts = new Map<string, number>();
    for (const l of leads) { const p = l.product?.trim() || 'Belirtilmedi'; counts.set(p, (counts.get(p) ?? 0) + 1); }
    const colors = ['#0071E3', '#10B981', '#EC4899', '#8B5CF6', '#F59E0B'];
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, n], i) => ({ name, count: n, pct: Math.round((n / Math.max(1, leads.length)) * 100), color: colors[i] }));
  })();
  const paidInvoices = invoices.filter(inv => inv.status === 'Ödendi');
  const pendingInvoices = invoices.filter(inv => inv.status === 'Beklemede');

  const formatTRY = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
  };
  const formatMoney = (val: number, currency: InvoiceRecord['currency'] = 'TRY') =>
    new Intl.NumberFormat(currency === 'EUR' ? 'de-DE' : 'tr-TR', { style: 'currency', currency: currency ?? 'TRY', maximumFractionDigits: currency === 'EUR' ? 2 : 0 }).format(val);
  /** Toplam: para birimine göre ayrı (ör. "₺12.000 + 1.416,10 €"); kayıt yoksa ₺0 */
  const sumMoney = (list: InvoiceRecord[]) => {
    const by = new Map<string, number>();
    for (const i of list) by.set(i.currency ?? 'TRY', (by.get(i.currency ?? 'TRY') ?? 0) + i.totalAmount);
    if (!by.size) return formatTRY(0);
    return [...by.entries()].map(([c, v]) => formatMoney(v, c as InvoiceRecord['currency'])).join(' + ');
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
    appointments: { title: 'Randevular', desc: 'Sitedeki formdan gelen görüşme talepleri.' },
    muhasebe: { title: 'Muhasebe & Finans', desc: 'Fatura ve tahsilat takibi (iç kayıt).' },
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
            <NotificationBell />
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
                <span className="text-xs text-[#6E6E73] font-medium">Kayıtlı Fatura Toplamı</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold text-[#10B981]">{sumMoney(totalInvoiced)}</span>
                  <span className="text-xs font-semibold text-[#6E6E73] bg-black/[0.04] px-2 py-0.5 rounded-full">
                    {invoices.length} kayıt
                  </span>
                </div>
              </div>

              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#6E6E73] font-medium">Canlı Demo Randevuları</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-bold text-[#8B5CF6]">{appointments.length}</span>
                  <span className="text-xs font-semibold text-[#8B5CF6] bg-[#8B5CF6]/10 px-2 py-0.5 rounded-full">
                    {appointments.filter(a => a.status === 'Beklemede').length} bekliyor
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
                  <span className="text-[11px] text-[#6E6E73]">Son 6 ay · {monthlyLeads.reduce((a, b) => a + b.count, 0)} talep</span>
                </div>

                <div className="h-44 flex items-end gap-3 pt-4">
                  {monthlyLeads.map((bar, i) => (
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
                  <span className="text-[11px] text-[#6E6E73]">Teklif taleplerinden</span>
                </div>

                <div className="space-y-3">
                  {productInterest.length === 0 && <p className="text-xs text-[#6E6E73]">Henüz teklif talebi yok.</p>}
                  {productInterest.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-[#1D1D1F] truncate pr-2">{item.name}</span>
                        <span className="font-bold text-[#1D1D1F]">{item.count} · %{item.pct}</span>
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
                Sitedeki randevu formundan gelen talepler. Onayladığınızda müşteriye davet ve bağlantıyı siz gönderirsiniz.
              </p>

              <div className="space-y-3">
                {appointments.length === 0 && (
                  <p className="text-sm text-[#6E6E73] py-6 text-center">Henüz randevu talebi yok.</p>
                )}
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
                        <select
                          aria-label="Randevu durumu"
                          value={apt.status}
                          onChange={(e) => void handleAppointmentStatus(apt.id, e.target.value as Appointment['status'])}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 ${apt.status === 'Beklemede' ? 'text-[#B45309] bg-[#F59E0B]/15' : 'text-[#10B981] bg-[#10B981]/10'}`}
                        >
                          <option value="Beklemede">Beklemede</option>
                          <option value="Onaylandı">Onaylandı</option>
                          <option value="Tamamlandı">Tamamlandı</option>
                        </select>
                      </div>
                      <h4 className="text-base font-bold text-[#1D1D1F]">{apt.name}{apt.company ? ` — ${apt.company}` : ''}</h4>
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
                  <span className="text-2xl font-bold text-[#10B981]">{sumMoney(paidInvoices)}</span>
                  <span className="text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                    Ödendi
                  </span>
                </div>
              </div>

              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#6E6E73] font-medium">Bekleyen Tahsilatlar</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold text-[#F59E0B]">{sumMoney(pendingInvoices)}</span>
                  <span className="text-xs font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">
                    Beklemede
                  </span>
                </div>
              </div>

              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#6E6E73] font-medium">Toplam Kayıt (KDV dahil)</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold text-[#0071E3]">{sumMoney(totalInvoiced)}</span>
                  <span className="text-xs font-semibold text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-full">
                    {invoices.length} kayıt
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
                    <span>Fatura & Tahsilat Kayıtları</span>
                  </h3>
                  <p className="text-xs text-[#6E6E73]">İç takip kaydıdır; resmi e-Fatura / e-Arşiv bu panelden kesilmez, muhasebe programınızdan kesilmelidir.</p>
                </div>

                <button
                  onClick={() => { setNewInvoiceData(blankInvoice()); setInvoiceModalOpen(true); }}
                  className="apple-pill-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Kayıt Ekle</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F5F7] border-b border-black/[0.06] text-[#6E6E73]">
                    <tr>
                      <th className="p-3.5 font-semibold">Kayıt No / Tarih</th>
                      <th className="p-3.5 font-semibold">Müşteri / Cari</th>
                      <th className="p-3.5 font-semibold">Hizmet / Ürün</th>
                      <th className="p-3.5 font-semibold">Net Tutar</th>
                      <th className="p-3.5 font-semibold">KDV</th>
                      <th className="p-3.5 font-semibold">Toplam</th>
                      <th className="p-3.5 font-semibold">Ödeme Türü</th>
                      <th className="p-3.5 font-semibold">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {invoices.length === 0 && (
                      <tr><td colSpan={8} className="p-6 text-center text-[#6E6E73]">Henüz kayıt yok.</td></tr>
                    )}
                    {invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-[#F5F5F7]/50 transition-colors">
                        <td className="p-3.5 font-mono text-[#6E6E73]">
                          {inv.invoiceNo}
                          <span className="block text-[11px]">{inv.issueDate}{inv.dueDate && inv.dueDate !== inv.issueDate ? ` · vade ${inv.dueDate}` : ''}</span>
                        </td>
                        <td className="p-3.5">
                          <strong className="text-[#1D1D1F] block">{inv.client}</strong>
                          {inv.taxNumber && <span className="text-[#6E6E73] text-[11px]">VN: {inv.taxNumber}</span>}
                        </td>
                        <td className="p-3.5 font-medium text-[#0071E3]">{inv.product}</td>
                        <td className="p-3.5 text-[#515154]">{formatMoney(inv.amount, inv.currency)}</td>
                        <td className="p-3.5 text-[#6E6E73]">%{inv.taxRate} · {formatMoney(inv.totalAmount - inv.amount, inv.currency)}</td>
                        <td className="p-3.5 font-bold text-[#1D1D1F]">{formatMoney(inv.totalAmount, inv.currency)}</td>
                        <td className="p-3.5 text-[#515154]">{inv.paymentType}</td>
                        <td className="p-3.5">
                          <select
                            value={inv.status}
                            onChange={e => void handleInvoiceStatusChange(inv.id, e.target.value as InvoiceRecord['status'])}
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
              <div role="dialog" aria-modal="true" aria-label="Yeni kayıt" onMouseDown={(e) => { if (e.target === e.currentTarget) setInvoiceModalOpen(false); }} className="admin-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                <div className="apple-card bg-white p-6 sm:p-8 max-w-md w-full border border-black/[0.1] shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] mb-4">
                    <h4 className="text-base font-bold text-[#1D1D1F]">Yeni Fatura / Tahsilat Kaydı</h4>
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
                        placeholder="İsteğe bağlı"
                        value={newInvoiceData.taxNumber}
                        onChange={e => setNewInvoiceData({ ...newInvoiceData, taxNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Hizmet / Ürün Kalemi</label>
                      <input
                        type="text"
                        list="invoice-products"
                        placeholder="Örn: Kurumsal web sitesi"
                        value={newInvoiceData.product}
                        onChange={e => setNewInvoiceData({ ...newInvoiceData, product: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                      />
                      <datalist id="invoice-products">
                        {PRODUCTS.map(p => <option key={p.id} value={p.name} />)}
                        <option value="Web sitesi kurulumu" />
                        <option value="Aylık bakım ve barındırma" />
                        <option value="Özel yazılım geliştirme" />
                      </datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Net Tutar (₺) *</label>
                        <input
                          type="number"
                          required
                          min={0}
                          step="0.01"
                          value={newInvoiceData.amount || ''}
                          onChange={e => setNewInvoiceData({ ...newInvoiceData, amount: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Ödeme Türü</label>
                        <select
                          value={newInvoiceData.paymentType}
                          onChange={e => setNewInvoiceData({ ...newInvoiceData, paymentType: e.target.value as InvoiceRecord['paymentType'] })}
                          className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                        >
                          <option value="Havale / EFT">Havale / EFT</option>
                          <option value="Sanal POS">Sanal POS</option>
                          <option value="Çek">Çek</option>
                          <option value="Nakit">Nakit</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">KDV Oranı</label>
                        <select
                          value={newInvoiceData.taxRate}
                          onChange={e => setNewInvoiceData({ ...newInvoiceData, taxRate: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                        >
                          <option value={20}>%20 (TR)</option>
                          <option value={10}>%10 (TR)</option>
                          <option value={1}>%1 (TR)</option>
                          <option value={19}>%19 (DE)</option>
                          <option value={7}>%7 (DE)</option>
                          <option value={0}>%0</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Durum</label>
                        <select
                          value={newInvoiceData.status}
                          onChange={e => setNewInvoiceData({ ...newInvoiceData, status: e.target.value as InvoiceRecord['status'] })}
                          className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                        >
                          <option value="Beklemede">Beklemede</option>
                          <option value="Ödendi">Ödendi</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Tarih</label>
                        <input
                          type="date"
                          value={newInvoiceData.issueDate}
                          onChange={e => setNewInvoiceData({ ...newInvoiceData, issueDate: e.target.value })}
                          className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Vade</label>
                        <input
                          type="date"
                          value={newInvoiceData.dueDate}
                          onChange={e => setNewInvoiceData({ ...newInvoiceData, dueDate: e.target.value })}
                          className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between">
                      <div className="text-xs text-[#6E6E73]">
                        KDV dahil toplam: <strong className="text-[#1D1D1F]">{formatTRY((newInvoiceData.amount || 0) * (1 + newInvoiceData.taxRate / 100))}</strong>
                      </div>
                      <button
                        type="submit"
                        disabled={invoiceSaving}
                        className="apple-pill-btn px-5 py-2 text-xs font-semibold disabled:opacity-60"
                      >
                        {invoiceSaving ? 'Kaydediliyor…' : 'Kaydı Ekle'}
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
                    Canlıdaki web projelerini yönetin, sitelerin gerçekten açılıp açılmadığını kontrol edin ve yeni site ekleyin.
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
                  <span className="text-[11px] text-[#6E6E73] block">Son kontrolde yanıt veren</span>
                  <strong className="text-base text-emerald-600 block mt-0.5 font-mono">
                    {Object.keys(sitePings).length ? `${Object.values(sitePings).filter(p => p.ok).length} / ${Object.keys(sitePings).length}` : '—'}
                  </strong>
                </div>
                <div className="p-3 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                  <span className="text-[11px] text-[#6E6E73] block">Sorunlu</span>
                  <strong className={`text-base block mt-0.5 font-mono ${Object.values(sitePings).some(p => !p.ok) ? 'text-red-600' : 'text-[#1D1D1F]'}`}>
                    {Object.keys(sitePings).length ? Object.values(sitePings).filter(p => !p.ok).length : '—'}
                  </strong>
                </div>
                <div className="p-3 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                  <span className="text-[11px] text-[#6E6E73] block">Tümünü kontrol et</span>
                  <button
                    type="button"
                    disabled={pingingAll}
                    onClick={() => void handlePingAll((products.length > 0 ? products : PRODUCTS).map(p => p.displayDomain))}
                    className="mt-0.5 text-xs font-semibold text-[#0071E3] hover:underline disabled:opacity-60"
                  >
                    {pingingAll ? 'Kontrol ediliyor…' : 'Şimdi kontrol et'}
                  </button>
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
                          <div className={`flex items-center gap-1.5 text-xs font-semibold ${!pingInfo ? 'text-[#6E6E73]' : pingInfo.ok ? 'text-[#10B981]' : 'text-red-600'}`}>
                            <span className={`w-2 h-2 rounded-full ${!pingInfo ? 'bg-[#D2D2D7]' : pingInfo.ok ? 'bg-[#10B981]' : 'bg-red-500'}`} />
                            <span>{pingInfo ? pingInfo.status : 'Kontrol edilmedi'}</span>
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
                          <span className="text-[#6E6E73] font-semibold shrink-0 ml-2">
                            {pingInfo && pingInfo.latency ? `${pingInfo.latency} ms` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-[#6E6E73]">
                          {pingInfo ? `Son kontrol: ${pingInfo.checkedAt}` : 'Henüz kontrol edilmedi'}
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
                  Uzaktan erişim belirteçleri
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
                <div className={`p-4 rounded-2xl border ${seoAuditOverallScore === null ? 'bg-[#F5F5F7] border-black/[0.04]' : seoAuditOverallScore >= 80 ? 'bg-emerald-50 border-emerald-200/80' : seoAuditOverallScore >= 60 ? 'bg-amber-50 border-amber-200/80' : 'bg-red-50 border-red-200/80'}`}>
                  <span className="text-[11px] text-[#515154] font-medium block">Genel SEO & GEO Skoru (ortalama)</span>
                  <div className="text-3xl font-extrabold text-[#1D1D1F] mt-1 font-mono">
                    {seoAuditOverallScore !== null ? `${seoAuditOverallScore}/100` : '—'}
                  </div>
                  <span className="text-[11px] text-[#6E6E73] mt-1 block">
                    {seoAuditOverallScore !== null ? 'Erişim, HTTPS, başlık, açıklama, schema, robots, sitemap, GEO' : 'Henüz tarama yapılmadı'}
                  </span>
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
                          <span className={`px-2 py-0.5 rounded font-semibold ${r.hasRobots ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {r.hasRobots ? 'robots OK' : 'robots Yok'}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-semibold ${r.hasSitemap ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {r.hasSitemap ? 'sitemap OK' : 'sitemap Yok'}
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
                <div className="text-xs text-[#6E6E73] mb-2 font-medium">Son Test Sonucu</div>
                <div className={`text-xl font-bold ${glmTestOk === null ? 'text-[#6E6E73]' : glmTestOk ? 'text-emerald-600' : 'text-red-600'}`}>
                  {glmTestOk === null ? 'Test edilmedi' : glmTestOk ? 'Yanıt alındı' : 'Hata'}
                </div>
                <div className="text-[11px] text-[#6E6E73] mt-1">
                  Aşağıdan bir test isteği gönderin
                </div>
              </div>

              <div className="apple-card bg-white p-5 border border-black/[0.07]">
                <div className="text-xs text-[#6E6E73] mb-2 font-medium">Aktif Çekirdek Model</div>
                <div className="text-xl font-bold text-[#1D1D1F]">
                  {aiConfig?.model ?? '—'}
                </div>
                <div className="text-[11px] text-[#6E6E73] mt-1">
                  Sitedeki asistanın modeli (GLM_CHAT_MODEL, varsayılan ücretsiz glm-4.7-flash)
                </div>
              </div>

              <div className="apple-card bg-white p-5 border border-black/[0.07]">
                <div className="text-xs text-[#6E6E73] mb-2 font-medium">Sunucu API Anahtarı</div>
                <div className={`text-xl font-bold ${aiConfig === null ? 'text-[#6E6E73]' : aiConfig.configured ? 'text-emerald-600' : 'text-red-600'}`}>
                  {aiConfig === null ? '…' : aiConfig.configured ? 'Tanımlı' : 'Tanımlı değil'}
                </div>
                <div className="text-[11px] text-[#6E6E73] mt-1">
                  Sunucudaki GLM_API_KEY (değeri gösterilmez)
                </div>
              </div>

              <div className="apple-card bg-white p-5 border border-black/[0.07]">
                <div className="text-xs text-[#6E6E73] mb-2 font-medium">Son İstek Gecikmesi</div>
                <div className="text-xl font-bold text-indigo-600">
                  {glmTestLatency ? `${glmTestLatency} ms` : 'Hazır'}
                </div>
                <div className="text-[11px] text-[#6E6E73] mt-1">
                  Son test isteğinin süresi
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
                <select
                  aria-label="Test modeli"
                  value={adminGlmModel}
                  onChange={e => setAdminGlmModel(e.target.value)}
                  className="text-xs font-semibold px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200"
                >
                  {(aiConfig?.models ?? ['glm-4.7-flash', 'glm-4.5-flash', 'glm-4-plus']).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
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
                  <span>Sıcaklık: <strong>0.6</strong></span>
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

            {/* Yapılandırma bilgisi: anahtar ve varsayılan model sunucuda tutulur */}
            <div className="apple-card bg-white border border-black/[0.07] p-6 max-w-2xl text-xs text-[#515154] space-y-2">
              <h4 className="text-sm font-bold text-[#1D1D1F]">Yapılandırma</h4>
              <p>API anahtarı ve varsayılan model yalnızca sunucudaki <code>.env.production</code> dosyasında tutulur (<code>GLM_API_KEY</code>, <code>GLM_CHAT_MODEL</code>). Tarayıcıdan anahtar girilmez ve gönderilmez.</p>
              <p>Sitedeki asistan ziyaretçi başına 10 dakikada en çok 20 soru kabul eder; hata olursa ziyaretçiye dürüstçe &quot;şu anda yanıt veremiyor&quot; der ve teklif formuna yönlendirir.</p>
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

            {/* 2. E-posta (sunucu ayarı) ve zamanlanmış işler — gerçek test */}
            <SystemMailPanel />

            {/* Müşteri yorumları: müşterinin kendi yazdığı ve izin verdiği yorumların onayı */}
            <TestimonialsPanel notify={notify} />

          </div>
        )}

      </main>

      {/* Teklif belgesi: alanlar yazdırmadan önce doldurulur (eskiden sabit garanti/SLA şartları basıyordu) */}
      {proposalLead && (
        <ProposalDocument key={proposalLead.id} lead={proposalLead} companyName={systemSettings.companyName} onClose={() => setProposalLead(null)} />
      )}

    </div>
  );
}
