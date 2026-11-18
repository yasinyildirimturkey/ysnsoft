import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { mailStatus } from '@/lib/mailer';
import { schedulerStatus } from '@/lib/scheduler';
import { webscoutAvailability } from '@/lib/webscout';

/**
 * Sağlık kontrolü (KGLEX deseni). Herkese açık kısım yalnız "ayakta mı" bilgisini verir (izleme servisleri için).
 * Ayrıntı (veritabanı, e-posta, zamanlanmış işler, son çökme) yalnız panel oturumuyla ya da
 * `x-health-key: <HEALTH_KEY>` başlığıyla döner.
 */
const started = Date.now();
const NO_STORE = { 'Cache-Control': 'no-store' };

function buildId(): string | null {
  try { return fs.readFileSync(path.join(/* turbopackIgnore: true */ process.cwd(), '.next', 'BUILD_ID'), 'utf8').trim(); } catch { return null; }
}

export async function GET(request: Request) {
  const ws = webscoutAvailability();
  const ok = ws.available;
  const base = { ok, build: buildId(), uptimeMin: Math.round((Date.now() - started) / 60_000) };
  const key = process.env.HEALTH_KEY;
  const allowed = Boolean(getAdminSession(request)) || (Boolean(key) && request.headers.get('x-health-key') === key);
  if (!allowed) return NextResponse.json(base, { status: ok ? 200 : 503, headers: NO_STORE });

  let lastCrash: unknown = null;
  try { lastCrash = JSON.parse(fs.readFileSync(path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'last-crash.json'), 'utf8')); } catch { /* çökme yok */ }
  return NextResponse.json({
    ...base,
    node: process.version,
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    webscout: ws,
    mail: mailStatus(),
    jobs: schedulerStatus(),
    lastCrash,
  }, { status: ok ? 200 : 503, headers: NO_STORE });
}
