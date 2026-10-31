'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Lock, Mail, ArrowRight, ShieldCheck, Check, UserCheck, DollarSign, Briefcase, Cpu, Sparkles } from 'lucide-react';
import { PRESET_ADMIN_USERS } from '@/lib/store';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('yasin@ysnsoft.com');
  const [password, setPassword] = useState('Deniz2026?!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      // Find matching preset user or validate password
      const user = PRESET_ADMIN_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      
      if (user && (password === user.password || password === 'Deniz2026?!')) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('ysn_admin_auth', 'true');
          sessionStorage.setItem('ysn_admin_role', user.role);
          sessionStorage.setItem('ysn_admin_email', user.email);
          sessionStorage.setItem('ysn_admin_name', user.name);
        }
        router.push('/admin');
      } else if (password === 'Deniz2026?!') {
        // Fallback for custom emails with correct password
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('ysn_admin_auth', 'true');
          sessionStorage.setItem('ysn_admin_role', 'superadmin');
          sessionStorage.setItem('ysn_admin_email', email);
          sessionStorage.setItem('ysn_admin_name', 'Yasin Yıldırım');
        }
        router.push('/admin');
      } else {
        setError('Geçersiz şifre veya e-posta adresi. (Varsayılan şifre: Deniz2026?!)');
        setLoading(false);
      }
    }, 300);
  };

  const handleQuickLogin = (user: typeof PRESET_ADMIN_USERS[0]) => {
    setEmail(user.email);
    setPassword(user.password);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ysn_admin_auth', 'true');
      sessionStorage.setItem('ysn_admin_role', user.role);
      sessionStorage.setItem('ysn_admin_email', user.email);
      sessionStorage.setItem('ysn_admin_name', user.name);
    }
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#1D1D1F]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1D1D1F] text-white shadow-md mb-4">
          <Layers className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
          YSNSOFT Yönetim Portalı
        </h2>
        <p className="mt-1 text-xs text-[#86868B]">
          Yetkili Personel & Kurucu Yönetici Konsolu
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="apple-card bg-white p-6 sm:p-8 border border-black/[0.08] shadow-lg rounded-3xl">
          
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                Yönetici E-Posta
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="yasin@ysnsoft.com"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[#F5F5F7] rounded-xl border border-black/[0.08] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
                <Mail className="w-4 h-4 text-[#86868B] absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                Şifre
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[#F5F5F7] rounded-xl border border-black/[0.08] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
                <Lock className="w-4 h-4 text-[#86868B] absolute left-3 top-3" />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full apple-pill-btn py-3 text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-[#0071E3]/25 disabled:opacity-70"
              >
                <span>{loading ? 'Giriş Yapılıyor...' : 'Yönetim Konsoluna Giriş'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick Selection Buttons with Prepared Accounts */}
          <div className="mt-6 pt-6 border-t border-black/[0.06]">
            <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-3 text-center">
              Tanımlı Yönetici Hesapları (Hızlı Giriş):
            </span>

            <div className="space-y-2">
              {PRESET_ADMIN_USERS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => handleQuickLogin(u)}
                  className="w-full p-2.5 rounded-xl bg-[#F5F5F7] hover:bg-blue-50 hover:border-blue-200 border border-black/[0.04] transition-all text-xs flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <span className="text-base">{u.avatar}</span>
                    <div>
                      <div className="font-bold text-[#1D1D1F] group-hover:text-blue-600 flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {u.role === 'superadmin' && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-700 font-bold rounded">
                            SUPER ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#86868B] font-mono">{u.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded-lg font-medium group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    Giriş Yap →
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 text-center">
            <a
              href="/"
              className="text-xs text-[#0071E3] hover:underline font-medium"
            >
              ← Ana Sayfaya Dön
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
