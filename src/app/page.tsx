import type { Metadata } from 'next';
import HomeClient from '@/components/HomeClient';
import { JsonLd } from '@/components/SiteChrome';
import { homeGraph } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function Home() {
  return (
    <>
      <JsonLd data={homeGraph()} />
      <HomeClient />
    </>
  );
}
