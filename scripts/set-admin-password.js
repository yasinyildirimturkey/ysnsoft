#!/usr/bin/env node
/**
 * Yönetici şifresini belirler.
 *
 *   node scripts/set-admin-password.js
 *
 * Şifreyi sorar (ekrana yazmaz), scrypt özetini ve — yoksa — rastgele bir
 * oturum anahtarını .env.local dosyasına yazar. Düz şifre hiçbir yere kaydedilmez.
 * Değişikliğin geçerli olması için sunucuyu yeniden başlatın.
 *
 * Farklı bir dosyaya yazmak için:  node scripts/set-admin-password.js .env.production
 *
 * Kişiye özel hesap şifresi (kurtarma; ör. Süper Admin şifresini unuttuysa):
 *   node scripts/set-admin-password.js --user yasin@ysnsoft.com
 * data/admin-users.json içindeki hesabın şifresini değiştirir, açık oturumlarını kapatır.
 * Yeniden başlatma gerekmez.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const userFlag = process.argv.indexOf('--user');
const targetUser = userFlag > -1 ? String(process.argv[userFlag + 1] || '').trim().toLowerCase() : '';
const envArg = process.argv.slice(2).find((a, i, arr) => !a.startsWith('--') && arr[i - 1] !== '--user');
const envPath = path.resolve(process.cwd(), envArg || '.env.local');
const usersPath = path.resolve(process.cwd(), 'data', 'admin-users.json');

function readHidden(prompt) {
  return new Promise((resolve) => {
    // Boru ile verilen girdi (otomasyon): ilk satırı oku
    if (!process.stdin.isTTY) {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => (data += chunk));
      process.stdin.on('end', () => resolve(data.split(/\r?\n/)[0]));
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl._writeToOutput = (text) => {
      // İstem metnini göster, yazılan karakterleri gizle
      if (text.includes(prompt)) process.stdout.write(prompt);
    };
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

function upsert(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return content.replace(/\s*$/, '') + (content.trim() ? '\n' : '') + line + '\n';
}

(async () => {
  const password = await readHidden('Yeni yönetici şifresi: ');
  if (!password || password.length < 12) {
    console.error('Şifre en az 12 karakter olmalıdır. Değişiklik yapılmadı.');
    process.exit(1);
  }
  if (process.stdin.isTTY) {
    const again = await readHidden('Şifre (tekrar): ');
    if (again !== password) {
      console.error('Şifreler eşleşmiyor. Değişiklik yapılmadı.');
      process.exit(1);
    }
  }

  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);

  if (targetUser) {
    if (!fs.existsSync(usersPath)) {
      console.error(`Hesap dosyası yok: ${usersPath}. Panel bir kez açılınca oluşur.`);
      process.exit(1);
    }
    const store = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    const user = (store.users || []).find((u) => u.email === targetUser);
    if (!user) {
      console.error(`Hesap bulunamadı: ${targetUser}`);
      process.exit(1);
    }
    user.passwordHash = `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
    user.invite = null;
    user.status = 'active';
    user.sv = (user.sv || 0) + 1;
    user.updatedAt = new Date().toISOString();
    const tmp = `${usersPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
    fs.renameSync(tmp, usersPath);
    fs.appendFileSync(path.join(path.dirname(usersPath), 'admin-audit.log'),
      JSON.stringify({ at: new Date().toISOString(), actor: 'console', action: 'password-reset', target: targetUser }) + '\n');
    console.log(`Şifre güncellendi: ${targetUser} (açık oturumları kapatıldı)`);
    return;
  }

  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (!/^ADMIN_SESSION_SECRET=.{32,}$/m.test(content)) {
    if (!/^# Yönetici girişi/m.test(content)) {
      content = content.replace(/\s*$/, '') + (content.trim() ? '\n\n' : '') + '# Yönetici girişi (scripts/set-admin-password.js)\n';
    }
    content = upsert(content, 'ADMIN_SESSION_SECRET', crypto.randomBytes(48).toString('base64url'));
  }
  content = upsert(content, 'ADMIN_PASSWORD_HASH', `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`);

  fs.writeFileSync(envPath, content);
  console.log(`Yönetici şifresi güncellendi: ${envPath}`);
  console.log('Geçerli olması için sunucuyu yeniden başlatın.');
})();
