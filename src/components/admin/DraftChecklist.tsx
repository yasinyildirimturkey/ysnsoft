'use client';

/**
 * Demonun (Seviye 3 taslak) hangi kısımları eksik ya da tahmini: sahada tamamlanacaklar listesi.
 * Veri taslak üretilirken kaydedilen kitten gelir; liste yalnızca yol gösterir, hiçbir şeyi değiştirmez.
 */
import React from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';

export interface DraftQuality {
  stock: number | null;
  photos: number | null;
  uploads: number | null;
  logo: string | null;
  hours: number | boolean | null;
  placeholder: number | boolean | null;
  suggested: number | boolean | null;
  conflicts: string[] | null;
  before: number | boolean | null;
  owner: string | null;
}

interface Item { todo: boolean; text: string }

function itemsOf(q: DraftQuality): Item[] {
  const out: Item[] = [];
  if (q.owner) out.push({ todo: false, text: `Yetkili (Impressum): ${q.owner} — görüşmede adıyla sorun.` });
  if (q.conflicts?.length) {
    out.push({ todo: true, text: `Eski sitede başka bir yönetici adı geçiyor (${q.conflicts.join(', ')}); metinden çıkarıldı. Kimin yetkili olduğunu sorun.` });
  }
  if (q.uploads) out.push({ todo: false, text: `${q.uploads} saha fotoğrafı kullanıldı.` });
  else if (q.stock) out.push({ todo: true, text: 'Fotoğraflar örnek (“Beispielfoto”). Ziyarette (izin alarak) dükkânın, ekibin ve işlerin fotoğrafını çekin; panelde aday detayından yükleyip “Yeniden üret”.' });
  else if (!q.photos) out.push({ todo: true, text: 'Hiç fotoğraf yok. Ziyarette (izin alarak) birkaç fotoğraf çekin; panelde yükleyip “Yeniden üret”.' });
  else out.push({ todo: false, text: `İşletmenin kendi sitesinden ${q.photos} fotoğraf kullanıldı.` });
  if (q.placeholder) out.push({ todo: true, text: 'Metinler yer tutucu. İşletmeden 3–4 cümlelik tanıtım ve hizmet listesini alıp notlara yazın.' });
  else if (q.suggested) out.push({ todo: true, text: 'Metinler yapay zekâ önerisi (sitede yeterli metin yoktu). Hizmetleri ve tanıtımı işletmeyle birlikte doğrulayın.' });
  else out.push({ todo: false, text: 'Metinler işletmenin kendi sitesinden.' });
  if (!q.logo) out.push({ todo: true, text: 'Logo bulunamadı; demoda baş harfler var. Logo dosyası varsa isteyin.' });
  if (!q.hours) out.push({ todo: true, text: 'Açılış saatleri bilinmiyor. Sorup notlara yazın.' });
  if (!q.before) out.push({ todo: false, text: 'Vorher ekran görüntüsü yok (site açılmadı ya da engelli); karşılaştırmayı sözlü yapın.' });
  return out;
}

export default function DraftChecklist({ quality }: { quality: DraftQuality }) {
  const items = itemsOf(quality);
  const open = items.filter((i) => i.todo).length;
  return (
    <div className="mt-3 pt-3 border-t border-black/[0.06]">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1D1D1F]">
        <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
        Ziyarette tamamlanacaklar {open ? <span className="px-1.5 rounded-md bg-amber-100 text-amber-900 tabular">{open}</span> : null}
      </span>
      <ul className="mt-2 space-y-1.5">
        {items.map((i) => (
          <li key={i.text} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
            {i.todo
              ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-px" aria-label="Yapılacak" />
              : <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-px" aria-label="Tamam" />}
            <span className={i.todo ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'}>{i.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
