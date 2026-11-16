import { readWebscoutDraft } from '@/lib/webscout';

/** Şablon taslağının görselleri (logo, foto1…): /demo/<belirteç>/a/<dosya>. Yalnızca kalıba uyan adlar okunur. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string; file: string }> }) {
  const { token, file } = await params;
  const asset = readWebscoutDraft(token, file);
  if (asset.state !== 'ok') return new Response(null, { status: asset.state === 'expired' ? 410 : 404 });
  return new Response(new Uint8Array(asset.data), {
    headers: {
      'Content-Type': asset.type,
      'X-Robots-Tag': 'noindex, noimageindex',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
