'use client';

/**
 * Saha fotoğrafları: ziyarette (işletmenin izniyle) çekilen fotoğraflar.
 * Taslak üretilirken önce bunlar kullanılır; ilk fotoğraf açılış (kapak) görseli olur.
 * Fotoğraflar yüklenmeden önce tarayıcıda küçültülür (uzun kenar ≤ 2000 px, JPEG): telefon
 * fotoğrafları 5-8 MB olabilir, demo sayfası mobilde hızlı açılmalı.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Star, Trash2 } from 'lucide-react';

interface Upload {
  name: string;
  size: number;
}

const MAX_EDGE = 2000;
const MAX_FILES = 9;

/**
 * Otomatik iyileştirme (telefon fotoğrafları çoğu zaman loş ya da gri çıkar): her kanalda en karanlık ve en
 * aydınlık %0,5'lik kısım atılıp ton aralığı gerilir (oto seviye), renk doygunluğu hafifçe artırılır.
 * Zaten iyi pozlanmış fotoğrafa dokunulmaz; aşırı düzeltme yapılmaz (en çok 1,6 kat germe).
 */
function enhance(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  const step = Math.max(1, Math.floor((w * h) / 250_000)) * 4; // büyük fotoğrafta örnekleme yeterli
  let n = 0;
  for (let i = 0; i < d.length; i += step) { hist[0][d[i]]++; hist[1][d[i + 1]]++; hist[2][d[i + 2]]++; n++; }
  const edge = (hst: Uint32Array, from: 'lo' | 'hi') => {
    const cut = n * 0.005;
    let acc = 0;
    if (from === 'lo') { for (let v = 0; v < 256; v++) { acc += hst[v]; if (acc > cut) return v; } return 0; }
    for (let v = 255; v >= 0; v--) { acc += hst[v]; if (acc > cut) return v; } return 255;
  };
  const lo = hist.map((x) => edge(x, 'lo'));
  const hi = hist.map((x) => edge(x, 'hi'));
  const gain = lo.map((l, c) => Math.min(1.6, 255 / Math.max(1, hi[c] - l)));
  if (gain.every((g) => g < 1.06)) return; // iyi pozlanmış: dokunma
  const lut = [0, 1, 2].map((c) => {
    const t = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) t[v] = (v - lo[c]) * gain[c];
    return t;
  });
  for (let i = 0; i < d.length; i += 4) {
    let r = lut[0][d[i]], g = lut[1][d[i + 1]], b = lut[2][d[i + 2]];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    r = y + (r - y) * 1.08; g = y + (g - y) * 1.08; b = y + (b - y) * 1.08; // hafif canlılık
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
}

async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    try { enhance(ctx, canvas.width, canvas.height); } catch { /* iyileştirme olmadan da yüklenir */ }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84));
    return blob ?? file;
  } catch {
    return file; // tarayıcı çözemediyse (ör. HEIC) sunucu biçimi denetler
  }
}

export default function ProspectPhotos({ id, onChange, onUploaded }: {
  id: number;
  onChange?: (count: number) => void;
  /** Bir yükleme grubu (ya da kapak değişikliği) bitince: demo kendiliğinden yeniden üretilsin diye */
  onUploaded?: () => void;
}) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const apply = useCallback(
    (list: Upload[]) => {
      setUploads(list);
      onChange?.(list.length);
    },
    [onChange],
  );

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/prospects?view=uploads&id=${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => alive && j?.success && apply(j.uploads ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, apply]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    let list = uploads;
    try {
      for (const file of Array.from(files).slice(0, Math.max(0, MAX_FILES - uploads.length))) {
        const form = new FormData();
        form.append('id', String(id));
        form.append('file', await shrink(file), file.name.replace(/\.[^.]+$/, '') + '.jpg');
        const res = await fetch('/api/admin/prospects', { method: 'POST', body: form });
        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.success) throw new Error(j?.error || `Yükleme başarısız (HTTP ${res.status})`);
        list = j.uploads;
        apply(list);
      }
      if (files.length > MAX_FILES - uploads.length) setError(`En fazla ${MAX_FILES} fotoğraf; fazlası yüklenmedi.`);
      if (list !== uploads) onUploaded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükleme başarısız.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const act = async (action: 'delete-upload' | 'cover-upload', name: string) => {
    if (action === 'delete-upload' && !window.confirm('Bu fotoğraf kalıcı olarak silinsin mi?')) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, name }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.success) throw new Error(j?.error || 'İşlem başarısız.');
      apply(j.uploads);
      onUploaded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-black/[0.06]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[12px] font-semibold text-[#1D1D1F]">Saha fotoğrafları ({uploads.length}/{MAX_FILES})</span>
          <span className="block text-[11px] text-[#6E6E73] leading-relaxed">
            Ziyarette işletmenin izniyle çekin. İlk fotoğraf kapak olur. Yüklerken ışık ve renk otomatik düzeltilir{onUploaded ? '; demo kendiliğinden yenilenir' : ''}.
          </span>
        </div>
        <label
          className={`apple-pill-btn-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${busy || uploads.length >= MAX_FILES ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Camera className="w-3.5 h-3.5" aria-hidden="true" />}
          <span>{busy ? 'İşleniyor…' : 'Fotoğraf ekle'}</span>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            disabled={busy || uploads.length >= MAX_FILES}
            onChange={(e) => upload(e.target.files)}
          />
        </label>
      </div>
      {error && <p role="alert" className="mt-2 text-[11px] text-red-600">{error}</p>}
      {uploads.length > 0 && (
        <ul className="mt-2.5 grid grid-cols-3 sm:grid-cols-5 gap-2">
          {uploads.map((u, i) => (
            <li key={u.name} className="relative group rounded-lg overflow-hidden border border-black/[0.08] aspect-square bg-[#F5F5F7]">
              {/* eslint-disable-next-line @next/next/no-img-element -- yönetici paneli, oturumlu küçük önizleme */}
              <img src={`/api/admin/prospects?view=upload&id=${id}&name=${encodeURIComponent(u.name)}`} alt={`Fotoğraf ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              {i === 0 && <span className="absolute left-1 top-1 text-[10px] font-semibold bg-black/70 text-white px-1.5 py-0.5 rounded">Kapak</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 p-1 bg-gradient-to-t from-black/60 to-transparent">
                {i > 0 && (
                  <button type="button" disabled={busy} onClick={() => act('cover-upload', u.name)} title="Kapak yap" aria-label={`Fotoğraf ${i + 1}: kapak yap`} className="w-6 h-6 grid place-items-center rounded bg-white/90 text-[#1D1D1F] hover:bg-white">
                    <Star className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
                <button type="button" disabled={busy} onClick={() => act('delete-upload', u.name)} title="Sil" aria-label={`Fotoğraf ${i + 1}: sil`} className="w-6 h-6 grid place-items-center rounded bg-white/90 text-red-600 hover:bg-white">
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
