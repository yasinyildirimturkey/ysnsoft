import { INDEXNOW_KEY } from '@/lib/seo';

// IndexNow anahtarı (Bing, Yandex, Seznam, Naver). scripts/indexnow.mjs bu adresi keyLocation olarak gönderir.
export function GET() {
  return new Response(INDEXNOW_KEY, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
}
