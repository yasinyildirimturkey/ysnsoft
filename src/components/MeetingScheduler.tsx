'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { 
  Calendar, 
  Clock, 
  Video, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  User, 
  Mail, 
  Building 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { submitAppointment } from '@/lib/crm-client';

type Day = { label: string; date: string; iso: string };

/** Yarından itibaren sıradaki 5 iş günü (eskiden sabit, geçmişte kalmış tarihler yazılıydı). */
function nextWorkdays(count = 5): Day[] {
  const out: Day[] = [];
  const d = new Date();
  while (out.length < count) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({
      label: d.toLocaleDateString('tr-TR', { weekday: 'long' }),
      date: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }),
      iso,
    });
  }
  return out;
}

// Tarih yalnız tarayıcıda hesaplanır (sunucu ön-render'ında "bugün" sabitlenmesin). Gün değişene kadar aynı dizi döner.
let dayCache: { key: string; days: Day[] } | null = null;
function clientDays(): Day[] {
  const key = new Date().toDateString();
  if (dayCache?.key !== key) dayCache = { key, days: nextWorkdays() };
  return dayCache.days;
}
const noSubscribe = () => () => {};
const serverDays = (): Day[] | null => null;

const TIME_SLOTS = ['10:00', '11:30', '14:00', '15:30', '16:45'];

export default function MeetingScheduler() {
  const DAYS = useSyncExternalStore<Day[] | null>(noSubscribe, clientDays, serverDays) ?? [];
  const [pickedIso, setPickedIso] = useState<string | null>(null);
  const selectedDay = DAYS.find((d) => d.iso === pickedIso) ?? DAYS[0] ?? { label: '', date: '', iso: '' };
  const setSelectedDay = (d: Day) => setPickedIso(d.iso);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[1]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [topic, setTopic] = useState('KGLEX Hukuk & UYAP Robotu');
  const [booked, setBooked] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || sending || !selectedDay.iso) return;
    setSending(true);
    setError('');
    try {
      await submitAppointment({
        name,
        company,
        email,
        topic,
        dateStr: `${selectedDay.label}, ${selectedDay.date} (${selectedDay.iso})`,
        timeStr: selectedTime
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Randevu talebi gönderilemedi.');
      setSending(false);
      return;
    }
    setSending(false);
    setBooked(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <section id="demo" className="py-16 sm:py-24 bg-white border-b border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="section-eyebrow">
            <Video className="w-3.5 h-3.5" aria-hidden="true" />
            <span>30 Dakikalık Birebir Canlı Demo</span>
          </div>
          <h2 className="section-title">
            Mühendislerimizle görüşün, <br />
            <span>ürünleri canlıda test edin.</span>
          </h2>
          <p className="section-lead">
            Şirketinizin ihtiyaçlarını dinleyelim; KGLEX, HaritaPlan veya Panelde üzerinde size özel ekranları canlı Google Meet oturumunda gösterelim.
          </p>
        </div>

        {/* Scheduler Card */}
        <div className="apple-card bg-[#F5F5F7] p-6 sm:p-10 border border-black/[0.08] max-w-4xl mx-auto">
          {booked ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-[#10B981]/15 text-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-semibold text-[#1D1D1F] mb-2">
                Randevu talebiniz alındı
              </h3>
              <p className="text-sm text-[#515154] max-w-md mx-auto mb-6">
                <strong>{selectedDay.label}, {selectedDay.date} saat {selectedTime}</strong> için talebinizi aldık. Uygunluğu kontrol edip onayı ve görüşme bağlantısını <strong>{email}</strong> adresine göndereceğiz.
              </p>

              <div className="bg-white p-4 rounded-2xl border border-black/[0.06] text-xs text-[#1D1D1F] max-w-sm mx-auto mb-6 shadow-2xs">
                <div className="flex items-center gap-2 mb-1 text-[#0071E3] font-semibold">
                  <Video className="w-4 h-4" />
                  <span>Online görüşme (onay bekliyor)</span>
                </div>
                <span>Konu: {topic} Fizibilite & Demo Oturumu</span>
              </div>

              <button
                onClick={() => setBooked(false)}
                className="apple-pill-btn-secondary px-6 py-2.5 text-xs font-medium"
              >
                Yeni Randevu Planla
              </button>
            </div>
          ) : (
            <form onSubmit={handleBook} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Date & Time (6 Cols) */}
              <div className="md:col-span-6 space-y-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#6E6E73] block mb-3">
                    1. Tarih Seçin
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DAYS.map(day => (
                      <button
                        type="button"
                        key={day.iso}
                        onClick={() => setSelectedDay(day)}
                        className={`p-3 rounded-xl text-left border transition-all ${
                          selectedDay.iso === day.iso
                            ? 'bg-white border-[#0071E3] shadow-xs ring-2 ring-[#0071E3]/20'
                            : 'bg-white/60 border-black/[0.06] hover:bg-white'
                        }`}
                      >
                        <span className="text-xs font-semibold text-[#1D1D1F] block">{day.label}</span>
                        <span className="text-[11px] text-[#6E6E73]">{day.date}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#6E6E73] block mb-3">
                    2. Saat Dilimi Seçin (TSİ)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TIME_SLOTS.map(slot => (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          selectedTime === slot
                            ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                            : 'bg-white text-[#1D1D1F] border-black/[0.06] hover:border-black/[0.15]'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-black/[0.06] text-xs text-[#515154] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0071E3] shrink-0" />
                  <span>
                    Görüşmeler birebir ve online yapılır; talebinizi onayladığımızda bağlantıyı e-postayla iletiriz.
                  </span>
                </div>
              </div>

              {/* Right Column: Contact Details (6 Cols) */}
              <div className="md:col-span-6 space-y-4 bg-white p-5 rounded-2xl border border-black/[0.06]">
                <label className="text-xs font-bold uppercase tracking-wider text-[#6E6E73] block mb-1">
                  3. Katılımcı Bilgileri
                </label>

                <div>
                  <label className="text-xs font-medium text-[#1D1D1F] block mb-1">Adınız Soyadınız *</label>
                  <input
                    type="text"
                    required
                    placeholder="Deniz Yılmaz"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F5F5F7] rounded-lg border border-black/[0.08] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#1D1D1F] block mb-1">İş E-Posta Adresi *</label>
                  <input
                    type="email"
                    required
                    placeholder="deniz@sirketiniz.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F5F5F7] rounded-lg border border-black/[0.08] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#1D1D1F] block mb-1">Şirket / Büro Adı</label>
                  <input
                    type="text"
                    placeholder="Yılmaz Hukuk / Çetinkaya Harita"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F5F5F7] rounded-lg border border-black/[0.08] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#1D1D1F] block mb-1">İlgilenilen Ürün</label>
                  <select
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F5F5F7] rounded-lg border border-black/[0.08] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  >
                    <option value="KGLEX Hukuk & UYAP Robotu">KGLEX Hukuk & UYAP Robotu</option>
                    <option value="HG Avukatlık & Açıkel Law">HG Avukatlık & Açıkel Law Portalı</option>
                    <option value="HaritaPlan 3D CBS & İmar">HaritaPlan 3D CBS & İmar</option>
                    <option value="Panelde Multi-Tenant SaaS">Panelde Multi-Tenant SaaS</option>
                    <option value="Flamantyou Kozmetik E-Ticaret">Flamantyou Kozmetik E-Ticaret</option>
                    <option value="Tarihi Samatya Mezecisi QR">Tarihi Samatya Mezecisi QR</option>
                    <option value="Şirketimize Özel Yazılım">Şirketimize Özel Yazılım</option>
                  </select>
                </div>

                {error && (
                  <p role="alert" className="text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full apple-pill-btn py-3 disabled:opacity-60 text-xs font-medium flex items-center justify-center gap-2 shadow-md shadow-[#0071E3]/20 mt-2"
                >
                  <span>{sending ? 'Gönderiliyor…' : `Randevu Talep Et (${selectedDay.date} - ${selectedTime})`}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </section>
  );
}
