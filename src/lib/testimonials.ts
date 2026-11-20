/**
 * Müşteri yorumları: müşterinin kendisinin /feedback/<kod> sayfasında, yayın izni vererek yazdığı yorumlar.
 * Siz panelde onaylayana kadar yayına çıkmaz. Uydurma yorum YOK (2026-11-18'de kaldırılan bölümün yerine).
 * data/testimonials.json (deploy paketi ezmez).
 */
import fs from 'node:fs';
import path from 'node:path';

export interface Testimonial {
  id: string; prospectId: number; business: string; city: string;
  name: string; role: string; rating: number; text: string;
  /** Müşteri yayın iznini işaretledi mi (zorunlu) */
  consent: true; showName: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string; decidedAt?: string;
}

const FILE = path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'testimonials.json');

export function readTestimonials(): Testimonial[] {
  try { const j = JSON.parse(fs.readFileSync(FILE, 'utf8')); return Array.isArray(j) ? j : []; } catch { return []; }
}

function write(list: Testimonial[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(list, null, 2));
  fs.renameSync(`${FILE}.tmp`, FILE);
}

export function addTestimonial(t: Omit<Testimonial, 'id' | 'status' | 'createdAt'>): Testimonial {
  const item: Testimonial = { ...t, id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, status: 'pending', createdAt: new Date().toISOString() };
  write([item, ...readTestimonials()].slice(0, 500));
  return item;
}

export function decideTestimonial(id: string, status: 'approved' | 'rejected' | 'pending'): boolean {
  const list = readTestimonials();
  const i = list.findIndex((t) => t.id === id);
  if (i < 0) return false;
  list[i] = { ...list[i], status, decidedAt: new Date().toISOString() };
  write(list);
  return true;
}

/** Ana sayfa için: yalnız onaylı yorumlar, kişisel bilgi en aza indirilmiş. */
export function publicTestimonials() {
  return readTestimonials().filter((t) => t.status === 'approved').slice(0, 12).map((t) => ({
    id: t.id, business: t.business, city: t.city, name: t.showName ? t.name : '', role: t.showName ? t.role : '', rating: t.rating, text: t.text,
  }));
}
