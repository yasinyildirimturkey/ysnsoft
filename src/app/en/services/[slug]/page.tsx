import { IntentView, intentMetadata, intentStaticParams } from '@/components/IntentView';

// Arama niyeti sayfası (en). İçerik: src/data/intent.ts, şablon: src/components/IntentView.tsx
type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return intentStaticParams('en');
}

export async function generateMetadata({ params }: Props) {
  return intentMetadata('en', (await params).slug);
}

export default async function Page({ params }: Props) {
  return <IntentView lang="en" slug={(await params).slug} />;
}
