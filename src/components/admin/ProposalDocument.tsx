'use client';

import React, { useState } from 'react';
import { Plus, Printer, Trash2 } from 'lucide-react';
import type { Lead } from '@/lib/store';

/**
 * Teklif belgesi (yazdır / PDF). Eskiden her talebe aynı sabit şartları basıyordu: "12 ay 7/24 SLA — Garantili",
 * "Sıfır kayıpla veri aktarımı", 3 haftalık sprint planı, UYAP/CAD/Sanal POS entegrasyonu ve %30/%40/%30 ödeme.
 * Artık kapsam, kalemler, süre, tutar ve ödeme koşulu yazdırmadan önce burada yazılır; hiçbir garanti varsayılan değildir.
 * Boş bırakılan alanlar çıktıda görünmez.
 */
interface Item { name: string; duration: string; price: string }

const field = 'w-full bg-transparent rounded-md border border-dashed border-black/15 px-1.5 py-1 focus:outline-none focus:border-[#0071E3] print:border-0 print:p-0';

export default function ProposalDocument({ lead, companyName, onClose }: { lead: Lead; companyName: string; onClose: () => void }) {
  const [title, setTitle] = useState(lead.product || 'Yazılım hizmeti');
  const [scope, setScope] = useState('');
  const [items, setItems] = useState<Item[]>([
    { name: 'İhtiyaç analizi ve kapsamın netleştirilmesi', duration: '', price: '' },
    { name: 'Tasarım, geliştirme ve kurulum', duration: '', price: '' },
    { name: 'Test, eğitim ve teslim', duration: '', price: '' },
  ]);
  const [total, setTotal] = useState('');
  const [payment, setPayment] = useState('');
  const [validity, setValidity] = useState('30 gün');
  const [notes, setNotes] = useState('');

  const setItem = (i: number, patch: Partial<Item>) => setItems((cur) => cur.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const shownItems = items.filter((it) => it.name.trim());
  const hasDuration = shownItems.some((it) => it.duration.trim());
  const hasPrice = shownItems.some((it) => it.price.trim());
  const hideIfEmpty = (v: string) => (v.trim() ? '' : 'print:hidden');
  const proposalNo = `YSN-${lead.id.replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase()}`;

  return (
    <div role="dialog" aria-modal="true" aria-label="Teklif önizleme" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} className="admin-modal fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-3xl w-full border border-black/[0.1] shadow-2xl my-8 print:shadow-none print:border-0 print:p-0 print:my-0">
        <p className="mb-5 text-[11px] text-[#6E6E73] bg-[#F5F5F7] rounded-xl px-3 py-2 print:hidden">
          Kesikli çizgili alanları doldurun; boş bırakılanlar çıktıda görünmez. Garanti, SLA veya kesin süre yazmadan önce sözleşmeyle uyumlu olduğundan emin olun.
        </p>

        <div className="flex items-center justify-between pb-6 border-b border-black/[0.1] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1D1D1F] text-white flex items-center justify-center font-bold">YSN</div>
            <div>
              <h2 className="text-lg font-bold text-[#1D1D1F]">{companyName || 'YSNSOFT'}</h2>
              <p className="text-[11px] text-[#6E6E73]">Teklif Belgesi</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <div className="font-bold text-[#1D1D1F]">TEKLİF NO: {proposalNo}</div>
            <div className="text-[#6E6E73]">Tarih: {new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div>

        <div className="bg-[#F5F5F7] p-5 rounded-2xl border border-black/[0.06] mb-6 text-xs">
          <span className="text-[#6E6E73] uppercase font-bold text-[11px] block mb-1">Müşteri / Kurum Bilgileri:</span>
          <h4 className="text-base font-bold text-[#1D1D1F] mb-1">{lead.name}</h4>
          {lead.company && <p className="text-[#515154] font-medium">{lead.company}</p>}
          <div className="text-[#6E6E73] mt-1">İletişim: {[lead.email, lead.phone].filter(Boolean).join(' | ')}</div>
        </div>

        <div className="space-y-4 text-xs mb-8">
          <div>
            <span className="text-[#6E6E73] uppercase font-bold text-[11px] block mb-1">1. Proje</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Proje başlığı" className={`${field} text-sm font-semibold text-[#1D1D1F]`} />
            <textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              rows={3}
              aria-label="Kapsam"
              placeholder="Kapsam: bu teklifin neleri içerdiği (ve içermediği)…"
              className={`${field} mt-2 text-[#515154] leading-relaxed resize-y ${hideIfEmpty(scope)}`}
            />
          </div>

          <div>
            <span className="text-[#6E6E73] uppercase font-bold text-[11px] block mb-1">2. Kalemler</span>
            <div className="border border-black/[0.08] rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#F5F5F7] border-b border-black/[0.06] text-[#6E6E73]">
                  <tr>
                    <th className="p-3 font-semibold">Hizmet / Modül</th>
                    <th className={`p-3 font-semibold w-32 ${hasDuration ? '' : 'print:hidden'}`}>Süre</th>
                    <th className={`p-3 font-semibold w-32 text-right ${hasPrice ? '' : 'print:hidden'}`}>Tutar</th>
                    <th className="p-3 w-8 print:hidden" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {items.map((it, i) => (
                    <tr key={i} className={it.name.trim() ? '' : 'print:hidden'}>
                      <td className="p-2"><input value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} aria-label="Kalem" className={`${field} font-medium text-[#1D1D1F]`} /></td>
                      <td className={`p-2 ${hasDuration ? '' : 'print:hidden'}`}><input value={it.duration} onChange={(e) => setItem(i, { duration: e.target.value })} placeholder="örn. 1 hafta" aria-label="Süre" className={`${field} text-[#515154]`} /></td>
                      <td className={`p-2 ${hasPrice ? '' : 'print:hidden'}`}><input value={it.price} onChange={(e) => setItem(i, { price: e.target.value })} placeholder="örn. 15.000 ₺" aria-label="Tutar" className={`${field} text-right text-[#515154]`} /></td>
                      <td className="p-2 print:hidden">
                        <button type="button" onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))} aria-label="Kalemi sil" className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => setItems((cur) => [...cur, { name: '', duration: '', price: '' }])} className="mt-2 text-[11px] font-semibold text-[#0071E3] flex items-center gap-1 print:hidden">
              <Plus className="w-3 h-3" /> Kalem ekle
            </button>
          </div>

          <div className="bg-[#0071E3]/5 p-4 rounded-xl border border-[#0071E3]/15 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={hideIfEmpty(total)}>
              <span className="text-[#6E6E73] block text-[11px]">Toplam tutar</span>
              <input value={total} onChange={(e) => setTotal(e.target.value)} placeholder={lead.budget ? `Müşterinin belirttiği bütçe: ${lead.budget}` : 'örn. 45.000 ₺ + KDV'} aria-label="Toplam tutar" className={`${field} text-base font-bold text-[#0071E3]`} />
            </div>
            <div className={hideIfEmpty(payment)}>
              <span className="text-[#6E6E73] block text-[11px]">Ödeme koşulu</span>
              <input value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="örn. %50 başlangıçta, %50 teslimde" aria-label="Ödeme koşulu" className={`${field} text-[#515154]`} />
            </div>
            <div className={hideIfEmpty(validity)}>
              <span className="text-[#6E6E73] block text-[11px]">Teklif geçerlilik süresi</span>
              <input value={validity} onChange={(e) => setValidity(e.target.value)} aria-label="Geçerlilik" className={`${field} text-[#515154]`} />
            </div>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            aria-label="Notlar"
            placeholder="Notlar (bakım/destek kapsamı, hariç tutulanlar…)"
            className={`${field} text-[#515154] resize-y ${hideIfEmpty(notes)}`}
          />
        </div>

        <div className="pt-6 border-t border-black/[0.1] grid grid-cols-2 gap-8 text-xs text-center mb-6">
          <div>
            <span className="text-[#6E6E73] block mb-1">Teklifi Hazırlayan</span>
            <strong className="text-[#1D1D1F] block">{companyName || 'YSNSOFT'}</strong>
            <span className="text-[#6E6E73] text-[11px] block mt-4">İmza</span>
          </div>
          <div>
            <span className="text-[#6E6E73] block mb-1">Müşteri Kabul Onayı</span>
            <strong className="text-[#1D1D1F] block">{lead.company || lead.name}</strong>
            <span className="text-[#6E6E73] text-[11px] block mt-4">İmza</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-black/[0.06] print:hidden">
          <button onClick={onClose} className="apple-pill-btn-secondary px-5 py-2.5 text-xs font-semibold">Kapat</button>
          <button onClick={() => window.print()} className="apple-pill-btn px-6 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-md shadow-[#0071E3]/25">
            <Printer className="w-4 h-4" />
            <span>Teklifi Yazdır / PDF Olarak Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
}
