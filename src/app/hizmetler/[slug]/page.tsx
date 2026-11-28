import { IntentView, intentMetadata, intentStaticParams } from '@/components/IntentView';

// Arama niyeti sayfası (tr). İçerik: src/data/intent.ts, şablon: src/components/IntentView.tsx
type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return intentStaticParams('tr');
}

export async function generateMetadata({ params }: Props) {
  return intentMetadata('tr', (await params).slug);
}

export default async function Page({ params }: Props) {
  return <IntentView lang="tr" slug={(await params).slug} />;
}
