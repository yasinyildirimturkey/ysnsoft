import type { ChatMessage, ContentBlock, Llm, LlmRequest, LlmTurn } from "./types.js";

/**
 * API anahtarı olmadan widget'ı ve araç akışını denemek için kural tabanlı sahte model
 * (LLM_MODE=demo). Gerçek bir dil modeli DEĞİLDİR; üretimde kullanılmaz.
 *
 * Anladıkları: "YYYY-MM-DD YYYY-MM-DD N" (müsaitlik), "rezervasyon/book" (link),
 * "insan/human/yetkili" (devir). Gerisine sabit bir cevap verir.
 */
export class DemoLlm implements Llm {
  private n = 0;

  async streamTurn(request: LlmRequest, onText: (delta: string) => void): Promise<LlmTurn> {
    const last = request.messages[request.messages.length - 1];
    const say = async (text: string): Promise<LlmTurn> => {
      for (const word of text.split(/(?<=\s)/)) {
        onText(word);
        await new Promise((r) => setTimeout(r, 15));
      }
      return { content: [{ type: "text", text, citations: null } as ContentBlock], stopReason: "end_turn" };
    };
    const call = (name: string, input: unknown): LlmTurn => ({
      content: [{ type: "tool_use", id: `toolu_demo_${++this.n}`, name, input } as ContentBlock],
      stopReason: "tool_use",
    });

    const toolResult = lastToolResult(last);
    if (toolResult !== null) return say(describeResult(toolResult));

    const text = lastUserText(last).toLowerCase();
    const dates = text.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
    const adults = Number(text.match(/(\d+)\s*(yetişkin|kişi|adult)/)?.[1] ?? 2);
    if (dates.length >= 2) {
      const stay = { giris_tarihi: dates[0], cikis_tarihi: dates[1], yetiskin_sayisi: adults, cocuk_yaslari: [] };
      return call(/rezerv|book/.test(text) ? "rezervasyon_linki_uret" : "musaitlik_sorgula", stay);
    }
    if (/insan|yetkili|human|agent|resepsiyon/.test(text)) {
      return call("insana_devret", { talep_ozeti: "Misafir bir yetkiliyle görüşmek istiyor (demo modu)." });
    }
    return say(
      "[Demo modu — gerçek model bağlı değil] Müsaitlik için iki tarih yazın (ör. 2027-03-10 2027-03-13 2 yetişkin), " +
        "bir yetkili için “insan” yazın.",
    );
  }
}

function lastUserText(msg: ChatMessage | undefined): string {
  if (!msg || msg.role !== "user") return "";
  if (typeof msg.content === "string") return msg.content;
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join(" ");
}

function lastToolResult(msg: ChatMessage | undefined): string | null {
  if (!msg || msg.role !== "user" || typeof msg.content === "string") return null;
  for (const b of msg.content) {
    if (b.type === "tool_result") return typeof b.content === "string" ? b.content : "";
  }
  return null;
}

function describeResult(json: string): string {
  try {
    const r = JSON.parse(json) as Record<string, unknown>;
    if (typeof r.error === "string") return `[Demo] Araç hatası: ${r.error}`;
    if (typeof r.url === "string") return `[Demo] Rezervasyon linkiniz: ${r.url}`;
    if (r.status === "contact_form_shown") return "[Demo] Lütfen aşağıdaki formu doldurun; resepsiyon size dönecek.";
    if (Array.isArray(r.offers)) {
      if (r.offers.length === 0) return "[Demo] Bu tarihlerde müsait oda görünmüyor.";
      const lines = (r.offers as Array<Record<string, unknown>>).map(
        (o) => `• ${o.roomTypeName}: ${o.discountedPrice ?? o.price} ${o.currency}`,
      );
      return `[Demo] ${r.checkIn} → ${r.checkOut} için:\n${lines.join("\n")}`;
    }
  } catch {
    /* aşağıya düş */
  }
  return "[Demo] Araç sonucu alındı.";
}
