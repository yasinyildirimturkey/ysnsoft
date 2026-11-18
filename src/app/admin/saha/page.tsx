import type { Metadata } from 'next';
import FieldMode from '@/components/admin/FieldMode';

export const metadata: Metadata = {
  title: 'Saha listesi',
  robots: { index: false, follow: false },
  // Telefona uygulama gibi kurulur ("Ana ekrana ekle"); simge ve tam ekran açılış
  manifest: '/saha.webmanifest',
  appleWebApp: { capable: true, title: 'Saha', statusBarStyle: 'default' },
  icons: { apple: '/saha-apple-180.png' },
};

/**
 * Telefonda saha ziyareti: haritada kaydedilen günün durakları ve tek dokunuşla sonuç girişi.
 * Gün (?date=YYYY-MM-DD) istemcide okunur: sayfa statik kalır, tarih telefonun saat dilimine göre hesaplanır.
 */
export default function FieldPage() {
  return <FieldMode />;
}
