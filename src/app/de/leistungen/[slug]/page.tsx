import { IntentView, intentMetadata, intentStaticParams } from '@/components/IntentView';

// Arama niyeti sayfası (de). İçerik: src/data/intent.ts, şablon: src/components/IntentView.tsx
type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return intentStaticParams('de');
}

export async function generateMetadata({ params }: Props) {
  return intentMetadata('de', (await params).slug);
}

export default async function Page({ params }: Props) {
  return <IntentView lang="de" slug={(await params).slug} />;
}
