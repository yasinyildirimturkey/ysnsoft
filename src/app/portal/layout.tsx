import type { Metadata } from 'next';

/**
 * /portal şimdilik sabit ÖRNEK projeler gösteriyor (gerçek müşteri verisi değil). Gerçek portal yapılana dek
 * menülerden kaldırıldı ve arama motorlarına kapatıldı (2026-11-18).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
