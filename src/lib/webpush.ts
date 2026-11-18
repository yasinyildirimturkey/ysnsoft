/**
 * Web Push (telefona/bilgisayara anlık bildirim) — ek paket olmadan, Node'un kendi şifrelemesiyle.
 * Standartlar: VAPID (RFC 8292, ES256 JWT) ve içerik şifreleme "aes128gcm" (RFC 8188 + RFC 8291).
 * KGLEX deseni: VAPID anahtarları ilk kullanımda üretilir ve sunucuda saklanır (data/push-vapid.json; ortam değişkeni
 * gerekmez); 404/410 dönen (iptal edilmiş) abonelikler kendiliğinden silinir.
 *
 * Bildirimler yalnızca panel kullanıcılarına (ekibe) gider; müşteri adaylarına bildirim gönderilmez.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA = path.join(/* turbopackIgnore: true */ process.cwd(), 'data');
const VAPID_FILE = path.join(DATA, 'push-vapid.json');
const SUBS_FILE = path.join(DATA, 'push-subs.json');
// Apple, "sub" alanında gerçek bir https adresi ya da mailto ister; aksi hâlde her bildirimi reddeder
const SUBJECT = process.env.PUSH_SUBJECT || 'mailto:info@ysnsoft.com';

const b64u = (b: Buffer) => b.toString('base64url');
const fromB64u = (s: string) => Buffer.from(s, 'base64url');

interface Vapid { publicKey: string; privateKey: string }
export interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  user: string;
  createdAt: string;
  label?: string;
  lastError?: string | null;
}

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 1));
  fs.renameSync(tmp, file);
}

/** VAPID anahtarı (yoksa üretir). publicKey: tarayıcının istediği ham 65 baytlık nokta (base64url). */
export function vapidKeys(): Vapid {
  try {
    const v = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8')) as Vapid;
    if (v.publicKey && v.privateKey) return v;
  } catch { /* ilk kullanım */ }
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const v = { publicKey: b64u(ecdh.getPublicKey()), privateKey: b64u(ecdh.getPrivateKey()) };
  // Aynı anda iki süreç üretirse ilk yazan kazanır (wx); kaybeden diskteki anahtarı kullanır
  try {
    fs.mkdirSync(DATA, { recursive: true });
    fs.writeFileSync(VAPID_FILE, JSON.stringify(v), { flag: 'wx' });
    return v;
  } catch {
    return JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8')) as Vapid;
  }
}

function vapidPrivateKey(v: Vapid) {
  const pub = fromB64u(v.publicKey); // 0x04 || X(32) || Y(32)
  return crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d: v.privateKey, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    format: 'jwk',
  });
}

/** VAPID yetki başlığı: "vapid t=<ES256 JWT>, k=<public key>". */
export function vapidAuth(endpoint: string, v: Vapid) {
  const aud = new URL(endpoint).origin;
  const header = b64u(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(Buffer.from(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT })));
  const sig = crypto.sign('sha256', Buffer.from(`${header}.${claims}`), { key: vapidPrivateKey(v), dsaEncoding: 'ieee-p1363' });
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${v.publicKey}`;
}

/**
 * RFC 8291 "aes128gcm" şifreleme. Dönen gövde: salt(16) | rs(4) | idlen(1)=65 | as_public(65) | şifreli metin + etiket.
 * Test için sabit salt/geçici anahtar verilebilir (yalnız testlerde).
 */
export function encryptPayload(payload: Buffer, uaPublicB64: string, authB64: string, test?: { salt: Buffer; asPrivate: Buffer }) {
  const uaPublic = fromB64u(uaPublicB64);
  const authSecret = fromB64u(authB64);
  const ecdh = crypto.createECDH('prime256v1');
  if (test) ecdh.setPrivateKey(test.asPrivate); else ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const ecdhSecret = ecdh.computeSecret(uaPublic);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', ecdhSecret, authSecret, keyInfo, 32));
  const salt = test?.salt ?? crypto.randomBytes(16);
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
}

// ── Abonelikler ──
export function listSubscriptions(): PushSubscriptionRecord[] {
  try { return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8')) as PushSubscriptionRecord[]; } catch { return []; }
}
function saveSubscriptions(list: PushSubscriptionRecord[]) { writeJson(SUBS_FILE, list); }

export function addSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, user: string, label?: string) {
  if (!/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error('Geçersiz abonelik');
  const list = listSubscriptions().filter((s) => s.endpoint !== sub.endpoint);
  list.push({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, user, label: label?.slice(0, 80), createdAt: new Date().toISOString(), lastError: null });
  saveSubscriptions(list.slice(-50));
}
export function removeSubscription(endpoint: string) {
  saveSubscriptions(listSubscriptions().filter((s) => s.endpoint !== endpoint));
}

export interface PushMessage { title: string; body: string; url?: string; tag?: string }

/** Tek aboneliğe gönderir. 404/410: abonelik iptal edilmiş → silinir. */
async function sendOne(sub: PushSubscriptionRecord, msg: PushMessage, v: Vapid): Promise<'ok' | 'gone' | 'error'> {
  try {
    const body = encryptPayload(Buffer.from(JSON.stringify(msg)), sub.keys.p256dh, sub.keys.auth);
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: { Authorization: vapidAuth(sub.endpoint, v), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404 || res.status === 410) return 'gone';
    return res.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

/** Bildirimi gönderir: `users` verilirse yalnız onların cihazlarına, yoksa tüm abonelere. */
export async function pushToUsers(msg: PushMessage, users?: string[]) {
  const v = vapidKeys();
  const all = listSubscriptions();
  const targets = users ? all.filter((s) => users.includes(s.user)) : all;
  const results = await Promise.all(targets.map(async (s) => ({ s, r: await sendOne(s, msg, v) })));
  const gone = new Set(results.filter((x) => x.r === 'gone').map((x) => x.s.endpoint));
  if (gone.size) saveSubscriptions(listSubscriptions().filter((s) => !gone.has(s.endpoint)));
  return { sent: results.filter((x) => x.r === 'ok').length, failed: results.filter((x) => x.r === 'error').length, removed: gone.size };
}
