// Firmanın bugünkü sitesinin mobil ekran görüntüsü ("Vorher") — yerel Chrome/Edge ile, ücretsiz ve anahtarsız.
// Tarayıcı bulunamazsa, süre aşılırsa ya da site bot doğrulaması / engel sayfası gösterirse null döner;
// taslak görüntüsüz üretilir. Doğrulama sayfaları ASLA aşılmaya çalışılmaz, yalnızca tanınıp atlanır.
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

const run = (exe, args, timeoutMs) => new Promise((resolve) => {
  execFile(exe, args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 16 * 1024 * 1024 }, (err, stdout) => resolve({ err, stdout: String(stdout ?? '') }));
});

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
  // Ayrı, geçici profil: kullanıcının tarayıcısına ve çerezlerine dokunulmaz
  const profile = mkdtempSync(join(tmpdir(), 'webscout-shot-'));
  try {
    // 1) Önce sayfanın Chrome'a gösterdiği metin: engel sayfasıysa görüntü alınmaz
    const dom = await run(exe, [...baseArgs(profile, insecure), '--dump-dom', url], timeoutMs);
    const text = visibleText(dom.stdout);
    if (!text || text.length < 80 || (BLOCK_PAGE.test(text) && text.length < 2500)) return false;
    // 2) Görüntü (aynı profil: çerez onayı vb. ilk açılıştakiyle aynı)
    await run(exe, [...baseArgs(profile, insecure), '--force-device-scale-factor=2', `--screenshot=${outFile}`, url], timeoutMs);
    // Neredeyse boş görüntü (beyaz sayfa, yükleme ekranı) işe yaramaz
    const ok = existsSync(outFile) && statSync(outFile).size > 60_000;
    if (!ok) rmSync(outFile, { force: true });
    return ok;
  } finally {
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome dosyayı hâlâ tutuyorsa kalsın */ }
  }
}
