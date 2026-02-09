import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export function initDb(dbPath) {
  // Ensure data directory exists
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      domain TEXT NOT NULL,
      title TEXT,
      timestamp INTEGER NOT NULL,
      minute_of_day INTEGER
    );

    CREATE TABLE IF NOT EXISTS domain_stats (
      domain TEXT PRIMARY KEY,
      url TEXT,
      title TEXT,
      visit_count INTEGER DEFAULT 0,
      last_seen INTEGER,
      score REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS domain_minutes (
      domain TEXT NOT NULL,
      minute INTEGER NOT NULL,
      visit_count INTEGER DEFAULT 0,
      PRIMARY KEY (domain, minute)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_visits_domain ON visits(domain);
    CREATE INDEX IF NOT EXISTS idx_visits_timestamp ON visits(timestamp);
    CREATE INDEX IF NOT EXISTS idx_visits_minute ON visits(minute_of_day);
    CREATE INDEX IF NOT EXISTS idx_domain_stats_score ON domain_stats(score DESC);
  `);

  // Migrations
  try {
    db.exec(`ALTER TABLE domain_stats ADD COLUMN url TEXT`);
  } catch (e) {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE visits ADD COLUMN minute_of_day INTEGER`);
  } catch (e) {
    // Column already exists
  }

  // Backfill minute_of_day from timestamp for existing visits
  db.exec(`
    UPDATE visits
    SET minute_of_day = (
      CAST(strftime('%H', timestamp / 1000, 'unixepoch', 'localtime') AS INTEGER) * 60 +
      CAST(strftime('%M', timestamp / 1000, 'unixepoch', 'localtime') AS INTEGER)
    )
    WHERE minute_of_day IS NULL
  `);

  // Migrate from old domain_hours to domain_minutes if needed
  const hasOldTable = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='domain_hours'
  `).get();

  if (hasOldTable) {
    // Convert hours to minutes (use middle of hour: hour * 60 + 30)
    db.exec(`
      INSERT OR IGNORE INTO domain_minutes (domain, minute, visit_count)
      SELECT domain, hour * 60 + 30, visit_count FROM domain_hours
    `);
    db.exec(`DROP TABLE domain_hours`);
  }

  return db;
}
