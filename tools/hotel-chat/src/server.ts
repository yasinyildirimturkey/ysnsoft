import path from "node:path";
import { buildApp } from "./app.js";
import { limitsFromEnv, loadEnv } from "./config/env.js";
import { loadHotels } from "./config/hotel.js";
import { RateLimiter } from "./guard/rate-limit.js";
import { createMailer } from "./handoff/mailer.js";
import { AnthropicLlm } from "./llm/anthropic.js";
import { DemoLlm } from "./llm/demo.js";
import { createPmsClient, type PmsClient } from "./pms/index.js";
import { Store } from "./store/store.js";

const env = loadEnv();
const log = (msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ t: new Date().toISOString(), msg, ...extra }));

const hotels = loadHotels(path.resolve(env.HOTELS_DIR));
const pmsClients = new Map<string, PmsClient>();
for (const [id, hotel] of hotels) pmsClients.set(id, createPmsClient(hotel.config));

const store = new Store(path.resolve(env.DATA_DIR, "chat.sqlite"));
const limiter = new RateLimiter();

if (env.LLM_MODE === "demo") log("warning_demo_llm", { note: "Gerçek model bağlı değil; yalnızca geliştirme içindir." });
if (!env.SMTP_HOST) log("warning_smtp_unconfigured", { note: "Devir e-postaları gönderilmeyecek, loga yazılacak." });

const app = buildApp({
  publicDir: path.resolve("public"),
  trustProxy: env.TRUST_PROXY,
  deps: {
    hotels,
    store,
    limiter,
    limits: limitsFromEnv(env),
    llm: env.LLM_MODE === "demo" ? new DemoLlm() : new AnthropicLlm(env),
    mailer: createMailer(env, log),
    pmsFor: (hotelId) => pmsClients.get(hotelId)!,
    log,
  },
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

await app.listen({ port: env.PORT, host: "0.0.0.0" });
log("listening", { port: env.PORT, hotels: [...hotels.keys()], llm: env.LLM_MODE, model: env.ANTHROPIC_MODEL });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void app.close().then(() => {
      store.close();
      process.exit(0);
    });
  });
}
