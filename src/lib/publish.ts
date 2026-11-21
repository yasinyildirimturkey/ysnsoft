/**
 * Tek tıkla yayın: müşteri sitesi Almanya'daki (Hetzner) sunucuya SSH ile gönderilir. Sunucuda deploy anahtarı yalnız
 * tools/hosting/ysn-site-gate komutlarını çalıştırabilir (publish/unpublish/list/ping). HTTPS'i Caddy otomatik alır.
 * Ayar (ortam değişkenleri): PUBLISH_HOST, PUBLISH_USER (deploy), PUBLISH_KEY (özel anahtar yolu), PUBLISH_IP (DNS'in göstermesi gereken IP),
 * isteğe bağlı PUBLISH_SSH (ssh.exe yolu), PUBLISH_TAR (tar.exe yolu).
 * Kayıtlar: data/published-sites.json, müşterinin yasal bilgileri: data/site-legal.json (deploy paketi ikisini de ezmez).
 */
import { spawn } from 'node:child_process';
import dns from 'node:dns/promises';
import fs from 'node:fs';
import path from 'node:path';

const DATA = path.join(/* turbopackIgnore: true */ process.cwd(), 'data');
const SITES_FILE = path.join(DATA, 'published-sites.json');
const LEGAL_FILE = path.join(DATA, 'site-legal.json');
export const DOMAIN_RE = /^(?=.{4,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function publishConfig() {
  const host = process.env.PUBLISH_HOST || '';
  const key = process.env.PUBLISH_KEY || '';
  return {
    configured: Boolean(host && key && fs.existsSync(/* turbopackIgnore: true */ key)),
    host, key, user: process.env.PUBLISH_USER || 'deploy', ip: process.env.PUBLISH_IP || host,
    ssh: process.env.PUBLISH_SSH || 'ssh', tar: process.env.PUBLISH_TAR || 'tar',
  };
}

/** "https://www.Example.de/" → "example.de" */
export function normalizeDomain(input: string): string | null {
  const d = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  return DOMAIN_RE.test(d) ? d : null;
}

export async function checkDns(domain: string) {
  const ip = publishConfig().ip;
  const look = async (h: string) => { try { return await dns.resolve4(h); } catch { return []; } };
  const [apex, www] = await Promise.all([look(domain), look(`www.${domain}`)]);
  return { ip, apex, www, apexOk: apex.length > 0 && apex.every((a) => a === ip), wwwOk: www.length > 0 && www.every((a) => a === ip) };
}

function sshArgs(cmd: string) {
  const c = publishConfig();
  return [
    '-i', c.key, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', '-o', 'StrictHostKeyChecking=accept-new',
    '-o', `UserKnownHostsFile=${path.join(DATA, 'publish-known_hosts')}`, `${c.user}@${c.host}`, cmd,
  ];
}

/** Kapı komutu çalıştırır; dir verilirse klasör tar olarak stdin'e akıtılır. */
export function gate(cmd: string, dir?: string, timeoutMs = 120_000): Promise<{ ok: boolean; out: string }> {
  const c = publishConfig();
  return new Promise((resolve) => {
    const ssh = spawn(/* turbopackIgnore: true */ c.ssh, sshArgs(cmd), { windowsHide: true });
    let out = '';
    ssh.stdout.on('data', (b) => { out += b; });
    ssh.stderr.on('data', (b) => { out += b; });
    const timer = setTimeout(() => { ssh.kill(); out += '\nzaman aşımı'; }, timeoutMs);
    ssh.on('error', (e) => { clearTimeout(timer); resolve({ ok: false, out: `ssh çalışmadı: ${e.message}` }); });
    ssh.on('close', (code) => { clearTimeout(timer); resolve({ ok: code === 0, out: out.trim().slice(-2000) }); });
    if (dir) {
      const tar = spawn(/* turbopackIgnore: true */ c.tar, ['-c', '-f', '-', '-C', /* turbopackIgnore: true */ dir, '.'], { windowsHide: true });
      tar.on('error', (e) => { out += `\ntar çalışmadı: ${e.message}`; ssh.stdin.end(); });
      tar.stdout.pipe(ssh.stdin);
    } else {
      ssh.stdin.end();
    }
  });
}

// ── Kayıtlar ──

export interface Published { prospectId: number; domain: string; at: string; by: string }
const readJson = <T,>(f: string, d: T): T => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) as T; } catch { return d; } };
const writeJson = (f: string, v: unknown) => {
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(`${f}.tmp`, JSON.stringify(v, null, 1));
  fs.renameSync(`${f}.tmp`, f);
};

export const publishedOf = (id: number) => readJson<Published[]>(SITES_FILE, []).find((p) => p.prospectId === id) ?? null;
export function savePublished(p: Published) {
  const list = readJson<Published[]>(SITES_FILE, []).filter((x) => x.prospectId !== p.prospectId && x.domain !== p.domain);
  writeJson(SITES_FILE, [...list, p]);
}
export function removePublished(id: number) {
  writeJson(SITES_FILE, readJson<Published[]>(SITES_FILE, []).filter((x) => x.prospectId !== id));
}

export type Legal = { owner: string; email: string; phone: string; register: string; vat: string; extra: string; datenschutz: string };
export const legalOf = (id: number): Legal | null => readJson<Record<string, Legal>>(LEGAL_FILE, {})[String(id)] ?? null;
export function saveLegal(id: number, l: Legal) {
  const all = readJson<Record<string, Legal>>(LEGAL_FILE, {});
  all[String(id)] = l;
  writeJson(LEGAL_FILE, all);
}
export function cleanLegal(x: Record<string, unknown> | undefined): Legal {
  const s = (k: string, n: number) => String(x?.[k] ?? '').replace(/\r/g, '').trim().slice(0, n);
  return { owner: s('owner', 160), email: s('email', 160), phone: s('phone', 60), register: s('register', 300), vat: s('vat', 40), extra: s('extra', 2000), datenschutz: s('datenschutz', 40000) };
}
