import { HubView, hubMetadata } from '@/components/IntentView';

// Hizmet sayfaları dizini (tr). İçerik: src/data/intent.ts
export const metadata = hubMetadata('tr');

export default function Page() {
  return <HubView lang="tr" />;
}
