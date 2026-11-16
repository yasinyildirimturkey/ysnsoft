'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Lock, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

/**
 * Davet bağlantısı: /admin/davet#t=<belirteç>
 * Belirteç URL'nin # kısmında durur — sunucu günlüklerine ve Referer başlığına düşmez.
 */
export default function AdminInvitePage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [target, setTarget] = useState<{ email: string; name: string; minLength: number } | null>(null);
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [state, setState] = useState<'checking' | 'ready' | 'invalid' | 'saving' | 'done'>('checking');
  const [error, setError] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get('t') || '';
    fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t }),
    })
      .then(r => r.json())
      .then(data => {
        setToken(t);
        if (data?.success) {
          setTarget({ email: data.email, name: data.name, minLength: data.minLength });
          setState('ready');
        } else {
          setError(data?.error || 'Davet bağlantısı geçersiz.');
          setState('invalid');
        }
      })
      .catch(() => {
        setError('Sunucuya ulaşılamadı.');
        setState('invalid');
      });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (password.length < target.minLength) return setError(`Şifre en az ${target.minLength} karakter olmalıdır.`);
    if (password !== again) return setError('Şifreler eşleşmiyor.');
    setError('');
    setState('saving');
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        history.replaceState(null, '', '/admin/davet');
        setState('done');
        return;
      }
      setError(data?.error || 'Şifre kaydedilemedi.');
    } catch {
      setError('Sunucuya ulaşılamadı.');
    }
    setState('ready');
  };

  const inputClass =
    'w-full pl-10 pr-3.5 py-3 text-[15px] bg-[#F5F5F7] rounded-xl border border-black/[0.08] placeholder:text-[#8E8E93] focus:bg-white focus:border-[#0071E3]';

  return (
    <div className="relative min-h-screen bg-[#F5F5F7] flex flex-col justify-center py-12 px-4 text-[#1D1D1F]">
      <main className="relative w-full max-w-[420px] mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1D1D1F] text-white shadow-md mb-5">
            <Layers className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight">Hesabınızı Etkinleştirin</h1>
          <p className="mt-1.5 text-sm text-[#6E6E73]">YSNSOFT yönetim konsolu için şifrenizi belirleyin</p>
        </div>

        <div className="bg-white p-6 sm:p-8 border border-black/[0.08] rounded-3xl shadow-lg">
          {state === 'checking' && (
            <div className="flex items-center justify-center gap-2 text-sm text-[#6E6E73] py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Davet kontrol ediliyor…
            </div>
          )}

          {state === 'invalid' && (
            <div role="alert" className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error} Yöneticinizden yeni bir davet bağlantısı isteyin.</span>
            </div>
          )}

          {state === 'done' && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-10 h-10 text-[#10B981] mx-auto" />
              <p className="text-sm">Şifreniz kaydedildi. Artık giriş yapabilirsiniz.</p>
              <button onClick={() => router.replace('/admin/login')} className="w-full apple-pill-btn py-3 text-[15px] font-semibold">
                Giriş sayfasına git
              </button>
            </div>
          )}

          {(state === 'ready' || state === 'saving') && target && (
            <form onSubmit={submit} className="space-y-5" noValidate>
              <div className="p-3 rounded-xl bg-[#F5F5F7] text-[13px]">
                <div className="font-semibold">{target.name}</div>
                <div className="text-[#6E6E73]">{target.email}</div>
              </div>
              {error && (
                <div role="alert" className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {/* Parola yöneticileri için görünmez kullanıcı adı alanı */}
              <input type="email" autoComplete="username" value={target.email} readOnly hidden />
              <div>
                <label htmlFor="pw1" className="text-[13px] font-medium block mb-1.5">Yeni şifre</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input id="pw1" type="password" autoComplete="new-password" autoFocus value={password}
                    onChange={e => setPassword(e.target.value)} placeholder={`En az ${target.minLength} karakter`} className={inputClass} />
                </div>
              </div>
              <div>
                <label htmlFor="pw2" className="text-[13px] font-medium block mb-1.5">Şifre (tekrar)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input id="pw2" type="password" autoComplete="new-password" value={again}
                    onChange={e => setAgain(e.target.value)} className={inputClass} />
                </div>
              </div>
              <button type="submit" disabled={state === 'saving' || !password || !again}
                className="w-full apple-pill-btn py-3.5 text-[15px] font-semibold flex items-center justify-center gap-2">
                {state === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Şifremi kaydet</span>
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
