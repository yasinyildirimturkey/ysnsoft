'use client';

/**
 * "Bölgenizdeki iyi örnek": aynı şehir ve meslekten (yoksa sektörden) sitesi en iyi puanlı işletmeler.
 * Görüşmede telefonda açıp göstermek için: "Ruhrort'taki X'in sitesi böyle — sizinki de böyle olabilir."
 */
import React, { useEffect, useState } from 'react';
import { Award, ExternalLink } from 'lucide-react';
import { api } from './prospect-shared';

interface Example { id: number; name: string; suburb: string | null; url: string; score: number; sameTrade: boolean; km: number | null }

export default function GoodExamples({ id, city }: { id: number; city: string }) {
  const [items, setItems] = useState<Example[] | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ examples: Example[] }>(`/api/admin/prospects?view=examples&id=${id}`)
      .then((r) => { if (alive) setItems(r.examples ?? []); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [id]);

  if (!items) return <p className="text-[11px] text-[#6E6E73]">İyi örnekler aranıyor…</p>;
  if (!items.length) return <p className="text-[11px] text-[#6E6E73]">{city} içinde bu sektörde iyi puanlı bir site henüz bulunamadı.</p>;

  const same = items[0].sameTrade;
  return (
    <div>
      <p className="text-[11px] text-[#6E6E73] mb-2">
        {city} içinde {same ? 'aynı meslekten' : 'aynı sektörden'}, sitesi teknik kontrolde en iyi çıkan işletmeler. Görüşmede telefonda açıp gösterin.
      </p>
      <ul className="space-y-1.5">
        {items.map((e) => (
          <li key={e.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#F5F5F7]">
            <Award className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-[#1D1D1F] block truncate">{e.name}</span>
              <span className="text-[11px] text-[#6E6E73]">
                Sorun puanı {e.score}/100{e.suburb ? ` · ${e.suburb}` : ''}{e.km !== null ? ` · ${String(e.km).replace('.', ',')} km` : ''}
              </span>
            </div>
            <a href={e.url} target="_blank" rel="noopener noreferrer" aria-label={`${e.name} sitesini aç`}
              className="shrink-0 px-2.5 py-1.5 rounded-full bg-white border border-black/[0.08] text-[11px] font-semibold text-[#0071E3] flex items-center gap-1">
              Siteyi aç <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
