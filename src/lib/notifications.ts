/**
 * Panel bildirimleri (zil) + telefona anlık bildirim. Ekip içidir: müşterilere gönderilmez.
 * Kayıt: data/notifications.json (son 200), kim neyi gördü: data/notif-seen.json (kullanıcı → son görülen an).
 * KGLEX'teki gibi tek kapı: her bildirim notify() üzerinden geçer; aynı konu kısa sürede tekrar gelirse birleştirilir.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadUsers } from '@/lib/admin-users';
import { can } from '@/lib/roles';
import { pushToUsers } from '@/lib/webpush';

const DATA = path.join(/* turbopackIgnore: true */ process.cwd(), 'data');
const FILE = path.join(DATA, 'notifications.json');
const SEEN = path.join(DATA, 'notif-seen.json');

export interface AppNotification { id: string; at: string; kind: string; title: string; body: string; url?: string; key?: string; count?: number }

function read<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return fallback; }
}
function write(file: string, value: unknown) {
  fs.mkdirSync(DATA, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value));
  fs.renameSync(tmp, file);
}

/** Aday modülünü kullanan aktif ekip üyeleri (bildirimlerin gideceği kişiler). */
export function teamEmails(): string[] {
  return loadUsers().filter((u) => u.status === 'active' && can(u.role, 'prospects', 'read')).map((u) => u.email);
}

/**
 * Bildirim oluşturur ve (push=true ise) ekibin cihazlarına gönderir.
 * `key`: aynı konudaki tekrar (ör. aynı demonun 1 saat içinde yeniden açılması) yeni satır açmaz, sayaç artar.
 */
export async function notify(n: { kind: string; title: string; body: string; url?: string; key?: string }, opts: { push?: boolean; mergeMinutes?: number } = {}) {
  const list = read<AppNotification[]>(FILE, []);
  const now = new Date();
  const recent = n.key ? list.find((x) => x.key === n.key && now.getTime() - Date.parse(x.at) < (opts.mergeMinutes ?? 60) * 60_000) : undefined;
  let item: AppNotification;
  if (recent) {
    recent.count = (recent.count ?? 1) + 1;
    recent.at = now.toISOString();
    recent.body = n.body;
    item = recent;
  } else {
    item = { id: crypto.randomBytes(6).toString('hex'), at: now.toISOString(), ...n, count: 1 };
    list.unshift(item);
  }
  list.sort((a, b) => b.at.localeCompare(a.at));
  write(FILE, list.slice(0, 200));
  if (opts.push !== false) {
    try {
      await pushToUsers({ title: item.title, body: (item.count ?? 1) > 1 ? `${item.body} (${item.count}. kez)` : item.body, url: item.url, tag: item.key ?? item.id }, teamEmails());
    } catch { /* bildirim panelde yine görünür */ }
  }
  return item;
}

export function listNotifications(user: string, limit = 30) {
  const list = read<AppNotification[]>(FILE, []).slice(0, limit);
  const seenAt = read<Record<string, string>>(SEEN, {})[user] ?? '';
  return { items: list, unread: list.filter((x) => x.at > seenAt).length, seenAt };
}

export function markSeen(user: string) {
  const seen = read<Record<string, string>>(SEEN, {});
  seen[user] = new Date().toISOString();
  write(SEEN, seen);
}
