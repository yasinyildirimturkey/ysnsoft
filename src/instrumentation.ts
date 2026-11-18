/**
 * Sunucu açılışında bir kez çalışır (Next.js instrumentation; iisnode'daki start.js ile de çağrılır).
 * Zamanlayıcı yalnızca üretimde başlar: geliştirmede her kayıtta yeniden başlayıp iş tetiklemesin.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV !== 'production' && process.env.ZAMANLAYICI_DEV !== '1') return;
  const { startScheduler } = await import('@/lib/scheduler');
  startScheduler();
}
