import { llmsFullTxt, TEXT_HEADERS } from '@/lib/llms';

export function GET() {
  return new Response(llmsFullTxt(), { headers: TEXT_HEADERS });
}
