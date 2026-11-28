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
  quickReplies: string[];
}

interface OffersPayload {
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: Array<{
    roomTypeId: string;
    roomTypeName: string;
    boardType: string | null;
    availableRooms: number | null;
    imagePath?: string | null;
    plans: Array<{ rateType: string | null; price: number; discountedPrice: number | null; currency: string; refundable: boolean | null }>;
  }>;
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
    book: "Rezerve et",
    bookMsg: "{room} ({plan}) için rezervasyon yapmak istiyorum.",
    nights: "{n} gece",
    roomsLeft: "Son {n} oda",
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
    book: "Book",
    bookMsg: "I would like to book {room} ({plan}).",
    nights: "{n} nights",
    roomsLeft: "{n} left",
  },
  de: {
    open: "Chat öffnen",
    close: "Schließen",
    placeholder: "Nachricht eingeben…",
    send: "Senden",
    privacyLink: "Datenschutzhinweis",
    clear: "Chat löschen",
    cleared: "Ihr Chatverlauf wurde gelöscht.",
    checking: "Das Reservierungssystem wird abgefragt…",
    preparing: "Wird vorbereitet…",
    formTitle: "Rückruf vom Hotelteam",
    name: "Ihr Name",
    contact: "Telefon oder E-Mail",
    note: "Anmerkung (optional)",
    submit: "Senden",
    cancel: "Abbrechen",
    sent: "Ihre Anfrage wurde an das Hotelteam weitergeleitet. Es meldet sich in Kürze bei Ihnen.",
    formError: "Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.",
    rate: "Sie senden zu schnell Nachrichten. Bitte warten Sie einen Moment.",
    tooLong: "Ihre Nachricht ist zu lang.",
    network: "Keine Verbindung. Bitte versuchen Sie es erneut.",
    unavailable: "Der Chat ist derzeit nicht verfügbar.",
    book: "Buchen",
    bookMsg: "Ich möchte {room} ({plan}) buchen.",
    nights: "{n} Nächte",
    roomsLeft: "Noch {n} frei",
  },
  ru: {
    open: "Открыть чат",
    close: "Закрыть",
    placeholder: "Введите сообщение…",
    send: "Отправить",
    privacyLink: "Уведомление о конфиденциальности",
    clear: "Удалить чат",
    cleared: "История чата удалена.",
    checking: "Проверяем систему бронирования…",
    preparing: "Подготовка…",
    formTitle: "Команда отеля свяжется с вами",
    name: "Ваше имя",
    contact: "Телефон или e-mail",
    note: "Комментарий (необязательно)",
    submit: "Отправить",
    cancel: "Отмена",
    sent: "Ваш запрос передан команде отеля. С вами свяжутся в ближайшее время.",
    formError: "Не удалось отправить запрос. Пожалуйста, попробуйте позже.",
    rate: "Вы отправляете сообщения слишком быстро. Пожалуйста, подождите.",
    tooLong: "Сообщение слишком длинное.",
    network: "Нет соединения. Пожалуйста, попробуйте ещё раз.",
    unavailable: "Чат сейчас недоступен.",
    book: "Забронировать",
    bookMsg: "Хочу забронировать {room} ({plan}).",
    nights: "Ночей: {n}",
    roomsLeft: "Осталось: {n}",
  },
};
(UI as Record<string, Strings>).ar = {
  open: "فتح المحادثة",
  close: "إغلاق",
  placeholder: "اكتبوا رسالتكم…",
  send: "إرسال",
  privacyLink: "إشعار الخصوصية",
  clear: "حذف المحادثة",
  cleared: "تم حذف سجل المحادثة.",
  checking: "جارٍ الاستعلام من نظام الحجز…",
  preparing: "جارٍ التحضير…",
  formTitle: "ليتواصل معكم فريق الفندق",
  name: "الاسم",
  contact: "الهاتف أو البريد الإلكتروني",
  note: "ملاحظة (اختياري)",
  submit: "إرسال",
  cancel: "إلغاء",
  sent: "تم إرسال طلبكم إلى فريق الفندق. سيتواصلون معكم في أقرب وقت.",
  formError: "تعذّر إرسال الطلب. يُرجى المحاولة لاحقًا.",
  rate: "أنتم ترسلون الرسائل بسرعة كبيرة. يُرجى الانتظار قليلًا.",
  tooLong: "رسالتكم طويلة جدًا.",
  network: "تعذّر الاتصال. يُرجى المحاولة مرة أخرى.",
  unavailable: "المحادثة غير متاحة حاليًا.",
  book: "احجز",
  bookMsg: "أرغب في حجز {room} ({plan}).",
  nights: "{n} ليالٍ",
  roomsLeft: "متبقٍ {n}",
};
const RTL = new Set(["ar", "he", "fa"]);
const strings = (lang: string): Strings => (UI as Record<string, Strings>)[lang] ?? UI.en;
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
.quick{display:flex;flex-wrap:wrap;gap:6px}
.quick button{background:#fff;color:var(--c);border:1px solid var(--c);border-radius:16px;padding:5px 11px;font-size:13px;cursor:pointer}
.quick button:hover{background:#f0f4f8}
.offers{align-self:stretch;display:flex;flex-direction:column;gap:8px}
.offers .stay{font-size:12px;color:#666}
.room{border:1px solid #d5d8dc;border-radius:12px;padding:10px 12px;background:#fff}
.room h4{margin:0 0 2px;font-size:14px}
.room img{display:block;width:calc(100% + 24px);margin:-10px -12px 10px;aspect-ratio:16/9;object-fit:cover;border-radius:11px 11px 0 0}
.room .meta{font-size:12px;color:#666;margin-bottom:6px}
.plan{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid #eceef1}
.plan .info{flex:1;min-width:0}
.plan .rate{font-size:12px;color:#444}
.plan .price{font-weight:600}
.plan s{font-weight:400;color:#888;font-size:12px;margin-right:4px}
.plan .btn{min-height:32px;padding:0 12px;font-size:13px}
.launcher.hide{display:none}
@media (max-width:600px){
/* Telefonda pencere tam ekran açılır. Yükseklik ve üst konum, klavye açılınca görünür alana göre betikten ayarlanır. */
.panel{left:0;right:0;top:0;bottom:auto;width:100%;max-width:none;height:100vh;height:100dvh;max-height:none;border-radius:0;box-shadow:none}
.launcher{right:14px;bottom:14px}
/* iOS, 16px'ten küçük yazılı alana odaklanınca sayfayı yakınlaştırır; bunu önlemek için 16px. */
textarea,.card input[type=text]{font-size:16px}
.head{padding-top:calc(12px + env(safe-area-inset-top))}
.head button{font-size:14px;padding:8px 10px}
form.compose{padding-bottom:calc(10px + env(safe-area-inset-bottom))}
.msg{max-width:90%;font-size:15px}
/* Parmakla rahat basılacak kadar büyük düğmeler. */
.plan .btn{min-height:42px;padding:0 16px;font-size:14px}
.quick button{padding:9px 14px;font-size:14px}
}
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
  let t: Strings = strings(browserLang);
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

  // Dönüşüm takibi: asistanın verdiği bir linke tıklanınca sunucuya haber verilir.
  log.addEventListener("click", (ev) => {
    const a = (ev.target as HTMLElement).closest?.(".bot a") as HTMLAnchorElement | null;
    if (!a || !sessionId) return;
    void fetch(`${api}/api/link-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId, sessionId, url: a.href }),
      keepalive: true,
    }).catch(() => undefined);
  });

  const money = (amount: number, currency: string) =>
    `${new Intl.NumberFormat(config?.language ?? browserLang, { maximumFractionDigits: 0 }).format(amount)} ${currency}`;

  /** Müsaitlik sonucunu oda kartları olarak gösterir; düğme, seçimi sohbete mesaj olarak yazar. */
  const showOffers = (p: OffersPayload) => {
    const wrap = el("div", "offers");
    wrap.append(el("div", "stay", `${p.checkIn} → ${p.checkOut} · ${t.nights.replace("{n}", String(p.nights))}`));
    for (const room of p.rooms) {
      const card = el("div", "room");
      // Fotoğraf yolu yalnızca sohbet sunucusunun /img/ klasörünü gösterebilir.
      if (room.imagePath && /^\/img\/[a-z0-9-]+\/[a-z0-9-]+[.](webp|jpg|png)$/.test(room.imagePath)) {
        const img = el("img");
        img.src = api + room.imagePath;
        img.alt = "";
        img.loading = "lazy";
        card.append(img);
      }
      card.append(el("h4", undefined, room.roomTypeName));
      const left = room.availableRooms !== null && room.availableRooms <= 2 ? t.roomsLeft.replace("{n}", String(room.availableRooms)) : null;
      const meta = [room.boardType, left].filter(Boolean).join(" · ");
      if (meta) card.append(el("div", "meta", meta));
      for (const plan of room.plans) {
        const row = el("div", "plan");
        const info = el("div", "info");
        info.append(el("div", "rate", plan.rateType ?? ""));
        const price = el("div", "price");
        if (plan.discountedPrice !== null) price.append(el("s", undefined, money(plan.price, plan.currency)));
        price.append(money(plan.discountedPrice ?? plan.price, plan.currency));
        info.append(price);
        const book = el("button", "btn", t.book);
        book.type = "button";
        book.addEventListener("click", () => {
          void send(t.bookMsg.replace("{room}", room.roomTypeName).replace("{plan}", plan.rateType ?? ""));
        });
        row.append(info, book);
        card.append(row);
      }
      wrap.append(card);
    }
    log.append(wrap);
    scroll();
  };

  const showQuickReplies = () => {
    if (!config?.quickReplies.length) return;
    const wrap = el("div", "quick");
    for (const q of config.quickReplies) {
      const b = el("button", undefined, q);
      b.type = "button";
      b.addEventListener("click", () => void send(q));
      wrap.append(b);
    }
    log.append(wrap);
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

  // Ayarlar sayfa yüklenince arka planda bir kez alınır; misafir düğmeye bastığında pencere
  // beklemeden, karşılama mesajı hazır olarak açılır. Eşzamanlı çağrılar aynı isteği paylaşır.
  let configRequest: Promise<WidgetConfig | null> | null = null;
  const fetchConfig = (): Promise<WidgetConfig | null> =>
    (configRequest ??= fetch(`${api}/api/hotels/${encodeURIComponent(hotelId)}/widget-config?lang=${browserLang}`)
      .then((res) => (res.ok ? (res.json() as Promise<WidgetConfig>) : null))
      .catch(() => null)
      .then((value) => {
        if (!value) configRequest = null; // başarısızsa sonraki açılışta yeniden denenir
        return value;
      }));

  /** `silent`: arka plan ön yüklemesi; başarısız olursa misafire bir şey gösterilmez. */
  const loadConfig = async (silent = false): Promise<boolean> => {
    if (config) return true;
    const loaded = await fetchConfig();
    if (config) return true; // eşzamanlı bir çağrı bu arada kurmuş olabilir
    if (!loaded) {
      if (!silent) addSys(t.unavailable);
      return false;
    }
    config = loaded;
    t = strings(config.language);
    // Sağdan sola diller: pencerenin tamamı çevrilir; konumu (sağ alt köşe) aynı kalır.
    panel.dir = RTL.has(config.language) ? "rtl" : "ltr";
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
    showQuickReplies();
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
    log.querySelector(".quick")?.remove();
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
    let offers: OffersPayload | null = null;

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
      } else if (event === "offers") {
        offers = data.payload as OffersPayload;
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
      if (offers) showOffers(offers);
      if (wantForm) showHandoffForm();
      setBusy(false);
      if (!mobile()) input.focus();
    }
  };

  const mobile = () => window.matchMedia("(max-width:600px)").matches;
  let savedOverflow: string | null = null;

  /** Telefonda pencereyi görünür alana oturtur; klavye açılınca mesaj kutusu klavyenin üstünde kalır. */
  const fit = () => {
    const vv = window.visualViewport;
    if (vv && mobile() && panel.classList.contains("open")) {
      panel.style.height = `${vv.height}px`;
      panel.style.top = `${vv.offsetTop}px`;
      scroll();
    } else {
      panel.style.height = "";
      panel.style.top = "";
    }
  };
  window.visualViewport?.addEventListener("resize", fit);
  window.visualViewport?.addEventListener("scroll", fit);
  window.addEventListener("resize", fit);

  const setOpen = (open: boolean) => {
    panel.classList.toggle("open", open);
    launcher.setAttribute("aria-expanded", String(open));
    // Telefonda tam ekran pencerenin altında sayfa kaymasın ve açma düğmesi üstte durmasın.
    launcher.classList.toggle("hide", open && mobile());
    const root = document.documentElement;
    if (open && mobile()) {
      savedOverflow ??= root.style.overflow;
      root.style.overflow = "hidden";
    } else if (savedOverflow !== null) {
      root.style.overflow = savedOverflow;
      savedOverflow = null;
    }
    fit();
  };

  const openChat = async (): Promise<boolean> => {
    setOpen(true);
    const ready = await loadConfig();
    // Telefonda otomatik odak klavyeyi açıp karşılama mesajını örter; odak masaüstünde verilir.
    if (ready && !mobile()) input.focus();
    return ready;
  };

  launcher.addEventListener("click", () => {
    if (panel.classList.contains("open")) setOpen(false);
    else void openChat();
  });
  closeBtn.addEventListener("click", () => {
    setOpen(false);
    launcher.focus();
  });

  // Sayfanın kendi düğmeleri sohbeti açabilsin: HotelChat.open() ve HotelChat.ask("soru").
  (window as unknown as { HotelChat: unknown }).HotelChat = {
    open: () => void openChat(),
    ask: async (question: string) => {
      if ((await openChat()) && typeof question === "string" && question.trim()) void send(question.trim());
    },
  };
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
    showQuickReplies();
    addSys(t.cleared);
  });
  compose.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = "";
    // Telefonda klavye kapanır ki cevap ekranın tamamında okunabilsin.
    if (mobile()) input.blur();
    void send(text);
  });
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      compose.requestSubmit();
    }
  });

  const mount = () => {
    document.body.append(host);
    // Sayfanın kendi yüklenmesini geciktirmemek için tarayıcı boşta kalınca ön yükleme yapılır.
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    if (idle) idle(() => void loadConfig(true), { timeout: 2500 });
    else setTimeout(() => void loadConfig(true), 1200);
  };
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
