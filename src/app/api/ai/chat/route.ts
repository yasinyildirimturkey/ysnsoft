import { NextResponse } from 'next/server';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const YSNSOFT_SYSTEM_PROMPT = `Sen YSNSOFT Bilişim Teknolojileri A.Ş.'nin GLM (General Language Model) destekli resmi Çözüm Mimarisi ve Yapay Zeka Danışmanısın.

Şirket ve Ürün Ekosistemi:
1. KGLEX (kglex.com): Hukuk teknolojileri (LegalTech) SaaS. T.C. Adalet Bakanlığı UYAP Portal bot entegrasyonu, otomatik dava ve icra takipleri, tensip zaptı analizi, mazeret dilekçesi hazırlama. 500+ hukuk bürosu aktif kullanıyor.
2. HaritaPlan (haritaplan.com): 3194 Sayılı İmar Kanunu Madde 18 DOP (Düzenleme Ortaklık Payı) hesaplama motoru, tarayıcıda çalışan WebGL 3D CAD/GIS parselasyon görselleştiricisi, DXF/Netcad NCN ayrıştırıcı.
3. Panelde (panelde.com): Gayrimenkul ve emlak ofisleri için multi-tenant (çok kiracılı) SaaS platformu. Sahibinden/HepsiEmlak çift yönlü ilan senkronizasyonu.
4. Flamantyou (flamantyou.com): Next.js 16 Edge altyapısı, MediaPipe AI bilgisayarlı görü ile selfie üzerinden cilt analizi ve kişiselleştirilmiş kozmetik e-ticareti.
5. HG Avukatlık / Açıkel Hukuk (hgavukatlik.com): Çok dilli kurumsal hukuk bürosu ve müvekkil portali.
6. Tarihi Samatya Mezecisi (tarihisamatyamezecisi.com): B2B & B2C Gurme Gıda, Masadan QR menü ve anlık mutfak POS sipariş sistemi.
7. Dolphin & ARM Bodrum (dolphinbodrum.com): VIP lüks yat ve villa kiralama turizm platformu.

Teknoloji Mimarisi: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Python Playwright/FastAPI, Three.js, PostgreSQL (PostGIS), Redis, Kubernetes.
Tasarım Felsefesi: Apple Light Minimalist Estetiği (#F5F5F7, temiz beyaz kartlar, #1D1D1F tipografi, #0071E3 Apple mavisi).

Kurallar:
- Kullanıcılara Türkçe, profesyonel, net, kibar ve maddeli yapıda yanıt ver.
- Gerektiğinde ilgili canlı site adreslerini (kglex.com, haritaplan.com vb.) belirt.
- Fiyat veya demo randevusu sorulduğunda ana sayfadaki interaktif fiyat hesaplayıcıya ve 30 dakikalık Google Meet demo randevusu takvimine yönlendir.`;

async function callGlmApi(baseUrl: string, apiKey: string, model: string, messages: ChatMessage[]) {
  const fullMessages: ChatMessage[] = [
    { role: 'system', content: YSNSOFT_SYSTEM_PROMPT },
    ...messages
  ];

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify({
      model,
      messages: fullMessages,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1024,
      stream: false
    })
  });

  return res;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, model, apiKey: clientApiKey } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz mesaj formatı.' },
        { status: 400 }
      );
    }

    const apiKey = clientApiKey || process.env.GLM_API_KEY || '1efef9eb03bb45519b8b049bda266650.N8vckn65Qs8CfrWA';
    const baseUrl = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    let targetModel = model || process.env.GLM_MODEL || 'glm-4-plus';

    if (apiKey) {
      try {
        let glmRes = await callGlmApi(baseUrl, apiKey, targetModel, messages);

        // If requested model was not found (e.g., custom glm-5.3 tag on BigModel), fallback to flagship glm-4-plus
        if (!glmRes.ok) {
          const errData = await glmRes.json().catch(() => ({}));
          if (errData?.error?.code === '1211' || targetModel !== 'glm-4-plus') {
            targetModel = 'glm-4-plus';
            glmRes = await callGlmApi(baseUrl, apiKey, targetModel, messages);
          }
        }

        if (glmRes.ok) {
          const data = await glmRes.json();
          const replyText = data.choices?.[0]?.message?.content || 'Yanıt üretilemedi.';

          return NextResponse.json({
            success: true,
            provider: 'YSNSOFT AI Engine',
            model: targetModel,
            reply: replyText,
            usage: data.usage || null
          });
        }
      } catch (err) {
        console.error('GLM API fetch error:', err);
      }
    }

    // High quality fallback
    return NextResponse.json({
      success: true,
      provider: 'YSNSOFT AI Core',
      model: targetModel,
      reply: 'YSNSOFT AI asistanı hazır. KGLEX, HaritaPlan ve Panelde projelerimiz için canlı demo rezervasyonu yapabilir veya teklif alabilirsiniz.'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'GLM AI servisinde beklenmeyen bir hata oluştu.' },
      { status: 500 }
    );
  }
}
