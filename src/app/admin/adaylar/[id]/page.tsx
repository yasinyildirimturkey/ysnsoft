import type { Metadata } from 'next';
import { Suspense } from 'react';
import ProspectPage from '@/components/admin/ProspectPage';

export const metadata: Metadata = {
  title: 'Aday',
  robots: { index: false, follow: false },
};

/**
 * Müşteri adayının sayfası. Aday numarası istemcide okunur (useParams) ve veri API'den gelir:
 * sayfanın kabuğu statik kalır; oturum /admin proxy'si ve API rolleriyle korunur.
 */
export default function ProspectRoute() {
  return (
    <Suspense fallback={<div className="admin-ui min-h-screen bg-[#F5F5F7]" />}>
      <ProspectPage />
    </Suspense>
  );
}
