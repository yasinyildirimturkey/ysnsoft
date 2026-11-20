'use client';

/**
 * Sesli not: tarayıcının kendi konuşma tanıması (Chrome / Android'de var, ücretsiz). Konuşulan Türkçe metin
 * nota eklenir; kişi göndermeden önce düzeltebilir. Destek yoksa düğme hiç görünmez.
 * Ses dosyası bizde saklanmaz ve bizim sunucumuza gitmez; ANCAK tanımayı tarayıcı yapar ve Chrome/Android bunun için
 * sesi Google'ın tanıma hizmetine gönderir. Bu yüzden müşterinin kişisel bilgileri sesle değil, gerekirse elle yazılmalı.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
}
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function VoiceNote({ onText }: { onText: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSupported(Boolean(ctor())), 0);
    return () => { clearTimeout(t); rec.current?.stop(); };
  }, []);

  if (!supported) return null;

  const start = () => {
    const C = ctor();
    if (!C) return;
    setError('');
    const r = new C();
    r.lang = 'tr-TR';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text.trim()) onText(text.trim());
    };
    r.onerror = (e) => setError(e.error === 'not-allowed' ? 'Mikrofon izni verilmedi.' : 'Ses anlaşılamadı, tekrar deneyin.');
    r.onend = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => (listening ? rec.current?.stop() : start())}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${listening ? 'bg-red-600 text-white animate-pulse' : 'bg-[#F5F5F7] text-[#1D1D1F]'}`}
        aria-label={listening ? 'Kaydı durdur' : 'Sesle not al'}
        title="Konuşma tanıma tarayıcınızın hizmetiyle (Chrome'da Google) yapılır; kişisel bilgileri elle yazın."
      >
        {listening ? <Square className="w-3.5 h-3.5" aria-hidden="true" /> : <Mic className="w-3.5 h-3.5" aria-hidden="true" />}
        {listening ? 'Dinleniyor… durdur' : 'Sesle not'}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
