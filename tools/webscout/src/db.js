import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Araç kökü: nereden çalıştırılırsa çalıştırılsın veri hep tools/webscout/data altında kalır.
export const TOOL_ROOT = join(import.meta.dirname, '..');
export const DATA_DIR = join(TOOL_ROOT, 'data');
export const OUT_DIR = join(TOOL_ROOT, 'out');

export const BUSINESS_STATUSES = [
  'new', 'visit_planned', 'visited', 'offer_sent', 'won', 'lost', 'do_not_contact',
];
// Sahadaki ziyaret sonucu → adayın durumu (null = durumu değiştirme). "Kazanıldı" hiçbir sonuçla geri alınmaz.
export const VISIT_OUTCOMES = {
  talked: 'visited',           // Görüşüldü
  demo_shown: 'visited',       // Demo gösterildi
  offer_requested: 'visited',  // Teklif istendi (teklif gidince "offer_sent" elle)
  come_back: 'visit_planned',  // Tekrar gel (yetkili yoktu / müsait değildi)
  closed: 'visit_planned',     // Kapalıydı
  not_interested: 'lost',      // İlgilenmedi
  won: 'won',                  // Anlaşıldı
};
export const PARTNER_STATUSES = [
  'new', 'contacted', 'meeting', 'active', 'declined', 'do_not_contact',
];

function addColumn(db, table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

export function openDb(path = process.env.WEBSCOUT_DB || join(DATA_DIR, 'webscout.db')) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  // Bekleme süresi HER ŞEYDEN ÖNCE ayarlanır: panel aynı anda birkaç süreç açar (liste + profil + iş durumu);
  // journal_mode ve şema komutları kilide takılırsa beklemeden "database is locked" verir.
  db.exec('PRAGMA busy_timeout = 8000');
  db.exec(`
    PRAGMA journal_mode = WAL;

    -- Taranacak yerel işletmeler (müşteri adayları = prospects)
    CREATE TABLE IF NOT EXISTS businesses (
      id         INTEGER PRIMARY KEY,
      osm_id     TEXT UNIQUE,
      name       TEXT NOT NULL,
      category   TEXT,
      city       TEXT,
      address    TEXT,
      website    TEXT,
      phone      TEXT,
      status     TEXT NOT NULL DEFAULT 'new',
      notes      TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Her tarama ayrı bir satır; en son tarama geçerli sayılır
    CREATE TABLE IF NOT EXISTS scans (
      id          INTEGER PRIMARY KEY,
      business_id INTEGER NOT NULL REFERENCES businesses(id),
      scanned_at  TEXT NOT NULL DEFAULT (datetime('now')),
      ok          INTEGER NOT NULL,
      error       TEXT,
      final_url   TEXT,
      http_status INTEGER,
      response_ms INTEGER,
      score       INTEGER,
      findings    TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_scans_business ON scans(business_id, id);

    -- İş birliği yapılacak aracılar (Steuerberater, dernek, Innung...)
    CREATE TABLE IF NOT EXISTS partners (
      id         INTEGER PRIMARY KEY,
      osm_id     TEXT UNIQUE,
      name       TEXT NOT NULL,
      type       TEXT,
      city       TEXT,
      address    TEXT,
      website    TEXT,
      phone      TEXT,
      status     TEXT NOT NULL DEFAULT 'new',
      notes      TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Çözümlenmiş OSM idari sınırları: şehirler ve altlarındaki ilçe/mahalleler.
    -- id = OSM relation id (Overpass alan kimliği = 3600000000 + id)
    CREATE TABLE IF NOT EXISTS areas (
      id          INTEGER PRIMARY KEY,
      kind        TEXT NOT NULL,            -- 'city' | 'district'
      country     TEXT NOT NULL,
      city        TEXT NOT NULL,
      name        TEXT NOT NULL,
      admin_level INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_areas_city ON areas(country, city, kind);

    -- Bir işletme hangi ilçe/mahalle sorgusunda bulundu (bir işletme iç içe birden çok alanda olabilir)
    CREATE TABLE IF NOT EXISTS business_areas (
      business_id INTEGER NOT NULL REFERENCES businesses(id),
      area_id     INTEGER NOT NULL REFERENCES areas(id),
      PRIMARY KEY (business_id, area_id)
    );

    -- Seviye 2 derin profil: işletme başına en son zenginleştirme (JSON). Ekran görüntüleri data/shots altında.
    CREATE TABLE IF NOT EXISTS profiles (
      business_id INTEGER PRIMARY KEY REFERENCES businesses(id),
      enriched_at TEXT NOT NULL DEFAULT (datetime('now')),
      activity    TEXT,                       -- 'active_likely' | 'closed_suspected' | 'unknown'
      auto        INTEGER NOT NULL DEFAULT 0, -- 1 = arama sonrası otomatik seçildi, 0 = elle istendi
      profile     TEXT NOT NULL
    );

    -- Seviye 3 şablon taslağı: işletme başına tek taslak. Dosyalar data/drafts/<token>/ altında;
    -- token gizli demo adresidir (/demo/<token>) ve yeniden üretimde değişmez.
    CREATE TABLE IF NOT EXISTS drafts (
      business_id INTEGER PRIMARY KEY REFERENCES businesses(id),
      token       TEXT NOT NULL UNIQUE,
      template    TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at  TEXT NOT NULL,
      kit         TEXT NOT NULL
    );

    -- Hangi bölge + kategori ne zaman çekildi (kapsam bilgisi)
    CREATE TABLE IF NOT EXISTS fetches (
      id         INTEGER PRIMARY KEY,
      country    TEXT NOT NULL,
      city       TEXT NOT NULL,
      area_id    INTEGER,
      category   TEXT NOT NULL,
      found      INTEGER NOT NULL,
      no_site    INTEGER NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  addColumn(db, 'businesses', 'country', "TEXT NOT NULL DEFAULT 'DE'");
  addColumn(db, 'businesses', 'postcode', 'TEXT');
  addColumn(db, 'businesses', 'suburb', 'TEXT');
  // E-posta adresi bilerek toplanmıyor: soğuk e-posta YOK (UWG §7).
  addColumn(db, 'businesses', 'lat', 'REAL');
  addColumn(db, 'businesses', 'lon', 'REAL');
  addColumn(db, 'businesses', 'updated_at', 'TEXT');
  addColumn(db, 'businesses', 'brand', 'TEXT'); // OSM marka etiketi: zincir şubesi, aday değil
  // Ziyaret planı: opening_hours = OSM etiketi (ham); visit_date/visit_order = planlanan gün ve rotadaki sıra
  addColumn(db, 'businesses', 'opening_hours', 'TEXT');
  addColumn(db, 'businesses', 'visit_date', 'TEXT');
  addColumn(db, 'businesses', 'visit_order', 'INTEGER');
  // Saha kayıtları: her ziyaret ayrı satır (sonuç, not, bir sonraki ziyaret tarihi). Kişisel veri/e-posta yok.
  db.exec(`CREATE TABLE IF NOT EXISTS visits (
      id          INTEGER PRIMARY KEY,
      business_id INTEGER NOT NULL REFERENCES businesses(id),
      at          TEXT NOT NULL DEFAULT (datetime('now')),
      outcome     TEXT NOT NULL,
      note        TEXT NOT NULL DEFAULT '',
      next_at     TEXT,
      by_user     TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_visits_business ON visits(business_id, id);`);
  // Durumun son değiştiği an (satış hunisi hatırlatmaları: "teklif verildi, 7 gündür ses yok").
  // Tetikleyici her yoldan (panel, saha kaydı, plan, CLI) gelen değişikliği yakalar.
  addColumn(db, 'businesses', 'status_at', 'TEXT');
  db.exec(`CREATE TRIGGER IF NOT EXISTS trg_business_status_at AFTER UPDATE OF status ON businesses
    WHEN NEW.status IS NOT OLD.status
    BEGIN UPDATE businesses SET status_at = datetime('now') WHERE id = NEW.id; END;`);
  addColumn(db, 'partners', 'country', "TEXT NOT NULL DEFAULT 'DE'");
  // Seviye 2 doğrulamasından sonraki puan: yanlış alarm çıkan bulguların puanı düşülür (yoksa NULL)
  addColumn(db, 'profiles', 'adjusted_score', 'INTEGER');
  return db;
}
