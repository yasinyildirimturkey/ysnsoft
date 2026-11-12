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
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const envPath = path.resolve(process.cwd(), process.argv[2] || '.env.local');

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
