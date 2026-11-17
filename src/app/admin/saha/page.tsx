import type { Metadata } from 'next';
import FieldMode from '@/components/admin/FieldMode';

export const metadata: Metadata = {
  title: 'Saha listesi',
  robots: { index: false, follow: false },
};

/**
 * Telefonda saha ziyareti: haritada kaydedilen günün durakları ve tek dokunuşla sonuç girişi.
 * Gün (?date=YYYY-MM-DD) istemcide okunur: sayfa statik kalır, tarih telefonun saat dilimine göre hesaplanır.
 */
export default function FieldPage() {
  return <FieldMode />;
}
