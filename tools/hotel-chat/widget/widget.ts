/**
 * Gömülebilir sohbet penceresi. Kullanım:
 *   <script src="https://SUNUCU/widget.js" data-hotel="otel-id" async></script>
 * Shadow DOM içinde çalışır; sitenin CSS'inden etkilenmez ve onu etkilemez.
 */

interface WidgetConfig {
  hotelName: string;
  language: string;
  title: string;
  welcome: string;
  primaryColor: string;
  privacyNotice: string;
  privacyUrl: string;
  consentLabel: string;
  maxMessageChars: number;
}

const UI = {
  tr: {
    open: "Sohbeti aç",
    close: "Kapat",
    placeholder: "Mesajınızı yazın…",
    send: "Gönder",
    privacyLink: "Aydınlatma metni",
    clear: "Sohbeti sil",
    cleared: "Sohbet kaydınız silindi.",
    checking: "Rezervasyon sistemi sorgulanıyor…",
    preparing: "Hazırlanıyor…",
    formTitle: "Otel ekibi size dönsün",
    name: "Adınız",
    contact: "Telefon ya da e-posta",
    note: "Eklemek istediğiniz not (isteğe bağlı)",
    submit: "Gönder",
    cancel: "Vazgeç",
    sent: "Talebiniz otel ekibine iletildi. En kısa sürede size dönecekler.",
    formError: "Talep gönderilemedi. Lütfen daha sonra tekrar deneyin.",
    rate: "Çok hızlı mesaj gönderiyorsunuz. Lütfen biraz bekleyin.",
    tooLong: "Mesajınız çok uzun.",
    network: "Bağlantı kurulamadı. Lütfen tekrar deneyin.",
    unavailable: "Sohbet şu anda kullanılamıyor.",
  },
  en: {
    open: "Open chat",
    close: "Close",
    placeholder: "Type your message…",
    send: "Send",
    privacyLink: "Privacy notice",
    clear: "Delete chat",
    cleared: "Your chat record has been deleted.",
    checking: "Checking the reservation system…",
    preparing: "Preparing…",
    formTitle: "Have the hotel team contact you",
    name: "Your name",
    contact: "Phone or e-mail",
    note: "Anything to add (optional)",
    submit: "Send",
    cancel: "Cancel",
    sent: "Your request has been sent to the hotel team. They will get back to you shortly.",
    formError: "The request could not be sent. Please try again later.",
    rate: "You are sending messages too quickly. Please wait a moment.",
    tooLong: "Your message is too long.",
    network: "Could not connect. Please try again.",
    unavailable: "Chat is currently unavailable.",
  },
};
type Strings = (typeof UI)["tr"];

const CSS = `
:host{all:initial;--c:#1f4e79}
*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.launcher{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;
  background:var(--c);color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:2147483000}
.launcher:focus-visible,.panel button:focus-visible,.panel input:focus-visible,.panel textarea:focus-visible{outline:2px solid #111;outline-offset:2px}
.panel{position:fixed;right:20px;bottom:88px;width:370px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 110px);
  background:#fff;color:#1a1a1a;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;z-index:2147483000;font-size:14px;line-height:1.45}
.panel.open{display:flex}
.head{background:var(--c);color:#fff;padding:12px 14px;display:flex;align-items:center;gap:8px}
.head h2{margin:0;font-size:15px;font-weight:600;flex:1}
.head button{background:transparent;border:0;color:#fff;cursor:pointer;font-size:12px;padding:4px 6px;border-radius:6px;opacity:.9}
.head button:hover{background:rgba(255,255,255,.18)}
.privacy{background:#f4f5f7;color:#444;font-size:11.5px;padding:8px 14px;border-bottom:1px solid #e3e5e8}
.privacy a{color:inherit}
.log{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.msg{max-width:86%;padding:8px 11px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere}
.msg a{color:inherit}
.bot{background:#f0f2f5;align-self:flex-start;border-bottom-left-radius:4px}
.user{background:var(--c);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.sys{align-self:center;color:#666;font-size:12px;text-align:center}
.status{color:#666;font-size:12px;font-style:italic;align-self:flex-start}
form.compose{display:flex;gap:8px;padding:10px;border-top:1px solid #e3e5e8}
textarea{flex:1;resize:none;border:1px solid #c9ccd1;border-radius:10px;padding:8px 10px;font-size:14px;height:40px;max-height:96px;color:#1a1a1a;background:#fff}
.btn{background:var(--c);color:#fff;border:0;border-radius:10px;padding:0 14px;cursor:pointer;font-size:14px;min-height:40px}
.btn:disabled{opacity:.5;cursor:default}
.btn.ghost{background:transparent;color:#444;border:1px solid #c9ccd1}
.card{align-self:stretch;border:1px solid #d5d8dc;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;background:#fff}
.card h3{margin:0;font-size:14px}
.card label{font-size:12px;color:#444;display:flex;flex-direction:column;gap:3px}
.card input[type=text]{border:1px solid #c9ccd1;border-radius:8px;padding:7px 9px;font-size:14px;color:#1a1a1a;background:#fff}
.card .consent{flex-direction:row;align-items:flex-start;gap:8px;font-size:12px}
.card .row{display:flex;gap:8px;justify-content:flex-end}
.err{color:#b00020;font-size:12px}
@media (max-width:480px){.panel{right:12px;left:12px;width:auto;bottom:84px}.launcher{right:12px;bottom:12px}}
`;

(function init() {
  const script = document.currentScript as HTMLScriptElement | null;
  const hotelId = script?.dataset.hotel;
  if (!script || !hotelId) {
    console.error("[hotel-chat] <script> etiketinde data-hotel eksik");
    return;
  }
  const api = (script.dataset.api || new URL(script.src).origin).replace(/\/$/, "");
  const browserLang = (script.dataset.lang || document.documentElement.lang || navigator.language || "tr").slice(0, 2).toLowerCase();
  const storageKey = `hotel-chat:${hotelId}:session`;

  const readSession = (): string | null => {
    try {
      return sessionStorage.getItem(storageKey);
    } catch {
      return null;
    }
  };
  const writeSession = (id: string | null) => {
    try {
      if (id) sessionStorage.setItem(storageKey, id);
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* depolama kapalıysa oturum yalnızca sayfa ömrünce yaşar */
    }
  };

  let sessionId = readSession();
  let config: WidgetConfig | null = null;
  let t: Strings = browserLang === "tr" ? UI.tr : UI.en;
  let busy = false;

  const host = document.createElement("div");
  // Ayarlar yüklenene kadar düğme rengi: data-color verilmişse o, yoksa varsayılan.
  const presetColor = script.dataset.color ?? "";
  if (/^#[0-9a-fA-F]{6}$/.test(presetColor)) host.style.setProperty("--c", presetColor);
  const root = host.attachShadow({ mode: "open" });
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const style = el("style");
  style.textContent = CSS;
  const launcher = el("button", "launcher");
  launcher.type = "button";
  launcher.innerHTML =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  const panel = el("div", "panel");
  panel.setAttribute("role", "dialog");
  const head = el("div", "head");
  const title = el("h2");
  const clearBtn = el("button");
  clearBtn.type = "button";
  const closeBtn = el("button");
  closeBtn.type = "button";
  head.append(title, clearBtn, closeBtn);
  const privacy = el("div", "privacy");
  const log = el("div", "log");
  log.setAttribute("aria-live", "polite");
  const compose = el("form", "compose");
  const input = el("textarea");
  input.rows = 1;
  const sendBtn = el("button", "btn");
  sendBtn.type = "submit";
  compose.append(input, sendBtn);
  panel.append(head, privacy, log, compose);
  root.append(style, launcher, panel);

  const scroll = () => {
    log.scrollTop = log.scrollHeight;
  };

  /** Metni güvenle basar; yalnızca http(s) adresleri bağlantıya çevrilir. HTML asla yorumlanmaz. */
  const renderText = (node: HTMLElement, text: string) => {
    node.textContent = "";
    const parts = text.split(/(https?:\/\/[^\s<>"']+)/g);
    for (const part of parts) {
      if (/^https?:\/\//.test(part)) {
        const trail = part.match(/[.,;:!?)\]]+$/)?.[0] ?? "";
        const href = trail ? part.slice(0, -trail.length) : part;
        const a = el("a", undefined, href);
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        node.append(a, trail);
      } else if (part) {
        node.append(part);
      }
    }
  };

  const addMsg = (cls: string, text: string) => {
    const node = el("div", `msg ${cls}`);
    renderText(node, text);
    log.append(node);
    scroll();
    return node;
  };
  const addSys = (text: string) => {
    log.append(el("div", "sys", text));
    scroll();
  };

  const applyStrings = () => {
    launcher.setAttribute("aria-label", t.open);
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", t.close);
    clearBtn.textContent = t.clear;
    input.placeholder = t.placeholder;
    input.setAttribute("aria-label", t.placeholder);
    sendBtn.textContent = t.send;
  };
  applyStrings();

  const loadConfig = async (): Promise<boolean> => {
    if (config) return true;
    try {
      const res = await fetch(`${api}/api/hotels/${encodeURIComponent(hotelId)}/widget-config?lang=${browserLang}`);
      if (!res.ok) throw new Error(String(res.status));
      config = (await res.json()) as WidgetConfig;
    } catch {
      addSys(t.unavailable);
      return false;
    }
    t = config.language === "tr" ? UI.tr : UI.en;
    applyStrings();
    host.style.setProperty("--c", config.primaryColor);
    title.textContent = config.title;
    panel.setAttribute("aria-label", config.title);
    input.maxLength = config.maxMessageChars;
    // KVKK: aydınlatma metni ilk mesajdan önce, her zaman görünür.
    privacy.textContent = `${config.privacyNotice} `;
    const link = el("a", undefined, t.privacyLink);
    link.href = config.privacyUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    privacy.append(link);
    addMsg("bot", config.welcome);
    return true;
  };

  const setBusy = (value: boolean) => {
    busy = value;
    sendBtn.disabled = value;
  };

  const showHandoffForm = () => {
    if (!config || log.querySelector(".card")) return;
    const card = el("form", "card");
    card.append(el("h3", undefined, t.formTitle));
    const field = (label: string, required: boolean, max: number) => {
      const wrap = el("label", undefined, label);
      const inp = el("input");
      inp.type = "text";
      inp.required = required;
      inp.maxLength = max;
      wrap.append(inp);
      card.append(wrap);
      return inp;
    };
    const name = field(t.name, true, 100);
    name.autocomplete = "name";
    const contact = field(t.contact, true, 120);
    const note = field(t.note, false, 500);
    const consentWrap = el("label", "consent");
    const consent = el("input");
    consent.type = "checkbox";
    consent.required = true;
    consentWrap.append(consent, el("span", undefined, config.consentLabel));
    const error = el("div", "err");
    const row = el("div", "row");
    const cancel = el("button", "btn ghost", t.cancel);
    cancel.type = "button";
    const submit = el("button", "btn", t.submit);
    submit.type = "submit";
    row.append(cancel, submit);
    card.append(consentWrap, error, row);
    log.append(card);
    scroll();

    cancel.addEventListener("click", () => card.remove());
    card.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (!consent.checked || !sessionId) return;
      submit.disabled = true;
      error.textContent = "";
      try {
        const res = await fetch(`${api}/api/handoff`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hotelId,
            sessionId,
            name: name.value,
            contact: contact.value,
            note: note.value || undefined,
            consent: true,
            language: config?.language,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        card.remove();
        addSys(t.sent);
      } catch {
        error.textContent = t.formError;
        submit.disabled = false;
      }
    });
  };

  const send = async (text: string) => {
    if (busy || !config) return;
    setBusy(true);
    addMsg("user", text);
    let bubble: HTMLElement | null = null;
    let answer = "";
    let status: HTMLElement | null = el("div", "status", t.preparing);
    log.append(status);
    scroll();
    const clearStatus = () => {
      status?.remove();
      status = null;
    };
    let wantForm = false;

    const onEvent = (event: string, data: Record<string, unknown>) => {
      if (event === "session" && typeof data.sessionId === "string") {
        sessionId = data.sessionId;
        writeSession(sessionId);
      } else if (event === "text" && typeof data.delta === "string") {
        clearStatus();
        answer += data.delta;
        bubble ??= addMsg("bot", "");
        renderText(bubble, answer);
        scroll();
      } else if (event === "tool") {
        // Araçtan sonra gelen metin yeni bir balonda başlar.
        bubble = null;
        answer = "";
        clearStatus();
        status = el("div", "status", data.name === "musaitlik_sorgula" ? t.checking : t.preparing);
        log.append(status);
        scroll();
      } else if (event === "handoff_form") {
        wantForm = true;
      } else if (event === "notice" && typeof data.message === "string") {
        clearStatus();
        addMsg("bot", data.message);
      }
    };

    try {
      const res = await fetch(`${api}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, sessionId: sessionId ?? undefined, message: text, language: config.language }),
      });
      if (res.status === 429) addSys(t.rate);
      else if (res.status === 413) addSys(t.tooLong);
      else if (!res.ok || !res.body) addSys(t.network);
      else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let sep: number;
          while ((sep = buffer.indexOf("\n\n")) >= 0) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const event = frame.match(/^event: (.*)$/m)?.[1];
            const data = frame.match(/^data: (.*)$/m)?.[1];
            if (!event || !data) continue;
            try {
              onEvent(event, JSON.parse(data) as Record<string, unknown>);
            } catch {
              /* bozuk çerçeve atlanır */
            }
          }
        }
      }
    } catch {
      addSys(t.network);
    } finally {
      clearStatus();
      if (wantForm) showHandoffForm();
      setBusy(false);
      input.focus();
    }
  };

  launcher.addEventListener("click", async () => {
    const opening = !panel.classList.contains("open");
    panel.classList.toggle("open", opening);
    launcher.setAttribute("aria-expanded", String(opening));
    if (opening && (await loadConfig())) input.focus();
  });
  closeBtn.addEventListener("click", () => {
    panel.classList.remove("open");
    launcher.focus();
  });
  clearBtn.addEventListener("click", async () => {
    if (busy) return;
    const id = sessionId;
    sessionId = null;
    writeSession(null);
    log.textContent = "";
    if (id) {
      try {
        await fetch(`${api}/api/session/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hotelId, sessionId: id }),
        });
      } catch {
        /* sunucuya ulaşılamazsa kayıt saklama süresi sonunda silinir */
      }
    }
    if (config) addMsg("bot", config.welcome);
    addSys(t.cleared);
  });
  compose.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = "";
    void send(text);
  });
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      compose.requestSubmit();
    }
  });

  const mount = () => document.body.append(host);
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
