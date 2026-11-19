'use client';

/**
 * Satış hunisi + yapılacaklar.
 *
 * Huni seçili bölge/kategoriyi izler; her aday ulaştığı en ileri basamakta sayılır, basamaktaki sayı o basamağa
 * EN AZ ulaşanlardır (oranlar bir önceki basamağa göre). Yapılacaklar bölgeden bağımsızdır (tüm şehirler):
 * demo sonradan açıldı, planlanan ziyaret kaçtı, teklif istendi/verildi ama ses yok, görüşülen aday hareketsiz.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { CalendarX, ChevronDown, Eye, FileClock, Hourglass, Phone, TrendingUp } from 'lucide-react';
import { CATEGORY_LABEL, isoDay, localDayOf } from '@/lib/visit-plan';
import PricingEditor from './PricingEditor';

interface Stage { key: string; label: string; n: number; rate: number | null }
interface Week { week: string; first_day: string; visits: number; met: number; won: number }
interface Reminder {
  id: number;
  name: string;
  city: string;
  phone: string | null;
  type: 'hot_demo' | 'missed_visit' | 'offer_due' | 'offer_silent' | 'stale';
  at: string | null;
  count?: number;
  days?: number | null;
}
interface Money { n: number; setup: number; monthly: number }
interface WinRates {
  sectors: { category: string; met: number; offers: number; won: number; rate: number | null }[];
  packages: { package: string; offered: number; won: number; rate: number | null }[];
}

interface Funnel {
  stages: Stage[];
  side: { lost: number; dnc: number; drafts: number; viewed: number; shown: number };
  money?: { open: Money; won: Money };
  winRates?: WinRates;
  weeks: Week[];
  reminders: { today: string; today_planned: number; items: Reminder[]; total: number };
}

const eur = (n: number) => `${n.toLocaleString('de-DE')} €`;
const fmtDay = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.`;
/** SQL (UTC, "YYYY-MM-DD HH:MM:SS") ya da ISO zaman → yerel gün */
const dayOf = (v: string) => (v.includes('T') ? isoDay(new Date(v)) : v.length > 10 ? localDayOf(v) : v);

const TYPE: Record<Reminder['type'], { label: string; Icon: typeof Eye; cls: string; text: (r: Reminder) => string }> = {
  hot_demo: {
    label: 'Demo açıldı',
    Icon: Eye,
    cls: 'bg-blue-50 text-blue-800',
    text: (r) => `${r.count}× açıldı, son ${r.at ? fmtDay(dayOf(r.at)) : '—'} — sıcakken arayın ya da uğrayın`,
  },
  missed_visit: {
    label: 'Ziyaret kaçtı',
    Icon: CalendarX,
    cls: 'bg-red-50 text-red-800',
    text: (r) => `${r.at ? fmtDay(r.at) : '—'} için planlıydı, saha kaydı yok — yeniden planlayın`,
  },
  offer_due: {
    label: 'Teklif bekliyor',
    Icon: FileClock,
    cls: 'bg-amber-50 text-amber-900',
    text: (r) => `Teklif istendi${r.days ? ` (${r.days} gün önce)` : ' (bugün)'} — teklifi hazırlayıp durumu “Teklif verildi” yapın`,
  },
  offer_silent: {
    label: 'Teklif sessiz',
    Icon: Hourglass,
    cls: 'bg-amber-50 text-amber-900',
    text: (r) => `Teklif verileli ${r.days ?? '7+'} gün oldu — takip edin`,
  },
  stale: {
    label: 'Hareketsiz',
    Icon: Hourglass,
    cls: 'bg-[#F5F5F7] text-[#1D1D1F]',
    text: (r) => `Görüşüldü, ${r.days} gündür sonraki adım yok`,
  },
};

/** Son 8 hafta (pazartesi başlangıçlı), boş haftalar dahil */
function lastWeeks(weeks: Week[]) {
  const monday = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const by = new Map<string, Week>();
  for (const w of weeks) by.set(isoDay(monday(new Date(`${w.first_day}T12:00:00`))), w);
  const out: { start: string; visits: number; met: number; won: number }[] = [];
  const m = monday(new Date());
  m.setDate(m.getDate() - 7 * 7);
  for (let i = 0; i < 8; i++) {
    const k = isoDay(m);
    const w = by.get(k);
    out.push({ start: k, visits: w?.visits ?? 0, met: w?.met ?? 0, won: w?.won ?? 0 });
    m.setDate(m.getDate() + 7);
  }
  return out;
}

export default function ProspectFunnel({ query, stamp, onOpen }: { query: string; stamp: unknown; onOpen: (id: number) => void }) {
  const [data, setData] = useState<Funnel | null>(null);
  const [error, setError] = useState('');
  const [all, setAll] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      fetch(`/api/admin/prospects?view=funnel&${query}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => {
          if (!alive) return;
          if (j.success === false || !j.stages) { setError(j.error || 'Huni yüklenemedi.'); return; }
          setData(j);
          setError('');
        })
        .catch(() => { if (alive) setError('Huni yüklenemedi.'); });
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [query, stamp]);

  const weeks = useMemo(() => lastWeeks(data?.weeks ?? []), [data]);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.visits));

  if (error) return <div className="apple-card p-4 bg-white border border-black/[0.07] text-xs text-red-700">{error}</div>;
  if (!data) return null;

  const items = all ? data.reminders.items : data.reminders.items.slice(0, 6);
  const weekTotal = weeks.reduce((s, w) => s + w.visits, 0);

  return (
    <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4">
      {pricingOpen && <PricingEditor onClose={() => setPricingOpen(false)} />}
      {/* Huni */}
      <section className="apple-card p-5 bg-white border border-black/[0.07]" aria-labelledby="funnel-h">
        <div className="flex items-center justify-between gap-2">
          <h3 id="funnel-h" className="text-sm font-semibold text-[#1D1D1F] flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" aria-hidden="true" /> Satış hunisi
          </h3>
          <span className="flex items-center gap-3 text-[11px] text-[#6E6E73]">Seçili bölge ve türler <button type="button" onClick={() => setPricingOpen(true)} className="font-semibold text-[#0071E3] hover:underline">Paketler ve fiyatlar</button></span>
        </div>
        <ol className="mt-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
          {data.stages.map((s, i) => (
            <li key={s.key} className="relative rounded-xl bg-[#F5F5F7] p-3">
              <span className="text-[11px] text-[#6E6E73] leading-tight block min-h-[28px]">{s.label}</span>
              <span className="text-xl font-semibold text-[#1D1D1F] tabular block mt-1">{s.n.toLocaleString('tr-TR')}</span>
              <span className="text-[11px] text-[#6E6E73] tabular">
                {i === 0 ? 'başlangıç' : s.rate === null ? '—' : `%${s.rate} geçiş`}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] text-[#6E6E73] leading-relaxed">
          Demo hazır <b className="text-[#1D1D1F] tabular">{data.side.drafts}</b> · müşteri açtı <b className="text-[#1D1D1F] tabular">{data.side.viewed}</b> ·
          sahada gösterildi <b className="text-[#1D1D1F] tabular">{data.side.shown}</b> · kaybedildi <b className="text-[#1D1D1F] tabular">{data.side.lost}</b>
          {data.side.dnc > 0 && <> · iletişime geçme <b className="text-[#1D1D1F] tabular">{data.side.dnc}</b></>}
        </p>
        {data.money && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {([['Açık teklifler', data.money.open, 'bg-amber-50 border-amber-200'], ['Kazanılan', data.money.won, 'bg-emerald-50 border-emerald-200']] as const).map(([label, m, cls]) => (
              <div key={label} className={`rounded-xl border p-3 ${cls}`}>
                <span className="text-[11px] text-[#6E6E73]">{label} ({m.n})</span>
                <span className="block text-lg font-semibold text-[#1D1D1F] tabular">{eur(m.setup + 12 * m.monthly)}</span>
                <span className="text-[11px] text-[#6E6E73] tabular">{eur(m.setup)} kurulum + {eur(m.monthly)}/ay · ilk yıl</span>
              </div>
            ))}
          </div>
        )}

        {data.winRates && (data.winRates.sectors.length > 0 || data.winRates.packages.length > 0) && (
          <div className="mt-4">
            <span className="text-[11px] text-[#6E6E73]">Kazanma oranı — görüşülenlerden kaçı &ldquo;Anlaştık&rdquo; oldu (sahada nereye gidileceğine karar verirken)</span>
            <table className="mt-1.5 w-full text-xs">
              <thead className="text-[#6E6E73] text-left"><tr><th className="font-medium py-1">Sektör</th><th className="font-medium text-right">Görüşülen</th><th className="font-medium text-right">Teklif</th><th className="font-medium text-right">Kazanılan</th><th className="font-medium text-right">Oran</th></tr></thead>
              <tbody className="divide-y divide-black/[0.05] tabular">
                {data.winRates.sectors.map((e) => (
                  <tr key={e.category}>
                    <td className="py-1">{CATEGORY_LABEL[e.category] ?? e.category}</td>
                    <td className="text-right">{e.met}</td><td className="text-right">{e.offers}</td><td className="text-right font-semibold">{e.won}</td>
                    <td className="text-right">{e.met < 3 ? <span className="text-[#6E6E73]" title="3 görüşmeden az: oran anlamlı değil">—</span> : `%${e.rate}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.winRates.packages.length > 0 && (
              <p className="mt-2 text-[11px] text-[#6E6E73]">
                Paket: {data.winRates.packages.map((p) => `${p.package} ${p.won}/${p.offered}${p.offered >= 3 ? ` (%${p.rate})` : ''}`).join(' · ')}
              </p>
            )}
          </div>
        )}

        <div className="mt-4">
          <span className="text-[11px] text-[#6E6E73]">Son 8 haftada saha ziyareti: <b className="text-[#1D1D1F] tabular">{weekTotal}</b></span>
          <div className="mt-2 flex items-end gap-1.5 h-16" role="img" aria-label={`Haftalık ziyaret sayıları: ${weeks.map((w) => `${fmtDay(w.start)} haftası ${w.visits}`).join(', ')}`}>
            {weeks.map((w) => (
              <div key={w.start} className="flex-1 h-full flex flex-col justify-end group relative" title={`${fmtDay(w.start)} haftası: ${w.visits} ziyaret, ${w.met} görüşme, ${w.won} kazanılan`}>
                <div className="w-full rounded-t-[4px] bg-[#0071E3]" style={{ height: w.visits ? `${Math.max(6, (w.visits / maxWeek) * 100)}%` : '2px', opacity: w.visits ? 1 : 0.25 }} />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-1 text-[10px] text-[#6E6E73] tabular">
            {weeks.map((w, i) => <span key={w.start} className="flex-1 text-center">{i % 2 === 1 || i === 7 ? fmtDay(w.start) : ''}</span>)}
          </div>
        </div>
      </section>

      {/* Yapılacaklar */}
      <section className="apple-card p-5 bg-white border border-black/[0.07]" aria-labelledby="todo-h">
        <div className="flex items-center justify-between gap-2">
          <h3 id="todo-h" className="text-sm font-semibold text-[#1D1D1F]">
            Yapılacaklar {data.reminders.total > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[#0071E3] text-white text-[11px] tabular">{data.reminders.total}</span>}
          </h3>
          <span className="text-[11px] text-[#6E6E73]">Tüm şehirler{data.reminders.today_planned ? ` · bugün ${data.reminders.today_planned} ziyaret planlı` : ''}</span>
        </div>
        {items.length === 0 ? (
          <p className="mt-4 text-xs text-[#6E6E73] leading-relaxed">
            Bekleyen iş yok. Hatırlatmalar saha kayıtlarından ve demo açılışlarından otomatik çıkar.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {items.map((r) => {
              const t = TYPE[r.type];
              return (
                <li key={`${r.type}-${r.id}`} className="flex items-start gap-2 p-2 rounded-lg hover:bg-[#F5F5F7]">
                  <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${t.cls}`}>
                    <t.Icon className="w-3 h-3" aria-hidden="true" /> {t.label}
                  </span>
                  <div className="min-w-0 flex-1 text-xs">
                    <button type="button" onClick={() => onOpen(r.id)} className="font-semibold text-[#1D1D1F] hover:underline text-left block truncate max-w-full">
                      {r.name} <span className="font-normal text-[#6E6E73]">· {r.city}</span>
                    </button>
                    <span className="text-[#6E6E73] block">{t.text(r)}</span>
                  </div>
                  {r.phone && (
                    <a href={`tel:${r.phone.replace(/[^+\d]/g, '')}`} aria-label={`${r.name}: ara`} className="shrink-0 p-1.5 rounded-full text-[#0071E3] hover:bg-blue-50">
                      <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {data.reminders.items.length > 6 && (
          <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all} className="mt-2 text-xs font-semibold text-[#0071E3] flex items-center gap-1">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${all ? 'rotate-180' : ''}`} aria-hidden="true" />
            {all ? 'Daha az göster' : `Tümünü göster (${data.reminders.items.length})`}
          </button>
        )}
      </section>
    </div>
  );
}
