import { HubView, hubMetadata } from '@/components/IntentView';

// Hizmet sayfaları dizini (en). İçerik: src/data/intent.ts
export const metadata = hubMetadata('en');

export default function Page() {
  return <HubView lang="en" />;
}
