'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  CheckCircle2, 
  Phone, 
  Mail, 
  ArrowRight, 
  ShieldCheck 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveLead } from '@/lib/store';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledProduct?: string;
}

export default function ContactModal({ isOpen, onClose, prefilledProduct }: ContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    product: prefilledProduct || 'KGLEX LegalTech AI',
    budget: '₺100.000 - ₺300.000',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefilledProduct) {
      setFormData(prev => ({ ...prev, product: prefilledProduct }));
    }
  }, [prefilledProduct]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    saveLead({
      name: formData.name,
      company: formData.company,
      email: formData.email,
      phone: formData.phone,
      product: formData.product,
      budget: formData.budget,
      message: formData.message
    });

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }, 600);
  };

  const handleReset = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-black/[0.08] overflow-hidden my-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-black/[0.06] flex items-center justify-between bg-[#F5F5F7]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0071E3]" />
            <h3 className="text-base font-semibold text-[#1D1D1F]">
              Proje & Fiyat Teklifi Alın
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6E6E73] hover:text-[#1D1D1F] rounded-full hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[#10B981]/10 text-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-2xl font-semibold text-[#1D1D1F] mb-2">
                Talebiniz Alındı!
              </h4>
              <p className="text-sm text-[#6E6E73] max-w-md mx-auto mb-6">
                Teşekkür ederiz. Proje detaylarınız teknik ekibimize iletildi. En geç 24 saat içinde size özel fizibilite ve teklif dosyasıyla dönüş yapacağız.
              </p>
              
              <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-black/[0.04] text-xs text-[#1D1D1F] max-w-sm mx-auto mb-6">
                <span className="text-[#86868B] block mb-1">Doğrudan İletişim</span>
                <strong>destek@ysnsoft.com</strong> | <strong>+90 532 725 50 98</strong>
              </div>

              <button
                onClick={handleReset}
                className="apple-pill-btn px-8 py-3 text-sm font-medium"
              >
                Tamamla
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                    Adınız Soyadınız *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Deniz Yılmaz"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                    Şirket / Büro Adınız *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Yılmaz Hukuk & Mühendislik"
                    value={formData.company}
                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                    İş E-Posta Adresi *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="deniz@sirketiniz.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                    Telefon Numarası *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0532 000 00 00"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                    İlgilenilen Ürün / Sistem
                  </label>
                  <select
                    value={formData.product}
                    onChange={e => setFormData({ ...formData, product: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                  >
                    <option value="KGLEX LegalTech AI">KGLEX LegalTech AI (Hukuk & UYAP)</option>
                    <option value="HG Avukatlık & Açıkel Law">HG Avukatlık & Açıkel Law Portalı</option>
                    <option value="HaritaPlan / GeoPlan">HaritaPlan (3D CBS & İmar Md. 18)</option>
                    <option value="Panelde Multi-Tenant SaaS">Panelde Multi-Tenant Portalı</option>
                    <option value="Flamantyou Kozmetik AI">Flamantyou Kozmetik (E-Ticaret & AI)</option>
                    <option value="Tarihi Samatya Mezecisi">Tarihi Samatya Mezecisi (Gıda & QR)</option>
                    <option value="Dolphin Bodrum Luxury">Bodrum Luxury (Villa & VIP Concierge)</option>
                    <option value="Şirketimize Özel Yazılım">Şirketimize Özel Yazılım Geliştirme</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                    Öngörülen Bütçe Ölçeği
                  </label>
                  <select
                    value={formData.budget}
                    onChange={e => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all"
                  >
                    <option value="₺50.000 - ₺100.000">₺50.000 - ₺100.000 (Giriş)</option>
                    <option value="₺100.000 - ₺300.000">₺100.000 - ₺300.000 (Standart)</option>
                    <option value="₺300.000 - ₺750.000">₺300.000 - ₺750.000 (Kurumsal)</option>
                    <option value="₺750.000+">₺750.000+ (Holding / Multi-Tenant)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                  Proje Notu & Beklentileriniz
                </label>
                <textarea
                  rows={3}
                  placeholder="Mevcut sistemleriniz, ihtiyaç duyduğunuz entegrasyonlar veya hedefleriniz..."
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#86868B] pt-1">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                <span>Bilgileriniz KVKK standartlarına uygun olarak gizlilikle korunur.</span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full apple-pill-btn py-3.5 text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-[#0071E3]/25 disabled:opacity-70"
                >
                  {loading ? (
                    <span>İletiliyor...</span>
                  ) : (
                    <>
                      <span>Teklif Talebini Gönder</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
