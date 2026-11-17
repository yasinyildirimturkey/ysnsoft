'use client';

/** Aday detayında saha kayıtları: telefondaki saha listesinden girilen ziyaret sonuçları (en yenisi üstte). */
import React, { useEffect, useState } from 'react';
import { localDayOf, VISIT_OUTCOME_LABEL } from '@/lib/visit-plan';

interface Visit { id: number; at: string; outcome: string; note: string; next_at: string | null; by_user: string | null }

const fmt = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

export default function ProspectVisits({ id }: { id: number }) {
  const [visits, setVisits] = useState<Visit[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/prospects?view=visits&id=${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (alive) setVisits(Array.isArray(j.visits) ? j.visits : []); })
      .catch(() => { if (alive) setVisits([]); });
    return () => { alive = false; };
  }, [id]);

  if (!visits?.length) return null;
  return (
    <div>
      <span className="text-[#6E6E73] block mb-1">Saha kayıtları</span>
      <ol className="space-y-1.5">
        {visits.map((v) => (
          <li key={v.id} className="p-2.5 rounded-lg bg-[#F5F5F7] text-xs">
            <b className="text-[#1D1D1F]">{VISIT_OUTCOME_LABEL[v.outcome] ?? v.outcome}</b>
            <span className="text-[#6E6E73]"> · {fmt(localDayOf(v.at))}{v.by_user ? ` · ${v.by_user}` : ''}{v.next_at ? ` → tekrar ${fmt(v.next_at)}` : ''}</span>
            {v.note && <p className="mt-1 text-[#1D1D1F] leading-relaxed">{v.note}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
