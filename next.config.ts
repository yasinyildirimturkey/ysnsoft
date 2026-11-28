import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Eski sitenin Search Console'da 404 veren adresleri (2026-11-28): karşılığı olan yeni sayfaya kalıcı (308) yönlendirme.
  // Karşılığı olmayanlar bilerek 404 kalır: /kullanici-sozlesmesi, /newsletter/subscribe, /api/newsletter/subscribe.
  async redirects() {
    const to = (destination: string) => (source: string) => ({ source, destination, permanent: true });
    return [
      ...['/cozumler', '/hakkimizda', '/fiyatlandirma', '/kayit'].map(to('/hizmetler')),
      ...['/iletisim', '/miletisim'].map(to('/hizmetler/pendik-web-tasarim-yazilim')),
      to('/projeler')('/ilanlar'),
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
