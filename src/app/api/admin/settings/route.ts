import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/admin-auth';

/**
 * Şirket / iletişim ayarları (teklif belgesinde kullanılır).
 * Eskiden yalnız tarayıcıya (localStorage) kaydediliyordu: başka bilgisayarda/telefonda görünmüyordu.
 * Artık sunucuda: data/system-settings.json (deploy paketi bu dosyayı ezmez).
 */
const FILE = path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'system-settings.json');
const FIELDS = ['companyName', 'companyPhone', 'whatsappNumber', 'supportEmail', 'infoEmail', 'notificationEmail', 'address', 'mersisNo', 'ticaretSicilNo'] as const;
type Settings = Record<(typeof FIELDS)[number], string>;

const DEFAULTS: Settings = {
  companyName: 'YSNSOFT',
  companyPhone: process.env.COMPANY_PHONE || '',
  whatsappNumber: process.env.COMPANY_PHONE || '',
  supportEmail: process.env.COMPANY_SUPPORT_EMAIL || '',
  infoEmail: process.env.COMPANY_INFO_EMAIL || '',
  notificationEmail: '',
  address: '',
  mersisNo: '',
  ticaretSicilNo: '',
};
const NO_STORE = { 'Cache-Control': 'no-store' };

function read(): Settings {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Partial<Settings>;
    return { ...DEFAULTS, ...Object.fromEntries(FIELDS.filter((k) => typeof raw[k] === 'string').map((k) => [k, raw[k]])) };
  } catch {
    return DEFAULTS;
  }
}

export async function GET(request: Request) {
  const denied = requireRole(request, 'settings', 'read');
  if (denied) return denied;
  return NextResponse.json({ success: true, data: read() }, { headers: NO_STORE });
}

export async function PUT(request: Request) {
  const denied = requireRole(request, 'settings', 'write');
  if (denied) return denied;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Geçersiz istek.' }, { status: 400 }); }
  const next = { ...read() };
  for (const k of FIELDS) if (typeof body[k] === 'string') next[k] = (body[k] as string).trim().slice(0, 300);
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(next, null, 2));
    fs.renameSync(`${FILE}.tmp`, FILE);
  } catch {
    return NextResponse.json({ success: false, error: 'Ayarlar kaydedilemedi.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, data: next }, { headers: NO_STORE });
}
