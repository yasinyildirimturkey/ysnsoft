import { NextResponse } from 'next/server';
import { clientKey, getAdminSession, requireAdmin } from '@/lib/admin-auth';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Sitedeki "YSNSOFT AI" asistanı ve paneldeki test alanı için GLM köprüsü.
 *
 * Eskiden: istemci kendi API anahtarını ve modelini gönderebiliyordu (sunucu başkasının anahtarıyla vekil oluyordu),
 * mesaj sayısı/uzunluğu sınırsızdı, istemci "system" rolüyle talimatları ezebiliyordu ve GLM hata verince bile
 * `success:true` ile hazır bir cümle dönüyordu. Artık:
 * - Anahtar YALNIZ sunucudaki GLM_API_KEY; model yalnız izin listesinden ve yalnız panel kullanıcısı seçebilir.
 * - Yalnız user/assistant mesajları, son 12 mesaj, her biri en çok 2000 karakter.
 * - IP başına 10 dakikada 20 istek (panel kullanıcısı için 60).
 * - Hata dürüstçe döner (503 yapılandırılmamış, 502 servis yanıt vermedi).
 */
type Role = 'user' | 'assistant';
interface ChatMessage { role: Role | 'system'; content: string }

// Ücretsiz modeller önce (BigModel'de *-flash ücretsiz). glm-4-plus ücretli ve bakiye gerektirir.
const MODELS = ['glm-4.7-flash', 'glm-4.5-flash', 'glm-4-plus'] as const;
const FREE_FALLBACK = 'glm-4.5-flash';
const chatModel = () => process.env.GLM_CHAT_MODEL || 'glm-4.7-flash';
const MAX_MESSAGES = 12;
const MAX_CHARS = 2000;
const NO_STORE = { 'Cache-Control': 'no-store' };

const SYSTEM_PROMPT = `Sen YSNSOFT'un web sitesindeki yardımcı asistansın. YSNSOFT web siteleri ve özel yazılım geliştirir.

Portföydeki ürünler ve projeler:
1. KGLEX (kglex.com): Hukuk büroları için dava ve icra takibi, belge hazırlama yardımcıları sunan hukuk yazılımı.
2. HaritaPlan (haritaplan.com): İmar uygulamaları (3194 sayılı Kanun md. 18) için hesaplama ve tarayıcıda 3D parsel görselleştirme aracı.
3. Panelde (panelde.com): Emlak ofisleri için çok kiracılı ilan ve ofis yönetimi platformu.
4. Flamantyou (flamantyou.com): Kozmetik e-ticaret sitesi.
5. HG Avukatlık / Açıkel Hukuk (hgavukatlik.com): Çok dilli hukuk bürosu sitesi.
6. Tarihi Samatya Mezecisi (tarihisamatyamezecisi.com): QR menü ve sipariş sistemi.
7. Dolphin & ARM Bodrum (dolphinbodrum.com): Yat ve villa kiralama sitesi.

Yukarıdaki listede yazanlar dışında bu ürünler hakkında HİÇBİR BİLGİN YOK.

Kurallar:
- Türkçe, kibar, kısa ve maddeli yanıt ver.
- EN ÖNEMLİ KURAL: Hiçbir rakam söyleme. Müşteri/büro/kullanıcı sayısı, başarı oranı, teslim süresi, fiyat sorulursa rakam VERME; şöyle de: "Bu konuda net bilgiyi ekibimiz verebilir; sayfadaki 'Teklif Al' formundan veya randevu formundan bize ulaşabilirsiniz." Tahmini, yaklaşık veya "-den fazla" gibi ifadeler de yasaktır.
- Bilmediğin bir şeyi uydurma; emin değilsen "bunu ekibimize sormanız en doğrusu" de.
- Hukuki, mali veya resmi uygunluk garantisi verme (ör. "KVKK'ya uygundur", "resmi entegrasyondur" deme). Bu tür konularda "projeye göre ayrıca kontrol edilmeli" de.
- Hukuki danışmanlık yapma; somut hukuki sorularda bir avukata danışılmasını öner.
- Görüşme isteyenleri sayfadaki randevu formuna yönlendir; randevunun ekip onayından sonra kesinleştiğini belirt.
- Gerektiğinde ilgili site adresini (kglex.com, haritaplan.com vb.) belirt.`;

const fail = (status: number, error: string, extra: Record<string, string> = {}) =>
  NextResponse.json({ success: false, error }, { status, headers: { ...NO_STORE, ...extra } });

function cleanMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const msgs = raw
    .filter((m): m is { role: Role; content: string } =>
      !!m && typeof m === 'object' && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim() !== '')
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) }));
  if (msgs.length === 0 || msgs[msgs.length - 1].role !== 'user') return null;
  return msgs;
}

async function callGlm(model: string, messages: ChatMessage[]) {
  const baseUrl = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
  return fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GLM_API_KEY!.trim()}` },
    body: JSON.stringify({
      model, messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages], temperature: 0.6, top_p: 0.9, max_tokens: 1024, stream: false,
      // flash modeller varsayılan olarak 'düşünür' ve yanıtı boş bırakabilir; sohbet için kapatılır
      ...(model.includes('flash') ? { thinking: { type: 'disabled' } } : {}),
    }),
    signal: AbortSignal.timeout(45_000),
  });
}

/** Panel: asistanın gerçek yapılandırma durumu (anahtarın kendisi asla dönmez). */
export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json({
    success: true,
    configured: Boolean(process.env.GLM_API_KEY?.trim()),
    model: chatModel(),
    models: MODELS,
  }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const isAdmin = getAdminSession(request) !== null;
  const wait = rateLimit('ai-chat', clientKey(request), isAdmin ? 60 : 20, 10 * 60_000);
  if (wait) return fail(429, 'Çok fazla soru gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.', { 'Retry-After': String(wait) });

  let body: { messages?: unknown; model?: unknown };
  try { body = await request.json(); } catch { return fail(400, 'Geçersiz istek.'); }
  const messages = cleanMessages(body.messages);
  if (!messages) return fail(400, 'Geçersiz mesaj formatı.');

  if (!process.env.GLM_API_KEY?.trim()) {
    return fail(503, 'Asistan şu anda kullanılamıyor. Sorunuzu "Teklif Al" formuyla iletebilirsiniz.');
  }

  const defaultModel = chatModel();
  const model = isAdmin && MODELS.includes(body.model as (typeof MODELS)[number]) ? (body.model as string) : defaultModel;

  try {
    let res = await callGlm(model, messages);
    let used = model;
    for (const next of [defaultModel, FREE_FALLBACK]) {
      if (res.ok || next === used) continue;
      console.error('[ai-chat] GLM', used, 'HTTP', res.status, '- yedek model deneniyor:', next);
      used = next;
      res = await callGlm(next, messages);
    }
    if (!res.ok) {
      console.error('[ai-chat] GLM HTTP', res.status, (await res.text().catch(() => '')).slice(0, 300));
      return fail(502, 'Asistan şu anda yanıt veremiyor. Lütfen biraz sonra tekrar deneyin veya "Teklif Al" formunu kullanın.');
    }
    const data = await res.json();
    const reply: unknown = data?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) return fail(502, 'Asistan boş yanıt verdi. Lütfen sorunuzu tekrar deneyin.');
    return NextResponse.json({ success: true, model: used, reply: reply.trim(), usage: data.usage ?? null }, { headers: NO_STORE });
  } catch (err) {
    console.error('[ai-chat] GLM bağlantı hatası:', err instanceof Error ? err.message : err);
    return fail(502, 'Asistana şu anda ulaşılamıyor. Lütfen biraz sonra tekrar deneyin veya "Teklif Al" formunu kullanın.');
  }
}
