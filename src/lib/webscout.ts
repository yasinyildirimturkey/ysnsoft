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
// Varsayılan: Node'un kendi (Mozilla) kök sertifika listesi. --use-system-ca bu listenin YERİNE Windows deposunu
// kullanır; Windows Server'da eksik kökler yüzünden OSM, GLM gibi HTTPS istekleri "unable to get issuer certificate"
// ile düşüyordu (2026-11-16). TLS denetimli bir kurumsal ağda gerekirse WEBSCOUT_SYSTEM_CA=1 ile açılır.
const NODE_FLAGS = [...(process.env.WEBSCOUT_SYSTEM_CA === '1' && atLeast(22, 15) ? ['--use-system-ca'] : []), '--no-warnings'];

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
// vorher.png: firmanın bugünkü sitesinin mobil ekran görüntüsü (Vorher / Nachher bölümü)
const DRAFT_ASSET_RE = /^(?:logo|foto[1-9]|vorher)\.(jpg|png|gif|webp)$/;
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

// ── Demo açılma sayacı ───────────────────────────────────────
// Müşteri demoyu açınca panelde "2× açıldı · dün 21:40" görünür (sıcak aday sinyali).
// Yalnızca sayaç ve zaman tutulur: IP, tarayıcı, çerez SAKLANMAZ. Dosya taslak klasörünün dışındadır
// (yeniden üretim taslak klasörünü siler, sayaç kalır): tools/webscout/data/views/<token>.json

const VIEWS_DIR = path.join(TOOL_DIR, 'data', 'views');

export interface DemoViews { count: number; first: string; last: string }

export function recordDemoView(token: string): void {
  if (!DRAFT_TOKEN_RE.test(token)) return;
  const file = path.join(VIEWS_DIR, `${token}.json`);
  const now = new Date().toISOString();
  let v: DemoViews = { count: 0, first: now, last: now };
  try { v = { ...v, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { /* ilk açılış */ }
  v.count += 1;
  v.last = now;
  try {
    fs.mkdirSync(VIEWS_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(v));
  } catch { /* sayaç yazılamazsa sayfa yine sunulur */ }
}

// ── Saha fotoğrafları ────────────────────────────────────────
// Ziyarette çekilen (izinli) fotoğraflar: tools/webscout/data/uploads/<işletme id>/.
// Taslak üretilirken önce bunlar kullanılır; ilk fotoğraf açılış (kapak) görseli olur.
// Deploy paketi data/ klasörünü taşımaz, sunucudaki yüklemeler korunur.

export const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
export const UPLOAD_MAX_FILES = 9;
const UPLOAD_NAME_RE = /^u\d{13}-[a-z0-9]{6}\.(jpg|png|webp)$/;

const uploadDir = (businessId: number) => path.join(TOOL_DIR, 'data', 'uploads', String(businessId));

/** Dosyanın gerçekten JPEG/PNG/WebP olup olmadığını ilk baytlarından anlar (uzantıya güvenilmez). */
function sniffImage(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.readUInt32BE(0) === 0x89504e47) return 'png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

/** Yüklenen fotoğraflar, yükleme sırasına göre (ilk = kapak). */
export function listWebscoutUploads(businessId: number): { name: string; size: number }[] {
  try {
    return fs
      .readdirSync(uploadDir(businessId))
      .filter((n) => UPLOAD_NAME_RE.test(n))
      .sort()
      .map((name) => ({ name, size: fs.statSync(path.join(uploadDir(businessId), name)).size }));
  } catch {
    return [];
  }
}

export function saveWebscoutUpload(businessId: number, buf: Buffer): string {
  if (buf.length > UPLOAD_MAX_BYTES) throw new Error(`Fotoğraf en fazla ${UPLOAD_MAX_BYTES / 1024 / 1024} MB olabilir.`);
  const ext = sniffImage(buf);
  if (!ext) throw new Error('Yalnızca JPG, PNG veya WebP fotoğraf yüklenebilir.');
  if (listWebscoutUploads(businessId).length >= UPLOAD_MAX_FILES) throw new Error(`En fazla ${UPLOAD_MAX_FILES} fotoğraf yüklenebilir.`);
  const dir = uploadDir(businessId);
  fs.mkdirSync(dir, { recursive: true });
  const name = `u${Date.now()}-${Math.random().toString(36).slice(2, 8).padEnd(6, '0')}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buf);
  return name;
}

export function readWebscoutUpload(businessId: number, name: string): { data: Buffer; type: string } | null {
  const m = UPLOAD_NAME_RE.exec(name);
  if (!m) return null;
  try {
    return { data: fs.readFileSync(path.join(uploadDir(businessId), name)), type: ASSET_TYPE[m[1]] };
  } catch {
    return null;
  }
}

export function deleteWebscoutUpload(businessId: number, name: string): boolean {
  if (!UPLOAD_NAME_RE.test(name)) return false;
  try {
    fs.unlinkSync(path.join(uploadDir(businessId), name));
    return true;
  } catch {
    return false;
  }
}

/** Kapak fotoğrafını değiştirmek için: seçilen dosyayı listenin başına alır (adındaki zaman damgası yenilenir). */
export function makeWebscoutUploadCover(businessId: number, name: string): boolean {
  if (!UPLOAD_NAME_RE.test(name)) return false;
  const dir = uploadDir(businessId);
  const first = listWebscoutUploads(businessId)[0];
  if (!first || first.name === name) return Boolean(first);
  const stamp = Number(first.name.slice(1, 14)) - 1;
  const next = `u${stamp}-${name.slice(15)}`;
  try {
    fs.renameSync(path.join(dir, name), path.join(dir, next));
    return true;
  } catch {
    return false;
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
