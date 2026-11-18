'use client';

/**
 * Bildirim merkezi (zil) ve bu cihazda anlık bildirim aç/kapat. KGLEX deseni: bildirimler sunucuda tutulur, okunmamış sayısı
 * zilde görünür; telefona/bilgisayara web push ile de gelir (müşteri demoyu açınca, sabah özeti…).
 * iPhone'da anlık bildirim yalnızca sayfa "Ana ekrana ekle" ile uygulama olarak kurulduysa çalışır (Apple kısıtı).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, BellRing, X } from 'lucide-react';

interface Item { id: string; at: string; kind: string; title: string; body: string; url?: string; count?: number }
interface State { items: Item[]; unread: number; seenAt: string; publicKey: string; devices: number }

const keyBytes = (b64u: string) => {
  const s = atob(b64u.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64u.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m} dk önce`;
  if (m < 24 * 60) return `${Math.round(m / 60)} sa önce`;
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
};

/** Bu cihazdaki abonelik durumu ve aç/kapat. */
export function usePush(publicKey: string | null) {
  const [status, setStatus] = useState<'unsupported' | 'off' | 'on' | 'denied' | 'busy'>('off');
  const [msg, setMsg] = useState('');

  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!supported) { setStatus('unsupported'); return; }
      if (Notification.permission === 'denied') { setStatus('denied'); return; }
      const reg = await navigator.serviceWorker.getRegistration('/admin/');
      const sub = reg?.scope.endsWith('/admin/') ? await reg.pushManager.getSubscription() : null;
      setStatus(sub ? 'on' : 'off');
    }, 0);
    return () => clearTimeout(t);
  }, [supported]);

  const enable = async () => {
    if (!publicKey) return;
    setStatus('busy'); setMsg('');
    try {
      const reg = await navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin/' });
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus(perm === 'denied' ? 'denied' : 'off'); setMsg('Bildirim izni verilmedi.'); return; }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const res = await fetch('/api/admin/notifications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe', subscription: sub.toJSON(), label: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'Telefon' : 'Bilgisayar' }),
      });
      if (!res.ok) throw new Error('Sunucu aboneliği kaydedemedi.');
      setStatus('on'); setMsg('Bu cihazda bildirimler açık.');
    } catch (e) {
      setStatus('off');
      setMsg(e instanceof Error ? e.message : 'Açılamadı.');
    }
  };

  const disable = async () => {
    setStatus('busy');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/admin/');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/admin/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unsubscribe', endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setStatus('off'); setMsg('Bu cihazda bildirimler kapalı.');
    } catch { setStatus('on'); }
  };

  return { status, msg, enable, disable };
}

export default function NotificationBell() {
  const [data, setData] = useState<State | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const push = usePush(data?.publicKey ?? null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/notifications', { cache: 'no-store' });
      if (r.ok) setData(await r.json());
    } catch { /* ağ yok */ }
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    const iv = setInterval(load, 60_000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [load]);

  // Dışarı tıklayınca / Esc ile kapanır
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && data?.unread) {
      await fetch('/api/admin/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seen' }) }).catch(() => {});
      setData((d) => (d ? { ...d, unread: 0 } : d));
    }
  };

  const test = async () => {
    await fetch('/api/admin/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test' }) }).catch(() => {});
    void load();
  };

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={toggle} aria-label={`Bildirimler${data?.unread ? ` (${data.unread} yeni)` : ''}`} aria-expanded={open}
        className="relative p-2 rounded-full bg-white border border-black/[0.08] hover:bg-black/[0.03]">
        <Bell className="w-4 h-4 text-[#1D1D1F]" aria-hidden="true" />
        {data?.unread ? <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold grid place-items-center tabular">{data.unread > 9 ? '9+' : data.unread}</span> : null}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(360px,calc(100vw-24px))] max-h-[70vh] overflow-y-auto bg-white rounded-2xl border border-black/[0.08] shadow-2xl z-50 text-xs">
          <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
            <strong className="text-sm">Bildirimler</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="Kapat" className="p-1 text-[#6E6E73]"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-4 py-3 border-b border-black/[0.06] space-y-2">
            {push.status === 'unsupported' ? (
              <p className="text-[#6E6E73]">Bu tarayıcı anlık bildirimi desteklemiyor. iPhone&apos;da önce Safari&apos;de “Ana ekrana ekle” ile uygulamayı kurun, oradan açın.</p>
            ) : push.status === 'denied' ? (
              <p className="text-amber-800">Bu cihazda bildirim izni kapalı. Tarayıcı ayarlarından ysnsoft.com için bildirime izin verin.</p>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[#1D1D1F]">
                  {push.status === 'on' ? <BellRing className="w-4 h-4 text-emerald-600" /> : <BellOff className="w-4 h-4 text-[#6E6E73]" />}
                  {push.status === 'on' ? 'Bu cihaza bildirim geliyor' : 'Bu cihaza bildirim gelmiyor'}
                </span>
                {push.status === 'on'
                  ? <button type="button" onClick={push.disable} className="font-semibold text-[#6E6E73] hover:text-red-600">Kapat</button>
                  : <button type="button" disabled={push.status === 'busy'} onClick={push.enable} className="px-3 py-1.5 rounded-full bg-[#0071E3] text-white font-semibold disabled:opacity-50">Aç</button>}
              </div>
            )}
            {push.msg && <p className="text-[#6E6E73]">{push.msg}</p>}
            {push.status === 'on' && <button type="button" onClick={test} className="text-[#0071E3] font-semibold">Deneme bildirimi gönder</button>}
          </div>
          {!data?.items.length ? (
            <p className="px-4 py-6 text-center text-[#6E6E73]">Henüz bildirim yok. Müşteri bir demoyu açınca burada ve telefonunuzda görünür.</p>
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {data.items.map((n) => {
                const fresh = n.at > (data.seenAt || '');
                const inner = (
                  <>
                    <span className="flex items-center justify-between gap-2">
                      <b className="text-[#1D1D1F]">{n.title}</b>
                      <span className="text-[10px] text-[#6E6E73] shrink-0">{ago(n.at)}</span>
                    </span>
                    <span className="block text-[#515154] mt-0.5">{n.body}{(n.count ?? 1) > 1 ? ` · ${n.count}×` : ''}</span>
                  </>
                );
                return (
                  <li key={n.id} className={fresh ? 'bg-blue-50/60' : ''}>
                    {n.url ? <Link href={n.url} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-black/[0.03]">{inner}</Link> : <div className="px-4 py-3">{inner}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
