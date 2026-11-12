'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Lock, Mail, ArrowRight, ArrowLeft, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Kimlik doğrulama sunucuda yapılır; başarılıysa sunucu httpOnly oturum çerezi yazar.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        router.replace('/admin');
        router.refresh();
        return;
      }
      setError(data?.error || 'Giriş yapılamadı. Lütfen tekrar deneyin.');
    } catch {
      setError('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    }
    setPassword('');
    setLoading(false);
  };

  const inputClass =
    'w-full pl-10 py-3 text-[15px] bg-[#F5F5F7] rounded-xl border border-black/[0.08] placeholder:text-[#8E8E93] transition-colors focus:bg-white focus:border-[#0071E3]';

  return (
    <div className="relative min-h-screen bg-[#F5F5F7] flex flex-col justify-center py-12 px-4 sm:px-6 text-[#1D1D1F] overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 hero-grid pointer-events-none" />

      <main className="relative w-full max-w-[420px] mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1D1D1F] text-white shadow-md mb-5">
            <Layers className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight text-[#1D1D1F]">Yönetim Konsolu</h1>
          <p className="mt-1.5 text-sm text-[#6E6E73]">YSNSOFT yetkili personel girişi</p>
        </div>

        <div className="bg-white p-6 sm:p-8 border border-black/[0.08] rounded-3xl shadow-[0_2px_4px_rgba(0,0,0,0.03),0_24px_56px_-12px_rgba(0,0,0,0.12)]">
          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700 font-medium animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="admin-email" className="text-[13px] font-medium text-[#1D1D1F] block mb-1.5">
                E-posta
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ad@ysnsoft.com"
                  aria-invalid={error ? true : undefined}
                  className={`${inputClass} pr-3.5`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="text-[13px] font-medium text-[#1D1D1F] block mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Şifreniz"
                  aria-invalid={error ? true : undefined}
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  aria-pressed={showPassword}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/[0.05] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full apple-pill-btn py-3.5 text-[15px] font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Giriş yapılıyor…</span>
                </>
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#515154] hover:text-[#1D1D1F] font-medium px-3 py-2 rounded-full hover:bg-black/[0.04] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Ana sayfaya dön
          </a>
        </div>
      </main>
    </div>
  );
}
