'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User, ArrowRight, ExternalLink, Calendar, Calculator, CheckCircle2, Settings2, Key, Cpu } from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  provider?: string;
  actions?: { label: string; action: string; url?: string }[];
}

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('glm-4-plus');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('ysn_glm_api_key') || '';
      const savedModel = localStorage.getItem('ysn_glm_model') || 'glm-4-plus';
      setCustomKey(savedKey);
      setSelectedModel(savedModel);
    }
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Merhaba! Ben YSNSOFT Akıllı Çözüm Danışmanı. Portföyümüzdeki KGLEX (Hukuk & UYAP), HaritaPlan (3D CBS/3194 Md. 18), Panelde (Emlak SaaS) veya özel yazılım hedefleriniz hakkında size nasıl yardımcı olabilirim?',
      time: 'Şimdi',
      provider: 'YSNSOFT AI',
      actions: [
        { label: '⚖️ KGLEX UYAP Botu', action: 'ask_kglex' },
        { label: '🏛️ HG & Açıkel Hukuk', action: 'ask_hg' },
        { label: '🗺️ HaritaPlan 3194 Md. 18', action: 'ask_harita' },
        { label: '🍱 Samatya Mezecisi POS', action: 'ask_samatya' },
        { label: '🏢 Panelde Emlak SaaS', action: 'ask_panelde' },
        { label: '📅 Canlı Demo Randevusu', action: 'schedule_demo' }
      ]
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('ysn_glm_api_key', customKey.trim());
      localStorage.setItem('ysn_glm_model', selectedModel);
    }
    setShowConfig(false);
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!textToSend) setInput('');
    setIsTyping(true);

    try {
      const apiMessages = nextMessages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
          apiKey: customKey || undefined
        })
      });

      const data = await res.json();
      const replyText = data.reply || 'Üzgünüm, şu an yanıt üretilemedi.';

      const q = (query + ' ' + replyText).toLowerCase();
      let actions: { label: string; action: string; url?: string }[] = [];

      if (q.includes('kglex') || q.includes('hukuk') || q.includes('uyap')) {
        actions.push({ label: '🌐 kglex.com Canlı İncele', action: 'link', url: 'https://kglex.com' });
        actions.push({ label: '📅 Hukuk Çözüm Mimarından Randevu Al', action: 'schedule_demo' });
      } else if (q.includes('harita') || q.includes('dop') || q.includes('3194')) {
        actions.push({ label: '🌐 haritaplan.com Canlı İncele', action: 'link', url: 'https://haritaplan.com' });
        actions.push({ label: '🧮 3D Simülatörü Aç', action: 'jump_sandbox' });
      } else if (q.includes('panelde') || q.includes('emlak')) {
        actions.push({ label: '🌐 panelde.com Canlı İncele', action: 'link', url: 'https://panelde.com' });
        actions.push({ label: '🏢 Mimari Şeması', action: 'jump_architecture' });
      } else if (q.includes('fiyat') || q.includes('maliyet') || q.includes('bütçe')) {
        actions.push({ label: '🧮 Kapsam ve Maliyet Hesapla', action: 'jump_calculator' });
        actions.push({ label: '📄 Teklif Al', action: 'quote_modal' });
      } else {
        actions.push({ label: '📅 30 Dk Demo Randevusu Al', action: 'schedule_demo' });
        actions.push({ label: '🧮 Fiyat Hesaplayıcı', action: 'jump_calculator' });
      }

      const aiMsg: Message = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'YSNSOFT AI',
        actions
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'ai-err-' + Date.now(),
          sender: 'ai',
          text: 'Bağlantı sırasında bir hata oluştu. Lütfen tekrar deneyiniz.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAction = (act: { label: string; action: string; url?: string }) => {
    if (act.url) {
      window.open(act.url, '_blank');
      return;
    }

    if (act.action === 'ask_kglex') {
      handleSend('KGLEX UYAP bot sistemi ve hukuk bürosu özellikleri nelerdir?');
    } else if (act.action === 'ask_hg') {
      handleSend('HG Avukatlık ve Açıkel Law çok dilli hukuk portalları ve online tahsilat özellikleri nelerdir?');
    } else if (act.action === 'ask_harita') {
      handleSend('HaritaPlan 3194 Madde 18 DOP hesabı nasıl çalışıyor?');
    } else if (act.action === 'ask_samatya') {
      handleSend('Tarihi Samatya Mezecisi QR menü ve restoran mutfak POS sipariş sistemi nasıl çalışır?');
    } else if (act.action === 'ask_panelde') {
      handleSend('Panelde emlak SaaS mimarisi ve multi-tenant yapısı hakkında bilgi ver.');
    } else if (act.action === 'schedule_demo' || act.action === 'jump_scheduler') {
      setIsOpen(false);
      document.getElementById('demo-scheduler')?.scrollIntoView({ behavior: 'smooth' });
    } else if (act.action === 'jump_calculator') {
      setIsOpen(false);
      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
    } else if (act.action === 'jump_sandbox') {
      setIsOpen(false);
      document.getElementById('sandbox')?.scrollIntoView({ behavior: 'smooth' });
    } else if (act.action === 'jump_architecture') {
      setIsOpen(false);
      document.getElementById('architecture')?.scrollIntoView({ behavior: 'smooth' });
    } else if (act.action === 'quote_modal') {
      setIsOpen(false);
      const contactTrigger = document.querySelector('[data-contact-trigger]') as HTMLElement;
      if (contactTrigger) contactTrigger.click();
    }
  };

  return (
    <>
      {/* Floating Apple Intelligence Orb */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="YSNSOFT AI Asistan"
        className={`fixed bottom-24 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 ${
          isOpen
            ? 'bg-[#1D1D1F] text-white scale-95'
            : 'bg-white/95 backdrop-blur-xl border border-blue-200/60 text-[#1D1D1F] hover:shadow-blue-500/20 hover:scale-105 group'
        }`}
      >
        <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 text-white shadow-sm">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-40 blur-sm group-hover:opacity-75 transition-opacity" />
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold leading-tight flex items-center gap-1.5">
            YSNSOFT AI
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
          </div>
          <div className="text-[10px] text-[#86868B] font-medium leading-none">Canlı Çözüm Asistanı</div>
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-36 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] max-h-[640px] h-[80vh] flex flex-col bg-white/95 backdrop-blur-2xl rounded-3xl border border-gray-200/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-[#F5F5F7] to-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1D1D1F] flex items-center gap-2">
                  YSNSOFT AI
                  <span className="px-1.5 py-0.5 text-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-md shadow-2xs">
                    Intelligence
                  </span>
                </h3>
                <p className="text-xs text-[#86868B]">Çözüm Mimarisi & SaaS Danışmanı</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowConfig(!showConfig)}
                title="Model & API Ayarları"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  showConfig ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Config Drawer */}
          {showConfig && (
            <form onSubmit={saveSettings} className="p-4 bg-blue-50/70 border-b border-blue-200/60 space-y-3 text-xs animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Yapay Zeka Model Yapılandırması
                </span>
                <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-semibold">
                  YSNSOFT Motoru
                </span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Özel API Anahtarı (İsteğe Bağlı):
                </label>
                <div className="flex items-center gap-2 bg-white rounded-xl px-2.5 py-1.5 border border-blue-200">
                  <Key className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <input
                    type="password"
                    value={customKey}
                    onChange={e => setCustomKey(e.target.value)}
                    placeholder="Boş bırakılırsa şirket varsayılanı kullanılır"
                    className="w-full bg-transparent text-xs text-[#1D1D1F] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  className="bg-white px-2.5 py-1.5 border border-blue-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none"
                >
                  <option value="glm-4-plus">YSNSOFT Plus (Yüksek Akıl)</option>
                  <option value="glm-4-air">YSNSOFT Air (Hızlı)</option>
                  <option value="glm-4-flash">YSNSOFT Flash (Anlık)</option>
                </select>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#0071E3] hover:bg-blue-600 text-white font-semibold rounded-xl text-xs transition-colors"
                >
                  Kaydet
                </button>
              </div>
            </form>
          )}

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className={`max-w-[85%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-[#0071E3] text-white rounded-br-none shadow-sm'
                        : 'bg-[#F5F5F7] text-[#1D1D1F] rounded-bl-none border border-gray-200/50'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Action suggestions */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {msg.actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleAction(act)}
                          className="text-xs px-2.5 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-[#1D1D1F] hover:text-blue-600 hover:border-blue-200 rounded-xl transition-all shadow-2xs font-medium flex items-center gap-1.5"
                        >
                          {act.label}
                          {act.url && <ExternalLink className="w-3 h-3 opacity-60" />}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="text-[10px] text-[#86868B] mt-1 px-1 flex items-center justify-between">
                    <span>{msg.time}</span>
                    <span className="font-semibold text-blue-600">
                      YSNSOFT AI
                    </span>
                  </div>
                </div>
                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 items-center">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-[#F5F5F7] px-4 py-3 rounded-2xl rounded-bl-none border border-gray-200/50 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-xs text-[#86868B] ml-2">YSNSOFT AI düşünüyor...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Input Form */}
          <div className="p-3 bg-white border-t border-gray-100">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 bg-[#F5F5F7] rounded-2xl px-3 py-2 border border-gray-200/80 focus-within:border-blue-500 focus-within:bg-white transition-all"
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Örn: KGLEX UYAP botu ve HaritaPlan nasıl çalışır?..."
                className="flex-1 bg-transparent text-xs text-[#1D1D1F] placeholder-gray-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-7 h-7 rounded-xl bg-[#0071E3] hover:bg-blue-600 disabled:opacity-40 text-white flex items-center justify-center transition-opacity shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="text-[10px] text-center text-gray-400 mt-2 flex items-center justify-center gap-1.5">
              <span>YSNSOFT Akıllı Çözüm & Mimari Danışmanı</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
