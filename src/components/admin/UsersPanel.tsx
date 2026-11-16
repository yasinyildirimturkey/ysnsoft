'use client';

/**
 * Roller & Yetkiler — gerçek kullanıcı hesapları (sunucuda data/admin-users.json).
 *
 * Süper Admin kullanıcı ekler, rol/durum değiştirir, davet bağlantısı üretir.
 * Şifreyi kimse başkası adına belirlemez: yeni kişi tek kullanımlık davet bağlantısıyla
 * kendi şifresini koyar. Bağlantı yalnızca üretildiği anda bir kez gösterilir (72 saat geçerli).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, KeyRound, Link2, Plus, ShieldCheck, Trash2, UserX, UserCheck } from 'lucide-react';
import { ADMIN_MODULES, ADMIN_ROLES, MODULE_LABELS, ROLE_INFO, accessLevel, type AdminRole } from '@/lib/roles';

interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: 'active' | 'disabled';
  hasPassword: boolean;
  invitePending: boolean;
  inviteExpiresAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

interface UsersResponse {
  success: boolean;
  error?: string;
  me: { id: string; email: string; name: string; role: AdminRole };
  canManage: boolean;
  users: PublicUser[];
  audit: { at: string; actor: string; action: string; target?: string; role?: string; status?: string }[];
}

const AUDIT_LABELS: Record<string, string> = {
  seed: 'Hesaplar ilk kez oluşturuldu',
  login: 'Giriş yaptı',
  'password-change': 'Şifresini değiştirdi',
  'password-reset': 'Şifre konsoldan sıfırlandı',
  'user-create': 'Kullanıcı ekledi',
  invite: 'Davet bağlantısı üretti',
  'invite-accept': 'Davetle şifresini belirledi',
  'user-update': 'Kullanıcıyı güncelledi',
  'user-delete': 'Kullanıcıyı sildi',
};

const ROLE_BADGE: Record<AdminRole, string> = {
  superadmin: 'bg-blue-100 text-blue-700',
  admin: 'bg-indigo-100 text-indigo-700',
  marketing: 'bg-purple-100 text-purple-700',
  accounting: 'bg-emerald-100 text-emerald-700',
  hr: 'bg-pink-100 text-pink-700',
  engineer: 'bg-amber-100 text-amber-700',
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

async function post(body: Record<string, unknown>) {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(data?.error || 'İşlem başarısız.');
  return data;
}

export default function UsersPanel({ notify }: { notify: (message: string) => void }) {
  const router = useRouter();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'marketing' as AdminRole });
  const [showCreate, setShowCreate] = useState(false);
  const [invite, setInvite] = useState<{ email: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  const [showPw, setShowPw] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const json = (await res.json()) as UsersResponse;
      if (!json.success) throw new Error(json.error || 'Kullanıcılar alınamadı.');
      setData(json);
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Kullanıcılar alınamadı.');
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const run = async (body: Record<string, unknown>, okMessage: string) => {
    setBusy(true);
    try {
      const result = await post(body);
      notify(okMessage);
      await load();
      return result;
    } catch (err) {
      notify(`Hata: ${err instanceof Error ? err.message : 'İşlem başarısız.'}`);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const showInvite = (email: string, token: string) => {
    setCopied(false);
    setInvite({ email, url: `${window.location.origin}/admin/davet#t=${token}` });
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await run({ action: 'create', ...newUser }, 'Kullanıcı eklendi. Davet bağlantısını kişiye iletin.');
    if (result?.inviteToken) {
      showInvite(newUser.email.trim().toLowerCase(), result.inviteToken);
      setNewUser({ name: '', email: '', role: 'marketing' });
      setShowCreate(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.again) return notify('Hata: yeni şifreler eşleşmiyor.');
    const result = await run({ action: 'change-password', current: pw.current, next: pw.next }, 'Şifreniz değişti; yeni şifrenizle tekrar giriş yapın.');
    if (result?.relogin) router.replace('/admin/login');
  };

  if (loadError) {
    return <div className="apple-card bg-white border border-black/[0.07] p-6 text-sm text-red-700">{loadError}</div>;
  }
  if (!data) {
    return <div className="apple-card bg-white border border-black/[0.07] p-8 text-center text-xs text-[#6E6E73]">Yükleniyor…</div>;
  }

  const { me, canManage, users } = data;
  const inputClass = 'w-full px-3 py-2 text-xs bg-[#F5F5F7] rounded-lg border border-black/[0.08] focus:bg-white focus:border-[#0071E3]';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hesabım */}
      <div className="apple-card bg-white border border-black/[0.07] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#8B5CF6]" /> Hesabım
            </h3>
            <p className="text-xs text-[#6E6E73]">
              {me.name} · {me.email} ·{' '}
              <span className={`font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[me.role]}`}>{ROLE_INFO[me.role].label}</span>
            </p>
          </div>
          <button onClick={() => setShowPw(v => !v)} className="apple-pill-btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" /> Şifremi değiştir
          </button>
        </div>
        {showPw && (
          <form onSubmit={changePassword} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <input type="email" autoComplete="username" value={me.email} readOnly hidden />
            <input type="password" autoComplete="current-password" placeholder="Mevcut şifre" value={pw.current}
              onChange={e => setPw({ ...pw, current: e.target.value })} className={inputClass} />
            <input type="password" autoComplete="new-password" placeholder="Yeni şifre (en az 12)" value={pw.next}
              onChange={e => setPw({ ...pw, next: e.target.value })} className={inputClass} />
            <input type="password" autoComplete="new-password" placeholder="Yeni şifre (tekrar)" value={pw.again}
              onChange={e => setPw({ ...pw, again: e.target.value })} className={inputClass} />
            <button type="submit" disabled={busy || !pw.current || !pw.next} className="apple-pill-btn px-4 py-2 text-xs font-semibold disabled:opacity-50">
              Kaydet
            </button>
          </form>
        )}
      </div>

      {/* Davet bağlantısı (bir kez gösterilir) */}
      {invite && (
        <div className="apple-card bg-emerald-50 border border-emerald-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                <Link2 className="w-4 h-4" /> {invite.email} için davet bağlantısı
              </h4>
              <p className="text-xs text-emerald-800/80 mt-1">
                Bu bağlantı yalnızca şimdi gösterilir ve 72 saat geçerlidir. Kişiye WhatsApp veya e-postayla iletin;
                kendi şifresini bu bağlantıdan belirleyecek. Kaybolursa yeni bağlantı üretin.
              </p>
              <code className="block mt-3 p-2.5 rounded-lg bg-white border border-emerald-200 text-[11px] break-all select-all">{invite.url}</code>
            </div>
            <button onClick={() => setInvite(null)} className="text-xs text-emerald-800 font-semibold shrink-0">Kapat</button>
          </div>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(invite.url);
                setCopied(true);
              } catch {
                notify('Hata: kopyalanamadı, bağlantıyı elle seçin.');
              }
            }}
            className="mt-3 apple-pill-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Kopyalandı' : 'Bağlantıyı kopyala'}
          </button>
        </div>
      )}

      {/* Kullanıcılar */}
      <div className="apple-card bg-white border border-black/[0.07] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/[0.06] mb-4">
          <div>
            <h3 className="text-base font-bold text-[#1D1D1F]">Kullanıcılar ({users.length})</h3>
            <p className="text-xs text-[#6E6E73]">
              {canManage ? 'Rol değişikliği ve pasifleştirme, kişinin açık oturumunu hemen kapatır.' : 'Kullanıcıları yalnızca Süper Admin yönetir.'}
            </p>
          </div>
          {canManage && (
            <button onClick={() => setShowCreate(v => !v)} className="apple-pill-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Yeni kullanıcı
            </button>
          )}
        </div>

        {canManage && showCreate && (
          <form onSubmit={createUser} className="mb-5 p-4 rounded-xl bg-[#F5F5F7] grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <input placeholder="Ad Soyad" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className={inputClass} />
            <input type="email" placeholder="E-posta" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className={inputClass} />
            <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as AdminRole })} className={inputClass}>
              {ADMIN_ROLES.map(r => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
            </select>
            <button type="submit" disabled={busy || !newUser.name || !newUser.email} className="apple-pill-btn px-4 py-2 text-xs font-semibold disabled:opacity-50">
              Ekle ve davet üret
            </button>
            <p className="sm:col-span-4 text-[11px] text-[#6E6E73]">{ROLE_INFO[newUser.role].desc}</p>
          </form>
        )}

        {users.length === 0 ? (
          <p className="text-xs text-[#6E6E73]">Kullanıcı listesini görme yetkiniz yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#6E6E73] border-b border-black/[0.06]">
                  <th className="py-2 pr-3 font-semibold">Kişi</th>
                  <th className="py-2 pr-3 font-semibold">Rol</th>
                  <th className="py-2 pr-3 font-semibold">Hesap</th>
                  <th className="py-2 pr-3 font-semibold">Son giriş</th>
                  {canManage && <th className="py-2 font-semibold text-right">İşlem</th>}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isMe = u.id === me.id;
                  const account = u.status === 'disabled'
                    ? { text: 'Pasif', cls: 'text-[#8E8E93]' }
                    : u.hasPassword
                      ? { text: 'Aktif', cls: 'text-[#10B981]' }
                      : u.invitePending
                        ? { text: `Davet bekliyor (${fmt(u.inviteExpiresAt)})`, cls: 'text-amber-600' }
                        : { text: 'Şifre yok — davet üretin', cls: 'text-red-600' };
                  return (
                    <tr key={u.id} className="border-b border-black/[0.04] align-middle">
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-[#1D1D1F]">{u.name}{isMe && <span className="text-[#6E6E73] font-normal"> (siz)</span>}</div>
                        <div className="text-[#6E6E73]">{u.email}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        {canManage && !isMe ? (
                          <select value={u.role} disabled={busy}
                            onChange={e => run({ action: 'update', id: u.id, role: e.target.value }, `${u.name} rolü güncellendi.`)}
                            className="px-2 py-1 rounded-md bg-[#F5F5F7] border border-black/[0.08]">
                            {ADMIN_ROLES.map(r => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
                          </select>
                        ) : (
                          <span className={`font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role]}`}>{ROLE_INFO[u.role].label}</span>
                        )}
                      </td>
                      <td className={`py-2.5 pr-3 font-semibold ${account.cls}`}>{account.text}</td>
                      <td className="py-2.5 pr-3 text-[#6E6E73]">{fmt(u.lastLoginAt)}</td>
                      {canManage && (
                        <td className="py-2.5 text-right whitespace-nowrap">
                          {!isMe && (
                            <div className="inline-flex gap-1">
                              {u.status === 'active' && (
                                <button title={u.hasPassword ? 'Şifre sıfırlama bağlantısı üret' : 'Davet bağlantısı üret'} disabled={busy}
                                  onClick={async () => {
                                    const r = await run({ action: 'invite', id: u.id }, 'Yeni bağlantı üretildi.');
                                    if (r?.inviteToken) showInvite(u.email, r.inviteToken);
                                  }}
                                  className="p-1.5 rounded-md hover:bg-black/[0.05] text-[#0071E3]"><Link2 className="w-3.5 h-3.5" /></button>
                              )}
                              <button title={u.status === 'active' ? 'Pasifleştir' : 'Etkinleştir'} disabled={busy}
                                onClick={() => run({ action: 'update', id: u.id, status: u.status === 'active' ? 'disabled' : 'active' },
                                  u.status === 'active' ? `${u.name} pasifleştirildi.` : `${u.name} etkinleştirildi.`)}
                                className="p-1.5 rounded-md hover:bg-black/[0.05] text-[#6E6E73]">
                                {u.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                              <button title="Sil" disabled={busy}
                                onClick={() => {
                                  if (window.confirm(`${u.name} (${u.email}) kalıcı olarak silinsin mi? Bu geri alınamaz.`)) {
                                    run({ action: 'delete', id: u.id }, `${u.name} silindi.`);
                                  }
                                }}
                                className="p-1.5 rounded-md hover:bg-red-50 text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Yetki matrisi */}
      <div className="apple-card bg-white border border-black/[0.07] p-5 sm:p-6">
        <h3 className="text-base font-bold text-[#1D1D1F] mb-1">Yetki Matrisi</h3>
        <p className="text-xs text-[#6E6E73] mb-4">Y = görüntüle ve düzenle · G = yalnızca görüntüle · — = erişim yok. Kontrol sunucuda yapılır.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[#6E6E73] border-b border-black/[0.06]">
                <th className="py-2 pr-3 text-left font-semibold">Ekran</th>
                {ADMIN_ROLES.map(r => <th key={r} className="py-2 px-2 font-semibold text-center whitespace-nowrap">{ROLE_INFO[r].label}</th>)}
              </tr>
            </thead>
            <tbody>
              {ADMIN_MODULES.map(m => (
                <tr key={m} className="border-b border-black/[0.04]">
                  <td className="py-1.5 pr-3 font-medium text-[#1D1D1F] whitespace-nowrap">{MODULE_LABELS[m]}</td>
                  {ADMIN_ROLES.map(r => {
                    const lv = accessLevel(r, m);
                    return (
                      <td key={r} className={`py-1.5 px-2 text-center font-bold ${lv === 'write' ? 'text-[#10B981]' : lv === 'read' ? 'text-amber-600' : 'text-[#C7C7CC]'}`}>
                        {lv === 'write' ? 'Y' : lv === 'read' ? 'G' : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Denetim kaydı */}
      {canManage && data.audit.length > 0 && (
        <div className="apple-card bg-white border border-black/[0.07] p-5 sm:p-6">
          <h3 className="text-base font-bold text-[#1D1D1F] mb-3">İşlem Kaydı (son 100)</h3>
          <ul className="space-y-1.5 text-xs max-h-80 overflow-y-auto">
            {data.audit.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-[#6E6E73] shrink-0 w-28">{fmt(a.at)}</span>
                <span>
                  <b>{a.actor}</b> — {AUDIT_LABELS[a.action] ?? a.action}
                  {a.target ? `: ${a.target}` : ''}
                  {a.role ? ` → ${ROLE_INFO[a.role as AdminRole]?.label ?? a.role}` : ''}
                  {a.status ? ` → ${a.status === 'active' ? 'aktif' : 'pasif'}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
