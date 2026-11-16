/**
 * WebScout köprüsü — YALNIZCA SUNUCU.
 *
 * Müşteri adayı (prospect) verisi tools/webscout/data/ altındaki SQLite dosyasında durur.
 * Araç kodu deploy paketiyle sunucuya gider; sunucudaki veri dosyası paketle EZİLMEZ
 * (yalnızca ilk kurulumda tohumlanır). Bu modül aracı ayrı bir Node süreci olarak çağırır;
 * böylece node:sqlite Next paketine karışmaz ve aracın bulunmadığı ortamda rota hata
 * vermek yerine "kurulu değil" bilgisini döner.
 */
import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const TOOL_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), 'tools', 'webscout');
const CLI = path.join(TOOL_DIR, 'src', 'cli.js');
const [NODE_MAJOR, NODE_MINOR] = process.versions.node.split('.').map(Number);
const atLeast = (major: number, minor: number) => NODE_MAJOR > major || (NODE_MAJOR === major && NODE_MINOR >= minor);
// --use-system-ca: kurumsal/TLS denetimli ağlarda sistem sertifikalarını kullan (yalnızca Node >= 22.15 tanır)
const NODE_FLAGS = [...(atLeast(22, 15) ? ['--use-system-ca'] : []), '--no-warnings'];

export function webscoutAvailability(): { available: boolean; reason?: string } {
  if (!fs.existsSync(CLI)) {
    return { available: false, reason: 'WebScout bu sunucuda kurulu değil (tools/webscout klasörü yok). Güncel deploy paketini uygulayın.' };
  }
  // node:sqlite bayraksız olarak 22.13'ten itibaren var
  if (!atLeast(22, 13)) {
    return { available: false, reason: `WebScout için Node 22.13 veya üzeri gerekir (şu an ${process.versions.node}).` };
  }
  return { available: true };
}

/** Aracı çalıştırır ve JSON çıktısını döner. Argümanlar kabuktan geçmez (enjeksiyon yok). */
export function runWebscout<T = Record<string, unknown>>(args: string[], timeoutMs = 90_000): Promise<T> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [...NODE_FLAGS, CLI, ...args],
      { cwd: TOOL_DIR, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true },
      (err, stdout) => {
        try {
          const parsed = JSON.parse(stdout);
          if (parsed && parsed.ok === false) return reject(new Error(parsed.error || 'WebScout hatası'));
          resolve(parsed as T);
        } catch {
          reject(new Error(err ? `WebScout çalıştırılamadı: ${err.message}` : 'WebScout geçersiz çıktı verdi'));
        }
      }
    );
  });
}

/** Seviye 2'nin kaydettiği mobil ekran görüntüsü (Google PageSpeed); yoksa null. */
export function readWebscoutShot(businessId: number): { data: Buffer; type: string } | null {
  const dir = path.join(TOOL_DIR, 'data', 'shots');
  for (const [ext, type] of [['jpg', 'image/jpeg'], ['webp', 'image/webp'], ['png', 'image/png']] as const) {
    const file = path.join(dir, `${businessId}.${ext}`);
    if (fs.existsSync(file)) return { data: fs.readFileSync(file), type };
  }
  return null;
}

const DRAFT_TOKEN_RE = /^[A-Za-z0-9_-]{16}$/;
const DRAFT_ASSET_RE = /^(?:logo|foto[1-9])\.(jpg|png|gif|webp)$/;
const ASSET_TYPE: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };

export type DraftFile =
  | { state: 'ok'; data: Buffer; type: string }
  | { state: 'missing' }
  | { state: 'expired' };

/**
 * Seviye 3 şablon taslağının dosyasını okur (tools/webscout/data/drafts/<token>/).
 * `file` verilmezse sayfanın kendisi (index.html). Belirteç ve dosya adı kalıba uymuyorsa
 * diske hiç gidilmez (yol kaçışı yok); süresi dolmuş taslak sunulmaz.
 */
export function readWebscoutDraft(token: string, file?: string): DraftFile {
  if (!DRAFT_TOKEN_RE.test(token)) return { state: 'missing' };
  const asset = file === undefined ? null : DRAFT_ASSET_RE.exec(file);
  if (file !== undefined && !asset) return { state: 'missing' };
  const dir = path.join(TOOL_DIR, 'data', 'drafts', token);
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')) as { expiresAt?: string };
    if (!meta.expiresAt || new Date(meta.expiresAt).getTime() < Date.now()) return { state: 'expired' };
    const data = fs.readFileSync(path.join(dir, asset ? file! : 'index.html'));
    return { state: 'ok', data, type: asset ? ASSET_TYPE[asset[1]] : 'text/html; charset=utf-8' };
  } catch {
    return { state: 'missing' };
  }
}

/**
 * Uzun süren işi arka planda başlatır; ilerleme `job-status` ile okunur.
 * `job` = çekim + tarama (+ isteğe bağlı derin profil), `job-enrich` = yalnızca derin profil (Seviye 2),
 * `job-draft` = şablon taslağı (Seviye 3).
 */
export function startWebscoutJob(args: string[], command: 'job' | 'job-enrich' | 'job-draft' = 'job'): void {
  const child = spawn(process.execPath, [...NODE_FLAGS, CLI, command, ...args], {
    cwd: TOOL_DIR,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}
