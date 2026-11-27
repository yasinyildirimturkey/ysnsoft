import { llmsTxt, TEXT_HEADERS } from '@/lib/llms';

export function GET() {
  return new Response(llmsTxt(), { headers: TEXT_HEADERS });
}
