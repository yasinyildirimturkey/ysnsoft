/**
 * Müşterinin demo metni için önerdiği düzeltmeler (/korrektur/<kod>). Siz panelde "Uygula" deyince demoya yazılır.
 * data/text-corrections.json (deploy paketi ezmez).
 */
import fs from 'node:fs';
import path from 'node:path';

export interface Correction {
  id: string; prospectId: number; token: string; business: string;
  changes: { from: string; to: string }[]; note: string; name: string;
  status: 'open' | 'applied' | 'dismissed'; createdAt: string; decidedAt?: string; replaced?: number;
}

const FILE = path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'text-corrections.json');

export function readCorrections(): Correction[] {
  try { const j = JSON.parse(fs.readFileSync(FILE, 'utf8')); return Array.isArray(j) ? j : []; } catch { return []; }
}

function write(list: Correction[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(list, null, 1));
  fs.renameSync(`${FILE}.tmp`, FILE);
}

export function addCorrection(c: Omit<Correction, 'id' | 'status' | 'createdAt'>): Correction {
  const item: Correction = { ...c, id: `k-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, status: 'open', createdAt: new Date().toISOString() };
  write([item, ...readCorrections()].slice(0, 2000));
  return item;
}

export function updateCorrection(id: string, patch: Partial<Pick<Correction, 'status' | 'replaced'>>): Correction | null {
  const list = readCorrections();
  const i = list.findIndex((c) => c.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch, decidedAt: new Date().toISOString() };
  write(list);
  return list[i];
}
