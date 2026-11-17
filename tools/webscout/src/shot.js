// Firmanın bugünkü sitesinin mobil ekran görüntüsü ("Vorher") — yerel Chrome/Edge ile, ücretsiz ve anahtarsız.
// Tarayıcı bulunamazsa, süre aşılırsa ya da site bot doğrulaması / engel sayfası gösterirse null döner;
// taslak görüntüsüz üretilir. Doğrulama sayfaları ASLA aşılmaya çalışılmaz, yalnızca tanınıp atlanır.
import { execFile } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DATA_DIR } from './db.js';

const CANDIDATES = [
  process.env.WEBSCOUT_CHROME,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

export const chromePath = () => CANDIDATES.find((p) => existsSync(p)) ?? null;

// Telefon gibi görünmek için: sunucu mobil sürüm veriyorsa onu alırız
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

// Bot doğrulaması, Cloudflare bekleme sayfası, erişim engeli: müşteriye "sitenin bugünkü hali" diye gösterilemez
const BLOCK_PAGE = /confirm you are human|not a robot|i am human|verify you are human|checking your browser|just a moment\.\.\.|cf-challenge|challenge-platform|captcha|access denied|zugriff verweigert|403 forbidden|request blocked|ddos protection|bot protection|sicherheitsüberprüfung|bitte bestätigen sie, dass sie ein mensch sind/i;

function baseArgs(profile, insecure) {
  return [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-sync', '--disable-background-networking', '--disable-notifications',
    // http:// siteler: Chrome önce https dener, olmayınca ERR_BLOCKED_BY_CLIENT ile sayfayı hiç açmaz
    '--disable-features=HttpsUpgrades,HttpsFirstBalancedModeAutoEnable',
    `--user-data-dir=${profile}`, `--user-agent=${MOBILE_UA}`,
    '--window-size=390,844',
    // Çerez bannerları ve geç yüklenen görseller için biraz zaman tanı
    '--virtual-time-budget=9000',
    ...(insecure ? ['--ignore-certificate-errors'] : []),
  ];
}

// IIS uygulama havuzu kullanıcısının (loadUserProfile=false) kullanıcı profili yoktur: TEMP/LOCALAPPDATA ya yoktur
// ya da yazılamaz ve Chrome sessizce kapanır. Chrome'un tüm geçici/veri klasörleri uygulamanın kendi veri klasörüne
// (yazma izni olan tek yer) yönlendirilir.
const SHOT_HOME = join(DATA_DIR, 'chrome-home');
const childEnv = () => {
  mkdirSync(join(SHOT_HOME, 'Temp'), { recursive: true });
  mkdirSync(join(SHOT_HOME, 'AppData', 'Local'), { recursive: true });
  mkdirSync(join(SHOT_HOME, 'AppData', 'Roaming'), { recursive: true });
  return {
    ...process.env,
    TEMP: join(SHOT_HOME, 'Temp'), TMP: join(SHOT_HOME, 'Temp'),
    LOCALAPPDATA: join(SHOT_HOME, 'AppData', 'Local'), APPDATA: join(SHOT_HOME, 'AppData', 'Roaming'),
    USERPROFILE: SHOT_HOME, HOME: SHOT_HOME,
  };
};

const run = (exe, args, timeoutMs) => new Promise((resolve) => {
  execFile(exe, args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 16 * 1024 * 1024, env: childEnv() },
    (err, stdout, stderr) => resolve({ err, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') }));
});

/** Görüntü alınamadığında nedeni kısa bir kayda yazar (yalnızca alan adı; sayfa içeriği yazılmaz). */
function logFail(url, stage, r) {
  try {
    let host = '';
    try { host = new URL(url).host; } catch { /* adres bozuk */ }
    const line = `${new Date().toISOString()} ${host} ${stage} code=${r?.err?.code ?? '-'} signal=${r?.err?.signal ?? '-'} user=${process.env.USERNAME ?? '?'} ${String(r?.stderr ?? '').replace(/\s+/g, ' ').slice(-300)}\n`;
    appendFileSync(join(DATA_DIR, 'shot-errors.log'), line);
  } catch { /* kayıt da yazılamıyorsa sessiz geç */ }
}

/** Görünen metin (betik/stil hariç) — engel sayfası tanımak için */
const visibleText = (html) => html.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * @param {string} url
 * @param {string} outFile  .png
 * @param {{insecure?: boolean, timeoutMs?: number}} [opts]
 * @returns {Promise<boolean>}
 */
export async function captureMobileShot(url, outFile, { insecure = false, timeoutMs = 60_000 } = {}) {
  const exe = chromePath();
  if (!exe || !/^https?:\/\//i.test(url)) return false;
  // Ayrı, geçici profil: kullanıcının tarayıcısına ve çerezlerine dokunulmaz. Uygulamanın veri klasöründe açılır
  // (IIS kullanıcısında sistem geçici klasörü yazılamayabilir).
  let profile;
  try {
    mkdirSync(join(SHOT_HOME, 'profiles'), { recursive: true });
    profile = mkdtempSync(join(SHOT_HOME, 'profiles', 'shot-'));
  } catch {
    profile = mkdtempSync(join(tmpdir(), 'webscout-shot-'));
  }
  try {
    // 1) Önce sayfanın Chrome'a gösterdiği metin: engel sayfasıysa görüntü alınmaz
    const dom = await run(exe, [...baseArgs(profile, insecure), '--dump-dom', url], timeoutMs);
    const text = visibleText(dom.stdout);
    if (!text || text.length < 80) { logFail(url, 'dom-empty', dom); return false; }
    if (BLOCK_PAGE.test(text) && text.length < 2500) return false; // engel sayfası: beklenen durum, kayda gerek yok
    // 2) Görüntü (aynı profil: çerez onayı vb. ilk açılıştakiyle aynı)
    const shot = await run(exe, [...baseArgs(profile, insecure), '--force-device-scale-factor=2', `--screenshot=${outFile}`, url], timeoutMs);
    // Neredeyse boş görüntü (beyaz sayfa, yükleme ekranı) işe yaramaz
    const ok = existsSync(outFile) && statSync(outFile).size > 60_000;
    if (!ok) { rmSync(outFile, { force: true }); logFail(url, 'screenshot', shot); }
    return ok;
  } finally {
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome dosyayı hâlâ tutuyorsa kalsın */ }
  }
}
