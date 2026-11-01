import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'YSNSOFT | Kurumsal SaaS & Bilişim Ekosistemi',
    short_name: 'YSNSOFT',
    description: 'KGLEX LegalTech AI, HaritaPlan 3D CBS, Panelde Emlak SaaS, Tarihi Samatya Mezecisi QR POS ve kurumsal bilişim sistemleri.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F5F7',
    theme_color: '#0071E3',
    lang: 'tr',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
