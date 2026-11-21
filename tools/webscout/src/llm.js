// GLM (Zhipu / BigModel) istemcisi — OpenAI uyumlu sohbet uç noktası.
// ysnsoft'un /api/ai/chat rotasıyla AYNI ortam değişkenlerini kullanır; anahtar yoksa hiçbir şey çağrılmaz.
//   GLM_API_KEY   zorunlu (yoksa yapay zekâ adımları sessizce atlanır)
//   GLM_BASE_URL  varsayılan https://open.bigmodel.cn/api/paas/v4
//   WEBSCOUT_GLM_MODEL  varsayılan glm-5.3; olmazsa GLM_FALLBACK_MODEL (glm-4-plus), o da olmazsa ücretsiz
//                       GLM_FREE_MODEL (glm-4.7-flash) denenir. Geçiş sebepleri: model yok (1211), bakiye/paket
//                       bitti (1113), hız sınırı (429). 2026-11-18: ücretli modellerde bakiye bittiği için WebScout duruyordu.
// Sitenin sohbet asistanı GLM_CHAT_MODEL'i kullanır (varsayılan ücretsiz glm-4.7-flash); WebScout bilerek ondan bağımsızdır.

const BASE = (process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/+$/, '');
const MODEL = process.env.WEBSCOUT_GLM_MODEL || 'glm-5.3';
const FALLBACK = process.env.GLM_FALLBACK_MODEL || 'glm-4-plus';
const FREE = process.env.GLM_FREE_MODEL || 'glm-4.7-flash';
// İkinci ücretsiz model: glm-4.7-flash yoğunken (429) sık düşüyor (2026-11-21)
const FREE2 = process.env.GLM_FREE_MODEL_2 || 'glm-4.5-flash';
const CHAIN = [...new Set([MODEL, FALLBACK, FREE, FREE2])];

/** Bu hata sıradaki modeli denemeyi gerektiriyor mu (model yok / bakiye bitti / hız sınırı)? */
const tryNext = (r) => !r.ok && (['1211', '1113'].includes(String(r.data?.error?.code)) || [400, 404, 429].includes(r.status));

export const llmConfigured = () => Boolean(process.env.GLM_API_KEY);

// GLM 4.5 ve sonrası her zaman "düşünür" ve kapatılamaz; düşük düşünme payı vermezsek token hakkının
// tamamını düşünmeye harcayıp boş içerik döndürebiliyor (2026-11-16, glm-5.3).
const THINKS = (model) => /^glm-(4\.[5-9]|[5-9])/.test(model);
// Ücretsiz flash modellerde düşünme tamamen kapatılabilir (açıkken yanıtı boş bırakabiliyor)
const FLASH = (model) => /flash/.test(model);

async function call(model, messages, maxTokens) {
  // Sunucunun ağı ara sıra kopuyor (ENOTFOUND / bağlantı zaman aşımı): ağ hatasında iki kez daha dene
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.GLM_API_KEY}` },
        body: JSON.stringify({
          model, messages, temperature: 0.2, max_tokens: maxTokens, response_format: { type: 'json_object' },
          ...(FLASH(model) ? { thinking: { type: 'disabled' } } : THINKS(model) ? { reasoning_effort: 'low' } : {}),
        }),
        signal: AbortSignal.timeout(90_000),
      });
      const data = await res.json().catch(() => null);
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      if (attempt >= 2) throw new Error(`GLM ağ hatası: ${e?.cause?.code || e?.name || e.message}`);
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

/** Yanıttaki ilk JSON nesnesini ayıklar (model ```json çiti ya da ön söz ekleyebilir). */
export function parseJsonReply(text) {
  const s = String(text ?? '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Model JSON döndürmedi');
  return JSON.parse(s.slice(start, end + 1));
}

/**
 * Sistem + kullanıcı mesajı gönderir, JSON nesnesi bekler.
 * @returns {{json: object, model: string}}
 */
export async function llmJson(system, user, { maxTokens = 900 } = {}) {
  if (!llmConfigured()) throw new Error('GLM_API_KEY tanımlı değil');
  const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
  let lastErr = null;
  for (const model of CHAIN) {
    const r = await call(model, messages, maxTokens);
    if (!r.ok) {
      lastErr = new Error(`GLM HTTP ${r.status} (${model}): ${String(r.data?.error?.message ?? '').slice(0, 120)}`);
      if (tryNext(r)) continue;
      throw lastErr;
    }
    try {
      return { json: parseJsonReply(r.data?.choices?.[0]?.message?.content), model };
    } catch (e) {
      // Boş ya da yarım yanıt (ör. token hakkı düşünmeye gitti): sıradaki modeli dene
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('GLM yanıt vermedi');
}
