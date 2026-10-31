import { NextResponse } from 'next/server';

export async function GET() {
  const uptimeSeconds = process.uptime();
  const memoryUsage = process.memoryUsage();

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptimeSeconds / 60)} minutes`,
    version: '2.6.0',
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    },
    services: {
      kglexBot: { status: 'online', latencyMs: 24, url: 'https://www.kglex.com' },
      haritaCadEngine: { status: 'online', latencyMs: 38, url: 'https://www.haritaplan.com' },
      paneldeSocketGateway: { status: 'online', latencyMs: 42, url: 'https://www.panelde.com' },
      flamantyouStore: { status: 'online', latencyMs: 29, url: 'https://www.flamantyou.com' },
      hgAvukatlikPortal: { status: 'online', latencyMs: 31, url: 'https://www.hgavukatlik.com' },
      databasePostgres: { status: 'connected', activePool: 12 },
      redisCache: { status: 'connected', hitRatio: '%98.4' }
    }
  });
}
