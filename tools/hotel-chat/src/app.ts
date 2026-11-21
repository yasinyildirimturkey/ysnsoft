import fs from "node:fs";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { registerAdmin, type AdminDeps } from "./admin/routes.js";
import { registerWebChannel, type WebDeps } from "./channels/web/routes.js";
import { registerWhatsAppChannel, type WhatsAppConfig } from "./channels/whatsapp/routes.js";
import type { Hotel } from "./config/hotel.js";

export interface AppOptions {
  deps: WebDeps;
  publicDir: string;
  trustProxy: boolean;
  /** Verilirse yönetim paneli (/admin) açılır. */
  admin?: Omit<AdminDeps, "hotels" | "store" | "limiter" | "log">;
  /** Verilirse WhatsApp webhook'u (/webhooks/whatsapp) açılır. */
  whatsapp?: { config: WhatsAppConfig; tokenFor: (hotel: Hotel) => string | undefined; fetchFn?: typeof fetch };
}

export function buildApp({ deps, publicDir, trustProxy, admin, whatsapp }: AppOptions): FastifyInstance {
  // Gövde sınırı: en uzun mesaj + JSON zarfı için fazlasıyla yeterli, büyük yükleri reddeder.
  const app = Fastify({ trustProxy, bodyLimit: 64 * 1024, logger: false });

  app.get("/health", async () => ({ ok: true, hotels: [...deps.hotels.keys()] }));

  const serveFile = (route: string, file: string, type: string, headers: Record<string, string>) => {
    app.get(route, async (_req, reply) => {
      const full = path.join(publicDir, file);
      if (!fs.existsSync(full)) return reply.code(404).send({ error: "not_built" });
      return reply.header("Content-Type", type).headers(headers).send(fs.readFileSync(full));
    });
  };
  serveFile("/widget.js", "widget.js", "application/javascript; charset=utf-8", {
    "Cache-Control": "public, max-age=300",
    "Access-Control-Allow-Origin": "*",
  });
  serveFile("/demo", "demo.html", "text/html; charset=utf-8", { "Cache-Control": "no-store" });
  // Ana sayfa: örnek otelin tanıtım sitesi (asistan içine gömülü).
  serveFile("/", "pati-koy.html", "text/html; charset=utf-8", { "Cache-Control": "no-cache" });

  registerWebChannel(app, deps);

  if (admin?.adminToken) {
    serveFile("/admin", "admin.html", "text/html; charset=utf-8", {
      "Cache-Control": "no-store",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
    });
    registerAdmin(app, { ...admin, hotels: deps.hotels, store: deps.store, limiter: deps.limiter, log: deps.log });
  }

  if (whatsapp) {
    registerWhatsAppChannel(app, { ...deps, whatsapp: whatsapp.config, tokenFor: whatsapp.tokenFor, fetchFn: whatsapp.fetchFn });
  }
  return app;
}
