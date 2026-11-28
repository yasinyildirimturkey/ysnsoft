// IIS / iisnode giriş noktası. iisnode bu dosyayı require() ile yükler; asıl sunucu ESM olduğu
// için dinamik import ile başlatılır. Normal çalıştırmada (npm start) bu dosya kullanılmaz.
const path = require("node:path");
const fs = require("node:fs");

// Göreli yollar (hotels/, public/, data/) uygulama klasörüne göre çözülsün.
process.chdir(__dirname);

// iisnode altında `node --env-file` verilemez; .env burada yüklenir.
// IIS'in verdiği PORT (adlandırılmış kanal) dosyadaki değerin üzerine yazılmamalı.
const iisPort = process.env.PORT;
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
if (iisPort) process.env.PORT = iisPort;

import("./dist/server.js").catch((err) => {
  console.error("hotel-chat başlatılamadı:", err);
  process.exit(1);
});
