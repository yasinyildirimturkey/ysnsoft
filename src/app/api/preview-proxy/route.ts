import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('URL parametresi eksik', { status: 400 });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const host = parsedUrl.hostname.toLowerCase();
    const origin = parsedUrl.origin;

    const allowedDomains = [
      'kglex.com',
      'www.kglex.com',
      'haritaplan.com',
      'www.haritaplan.com',
      'hgavukatlik.com',
      'www.hgavukatlik.com',
      'acikellaw.com',
      'www.acikellaw.com',
      'panelde.com',
      'www.panelde.com',
      'flamantyou.com',
      'www.flamantyou.com',
      'tarihisamatyamezecisi.com',
      'www.tarihisamatyamezecisi.com',
      'samatya-mezecisi.com',
      'www.samatya-mezecisi.com',
      'dolphinbodrum.com',
      'www.dolphinbodrum.com'
    ];

    const isAllowed = allowedDomains.some(d => host === d || host.endsWith('.' + d));

    if (!isAllowed) {
      return new NextResponse('Yetkisiz alan adı', { status: 403 });
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 YSNSOFT-Showcase/2.6',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache'
      },
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      return renderFallbackHtml(targetUrl, host);
    }

    let html = await response.text();

    // 1. Rewrite root-relative URLs so scripts, chunks, styles and images load directly from the target site origin
    html = html.replace(/src=["']\/_next\//g, `src="${origin}/_next/`);
    html = html.replace(/href=["']\/_next\//g, `href="${origin}/_next/`);
    html = html.replace(/src=["']\/(images|assets|static|uploads|img|media)\//g, `src="${origin}/$1/`);
    html = html.replace(/href=["']\/(images|assets|static|uploads|favicon|icons|fonts)\//g, `href="${origin}/$1/`);

    // 2. Client-Side Runtime Patch & Sandbox Bridge
    // This script ensures Next.js hydration runs cleanly without crashing on router state or redirecting away
    const injection = `
      <base href="${origin}/">
      <script>
        (function() {
          try {
            // Anti-framebuster: trap window.top & parent so scripts think they are top-level
            Object.defineProperty(window, 'top', { get: function() { return window.self; } });
            Object.defineProperty(window, 'parent', { get: function() { return window.self; } });
          } catch(e) {}

          const targetOrigin = "${origin}";

          // Route all relative fetch requests to target origin (e.g. /api/... or /_next/data/...)
          try {
            const origFetch = window.fetch;
            if (origFetch) {
              window.fetch = function(input, init) {
                if (typeof input === 'string' && input.startsWith('/') && !input.startsWith('//')) {
                  input = targetOrigin + input;
                } else if (input instanceof Request && input.url.startsWith(window.location.origin + '/')) {
                  input = new Request(targetOrigin + input.url.slice(window.location.origin.length), input);
                }
                return origFetch.call(this, input, init);
              };
            }

            const origOpen = XMLHttpRequest.prototype.open;
            if (origOpen) {
              XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
                  url = targetOrigin + url;
                }
                return origOpen.call(this, method, url, ...rest);
              };
            }
          } catch(e) {}

          // Safely catch pushState / replaceState errors
          try {
            const origPush = history.pushState;
            const origReplace = history.replaceState;
            history.pushState = function(state, title, url) {
              try { return origPush.call(history, state, title, url); } catch(err) {}
            };
            history.replaceState = function(state, title, url) {
              try { return origReplace.call(history, state, title, url); } catch(err) {}
            };
          } catch(e) {}

          // Target external navigation links to new tab
          document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('a').forEach(function(anchor) {
              const href = anchor.getAttribute('href');
              if (href && (href.startsWith('http') || href.startsWith('/'))) {
                anchor.setAttribute('target', '_blank');
                anchor.setAttribute('rel', 'noopener noreferrer');
              }
            });
          });
        })();
      </script>
      <style>
        html, body {
          scrollbar-width: thin !important;
          overflow-x: hidden !important;
        }
        #__next-build-watcher, [data-nextjs-toast] {
          display: none !important;
        }
      </style>
    `;

    // 3. Inject injection as first child of <head>
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${injection}`);
    } else if (html.includes('<head ')) {
      html = html.replace(/<head[^>]*>/, `$&${injection}`);
    } else {
      html = injection + html;
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120, s-maxage=300',
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return renderFallbackHtml(targetUrl, 'YSNSOFT');
  }
}

function renderFallbackHtml(targetUrl: string, host: string) {
  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="tr">
      <head>
        <meta charset="utf-8">
        <title>${host} Canlı Görünümü</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #F5F5F7;
            color: #1D1D1F;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
            padding: 24px;
          }
          .card {
            background: white;
            padding: 36px 32px;
            border-radius: 28px;
            box-shadow: 0 12px 35px rgba(0,0,0,0.06);
            max-width: 440px;
            border: 1px solid rgba(0,0,0,0.06);
          }
          h3 { font-size: 18px; margin: 0 0 8px 0; color: #1D1D1F; }
          p { font-size: 13px; color: #86868B; margin: 0 0 20px 0; line-height: 1.5; }
          .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #0071E3;
            color: white;
            text-decoration: none;
            padding: 11px 24px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h3>${host} Canlıda Aktif</h3>
          <p>
            Bu proje yüksek güvenlik ve kullanıcı oturumu korumasıyla canlıda hizmet vermektedir.
          </p>
          <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn">
            Siteyi Canlı İncele (Yeni Sekme) ↗
          </a>
        </div>
      </body>
    </html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    }
  );
}