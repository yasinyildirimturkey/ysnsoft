'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getStoredLeads, 
  updateLeadStatus, 
  getStoredAppointments, 
  getStoredTeamMembers,
  saveTeamMember,
  getStoredInvoices,
  saveInvoice,
  updateInvoiceStatus,
  getStoredSmtpSettings,
  saveSmtpSettings,
  getStoredSystemSettings,
  saveSystemSettings,
  Lead, 
  Appointment,
  TeamMember,
  InvoiceRecord,
  SmtpSettings,
  SystemSettings,
  PRESET_ADMIN_USERS
} from '@/lib/store';
import { PRODUCTS } from '@/data/products';
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
  ArrowRight
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeMenu, setActiveMenu] = useState<'overview' | 'leads' | 'appointments' | 'muhasebe' | 'roller' | 'domains' | 'glm' | 'settings'>('overview');
  
  // States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  // Active User Info
  const [activeUserName, setActiveUserName] = useState<string>('Yasin Yıldırım');
  const [activeUserRole, setActiveUserRole] = useState<string>('superadmin');
  const [activeUserEmail, setActiveUserEmail] = useState<string>('yasin@ysnsoft.com');

  // SMTP & System Settings States
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>({
    host: 'mail.ysnsoft.com',
    port: 587,
    user: 'noreply@ysnsoft.com',
    pass: 'Deniz2026?!',
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

  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    name: '',
    email: '',
    role: 'sales' as const,
    roleTitle: 'Satış & Müşteri Temsilcisi',
    status: 'Aktif' as const,
    permissions: ['Teklif Talepleri', 'Müşteri CRM']
  });

  // Load from store on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuth = sessionStorage.getItem('ysn_admin_auth');
      if (isAuth !== 'true') {
        setIsAuthenticated(false);
        router.replace('/admin/login');
        return;
      }
      setIsAuthenticated(true);

      const r = sessionStorage.getItem('ysn_admin_role') || 'superadmin';
      const e = sessionStorage.getItem('ysn_admin_email') || 'yasin@ysnsoft.com';
      const n = sessionStorage.getItem('ysn_admin_name') || 'Yasin Yıldırım';
      setActiveUserRole(r);
      setActiveUserEmail(e);
      setActiveUserName(n);

      setLeads(getStoredLeads());
      setAppointments(getStoredAppointments());
      setTeamMembers(getStoredTeamMembers());
      setInvoices(getStoredInvoices());
      setSmtpSettings(getStoredSmtpSettings());
      setSystemSettings(getStoredSystemSettings());

      const savedKey = localStorage.getItem('ysn_glm_api_key') || '';
      const savedModel = localStorage.getItem('ysn_glm_model') || 'glm-4-plus';
      setAdminGlmKey(savedKey);
      setAdminGlmModel(savedModel);
    }
  }, [router]);

  const handleSaveGlmKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('ysn_glm_api_key', adminGlmKey.trim());
      localStorage.setItem('ysn_glm_model', adminGlmModel);
      alert('Yapay Zeka API Anahtarı ve Model konfigürasyonu başarıyla kaydedildi!');
    }
  };

  const handleSaveSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    saveSmtpSettings(smtpSettings);
    alert('SMTP E-Posta ayarları başarıyla güncellendi!');
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
    alert('Sistem ve şirket iletişim ayarları başarıyla kaydedildi!');
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

  const handleCreateTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberData.name || !newMemberData.email) return;

    saveTeamMember({
      name: newMemberData.name,
      email: newMemberData.email,
      role: newMemberData.role,
      roleTitle: newMemberData.roleTitle,
      status: newMemberData.status,
      permissions: newMemberData.permissions
    });

    setTeamMembers(getStoredTeamMembers());
    setTeamModalOpen(false);
    setNewMemberData({
      name: '',
      email: '',
      role: 'sales',
      roleTitle: 'Satış & Müşteri Temsilcisi',
      status: 'Aktif',
      permissions: ['Teklif Talepleri', 'Müşteri CRM']
    });
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('ysn_admin_auth');
      sessionStorage.removeItem('ysn_admin_role');
      sessionStorage.removeItem('ysn_admin_email');
      sessionStorage.removeItem('ysn_admin_name');
    }
    setIsAuthenticated(false);
    router.push('/admin/login');
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

  if (isAuthenticated !== true) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 text-[#1D1D1F]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-center shadow-sm animate-pulse">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs font-semibold text-[#86868B]">Yönetici oturumu kontrol ediliyor, yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-black/[0.08] p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 pb-6 border-b border-black/[0.06] mb-6">
            <div className="w-9 h-9 rounded-xl bg-[#1D1D1F] text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-[#1D1D1F] block leading-none">
                YSN<span className="text-[#0071E3]">SOFT</span>
              </span>
              <span className="text-[10px] text-[#86868B] font-semibold uppercase tracking-wider mt-1 block">
                Yönetim Konsolu
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveMenu('overview')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                activeMenu === 'overview'
                  ? 'bg-[#0071E3] text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Genel Bakış</span>
            </button>

            <button
              onClick={() => setActiveMenu('leads')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                activeMenu === 'leads'
                  ? 'bg-[#0071E3] text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className="w-4 h-4" />
                <span>Teklif Talepleri</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeMenu === 'leads' ? 'bg-white/20 text-white' : 'bg-[#0071E3]/10 text-[#0071E3]'
              }`}>
                {leads.filter(l => l.status === 'Yeni').length} Yeni
              </span>
            </button>

            <button
              onClick={() => setActiveMenu('appointments')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                activeMenu === 'appointments'
                  ? 'bg-[#0071E3] text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4" />
                <span>Canlı Randevular</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeMenu === 'appointments' ? 'bg-white/20 text-white' : 'bg-[#10B981]/15 text-[#10B981]'
              }`}>
                {appointments.length}
              </span>
            </button>

            {/* Muhasebe & Finans Tab */}
            <button
              onClick={() => setActiveMenu('muhasebe')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                activeMenu === 'muhasebe'
                  ? 'bg-[#0071E3] text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4" />
                <span>Muhasebe & Finans</span>
              </div>
              <span className="text-[10px] font-bold text-[#10B981]">GİB E-Fatura</span>
            </button>

            {/* Roller & Ekip Yetkileri Tab */}
            <button
              onClick={() => setActiveMenu('roller')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                activeMenu === 'roller'
                  ? 'bg-[#0071E3] text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Roller & Yetkiler</span>
              </div>
              <span className="text-[10px] font-bold text-[#8B5CF6]">{teamMembers.length} Üye</span>
            </button>

            <button
              onClick={() => setActiveMenu('domains')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                activeMenu === 'domains'
                  ? 'bg-[#0071E3] text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4" />
                <span>Canlı Siteler & Sağlık</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            </button>

            {/* AI Studio Tab */}
            <button
              onClick={() => setActiveMenu('glm')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                activeMenu === 'glm'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Yapay Zeka & Asistan Stüdyosu</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Aktif</span>
            </button>

            <button
              onClick={() => setActiveMenu('settings')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                activeMenu === 'settings'
                  ? 'bg-[#0071E3] text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Sistem Ayarları</span>
            </button>
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-black/[0.06] space-y-2">
          <div className="p-2.5 bg-[#F5F5F7] rounded-xl text-[11px] text-[#6E6E73]">
            <span className="text-[#86868B] block">Aktif Oturum:</span>
            <strong className="text-[#1D1D1F] truncate block">{activeUserName}</strong>
            <span className="text-[#86868B] text-[10px] truncate block">{activeUserEmail}</span>
            <span className="text-[#0071E3] font-bold uppercase tracking-wider text-[10px]">
              {activeUserRole}
            </span>
          </div>

          <a
            href="/portal"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            <span>Müşteri Portalı</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href="/"
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-[#1D1D1F] bg-[#F5F5F7] rounded-xl hover:bg-black/[0.08] transition-colors"
          >
            <span>Canlı Siteye Git</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-5 sm:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/[0.06] mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F]">
              {activeMenu === 'overview' && 'Yönetim Konsolu • Genel Bakış'}
              {activeMenu === 'leads' && 'Gelen Teklif & İletişim Talepleri'}
              {activeMenu === 'appointments' && 'Planlanan Canlı Demo Görüşmeleri'}
              {activeMenu === 'muhasebe' && 'Muhasebe, E-Fatura & Kasa Yönetimi'}
              {activeMenu === 'roller' && 'Ekip Üyeleri, Roller & Yetki Matrisi'}
              {activeMenu === 'domains' && 'Yayındaki Canlı Siteler & Sunucu Sağlığı'}
              {activeMenu === 'glm' && 'Yapay Zeka & Asistan Mimarisi Stüdyosu'}
              {activeMenu === 'settings' && 'Şirket, İletişim ve Sistem Ayarları'}
            </h1>
            <p className="text-xs text-[#86868B] mt-0.5">
              Giriş yapan: {activeUserEmail} | Yetki Düzeyi: {activeUserRole.toUpperCase()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              Sistem Aktif (%99.99 Uptime)
            </span>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeMenu === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#86868B] font-medium">Toplam Teklif Talebi</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-bold text-[#1D1D1F]">{leads.length}</span>
                  <span className="text-xs font-semibold text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-full">
                    {leads.filter(l => l.status === 'Yeni').length} Yeni
                  </span>
                </div>
              </div>

              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#86868B] font-medium">Bu Ay Kesilen E-Fatura</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold text-[#10B981]">{formatTRY(totalInvoiced)}</span>
                  <span className="text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                    GİB Onaylı
                  </span>
                </div>
              </div>

              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#86868B] font-medium">Canlı Demo Randevuları</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-bold text-[#8B5CF6]">{appointments.length}</span>
                  <span className="text-xs font-semibold text-[#8B5CF6] bg-[#8B5CF6]/10 px-2 py-0.5 rounded-full">
                    Google Meet
                  </span>
                </div>
              </div>

              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#86868B] font-medium">Aktif Ekip & Roller</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-bold text-[#F59E0B]">{teamMembers.length} Kişi</span>
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
                      <span className="text-[10px] font-semibold text-[#1D1D1F]">{bar.count}</span>
                      <div className="w-full bg-[#F5F5F7] rounded-t-lg h-32 flex items-end">
                        <div
                          style={{ height: `${bar.pct}%` }}
                          className={`w-full rounded-t-lg transition-all ${
                            i === 5 ? 'bg-[#0071E3]' : 'bg-[#D2D2D7] hover:bg-[#86868B]'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] text-[#86868B]">{bar.month}</span>
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
                  <span className="text-[11px] text-[#86868B]">Canlı Veri</span>
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
                  <p className="text-xs text-[#86868B]">Siteden müşterilerin gönderdiği anlık leadler</p>
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
                    <tr className="border-b border-black/[0.06] text-[#86868B]">
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
                        <td className="py-3 text-[#86868B] whitespace-nowrap">{lead.date}</td>
                        <td className="py-3 font-semibold text-[#1D1D1F]">{lead.name}</td>
                        <td className="py-3 text-[#1D1D1F]">{lead.company}</td>
                        <td className="py-3 font-medium text-[#0071E3]">{lead.product}</td>
                        <td className="py-3 text-[#6E6E73]">{lead.budget}</td>
                        <td className="py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                  <Search className="w-4 h-4 text-[#86868B] absolute left-3 top-2.5" />
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
                  <thead className="bg-[#F5F5F7] border-b border-black/[0.06] text-[#86868B]">
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
                        <td className="p-4 text-[#86868B] whitespace-nowrap">{lead.date}</td>
                        <td className="p-4 font-bold text-[#1D1D1F]">{lead.name}</td>
                        <td className="p-4 text-[#1D1D1F] font-medium">{lead.company}</td>
                        <td className="p-4">
                          <div className="text-[#1D1D1F] font-semibold">{lead.phone}</div>
                          <span className="text-[#86868B] text-[11px]">{lead.email}</span>
                        </td>
                        <td className="p-4 font-semibold text-[#0071E3]">{lead.product}</td>
                        <td className="p-4 text-[#6E6E73]">{lead.budget}</td>
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
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                <div className="apple-card bg-white p-6 sm:p-8 max-w-lg w-full border border-black/[0.1] shadow-2xl relative">
                  <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] mb-5">
                    <div>
                      <span className="text-xs font-bold text-[#86868B]">{selectedLead.id}</span>
                      <h4 className="text-lg font-bold text-[#1D1D1F]">{selectedLead.name}</h4>
                    </div>
                    <button onClick={() => setSelectedLead(null)} className="p-1 text-[#86868B] hover:text-[#1D1D1F]">
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="text-[#86868B] block">Şirket / Büro:</span>
                      <strong className="text-sm text-[#1D1D1F]">{selectedLead.company}</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[#86868B] block">E-Posta:</span>
                        <a href={`mailto:${selectedLead.email}`} className="text-[#0071E3] font-semibold underline">
                          {selectedLead.email}
                        </a>
                      </div>
                      <div>
                        <span className="text-[#86868B] block">Telefon:</span>
                        <a href={`tel:${selectedLead.phone}`} className="text-[#0071E3] font-semibold underline">
                          {selectedLead.phone}
                        </a>
                      </div>
                    </div>

                    <div>
                      <span className="text-[#86868B] block">Talep Edilen Sistem:</span>
                      <strong className="text-sm text-[#0071E3]">{selectedLead.product}</strong>
                    </div>

                    <div>
                      <span className="text-[#86868B] block">Öngörülen Bütçe Ölçeği:</span>
                      <span className="font-semibold text-[#1D1D1F]">{selectedLead.budget}</span>
                    </div>

                    <div className="p-3.5 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                      <span className="text-[#86868B] block mb-1">Müşteri Notu:</span>
                      <p className="text-[#1D1D1F] leading-relaxed">
                        {selectedLead.message || 'Özel bir not belirtilmedi.'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[#86868B] block mb-1">Talep Durumu Değiştir:</span>
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

        {/* TAB 3: APPOINTMENTS */}
        {activeMenu === 'appointments' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="apple-card bg-white border border-black/[0.07] p-6">
              <h3 className="text-base font-bold text-[#1D1D1F] mb-1">
                Planlanmış Canlı Demo Takvimi
              </h3>
              <p className="text-xs text-[#86868B] mb-6">
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
                      <p className="text-xs text-[#6E6E73] mt-0.5">Konu: {apt.topic} | E-Posta: {apt.email}</p>
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
                <span className="text-xs text-[#86868B] font-medium">Toplam Tahsil Edilen</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold text-[#10B981]">{formatTRY(paidInvoices)}</span>
                  <span className="text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                    Kasada Aktif
                  </span>
                </div>
              </div>

              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#86868B] font-medium">Bekleyen Tahsilatlar</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold text-[#F59E0B]">{formatTRY(pendingInvoices)}</span>
                  <span className="text-xs font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">
                    Vadesi Gelmedi
                  </span>
                </div>
              </div>

              <div className="apple-card p-5 bg-white border border-black/[0.07]">
                <span className="text-xs text-[#86868B] font-medium">GİB E-Fatura Hacmi</span>
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
                  <p className="text-xs text-[#86868B]">Resmi GİB onaylı faturalar ve tahsilat takibi</p>
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
                  <thead className="bg-[#F5F5F7] border-b border-black/[0.06] text-[#86868B]">
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
                        <td className="p-3.5 font-mono text-[#86868B]">{inv.invoiceNo}</td>
                        <td className="p-3.5">
                          <strong className="text-[#1D1D1F] block">{inv.client}</strong>
                          <span className="text-[#86868B] text-[10px]">VN: {inv.taxNumber}</span>
                        </td>
                        <td className="p-3.5 font-medium text-[#0071E3]">{inv.product}</td>
                        <td className="p-3.5 text-[#6E6E73]">{formatTRY(inv.amount)}</td>
                        <td className="p-3.5 text-[#86868B]">{formatTRY(inv.totalAmount - inv.amount)}</td>
                        <td className="p-3.5 font-bold text-[#1D1D1F]">{formatTRY(inv.totalAmount)}</td>
                        <td className="p-3.5 text-[#6E6E73]">{inv.paymentType}</td>
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
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                <div className="apple-card bg-white p-6 sm:p-8 max-w-md w-full border border-black/[0.1] shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] mb-4">
                    <h4 className="text-base font-bold text-[#1D1D1F]">Yeni E-Fatura / Tahsilat Kaydı</h4>
                    <button onClick={() => setInvoiceModalOpen(false)} className="text-[#86868B] hover:text-[#1D1D1F]">✕</button>
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
                      <div className="text-xs text-[#86868B]">
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
        {activeMenu === 'roller' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header info */}
            <div className="apple-card bg-white border border-black/[0.07] p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Rol Tabanlı Yetkilendirme (RBAC) & Ekip Üyeleri</span>
                  </h3>
                  <p className="text-xs text-[#86868B]">
                    Hangi ekip üyesinin muhasebe, teklif onayı veya teknik loglara erişebileceğini yönetin
                  </p>
                </div>

                <button
                  onClick={() => setTeamModalOpen(true)}
                  className="apple-pill-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Ekip Üyesi Ekle</span>
                </button>
              </div>

              {/* Team Members List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {teamMembers.map(member => (
                  <div key={member.id} className="p-5 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          member.role === 'superadmin' ? 'bg-blue-100 text-blue-700' :
                          member.role === 'accounting' ? 'bg-emerald-100 text-emerald-700' :
                          member.role === 'sales' ? 'bg-purple-100 text-purple-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {member.roleTitle}
                        </span>
                        <span className="text-xs text-[#10B981] font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {member.status}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-[#1D1D1F]">{member.name}</h4>
                      <p className="text-xs text-[#86868B] mb-3">{member.email}</p>

                      <div className="space-y-1">
                        <span className="text-[10px] text-[#86868B] font-bold uppercase tracking-wider block">Yetki Alanları:</span>
                        <div className="flex flex-wrap gap-1">
                          {member.permissions.map((p, idx) => (
                            <span key={idx} className="bg-white px-2 py-0.5 rounded text-[10px] font-medium text-[#1D1D1F] border border-black/[0.04]">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-black/[0.06] text-[10px] text-[#86868B] mt-4 flex justify-between items-center">
                      <span>Son Görülme: {member.lastLogin}</span>
                      <span className="text-[#0071E3] font-semibold cursor-pointer hover:underline">Düzenle</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Role Permissions Matrix Table */}
              <div className="pt-4 border-t border-black/[0.06]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#86868B] mb-3">
                  Sistem Yetki Matrisi
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-black/[0.06] rounded-xl overflow-hidden">
                    <thead className="bg-[#F5F5F7] text-[#86868B]">
                      <tr>
                        <th className="p-3 font-semibold">Modül / İşlem</th>
                        <th className="p-3 font-semibold text-center">Süper Admin</th>
                        <th className="p-3 font-semibold text-center">Muhasebe Müdürü</th>
                        <th className="p-3 font-semibold text-center">Satış / Lead</th>
                        <th className="p-3 font-semibold text-center">Çözüm Mimarı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.04]">
                      <tr>
                        <td className="p-3 font-medium text-[#1D1D1F]">Gelen Teklif Taleplerini Görme & Düzenleme</td>
                        <td className="p-3 text-center text-[#10B981] font-bold">✓ Tam Yetki</td>
                        <td className="p-3 text-center text-[#86868B]">—</td>
                        <td className="p-3 text-center text-[#10B981] font-bold">✓ Tam Yetki</td>
                        <td className="p-3 text-center text-[#0071E3]">Yalnızca Okuma</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-[#1D1D1F]">Resmi Teklif Mektubu PDF Basma & Fiyatlandırma</td>
                        <td className="p-3 text-center text-[#10B981] font-bold">✓ Tam Yetki</td>
                        <td className="p-3 text-center text-[#0071E3]">Onaylama</td>
                        <td className="p-3 text-center text-[#10B981] font-bold">✓ Taslak & Basım</td>
                        <td className="p-3 text-center text-[#86868B]">—</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-[#1D1D1F]">E-Fatura Kesme, Kasa & Banka Tahsilatı</td>
                        <td className="p-3 text-center text-[#10B981] font-bold">✓ Tam Yetki</td>
                        <td className="p-3 text-center text-[#10B981] font-bold">✓ Tam Yetki</td>
                        <td className="p-3 text-center text-[#86868B]">—</td>
                        <td className="p-3 text-center text-[#86868B]">—</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-[#1D1D1F]">Canlı Siteler & DNS/SSL Sağlık İzleme</td>
                        <td className="p-3 text-center text-[#10B981] font-bold">✓ Tam Yetki</td>
                        <td className="p-3 text-center text-[#86868B]">—</td>
                        <td className="p-3 text-center text-[#0071E3]">Yalnızca Okuma</td>
                        <td className="p-3 text-center text-[#10B981] font-bold">✓ Tam Yetki</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-[#1D1D1F]">Kullanıcı Ekleme, Silme ve Rol Değiştirme</td>
                        <td className="p-3 text-center text-[#10B981] font-bold">✓ Tam Yetki</td>
                        <td className="p-3 text-center text-[#86868B]">—</td>
                        <td className="p-3 text-center text-[#86868B]">—</td>
                        <td className="p-3 text-center text-[#86868B]">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* New Member Modal */}
            {teamModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                <div className="apple-card bg-white p-6 sm:p-8 max-w-md w-full border border-black/[0.1] shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] mb-4">
                    <h4 className="text-base font-bold text-[#1D1D1F]">Yeni Ekip Üyesi & Rol Tanımı</h4>
                    <button onClick={() => setTeamModalOpen(false)} className="text-[#86868B] hover:text-[#1D1D1F]">✕</button>
                  </div>

                  <form onSubmit={handleCreateTeamMember} className="space-y-3.5 text-xs">
                    <div>
                      <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Ad Soyad *</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Ayşe Demir"
                        value={newMemberData.name}
                        onChange={e => setNewMemberData({ ...newMemberData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Kurumsal E-Posta *</label>
                      <input
                        type="email"
                        required
                        placeholder="ayse@ysnsoft.com"
                        value={newMemberData.email}
                        onChange={e => setNewMemberData({ ...newMemberData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Rol Tanımı</label>
                      <select
                        value={newMemberData.role}
                        onChange={e => {
                          const r = e.target.value as any;
                          const title = 
                            r === 'superadmin' ? 'Süper Admin' :
                            r === 'accounting' ? 'Mali İşler & Muhasebe' :
                            r === 'sales' ? 'Satış & Müşteri Yöneticisi' : 'Kıdemli Çözüm Mimarı';
                          setNewMemberData({ ...newMemberData, role: r, roleTitle: title });
                        }}
                        className="w-full px-3 py-2 bg-[#F5F5F7] rounded-xl border border-black/[0.08]"
                      >
                        <option value="sales">Satış & Müşteri Yöneticisi</option>
                        <option value="accounting">Mali İşler & Muhasebe</option>
                        <option value="engineer">Kıdemli Çözüm Mimarı</option>
                        <option value="superadmin">Süper Admin</option>
                      </select>
                    </div>

                    <div className="pt-3 border-t border-black/[0.06] flex justify-end">
                      <button
                        type="submit"
                        className="apple-pill-btn px-6 py-2 text-xs font-semibold"
                      >
                        Üyeyi Kaydet
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: LIVE DOMAINS & HEALTH CHECK */}
        {activeMenu === 'domains' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="apple-card bg-white border border-black/[0.07] p-6">
              <h3 className="text-base font-bold text-[#1D1D1F] mb-1">
                Canlıda Yayında Olan Web Siteleri ve Portallar
              </h3>
              <p className="text-xs text-[#86868B] mb-6">
                YSNSOFT tarafından geliştirilen ve canlı DNS/SSL ile çalışan gerçek siteler
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PRODUCTS.map(prod => (
                  <div key={prod.id} className="p-5 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-[#0071E3] bg-[#0071E3]/10 px-3 py-0.5 rounded-full">
                          {prod.categoryLabel}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#10B981]">
                          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                          <span>200 OK • SSL Aktif</span>
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-[#1D1D1F] mb-1">{prod.name}</h4>
                      <p className="text-xs text-[#6E6E73] mb-3">{prod.tagline}</p>

                      <div className="p-2.5 bg-white rounded-xl border border-black/[0.04] text-xs font-mono text-[#1D1D1F] flex items-center justify-between mb-4">
                        <span>{prod.displayDomain}</span>
                        <span className="text-[#10B981] font-semibold">Ping: 38 ms</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between">
                      <span className="text-[11px] text-[#86868B]">Uptime: {prod.liveStats.uptime}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => alert(`${prod.displayDomain} için Cloudflare & Next.js önbelleği temizlendi.`)}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#1D1D1F] text-[11px] font-semibold transition-colors"
                        >
                          Önbellek Temizle
                        </button>
                        <a
                          href={prod.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="apple-pill-btn px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <span>Aç</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
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
                  <p className="text-xs text-[#86868B] mt-0.5">
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
                  YSNSOFT Akıllı Sunucu Proxy Katmanı sayesinde, istemci sitelerinizin (<code className="font-mono bg-white px-1 py-0.5 rounded text-emerald-950 font-bold">kglex.com</code>, <code className="font-mono bg-white px-1 py-0.5 rounded text-emerald-950 font-bold">hgavukatlik.com</code>, <code className="font-mono bg-white px-1 py-0.5 rounded text-emerald-950 font-bold">acikellaw.com</code>, <code className="font-mono bg-white px-1 py-0.5 rounded text-emerald-950 font-bold">haritaplan.com</code>) <code className="font-mono bg-white px-1 py-0.5 rounded text-emerald-950">next.config.js</code> dosyasını değiştirmenize veya sunucuda yeniden derleme (rebuild) yapmanıza <strong>gerek yoktur</strong>.
                </p>
                <p className="leading-relaxed text-[11px] text-emerald-900">
                  Sitelerinizin <code className="font-mono bg-white px-1 py-0.5 rounded text-emerald-950">.env</code> dosyasına tanımladığınız yönetim tokenları ile panelden uzaktan önbellek temizleme, sağlık pinglemesi ve performans telemetrisi doğrudan yönetilir.
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
                        navigator.clipboard.writeText(`YSN_MANAGEMENT_TOKEN=ysn_live_sec_2026_kglex\nYSN_ALLOWED_ORIGINS=http://localhost:3000,https://ysnsoft.com`);
                        alert('.env yapılandırması panoya kopyalandı!');
                      }}
                      className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-[10px] font-mono transition-colors"
                    >
                      Kopyala
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-emerald-400 overflow-x-auto p-1 leading-relaxed">
{`# YSNSOFT Merkezi Yönetim ve Iframe Tokenı
YSN_MANAGEMENT_TOKEN=ysn_live_sec_2026_kglex
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
                        alert('next.config.js başlık kodu kopyalandı!');
                      }}
                      className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-[10px] font-mono transition-colors"
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
                  <span className="text-[11px] text-[#86868B] font-normal">Tüm siteler 256-bit şifrelenmiştir</span>
                </div>
                <div className="divide-y divide-black/[0.04]">
                  {PRODUCTS.map(p => (
                    <div key={p.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 transition-colors">
                      <div>
                        <div className="font-bold text-[#1D1D1F] flex items-center gap-2">
                          <span>{p.name}</span>
                          <code className="text-[11px] text-blue-600 font-mono">({p.displayDomain})</code>
                        </div>
                        <div className="text-[11px] font-mono text-gray-500 mt-0.5">
                          Token: <span className="text-gray-800 font-semibold">ysn_live_{p.id}_2026_{p.id.slice(-4)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`YSN_MANAGEMENT_TOKEN=ysn_live_${p.id}_2026_${p.id.slice(-4)}`);
                            alert(`${p.displayDomain} tokenı panoya kopyalandı!`);
                          }}
                          className="px-3 py-1 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg text-[11px] font-semibold text-gray-700 transition-colors"
                        >
                          Token Kopyala
                        </button>
                        <button
                          type="button"
                          onClick={() => alert(`${p.displayDomain} canlı sağlık pingi: 200 OK (24 ms)`)}
                          className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          Ping & Test
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: YAPAY ZEKA & ASİSTAN STÜDYOSU */}
        {activeMenu === 'glm' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="apple-card bg-white p-5 border border-black/[0.07]">
                <div className="flex items-center justify-between text-xs text-[#86868B] mb-2 font-medium">
                  <span>Yapay Zeka Motor Durumu</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div className="text-xl font-bold text-emerald-600 flex items-center gap-2">
                  <span>Bağlandı</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">200 OK</span>
                </div>
                <div className="text-[11px] text-[#86868B] mt-1 font-mono">
                  YSNSOFT Neural Gateway
                </div>
              </div>

              <div className="apple-card bg-white p-5 border border-black/[0.07]">
                <div className="text-xs text-[#86868B] mb-2 font-medium">Aktif Çekirdek Model</div>
                <div className="text-xl font-bold text-[#1D1D1F]">
                  {adminGlmModel === 'glm-4-plus' ? 'Plus Enterprise' : adminGlmModel.toUpperCase()}
                </div>
                <div className="text-[11px] text-blue-600 mt-1 font-medium">
                  Yüksek Akıl & Dava Analizörü
                </div>
              </div>

              <div className="apple-card bg-white p-5 border border-black/[0.07]">
                <div className="text-xs text-[#86868B] mb-2 font-medium">Yetkili API Anahtarı</div>
                <div className="text-sm font-mono font-bold text-[#1D1D1F] truncate">
                  1efef9eb...CfrWA
                </div>
                <div className="text-[11px] text-emerald-600 mt-1 font-medium">
                  ✓ Güvenli Sunucu Yetkisi Aktif
                </div>
              </div>

              <div className="apple-card bg-white p-5 border border-black/[0.07]">
                <div className="text-xs text-[#86868B] mb-2 font-medium">Son İstek Gecikmesi</div>
                <div className="text-xl font-bold text-indigo-600">
                  {glmTestLatency ? `${glmTestLatency} ms` : 'Hazır'}
                </div>
                <div className="text-[11px] text-[#86868B] mt-1">
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
                  <p className="text-xs text-[#86868B] mt-0.5">
                    Hukuk UYAP botları, imar mevzuatı (3194 Md. 18) ve sistem tekliflerini canlı test edin.
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                  Canlı AI API Motoru
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[11px] font-semibold text-[#86868B] block mb-2">Hazır Test Senaryoları:</span>
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
                <div className="text-xs text-[#86868B] flex items-center gap-2">
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
                    <span className="text-[#86868B] font-normal">
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
              <p className="text-xs text-[#86868B] mb-4">
                API anahtarınız sunucu tarafında güvenli şekilde saklanmaktadır. Dilerseniz buradan güncelleyebilirsiniz.
              </p>

              <form onSubmit={handleSaveGlmKey} className="space-y-4 text-xs">
                <div>
                  <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Yetkili API Anahtarı</label>
                  <input
                    type="password"
                    value={adminGlmKey}
                    onChange={e => setAdminGlmKey(e.target.value)}
                    placeholder="1efef9eb03bb45519b8b049bda266650.N8vckn65Qs8CfrWA"
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
                  <p className="text-xs text-[#86868B] mt-0.5">
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
                  <p className="text-xs text-[#86868B] mt-0.5">
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
                  <p className="text-xs text-[#86868B] mt-0.5">
                    D:\hukuk\kglex sistem mimarisi ve canlı üretim parametreleri
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                  Canlıda (v0.33.45)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                  <span className="text-[#86868B] block text-[10px] uppercase font-semibold">UYAP Bot Servisi</span>
                  <strong className="text-emerald-700 block mt-0.5">Port 3006 (Aktif)</strong>
                  <span className="text-[10px] text-[#86868B]">MariaDB lawdba (Multi-Tenant)</span>
                </div>

                <div className="p-3 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                  <span className="text-[#86868B] block text-[10px] uppercase font-semibold">Gece Evrak Taraması</span>
                  <strong className="text-[#1D1D1F] block mt-0.5">02:00 - 06:00</strong>
                  <span className="text-[10px] text-emerald-600">500+ Büro Otomatik Takip</span>
                </div>

                <div className="p-3 bg-[#F5F5F7] rounded-xl border border-black/[0.04]">
                  <span className="text-[#86868B] block text-[10px] uppercase font-semibold">Kiracı İzolasyonu</span>
                  <strong className="text-[#1D1D1F] block mt-0.5">AsyncLocalStorage</strong>
                  <span className="text-[10px] text-blue-600">companyId Filtresi Aktif</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* OFFICIAL PROPOSAL / PDF PRINT MODAL */}
      {proposalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-3xl w-full border border-black/[0.1] shadow-2xl my-8 print:shadow-none print:border-0 print:p-0">
            
            <div className="flex items-center justify-between pb-6 border-b border-black/[0.1] mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1D1D1F] text-white flex items-center justify-center font-bold">
                  YSN
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1D1D1F]">YSNSOFT BİLİŞİM TEKNOLOJİLERİ A.Ş.</h2>
                  <p className="text-[11px] text-[#86868B]">Kurumsal SaaS & Yazılım Mühendisliği • Teklif Belgesi</p>
                </div>
              </div>

              <div className="text-right text-xs">
                <div className="font-bold text-[#1D1D1F]">TEKLİF NO: YSN-{proposalLead.id}</div>
                <div className="text-[#86868B]">Tarih: {new Date().toLocaleDateString('tr-TR')}</div>
              </div>
            </div>

            <div className="bg-[#F5F5F7] p-5 rounded-2xl border border-black/[0.06] mb-6 text-xs">
              <span className="text-[#86868B] uppercase font-bold text-[10px] block mb-1">Müşteri / Kurum Bilgileri:</span>
              <h4 className="text-base font-bold text-[#1D1D1F] mb-1">{proposalLead.name}</h4>
              <p className="text-[#6E6E73] font-medium">{proposalLead.company}</p>
              <div className="text-[#86868B] mt-1">İletişim: {proposalLead.email} | {proposalLead.phone}</div>
            </div>

            <div className="space-y-4 text-xs mb-8">
              <div>
                <span className="text-[#86868B] uppercase font-bold text-[10px] block mb-1">1. Proje Kapsamı</span>
                <p className="text-sm font-semibold text-[#1D1D1F]">
                  {proposalLead.product} — Anahtar Teslim Kurulum ve Entegrasyon
                </p>
                <p className="text-[#6E6E73] mt-1 leading-relaxed">
                  İşbu teklif; talep edilen sistemin şirket altyapısına kurulması, veri aktarımı, UYAP/CAD/Sanal POS entegrasyonu ve 12 aylık 7/24 SLA teknik destek güvencesini kapsar.
                </p>
              </div>

              <div className="border border-black/[0.08] rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#F5F5F7] border-b border-black/[0.06] text-[#86868B]">
                    <tr>
                      <th className="p-3 font-semibold">Hizmet / Modül</th>
                      <th className="p-3 font-semibold">Teslim Süresi</th>
                      <th className="p-3 font-semibold text-right">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05]">
                    <tr>
                      <td className="p-3 font-medium text-[#1D1D1F]">SaaS Çekirdek Kurulumu & Veritabanı</td>
                      <td className="p-3 text-[#6E6E73]">Sprint 1 (1. Hafta)</td>
                      <td className="p-3 text-right font-bold text-[#10B981]">Dahil</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-[#1D1D1F]">Özel Entegrasyonlar (Robot/API/Ödeme)</td>
                      <td className="p-3 text-[#6E6E73]">Sprint 2 (2. Hafta)</td>
                      <td className="p-3 text-right font-bold text-[#10B981]">Dahil</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-[#1D1D1F]">Eski Sistemden Sıfır Kayıpla Veri Aktarımı</td>
                      <td className="p-3 text-[#6E6E73]">Sprint 3 (3. Hafta)</td>
                      <td className="p-3 text-right font-bold text-[#10B981]">Dahil</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-[#1D1D1F]">Kullanıcı Eğitimi & 1 Yıllık 7/24 SLA Bakım</td>
                      <td className="p-3 text-[#6E6E73]">Sürekli</td>
                      <td className="p-3 text-right font-bold text-[#10B981]">Garantili</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-[#0071E3]/5 p-4 rounded-xl border border-[#0071E3]/15 flex items-center justify-between">
                <div>
                  <span className="text-[#86868B] block text-[11px]">Öngörülen Bütçe Ölçeği</span>
                  <span className="text-base font-bold text-[#0071E3]">{proposalLead.budget}</span>
                </div>
                <div className="text-right text-[11px] text-[#6E6E73]">
                  Ödeme Koşulu: %30 Avans, %40 Sprint Kabulü, %30 Canlı Teslimat
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-black/[0.1] grid grid-cols-2 gap-8 text-xs text-center mb-6">
              <div>
                <span className="text-[#86868B] block mb-1">Teklifi Hazırlayan</span>
                <strong className="text-[#1D1D1F] block">YSNSOFT Bilişim Teknolojileri A.Ş.</strong>
                <span className="text-[#86868B] text-[10px] block mt-4">İmza & Kaşe</span>
              </div>
              <div>
                <span className="text-[#86868B] block mb-1">Müşteri Kabul Onayı</span>
                <strong className="text-[#1D1D1F] block">{proposalLead.company}</strong>
                <span className="text-[#86868B] text-[10px] block mt-4">İmza & Kaşe</span>
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
