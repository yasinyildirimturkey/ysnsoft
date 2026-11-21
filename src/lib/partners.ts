/**
 * Ortaklar (white-label): ajans, vergi danışmanı vb. Bir adaya ortak atanınca o adayın müşteri sayfaları
 * (site kontrolü, teklif, rapor, metin düzeltme, yorum) ve demo alt yazısı ortağın adı/iletişimiyle görünür;
 * YSNSOFT arka planda çalışır. data/partners.json (deploy paketi ezmez).
 */
import fs from 'node:fs';
import path from 'node:path';

export interface Partner { id: string; name: string; tagline: string; email: string; phone: string; website: string; active: boolean; createdAt: string }
interface Store { partners: Partner[]; assign: Record<string, string> }

const FILE = path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'partners.json');

function read(): Store {
  try { const j = JSON.parse(fs.readFileSync(FILE, 'utf8')); return { partners: j.partners ?? [], assign: j.assign ?? {} }; } catch { return { partners: [], assign: {} }; }
}
function write(s: Store) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(s, null, 1));
  fs.renameSync(`${FILE}.tmp`, FILE);
}

const clean = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export function listPartners(): Partner[] { return read().partners; }
export function assignments(): Record<string, string> { return read().assign; }

export function upsertPartner(input: Partial<Partner> & { id?: string }): Partner {
  const name = clean(input.name, 80);
  if (!name) throw new Error('Ad gerekli.');
  const email = clean(input.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Geçersiz e-posta.');
  const website = clean(input.website, 200);
  if (website && !/^https?:\/\/[^\s]+$/i.test(website)) throw new Error('Web adresi https:// ile başlamalı.');
  const s = read();
  const prev = input.id ? s.partners.find((p) => p.id === input.id) : undefined;
  const p: Partner = {
    id: prev?.id ?? `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name, tagline: clean(input.tagline, 100), email, phone: clean(input.phone, 40), website,
    active: input.active === undefined ? (prev?.active ?? true) : Boolean(input.active),
    createdAt: prev?.createdAt ?? new Date().toISOString(),
  };
  s.partners = prev ? s.partners.map((x) => (x.id === p.id ? p : x)) : [...s.partners, p].slice(0, 100);
  write(s);
  return p;
}

export function assignPartner(prospectId: number, partnerId: string | null) {
  const s = read();
  if (partnerId && !s.partners.some((p) => p.id === partnerId)) throw new Error('Ortak bulunamadı.');
  if (partnerId) s.assign[String(prospectId)] = partnerId; else delete s.assign[String(prospectId)];
  write(s);
}

/** Adayın etkin ortağı (yoksa null → YSNSOFT) */
export function partnerFor(prospectId: number): Partner | null {
  const s = read();
  const id = s.assign[String(prospectId)];
  const p = id ? s.partners.find((x) => x.id === id) : undefined;
  return p && p.active ? p : null;
}
