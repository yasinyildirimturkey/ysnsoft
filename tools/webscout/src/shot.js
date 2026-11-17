// Firmanın bugünkü sitesinin mobil ekran görüntüsü ("Vorher") — yerel Chrome/Edge ile, ücretsiz ve anahtarsız.
// Tarayıcı bulunamazsa ya da süre aşılırsa null döner; taslak görüntüsüz üretilir.
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

/**
 * @param {string} url
 * @param {string} outFile  .png
 * @param {{insecure?: boolean, timeoutMs?: number}} [opts]
 * @returns {Promise<boolean>}
 */
export function captureMobileShot(url, outFile, { insecure = false, timeoutMs = 60_000 } = {}) {
  const exe = chromePath();
  if (!exe || !/^https?:\/\//i.test(url)) return Promise.resolve(false);
  // Ayrı, geçici profil: kullanıcının tarayıcısına ve çerezlerine dokunulmaz
  const profile = mkdtempSync(join(tmpdir(), 'webscout-shot-'));
  const args = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-sync', '--disable-background-networking', '--disable-notifications',
    // http:// siteler: Chrome önce https dener, olmayınca ERR_BLOCKED_BY_CLIENT ile sayfayı hiç açmaz
    '--disable-features=HttpsUpgrades,HttpsFirstBalancedModeAutoEnable',
    `--user-data-dir=${profile}`, `--user-agent=${MOBILE_UA}`,
    '--window-size=390,844', '--force-device-scale-factor=2',
    // Çerez bannerları ve geç yüklenen görseller için biraz zaman tanı
    '--virtual-time-budget=9000',
    ...(insecure ? ['--ignore-certificate-errors'] : []),
    `--screenshot=${outFile}`,
    url,
  ];
  return new Promise((resolve) => {
    execFile(exe, args, { timeout: timeoutMs, windowsHide: true }, () => {
      try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome dosyayı hâlâ tutuyorsa kalsın */ }
      try { resolve(existsSync(outFile) && statSync(outFile).size > 5_000); } catch { resolve(false); }
    });
  });
}
