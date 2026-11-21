import path from "node:path";
import { buildApp } from "./app.js";
import { limitsFromEnv, loadEnv } from "./config/env.js";
import { loadHotels } from "./config/hotel.js";
import { RateLimiter } from "./guard/rate-limit.js";
import { createMailer } from "./handoff/mailer.js";
import { AnthropicLlm } from "./llm/anthropic.js";
import { DemoLlm } from "./llm/demo.js";
import { Alerter } from "./ops/alerter.js";
import { createPmsClient, type PmsClient } from "./pms/index.js";
import { Store } from "./store/store.js";

const env = loadEnv();
const log = (msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ t: new Date().toISOString(), msg, ...extra }));

const hotels = loadHotels(path.resolve(env.HOTELS_DIR));
const pmsClients = new Map<string, PmsClient>();
for (const [id, hotel] of hotels) pmsClients.set(id, createPmsClient(hotel));

const store = new Store(path.resolve(env.DATA_DIR, "chat.sqlite"));
const limiter = new RateLimiter();
const mailer = createMailer(env, log);
const alerter = new Alerter(mailer, env.OPS_ALERT_EMAIL, log);

if (env.LLM_MODE === "demo") log("warning_demo_llm", { note: "Gerçek model bağlı değil; yalnızca geliştirme içindir." });
if (!env.SMTP_HOST) log("warning_smtp_unconfigured", { note: "Devir ve uyarı e-postaları gönderilmeyecek, loga yazılacak." });
if (!env.ADMIN_TOKEN) log("info_admin_disabled", { note: "ADMIN_TOKEN tanımlı değil; yönetim paneli kapalı." });

// WhatsApp yalnızca üç ayar da verilmişse açılır; eksikse hangi otelin etkilendiği söylenir.
const waHotels = [...hotels.values()].filter((h) => h.config.whatsapp).map((h) => h.config.id);
const waReady = env.WHATSAPP_VERIFY_TOKEN && env.WHATSAPP_APP_SECRET && env.WHATSAPP_API_VERSION;
if (waHotels.length > 0 && !waReady) {
  log("warning_whatsapp_disabled", {
    hotels: waHotels,
    note: "WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET ve WHATSAPP_API_VERSION tanımlanmadan WhatsApp kanalı açılmaz.",
  });
}

const app = buildApp({
  publicDir: path.resolve("public"),
  trustProxy: env.TRUST_PROXY,
  deps: {
    hotels,
    store,
    limiter,
    limits: limitsFromEnv(env),
    llm: env.LLM_MODE === "demo" ? new DemoLlm() : new AnthropicLlm(env),
    mailer,
    pmsFor: (hotelId) => pmsClients.get(hotelId)!,
    log,
    alert: alerter.alert,
  },
  admin: {
    adminToken: env.ADMIN_TOKEN,
    backupDir: path.resolve(env.DATA_DIR, "kb-backups"),
    priceInputPerMTok: env.LLM_PRICE_INPUT_PER_MTOK,
    priceOutputPerMTok: env.LLM_PRICE_OUTPUT_PER_MTOK,
  },
  whatsapp:
    waHotels.length > 0 && waReady
      ? {
          config: {
            verifyToken: env.WHATSAPP_VERIFY_TOKEN!,
            appSecret: env.WHATSAPP_APP_SECRET!,
            apiVersion: env.WHATSAPP_API_VERSION!,
          },
          tokenFor: (hotel) => process.env[`${hotel.config.whatsapp?.secretsEnvPrefix}_TOKEN`]?.trim() || undefined,
        }
      : undefined,
});

/** Saklama süresi dolan kayıtları siler; açılışta ve saatte bir çalışır. */
function purge(): void {
  limiter.prune();
  for (const [id, hotel] of hotels) {
    const removed = store.purgeExpired(id, hotel.config.privacy.retentionDays);
    if (removed > 0) log("retention_purge", { hotelId: id, sessions: removed });
  }
}
purge();
setInterval(purge, 60 * 60 * 1000).unref();

// iisnode PORT olarak bir adlandırılmış kanal (\\.\pipe\...) verir; normal çalıştırmada sayıdır.
await (/^[0-9]+$/.test(env.PORT) ? app.listen({ port: Number(env.PORT), host: "0.0.0.0" }) : app.listen({ path: env.PORT }));
log("listening", {
  port: env.PORT,
  hotels: [...hotels.keys()],
  llm: env.LLM_MODE,
  model: env.ANTHROPIC_MODEL,
  admin: Boolean(env.ADMIN_TOKEN),
  whatsapp: waHotels.length > 0 && Boolean(waReady) ? waHotels : [],
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void app.close().then(() => {
      store.close();
      process.exit(0);
    });
  });
}
