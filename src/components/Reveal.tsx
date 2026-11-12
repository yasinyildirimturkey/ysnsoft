'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Çocuklarını görünüm alanına girdiklerinde bir kez, yumuşakça belirtir.
 * İlk render'da içerik görünürdür (SSR / JS'siz güvenli); gizleme yalnızca
 * tarayıcıda ve öğe henüz ekran dışındaysa uygulanır.
 */
export default function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'pending' | 'shown'>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Zaten ekrandaysa dokunma — sayfa açılışında titreme olmasın
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setState('pending');
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState('shown');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="reveal" data-reveal={state}>
      {children}
    </div>
  );
}
