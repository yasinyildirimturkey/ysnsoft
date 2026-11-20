'use client';

/**
 * Müşteri yorumları: YALNIZ müşterinin /feedback sayfasında kendisinin yazdığı, yayın iznini verdiği ve panelde
 * onaylanan yorumlar. Eski sürümdeki uydurma yorumlar ve rakamlar (45+ proje, %99,8 memnuniyet…) kaldırıldı.
 * Onaylı yorum yoksa bölüm hiç görünmez.
 */
import React, { useEffect, useState } from 'react';
import { Quote, Star } from 'lucide-react';

interface Item { id: string; business: string; city: string; name: string; role: string; rating: number; text: string }

export default function Testimonials() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    let alive = true;
    fetch('/api/testimonials').then((r) => r.json()).then((j) => { if (alive && j.success) setItems(j.data); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!items.length) return null;

  return (
    <section id="testimonials" className="py-16 sm:py-24 bg-white border-b border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="section-title">Müşterilerimiz ne diyor?</h2>
          <p className="section-lead">Müşterilerimizin kendi yazdığı ve yayınlanmasına izin verdiği yorumlar.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((t) => (
            <figure key={t.id} className="apple-card p-6 bg-white border border-black/[0.07] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5 text-[#FFBD2E]" aria-label={`${t.rating} / 5`}>
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" aria-hidden="true" />)}
                </div>
                <Quote className="w-5 h-5 text-black/10" aria-hidden="true" />
              </div>
              <blockquote className="text-[15px] text-[#1D1D1F] leading-relaxed whitespace-pre-wrap">{t.text}</blockquote>
              <figcaption className="text-xs text-[#6E6E73] mt-auto">
                {t.name && <b className="text-[#1D1D1F]">{t.name}{t.role ? `, ${t.role}` : ''}</b>}
                {t.name && <br />}
                {t.business} · {t.city}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
