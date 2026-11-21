import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ChatMessage } from "../llm/types.js";

export interface Session {
  id: string;
  hotelId: string;
  channel: string;
  turns: number;
  toolCalls: number;
  /** insana_devret çağrıldıysa, form gönderilene kadar bekleyen talep özeti. */
  pendingHandoff: string | null;
}

export interface HandoffRecord {
  sessionId: string;
  hotelId: string;
  name: string;
  contact: string;
  summary: string;
  note: string | null;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL,
  channel TEXT NOT NULL,
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
`;

/** Oturum, mesaj ve devir kayıtları. Dosya yolu ":memory:" ise yalnızca bellekte tutar. */
export class Store {
  private readonly db: DatabaseSync;

  constructor(file: string, private readonly now: () => number = Date.now) {
    if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.db.exec(SCHEMA);
  }

  createSession(hotelId: string, channel: string): Session {
    const id = randomUUID();
    const t = this.now();
    this.db
      .prepare("INSERT INTO sessions (id, hotel_id, channel, created_at, last_at) VALUES (?, ?, ?, ?, ?)")
      .run(id, hotelId, channel, t, t);
    return { id, hotelId, channel, turns: 0, toolCalls: 0, pendingHandoff: null };
  }

  /** Oturum başka bir otele aitse bulunamadı sayılır. */
  getSession(id: string, hotelId: string): Session | null {
    const row = this.db
      .prepare("SELECT id, hotel_id, channel, turns, tool_calls, pending_handoff FROM sessions WHERE id = ? AND hotel_id = ?")
      .get(id, hotelId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      hotelId: row.hotel_id as string,
      channel: row.channel as string,
      turns: row.turns as number,
      toolCalls: row.tool_calls as number,
      pendingHandoff: (row.pending_handoff as string | null) ?? null,
    };
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

  saveHandoff(h: HandoffRecord): void {
    this.db
      .prepare(
        "INSERT INTO handoffs (session_id, hotel_id, name, contact, summary, note, consent_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(h.sessionId, h.hotelId, h.name, h.contact, h.summary, h.note, this.now());
    this.db.prepare("UPDATE sessions SET pending_handoff = NULL WHERE id = ?").run(h.sessionId);
  }

  countHandoffs(sessionId: string): number {
    const row = this.db.prepare("SELECT COUNT(*) AS n FROM handoffs WHERE session_id = ?").get(sessionId);
    return (row?.n as number) ?? 0;
  }

  /** Misafirin isteğiyle oturumu ve ona bağlı tüm kayıtları siler. */
  deleteSession(id: string, hotelId: string): boolean {
    const r = this.db.prepare("DELETE FROM sessions WHERE id = ? AND hotel_id = ?").run(id, hotelId);
    return Number(r.changes) > 0;
  }

  /** Saklama süresi dolan oturumları (mesajlar ve devirlerle birlikte) siler. */
  purgeExpired(hotelId: string, retentionDays: number): number {
    const cutoff = this.now() - retentionDays * 86_400_000;
    const r = this.db.prepare("DELETE FROM sessions WHERE hotel_id = ? AND last_at < ?").run(hotelId, cutoff);
    return Number(r.changes);
  }

  close(): void {
    this.db.close();
  }
}
