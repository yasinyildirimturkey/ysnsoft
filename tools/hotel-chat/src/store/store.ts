import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ChatMessage, LlmUsage } from "../llm/types.js";

export interface Session {
  id: string;
  hotelId: string;
  channel: string;
  /** Kanalın kendi kullanıcı kimliği (ör. WhatsApp numarası); web'de null. */
  externalId: string | null;
  turns: number;
  toolCalls: number;
  /** insana_devret çağrıldıysa, onay/form gelene kadar bekleyen talep özeti. */
  pendingHandoff: string | null;
  lastAt: number;
}

export interface HandoffRecord {
  sessionId: string;
  hotelId: string;
  name: string;
  contact: string;
  summary: string;
  note: string | null;
}

/** Panel istatistikleri ve dönüşüm takibi için kaydedilen olay türleri. */
export type EventType = "availability_query" | "link_created" | "link_clicked" | "unanswered" | "handoff" | "lead";

export interface EventRow {
  id: number;
  sessionId: string | null;
  type: EventType;
  data: Record<string, unknown>;
  createdAt: number;
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  turns: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  external_id TEXT,
  turns INTEGER NOT NULL DEFAULT 0,
  tool_calls INTEGER NOT NULL DEFAULT 0,
  pending_handoff TEXT,
  created_at INTEGER NOT NULL,
  last_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_session ON messages(session_id, id);
CREATE TABLE IF NOT EXISTS handoffs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  hotel_id TEXT NOT NULL,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  summary TEXT NOT NULL,
  note TEXT,
  consent_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_hotel_last ON sessions(hotel_id, last_at);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id TEXT NOT NULL,
  session_id TEXT,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS events_hotel_type ON events(hotel_id, type, created_at);
CREATE INDEX IF NOT EXISTS events_session ON events(session_id);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS usage (
  hotel_id TEXT NOT NULL,
  month TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  turns INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (hotel_id, month)
);
`;

type Row = Record<string, unknown>;

function toSession(row: Row): Session {
  return {
    id: row.id as string,
    hotelId: row.hotel_id as string,
    channel: row.channel as string,
    externalId: (row.external_id as string | null) ?? null,
    turns: row.turns as number,
    toolCalls: row.tool_calls as number,
    pendingHandoff: (row.pending_handoff as string | null) ?? null,
    lastAt: row.last_at as number,
  };
}

const SESSION_COLS = "id, hotel_id, channel, external_id, turns, tool_calls, pending_handoff, last_at";

/** Oturum, mesaj, devir, olay ve kullanım kayıtları. Dosya yolu ":memory:" ise yalnızca bellekte tutar. */
export class Store {
  private readonly db: DatabaseSync;

  constructor(file: string, private readonly now: () => number = Date.now) {
    if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.db.exec(SCHEMA);
    // Eski veritabanlarında olmayan sütun sonradan eklenir.
    const cols = this.db.prepare("PRAGMA table_info(sessions)").all().map((c) => c.name);
    if (!cols.includes("external_id")) this.db.exec("ALTER TABLE sessions ADD COLUMN external_id TEXT");
    this.db.exec("CREATE INDEX IF NOT EXISTS sessions_external ON sessions(hotel_id, channel, external_id, last_at)");
  }

  createSession(hotelId: string, channel: string, externalId: string | null = null): Session {
    const id = randomUUID();
    const t = this.now();
    this.db
      .prepare("INSERT INTO sessions (id, hotel_id, channel, external_id, created_at, last_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, hotelId, channel, externalId, t, t);
    return { id, hotelId, channel, externalId, turns: 0, toolCalls: 0, pendingHandoff: null, lastAt: t };
  }

  /** Oturum başka bir otele aitse bulunamadı sayılır. */
  getSession(id: string, hotelId: string): Session | null {
    const row = this.db.prepare(`SELECT ${SESSION_COLS} FROM sessions WHERE id = ? AND hotel_id = ?`).get(id, hotelId);
    return row ? toSession(row) : null;
  }

  /** Bir kanal kullanıcısının (ör. WhatsApp numarası) en son oturumu. */
  findLatestByExternalId(hotelId: string, channel: string, externalId: string): Session | null {
    const row = this.db
      .prepare(`SELECT ${SESSION_COLS} FROM sessions WHERE hotel_id = ? AND channel = ? AND external_id = ? ORDER BY last_at DESC LIMIT 1`)
      .get(hotelId, channel, externalId);
    return row ? toSession(row) : null;
  }

  getMessages(sessionId: string): ChatMessage[] {
    const rows = this.db.prepare("SELECT message FROM messages WHERE session_id = ? ORDER BY id").all(sessionId);
    return rows.map((r) => JSON.parse(r.message as string) as ChatMessage);
  }

  /** Tamamlanan bir turun mesajlarını tek işlemde yazar; yarım tur asla kaydedilmez. */
  appendTurn(sessionId: string, messages: ChatMessage[], toolCalls: number, pendingHandoff: string | null): void {
    const t = this.now();
    this.db.exec("BEGIN");
    try {
      const insert = this.db.prepare("INSERT INTO messages (session_id, message, created_at) VALUES (?, ?, ?)");
      for (const m of messages) insert.run(sessionId, JSON.stringify(m), t);
      this.db
        .prepare(
          "UPDATE sessions SET turns = turns + 1, tool_calls = tool_calls + ?, last_at = ?, " +
            "pending_handoff = COALESCE(?, pending_handoff) WHERE id = ?",
        )
        .run(toolCalls, t, pendingHandoff, sessionId);
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  clearPendingHandoff(sessionId: string): void {
    this.db.prepare("UPDATE sessions SET pending_handoff = NULL WHERE id = ?").run(sessionId);
  }

  saveHandoff(h: HandoffRecord): void {
    this.db
      .prepare(
        "INSERT INTO handoffs (session_id, hotel_id, name, contact, summary, note, consent_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(h.sessionId, h.hotelId, h.name, h.contact, h.summary, h.note, this.now());
    this.clearPendingHandoff(h.sessionId);
  }

  countHandoffs(sessionId: string): number {
    const row = this.db.prepare("SELECT COUNT(*) AS n FROM handoffs WHERE session_id = ?").get(sessionId);
    return (row?.n as number) ?? 0;
  }

  // --- Olaylar -------------------------------------------------------------

  recordEvent(hotelId: string, sessionId: string | null, type: EventType, data: Record<string, unknown> = {}): void {
    this.db
      .prepare("INSERT INTO events (hotel_id, session_id, type, data, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(hotelId, sessionId, type, JSON.stringify(data), this.now());
  }

  listEvents(hotelId: string, type: EventType, limit = 100): EventRow[] {
    const rows = this.db
      .prepare("SELECT id, session_id, type, data, created_at FROM events WHERE hotel_id = ? AND type = ? ORDER BY id DESC LIMIT ?")
      .all(hotelId, type, limit);
    return rows.map((r) => ({
      id: r.id as number,
      sessionId: (r.session_id as string | null) ?? null,
      type: r.type as EventType,
      data: JSON.parse(r.data as string) as Record<string, unknown>,
      createdAt: r.created_at as number,
    }));
  }

  /** Bu oturumda üretilmiş bir rezervasyon linki mi? (Tıklama takibinde sahte kayıt önlenir.) */
  linkBelongsToSession(sessionId: string, url: string): boolean {
    const rows = this.db.prepare("SELECT data FROM events WHERE session_id = ? AND type = 'link_created'").all(sessionId);
    return rows.some((r) => (JSON.parse(r.data as string) as { url?: string }).url === url);
  }

  // --- Küçük durum kayıtları (ör. son rapor tarihi) -------------------------

  getMeta(key: string): string | null {
    const row = this.db.prepare("SELECT value FROM meta WHERE key = ?").get(key);
    return (row?.value as string | undefined) ?? null;
  }

  setMeta(key: string, value: string): void {
    this.db.prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
  }

  // --- Kullanım ------------------------------------------------------------

  private month(): string {
    return new Date(this.now()).toISOString().slice(0, 7);
  }

  addUsage(hotelId: string, u: LlmUsage): void {
    this.db
      .prepare(
        "INSERT INTO usage (hotel_id, month, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, turns) " +
          "VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT(hotel_id, month) DO UPDATE SET " +
          "input_tokens = input_tokens + excluded.input_tokens, output_tokens = output_tokens + excluded.output_tokens, " +
          "cache_read_tokens = cache_read_tokens + excluded.cache_read_tokens, " +
          "cache_write_tokens = cache_write_tokens + excluded.cache_write_tokens, turns = turns + 1",
      )
      .run(hotelId, this.month(), u.inputTokens, u.outputTokens, u.cacheReadTokens, u.cacheWriteTokens);
  }

  /** İçinde bulunulan ayın toplam kullanımı. */
  getMonthUsage(hotelId: string): UsageTotals & { month: string } {
    const month = this.month();
    const r = this.db.prepare("SELECT * FROM usage WHERE hotel_id = ? AND month = ?").get(hotelId, month);
    return {
      month,
      inputTokens: (r?.input_tokens as number) ?? 0,
      outputTokens: (r?.output_tokens as number) ?? 0,
      cacheReadTokens: (r?.cache_read_tokens as number) ?? 0,
      cacheWriteTokens: (r?.cache_write_tokens as number) ?? 0,
      turns: (r?.turns as number) ?? 0,
    };
  }

  // --- Yönetim paneli ------------------------------------------------------

  stats(hotelId: string, days: number): Record<string, number> {
    const since = this.now() - days * 86_400_000;
    const one = (sql: string, ...args: Array<string | number>) => (this.db.prepare(sql).get(...args)?.n as number) ?? 0;
    const event = (type: EventType) =>
      one("SELECT COUNT(*) AS n FROM events WHERE hotel_id = ? AND type = ? AND created_at >= ?", hotelId, type, since);
    return {
      sessions: one("SELECT COUNT(*) AS n FROM sessions WHERE hotel_id = ? AND last_at >= ? AND turns > 0", hotelId, since),
      guestMessages: one("SELECT COALESCE(SUM(turns), 0) AS n FROM sessions WHERE hotel_id = ? AND last_at >= ?", hotelId, since),
      whatsappSessions: one(
        "SELECT COUNT(*) AS n FROM sessions WHERE hotel_id = ? AND last_at >= ? AND turns > 0 AND channel = 'whatsapp'",
        hotelId,
        since,
      ),
      availabilityQueries: event("availability_query"),
      linksCreated: event("link_created"),
      linksClicked: event("link_clicked"),
      handoffs: event("handoff"),
      unanswered: event("unanswered"),
    };
  }

  listSessions(hotelId: string, limit = 50): Array<{ id: string; channel: string; turns: number; lastAt: number; preview: string }> {
    const rows = this.db
      .prepare("SELECT id, channel, turns, last_at FROM sessions WHERE hotel_id = ? AND turns > 0 ORDER BY last_at DESC LIMIT ?")
      .all(hotelId, limit);
    const first = this.db.prepare("SELECT message FROM messages WHERE session_id = ? ORDER BY id LIMIT 1");
    return rows.map((r) => {
      const m = first.get(r.id as string);
      const content = m ? (JSON.parse(m.message as string) as ChatMessage).content : "";
      return {
        id: r.id as string,
        channel: r.channel as string,
        turns: r.turns as number,
        lastAt: r.last_at as number,
        preview: typeof content === "string" ? content.slice(0, 120) : "",
      };
    });
  }

  listHandoffs(hotelId: string, limit = 100): Array<HandoffRecord & { consentAt: number }> {
    const rows = this.db
      .prepare("SELECT session_id, hotel_id, name, contact, summary, note, consent_at FROM handoffs WHERE hotel_id = ? ORDER BY id DESC LIMIT ?")
      .all(hotelId, limit);
    return rows.map((r) => ({
      sessionId: r.session_id as string,
      hotelId: r.hotel_id as string,
      name: r.name as string,
      contact: r.contact as string,
      summary: r.summary as string,
      note: (r.note as string | null) ?? null,
      consentAt: r.consent_at as number,
    }));
  }

  // --- Silme ve saklama ----------------------------------------------------

  /** Misafirin isteğiyle oturumu ve ona bağlı tüm kayıtları siler. */
  deleteSession(id: string, hotelId: string): boolean {
    const r = this.db.prepare("DELETE FROM sessions WHERE id = ? AND hotel_id = ?").run(id, hotelId);
    if (Number(r.changes) > 0) this.db.prepare("DELETE FROM events WHERE session_id = ? AND hotel_id = ?").run(id, hotelId);
    return Number(r.changes) > 0;
  }

  /** Saklama süresi dolan oturumları (mesaj ve devirlerle) ve olayları siler. Aylık kullanım toplamları kişisel veri içermez, kalır. */
  purgeExpired(hotelId: string, retentionDays: number): number {
    const cutoff = this.now() - retentionDays * 86_400_000;
    const r = this.db.prepare("DELETE FROM sessions WHERE hotel_id = ? AND last_at < ?").run(hotelId, cutoff);
    this.db.prepare("DELETE FROM events WHERE hotel_id = ? AND created_at < ?").run(hotelId, cutoff);
    return Number(r.changes);
  }

  close(): void {
    this.db.close();
  }
}
