import { HubView, hubMetadata } from '@/components/IntentView';

// Hizmet sayfaları dizini (de). İçerik: src/data/intent.ts
export const metadata = hubMetadata('de');

export default function Page() {
  return <HubView lang="de" />;
}
