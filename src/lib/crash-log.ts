/**
 * Yakalanmamış hata ve reddedilen sözleri kaydeder (dış servis yok). Son çökme data/last-crash.json'a yazılır;
 * reddedilen sözler sayılır. iisnode süreci yeniden başlatır; kayıt sayesinde neden düştüğü panelden görülür.
 */
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'last-crash.json');
let installed = false;
let rejections = 0;

function write(kind: string, err: unknown) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const e = err instanceof Error ? err : new Error(String(err));
    fs.writeFileSync(FILE, JSON.stringify({ at: new Date().toISOString(), kind, message: e.message.slice(0, 500), stack: (e.stack ?? '').split('\n').slice(0, 8).join('\n'), rejections, pid: process.pid }, null, 1));
  } catch { /* yazılamazsa sessiz */ }
}

export function recordCrashes() {
  if (installed) return;
  installed = true;
  process.on('uncaughtExceptionMonitor', (err) => write('uncaughtException', err));
  process.on('unhandledRejection', (reason) => { rejections += 1; if (rejections <= 3 || rejections % 50 === 0) write('unhandledRejection', reason); });
}
