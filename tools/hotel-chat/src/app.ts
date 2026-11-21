import fs from "node:fs";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { registerWebChannel, type WebDeps } from "./channels/web/routes.js";

export interface AppOptions {
  deps: WebDeps;
  publicDir: string;
  trustProxy: boolean;
}

export function buildApp({ deps, publicDir, trustProxy }: AppOptions): FastifyInstance {
  // Gövde sınırı: en uzun mesaj + JSON zarfı için fazlasıyla yeterli, büyük yükleri reddeder.
  const app = Fastify({ trustProxy, bodyLimit: 16 * 1024, logger: false });

  app.get("/health", async () => ({ ok: true, hotels: [...deps.hotels.keys()] }));

  const serveFile = (route: string, file: string, type: string, cache: string) => {
    app.get(route, async (_req, reply) => {
      const full = path.join(publicDir, file);
      if (!fs.existsSync(full)) return reply.code(404).send({ error: "not_built" });
      return reply
        .header("Content-Type", type)
        .header("Cache-Control", cache)
        .header("Access-Control-Allow-Origin", "*")
        .send(fs.readFileSync(full));
    });
  };
  serveFile("/widget.js", "widget.js", "application/javascript; charset=utf-8", "public, max-age=300");
  serveFile("/demo", "demo.html", "text/html; charset=utf-8", "no-store");

  registerWebChannel(app, deps);
  return app;
}
