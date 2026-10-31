'use client';

import React, { useState } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Scale, 
  Compass, 
  Layers, 
  Bot, 
  Plus, 
  Calculator, 
  FileText,
  Search,
  Camera,
  ShoppingBag
} from 'lucide-react';

export default function InteractiveSandbox() {
  const [activeTab, setActiveTab] = useState<'kglex' | 'harita' | 'hg' | 'flamant'>('kglex');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');

  // KGLEX UYAP Robot Simulator State
  const [uyapCases, setUyapCases] = useState([
    { no: '2026/418 Esas', court: 'İstanbul 4. Asliye Ticaret', client: 'Arı Lojistik A.Ş.', status: 'Duruşma 14.11.2026', uyapSynced: true },
    { no: '2026/892 İcra', court: 'Bakırköy 2. İcra Dairesi', client: 'Bora Teknoloji Ltd.', status: 'Haciz Emri Tebliğ Edildi', uyapSynced: true },
    { no: '2026/105 Esas', court: 'Çağlayan 11. İş Mahkemesi', client: 'Selin Aksoy', status: 'Bilirkişi Raporu Geldi', uyapSynced: true }
  ]);
  const [newCaseNo, setNewCaseNo] = useState('');
  const [newClient, setNewClient] = useState('');
  const [robotScanning, setRobotScanning] = useState(false);

  // HG & Açıkel Law Simulator State
  const [hgLang, setHgLang] = useState<'TR' | 'EN' | 'DE'>('TR');
  const [hgFeeBase, setHgFeeBase] = useState<number>(45000);
  const [hgFeeCurrency, setHgFeeCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');

  const handleScanUyap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseNo || !newClient) return;
    setRobotScanning(true);

    setTimeout(() => {
      setRobotScanning(false);
      setUyapCases([
        { no: newCaseNo, court: 'Ankara 8. Fikri Sınai Mahkemesi', client: newClient, status: 'UYAP Robotu Tarafından Çekildi', uyapSynced: true },
        ...uyapCases
      ]);
      setNewCaseNo('');
      setNewClient('');
    }, 1200);
  };

  // HaritaPlan 3D CBS & DOP Simulator State
  const [ada, setAda] = useState('1402');
  const [parsel, setParsel] = useState('18');
  const [totalArea, setTotalArea] = useState(12500); // m²
  const [dopResult, setDopResult] = useState<{ dopArea: number; netArea: number; dopRatio: number } | null>({
    dopArea: 5000,
    netArea: 7500,
    dopRatio: 40.0
  });

  const handleCalculateDop = () => {
    // 3194 Sayılı Kanun Md. 18: Maksimum DOP %45
    const ratio = 40.0;
    const dop = Math.round((totalArea * ratio) / 100);
    const net = totalArea - dop;
    setDopResult({
      dopArea: dop,
      netArea: net,
      dopRatio: ratio
    });
  };

  // Flamantyou AI Cilt Analizi State
  const [skinType, setSkinType] = useState<'karma' | 'kuru' | 'yagli'>('karma');
  const [skinReport, setSkinReport] = useState<{ hydration: string; barrier: string; recipe: string[] }>({
    hydration: '%78 İdeal Nem',
    barrier: '%85 Sağlıklı Bariyer',
    recipe: ['Hyalüronik Asit B5 Serum', 'Centella Yatıştırıcı Tonik', 'Mineral Filtreli Güneş Kremi']
  });

  const handleAnalyzeSkin = (type: 'karma' | 'kuru' | 'yagli') => {
    setSkinType(type);
    if (type === 'kuru') {
      setSkinReport({
        hydration: '%42 Düşük Nem (Destek Gerekli)',
        barrier: '%60 Hassaslaşmış Bariyer',
        recipe: ['Seramid Yoğun Nemlendirici Krem', 'Skualen Besleyici Yağ', 'Nazik Köpük Temizleyici']
      });
    } else if (type === 'yagli') {
      setSkinReport({
        hydration: '%68 Dengeli Nem',
        barrier: '%72 Sebum Fazlalığı',
        recipe: ['Niasinamid %10 + Çinko Serum', 'Salisilik Asit Gözenek Toniği', 'Su Bazlı Jel Nemlendirici']
      });
    } else {
      setSkinReport({
        hydration: '%78 İdeal Nem',
        barrier: '%85 Sağlıklı Bariyer',
        recipe: ['Hyalüronik Asit B5 Serum', 'Centella Yatıştırıcı Tonik', 'Mineral Filtreli Güneş Kremi']
      });
    }
  };

  return (
    <section id="sandbox" className="py-24 bg-white border-b border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F5F7] border border-black/[0.08] text-xs font-semibold text-[#1D1D1F] mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Gerçek Ürün Simülatörü</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#1D1D1F] mb-4">
            Ürünlerimizi şimdi <br />
            <span className="text-[#0071E3]">canlı olarak test edin.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73]">
            KGLEX UYAP robotu, HaritaPlan DOP hesap motoru ve Flamantyou AI cilt analizi laboratuvarı burada. İstediğiniz modülü seçip canlı kod üzerinde deneyin.
          </p>

          {/* Selector Tabs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-4 border-t border-black/[0.06]">
            <div className="flex flex-wrap items-center gap-1.5 bg-[#F5F5F7] p-1.5 rounded-2xl border border-black/[0.04]">
              <button
                onClick={() => setActiveTab('kglex')}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                  activeTab === 'kglex' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                KGLEX UYAP Robotu
              </button>
              <button
                onClick={() => setActiveTab('harita')}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                  activeTab === 'harita' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                HaritaPlan 3194 Md. 18
              </button>
              <button
                onClick={() => setActiveTab('hg')}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                  activeTab === 'hg' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                HG & Açıkel Hukuk
              </button>
              <button
                onClick={() => setActiveTab('flamant')}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                  activeTab === 'flamant' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                Flamantyou AI Cilt Analizi
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1 bg-[#F5F5F7] p-1 rounded-xl">
              <button
                onClick={() => setDeviceMode('desktop')}
                title="Masaüstü"
                className={`p-2 rounded-lg transition-all ${deviceMode === 'desktop' ? 'bg-white text-[#0071E3] shadow-xs' : 'text-[#86868B]'}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeviceMode('mobile')}
                title="Mobil"
                className={`p-2 rounded-lg transition-all ${deviceMode === 'mobile' ? 'bg-white text-[#0071E3] shadow-xs' : 'text-[#86868B]'}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sandbox Canvas */}
        <div className={`mx-auto transition-all duration-300 ${deviceMode === 'mobile' ? 'max-w-md' : 'max-w-5xl'}`}>
          <div className="bg-[#F5F5F7] rounded-3xl p-3 sm:p-6 border border-black/[0.08] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.06)]">
            
            {/* Header Chrome */}
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] px-2 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
                <span className="ml-2 text-xs font-medium text-[#86868B]">
                  {activeTab === 'kglex' && 'kglex-uyap-robot.live.ysnsoft.com'}
                  {activeTab === 'harita' && 'haritaplan-geoplan.live.ysnsoft.com'}
                  {activeTab === 'flamant' && 'flamantyou-ai-skin.live.ysnsoft.com'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#10B981] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span>Canlı Motor Aktif</span>
              </div>
            </div>

            {/* TAB 1: KGLEX UYAP Robot Simulator */}
            {activeTab === 'kglex' && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-black/[0.06] shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] mb-5">
                  <div>
                    <h5 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
                      <Scale className="w-4 h-4 text-[#0071E3]" />
                      <span>KGLEX Otonom UYAP Taraması & Dava Takip Masası</span>
                    </h5>
                    <p className="text-xs text-[#86868B]">Arka plan Python botu UYAP portallarına bağlanıp yeni evrakları otomatik listeler.</p>
                  </div>
                  <span className="text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-3 py-1 rounded-full">
                    UYAP v4.8 Uyumlu
                  </span>
                </div>

                {/* Simulation input */}
                <form onSubmit={handleScanUyap} className="bg-[#F5F5F7] p-4 rounded-xl border border-black/[0.05] mb-6 flex flex-col sm:flex-row items-center gap-2.5">
                  <input
                    type="text"
                    placeholder="Dosya No (örn: 2026/784 Esas)"
                    value={newCaseNo}
                    onChange={e => setNewCaseNo(e.target.value)}
                    className="w-full sm:w-1/3 px-3 py-2 text-xs bg-white rounded-lg border border-black/[0.08] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                  <input
                    type="text"
                    placeholder="Müvekkil Adı (örn: Kaya İnşaat A.Ş.)"
                    value={newClient}
                    onChange={e => setNewClient(e.target.value)}
                    className="w-full sm:flex-1 px-3 py-2 text-xs bg-white rounded-lg border border-black/[0.08] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                  <button
                    type="submit"
                    disabled={robotScanning}
                    className="w-full sm:w-auto apple-pill-btn px-5 py-2 text-xs font-medium flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{robotScanning ? 'UYAP Taranıyor...' : 'Robotu Tetikle'}</span>
                  </button>
                </form>

                {/* Case List */}
                <div className="space-y-2.5">
                  {uyapCases.map((c, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-black/[0.05] bg-[#F5F5F7]/60 flex items-center justify-between text-xs hover:bg-[#F5F5F7] transition-all">
                      <div>
                        <div className="flex items-center gap-2 font-semibold text-[#1D1D1F]">
                          <span>{c.no}</span>
                          <span className="text-[10px] text-[#86868B] font-normal">({c.court})</span>
                        </div>
                        <span className="text-[#6E6E73] mt-0.5 block">Müvekkil: {c.client}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#0071E3] font-semibold block">{c.status}</span>
                        <span className="text-[10px] text-[#10B981] flex items-center gap-1 justify-end mt-0.5">
                          <CheckCircle2 className="w-3 h-3" /> UYAP Eşitlendi
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: HaritaPlan 3194 Md. 18 & DOP Calculator */}
            {activeTab === 'harita' && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-black/[0.06] shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] mb-5">
                  <div>
                    <h5 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#10B981]" />
                      <span>HaritaPlan 3194 Sayılı Kanun Madde 18 & DOP Hesap Motoru</span>
                    </h5>
                    <p className="text-xs text-[#86868B]">Düzenleme Ortaklık Payı, ifraz/tevhid ve resmi dağıtım cetveli üretimi.</p>
                  </div>
                  <span className="text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-3 py-1 rounded-full">
                    HKMO 2026 Tarifesi
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-medium text-[#1D1D1F] block mb-1">Ada Numarası</label>
                    <input
                      type="text"
                      value={ada}
                      onChange={e => setAda(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F5F5F7] rounded-lg border border-black/[0.08]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#1D1D1F] block mb-1">Parsel Numarası</label>
                    <input
                      type="text"
                      value={parsel}
                      onChange={e => setParsel(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F5F5F7] rounded-lg border border-black/[0.08]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#1D1D1F] block mb-1">Toplam Brüt Alan (m²)</label>
                    <input
                      type="number"
                      value={totalArea}
                      onChange={e => setTotalArea(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-[#F5F5F7] rounded-lg border border-black/[0.08]"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCalculateDop}
                  className="apple-pill-btn px-6 py-2.5 text-xs font-medium flex items-center gap-2 mb-6"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>DOP ve Net İmar Parselini Hesapla</span>
                </button>

                {dopResult && (
                  <div className="bg-[#F5F5F7] p-5 rounded-xl border border-black/[0.05]">
                    <span className="text-xs font-semibold text-[#1D1D1F] block mb-3">
                      Hesaplama Sonucu (Ada: {ada} / Parsel: {parsel})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white p-3.5 rounded-lg border border-black/[0.04]">
                        <span className="text-[11px] text-[#86868B]">DOP Oranı (Kanuni Sınır: %45)</span>
                        <h6 className="text-lg font-bold text-[#0071E3] mt-1">%{dopResult.dopRatio.toFixed(1)}</h6>
                      </div>
                      <div className="bg-white p-3.5 rounded-lg border border-black/[0.04]">
                        <span className="text-[11px] text-[#86868B]">Kamuya Terk (DOP Alanı)</span>
                        <h6 className="text-lg font-bold text-[#F59E0B] mt-1">{dopResult.dopArea.toLocaleString('tr-TR')} m²</h6>
                      </div>
                      <div className="bg-white p-3.5 rounded-lg border border-black/[0.04]">
                        <span className="text-[11px] text-[#86868B]">Malike Verilecek Net İmar Parseli</span>
                        <h6 className="text-lg font-bold text-[#10B981] mt-1">{dopResult.netArea.toLocaleString('tr-TR')} m²</h6>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: HG Avukatlık & Açıkel Law Simulator */}
            {activeTab === 'hg' && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-black/[0.06] shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-black/[0.06] gap-3 mb-5">
                  <div>
                    <h5 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
                      <Scale className="w-4 h-4 text-[#0071E3]" />
                      <span>HG & Açıkel Hukuk Çok Dilli Müvekkil Portalı & Vekalet Ücret Motoru</span>
                    </h5>
                    <p className="text-xs text-[#86868B]">
                      Uluslararası tahkim, şirket danışmanlığı, online vekalet sözleşmesi ve Sanal POS harç tahsilatı
                    </p>
                  </div>
                  
                  {/* Language Switcher */}
                  <div className="flex items-center gap-1 bg-[#F5F5F7] p-1 rounded-xl text-xs font-semibold">
                    {(['TR', 'EN', 'DE'] as const).map(lang => (
                      <button
                        key={lang}
                        onClick={() => setHgLang(lang)}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          hgLang === lang ? 'bg-white text-[#0071E3] shadow-xs' : 'text-[#6E6E73]'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Multilingual Banner */}
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/60 text-xs mb-5">
                  <span className="font-bold text-[#0071E3] block mb-1">
                    {hgLang === 'TR' && '🇹🇷 Uluslararası Dava, Tahkim & Kurumsal Şirketler Hukuku'}
                    {hgLang === 'EN' && '🇬🇧 International Commercial Arbitration & Cross-Border Corporate Law'}
                    {hgLang === 'DE' && '🇩🇪 Internationale Schiedsgerichtsbarkeit & Wirtschaftsrecht'}
                  </span>
                  <p className="text-blue-900/80 leading-relaxed text-[11px]">
                    {hgLang === 'TR' && 'Müvekkillerimiz 256-bit şifreli portala giriş yaparak dava dosyalarını, duruşma tutanaklarını ve bilirkişi raporlarını canlı izleyebilir.'}
                    {hgLang === 'EN' && 'Clients access encrypted portals to review hearing transcripts, expert witness reports and execute retainer agreements.'}
                    {hgLang === 'DE' && 'Mandanten erhalten verschlüsselten Zugang zu Verhandlungsprotokollen, Gutachten und Honorarvereinbarungen.'}
                  </p>
                </div>

                {/* Retainer & Fee Calculator */}
                <div className="p-4 bg-[#F5F5F7] rounded-xl border border-black/[0.05] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-[#1D1D1F]">
                      Online Vekalet & Danışmanlık Ücreti Hesabı:
                    </span>
                    <div className="flex items-center gap-2">
                      {(['TRY', 'USD', 'EUR'] as const).map(c => (
                        <button
                          key={c}
                          onClick={() => setHgFeeCurrency(c)}
                          className={`px-2.5 py-1 text-xs rounded-lg font-mono font-bold transition-all ${
                            hgFeeCurrency === c ? 'bg-[#1D1D1F] text-white shadow-2xs' : 'bg-white text-[#6E6E73] border border-black/[0.06]'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-[#6E6E73] block mb-1">Dava / Danışmanlık Türü</label>
                      <select className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-black/[0.08] font-medium">
                        <option>Ticari Dava & Tahkim Sözleşmesi</option>
                        <option>Yabancı Sermaye & Şirket Kuruluşu</option>
                        <option>Kira & Gayrimenkul Hukuku</option>
                        <option>Fikri & Sınai Mülkiyet / Marka</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#6E6E73] block mb-1">Baz Danışmanlık Tutarı</label>
                      <input
                        type="number"
                        value={hgFeeBase}
                        onChange={e => setHgFeeBase(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-black/[0.08] font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-[#6E6E73] block mb-1">KDV (%20) Dahil Toplam</label>
                      <div className="px-3 py-2 text-xs bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 font-mono font-bold">
                        {hgFeeCurrency === 'TRY' ? '₺' : hgFeeCurrency === 'USD' ? '$' : '€'}{(hgFeeBase * 1.2).toLocaleString('tr-TR')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] text-xs">
                    <span className="text-[#86868B] text-[11px]">Entegre Iyzico Sanal POS ile anında 3D Secure kredi kartı tahsilatı</span>
                    <button
                      type="button"
                      onClick={() => alert(`HG Avukatlık & Açıkel Law demo tahsilat simülasyonu: ${hgFeeCurrency} ${(hgFeeBase * 1.2).toLocaleString('tr-TR')} için 3D Secure oturumu başlatıldı.`)}
                      className="apple-pill-btn px-4 py-1.5 text-xs font-semibold"
                    >
                      Online Tahsilat Başlat
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Flamantyou AI Cilt Analizi */}
            {activeTab === 'flamant' && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-black/[0.06] shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] mb-5">
                  <div>
                    <h5 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#EC4899]" />
                      <span>Flamantyou Yapay Zeka Cilt Analizi & Ürün Reçetesi Motoru</span>
                    </h5>
                    <p className="text-xs text-[#86868B]">Kamera taraması ve anket verileriyle kullanıcıya özel bakım protokolü çıkarır.</p>
                  </div>
                  <span className="text-xs font-semibold text-[#EC4899] bg-[#EC4899]/10 px-3 py-1 rounded-full">
                    %94 Doğruluk
                  </span>
                </div>

                <div className="mb-6">
                  <span className="text-xs font-semibold text-[#1D1D1F] block mb-2">Cilt Tipini Simüle Edin:</span>
                  <div className="flex gap-2">
                    {[
                      { id: 'karma', label: 'Karma / Normal' },
                      { id: 'kuru', label: 'Kuru / Nemsiz' },
                      { id: 'yagli', label: 'Yağlı / Akneye Eğilimli' }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleAnalyzeSkin(t.id as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                          skinType === t.id
                            ? 'bg-[#EC4899] text-white border-[#EC4899] shadow-xs'
                            : 'bg-[#F5F5F7] text-[#1D1D1F] border-black/[0.06]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#F5F5F7] p-5 rounded-xl border border-black/[0.05]">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white p-3.5 rounded-lg border border-black/[0.04]">
                      <span className="text-[11px] text-[#86868B]">Nem Seviyesi</span>
                      <h6 className="text-base font-bold text-[#1D1D1F] mt-1">{skinReport.hydration}</h6>
                    </div>
                    <div className="bg-white p-3.5 rounded-lg border border-black/[0.04]">
                      <span className="text-[11px] text-[#86868B]">Bariyer Sağlığı</span>
                      <h6 className="text-base font-bold text-[#1D1D1F] mt-1">{skinReport.barrier}</h6>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-[#1D1D1F] block mb-2">
                    AI Tarafından Önerilen Özel Bakım Reçetesi:
                  </span>
                  <div className="space-y-2">
                    {skinReport.recipe.map((r, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-black/[0.04] text-xs font-medium text-[#1D1D1F] flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#EC4899]" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </section>
  );
}
