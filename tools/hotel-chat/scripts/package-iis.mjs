// IIS/iisnode sunucusu için dağıtım klasörü hazırlar: derlenmiş kod + yalnızca çalışma
// zamanı bağımlılıkları. Sunucuda npm çalıştırmak gerekmez.
//
//   npm run package:iis          → _deploy/hotel-chat/ ve _deploy/hotel-chat.zip
//
// .env ve data/ pakete GİRMEZ; sunucudaki ayarlar ve kayıtlar korunur.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "_deploy", "hotel-chat");
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: "inherit" });

fs.rmSync(path.join(root, "_deploy"), { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

run("npm run build");
for (const dir of ["dist", "public", "hotels"]) fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
for (const file of ["package.json", "package-lock.json", "iis-start.cjs", "web.config", ".env.example"]) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}
// Geliştirme araçları (tsx, esbuild, vitest) sunucuya gitmez.
run("npm ci --omit=dev --ignore-scripts --no-audit --no-fund", out);

const zip = path.join(root, "_deploy", "hotel-chat.zip");
// Windows'un kendi tar'ı (bsdtar) uzantıya göre zip üretir; PATH'teki GNU tar bunu yapamaz.
const tar = process.platform === "win32" ? `"${path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe")}"` : "tar";
run(`${tar} -a -c -f "${zip}" -C "${out}" .`);
console.log(`\nHazır: ${zip} (${(fs.statSync(zip).size / 1024 / 1024).toFixed(1)} MB)`);
