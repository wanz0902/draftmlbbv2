import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const DB_PATH = path.resolve(DB_DIR, 'mlbb_master.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('cache_size = -64000');
  _db.pragma('temp_store = MEMORY');
  _db.pragma('mmap_size = 268435456');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS heroes (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      hero_id             TEXT UNIQUE NOT NULL,
      hero_name           TEXT NOT NULL,
      title               TEXT,
      liquipedia_page     TEXT,
      roles               TEXT NOT NULL DEFAULT '[]',
      lanes               TEXT NOT NULL DEFAULT '[]',
      specialty           TEXT DEFAULT '[]',
      difficulty          INTEGER DEFAULT 2,
      release_date        TEXT,
      region              TEXT,
      stat_hp             REAL DEFAULT 0,
      stat_hp_regen       REAL DEFAULT 0,
      stat_mana           REAL DEFAULT 0,
      stat_mana_regen     REAL DEFAULT 0,
      stat_phys_atk       REAL DEFAULT 0,
      stat_phys_def       REAL DEFAULT 0,
      stat_magic_power    REAL DEFAULT 0,
      stat_magic_def      REAL DEFAULT 0,
      stat_atk_speed      TEXT,
      stat_move_speed     REAL DEFAULT 0,
      skills              TEXT DEFAULT '{}',
      win_rate_overall    REAL DEFAULT 0.0,
      pick_rate_overall   REAL DEFAULT 0.0,
      ban_rate_overall    REAL DEFAULT 0.0,
      tournament_presence REAL DEFAULT 0.0,
      blue_side_wr        REAL DEFAULT 0.0,
      red_side_wr         REAL DEFAULT 0.0,
      picks_total         INTEGER DEFAULT 0,
      bans_total          INTEGER DEFAULT 0,
      tier_rating         TEXT DEFAULT 'B',
      tier_score          REAL DEFAULT 50.0,
      counters            TEXT DEFAULT '[]',
      countered_by        TEXT DEFAULT '[]',
      synergies           TEXT DEFAULT '[]',
      pro_players         TEXT DEFAULT '[]',
      patch_history       TEXT DEFAULT '[]',
      scraped_at          INTEGER,
      data_quality        INTEGER DEFAULT 0,
      created_at          INTEGER DEFAULT (unixepoch()),
      updated_at          INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id   TEXT UNIQUE NOT NULL,
      name            TEXT NOT NULL,
      liquipedia_page TEXT,
      tier            TEXT,
      region          TEXT,
      start_date      TEXT,
      end_date        TEXT,
      prize_pool      TEXT,
      organizer       TEXT,
      patch_version   TEXT,
      status          TEXT DEFAULT 'completed',
      teams           TEXT DEFAULT '[]',
      scraped_at      INTEGER,
      created_at      INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS spells (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      spell_id        TEXT UNIQUE NOT NULL,
      name            TEXT NOT NULL,
      description     TEXT,
      cooldown        INTEGER,
      image_path      TEXT,
      stats           TEXT DEFAULT '{}',
      scraped_at      INTEGER,
      created_at      INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS emblems (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      emblem_id       TEXT UNIQUE NOT NULL,
      name            TEXT NOT NULL,
      category        TEXT,
      description     TEXT,
      stats_provided  TEXT DEFAULT '{}',
      image_path      TEXT,
      scraped_at      INTEGER,
      created_at      INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS matches (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id        TEXT UNIQUE NOT NULL,
      tournament_id   TEXT REFERENCES tournaments(tournament_id),
      blue_team       TEXT,
      red_team        TEXT,
      winner          TEXT,
      game_number     INTEGER DEFAULT 1,
      match_date      TEXT,
      patch_version   TEXT,
      duration_text   TEXT,
      liquipedia_url  TEXT,
      draft_data      TEXT DEFAULT '{}',
      blue_comp_type  TEXT,
      red_comp_type   TEXT,
      scraped_at      INTEGER,
      created_at      INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS draft_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id    TEXT REFERENCES matches(match_id),
      phase       TEXT NOT NULL,
      sequence    INTEGER NOT NULL,
      side        TEXT NOT NULL,
      action_type TEXT NOT NULL,
      hero_id     TEXT,
      hero_name   TEXT,
      created_at  INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS teams (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id         TEXT UNIQUE NOT NULL,
      name            TEXT NOT NULL,
      abbreviation    TEXT,
      region          TEXT,
      logo_filename   TEXT,
      liquipedia_page TEXT,
      active_roster   TEXT DEFAULT '[]',
      draft_tendencies TEXT DEFAULT '{}',
      win_rate        REAL DEFAULT 0.0,
      total_matches   INTEGER DEFAULT 0,
      scraped_at      INTEGER,
      created_at      INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS meta_snapshots (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      patch_version     TEXT NOT NULL,
      snapshot_date     TEXT NOT NULL,
      tier_data         TEXT NOT NULL DEFAULT '{}',
      top_picks         TEXT DEFAULT '[]',
      top_bans          TEXT DEFAULT '[]',
      rising_heroes     TEXT DEFAULT '[]',
      falling_heroes    TEXT DEFAULT '[]',
      meta_description  TEXT,
      dominant_archetype TEXT,
      created_at        INTEGER DEFAULT (unixepoch()),
      UNIQUE(patch_version)
    );

    CREATE TABLE IF NOT EXISTS scrape_log (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_type   TEXT NOT NULL,
      resource_id     TEXT NOT NULL,
      endpoint_url    TEXT,
      http_status     INTEGER,
      success         INTEGER DEFAULT 1,
      records_written INTEGER DEFAULT 0,
      error_message   TEXT,
      scraped_at      INTEGER DEFAULT (unixepoch()),
      UNIQUE(resource_type, resource_id)
    );

    CREATE INDEX IF NOT EXISTS idx_heroes_tier ON heroes(tier_rating);
    CREATE INDEX IF NOT EXISTS idx_heroes_data_quality ON heroes(data_quality);
    CREATE INDEX IF NOT EXISTS idx_heroes_scraped ON heroes(scraped_at);
    CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
    CREATE INDEX IF NOT EXISTS idx_draft_events_match ON draft_events(match_id);
    CREATE INDEX IF NOT EXISTS idx_scrape_log_lookup ON scrape_log(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_scrape_log_time ON scrape_log(scraped_at);
    CREATE INDEX IF NOT EXISTS idx_meta_patch ON meta_snapshots(patch_version);

    CREATE TABLE IF NOT EXISTS ai_request_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      team_blue TEXT,
      team_red TEXT,
      draft_phase TEXT,
      request_type TEXT NOT NULL,
      provider_used TEXT,
      model_used TEXT,
      tokens_input INTEGER,
      tokens_output INTEGER,
      cost_usd REAL,
      response_time_ms INTEGER,
      cache_hit INTEGER DEFAULT 0,
      fallback_used INTEGER DEFAULT 0,
      error_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_request_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_logs_provider ON ai_request_logs(provider_used);

    CREATE TABLE IF NOT EXISTS visitors (
      visitor_id  TEXT PRIMARY KEY,
      first_seen  INTEGER DEFAULT (unixepoch()),
      last_seen   INTEGER DEFAULT (unixepoch()),
      visit_count INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen);
  `);
}

export function needsRescrape(
  db: Database.Database,
  resourceType: string,
  resourceId: string,
  maxAgeHours: number = 48
): boolean {
  try {
    const row = db.prepare(`
      SELECT scraped_at FROM scrape_log
      WHERE resource_type = ? AND resource_id = ? AND success = 1
      ORDER BY scraped_at DESC LIMIT 1
    `).get(resourceType, resourceId) as { scraped_at: number } | undefined;

    if (!row?.scraped_at) return true;
    const ageHours = (Date.now() / 1000 - row.scraped_at) / 3600;
    return ageHours > maxAgeHours;
  } catch {
    return true;
  }
}

export function logScrape(
  db: Database.Database,
  resourceType: string,
  resourceId: string,
  opts: {
    url?: string;
    status?: number;
    success?: boolean;
    records?: number;
    error?: string;
  } = {}
): void {
  try {
    db.prepare(`
      INSERT INTO scrape_log (resource_type, resource_id, endpoint_url, http_status, success, records_written, error_message, scraped_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT(resource_type, resource_id) DO UPDATE SET
        endpoint_url    = excluded.endpoint_url,
        http_status     = excluded.http_status,
        success         = excluded.success,
        records_written = excluded.records_written,
        error_message   = excluded.error_message,
        scraped_at      = unixepoch()
    `).run(
      resourceType,
      resourceId,
      opts.url ?? null,
      opts.status ?? 200,
      opts.success !== false ? 1 : 0,
      opts.records ?? 0,
      opts.error ?? null
    );
  } catch (err) {
    console.error('[DB] Failed to write scrape_log:', err);
  }
}

export function seedHeroesIfEmpty(db: Database.Database): void {
  const countObj = db.prepare('SELECT COUNT(*) as c FROM heroes').get() as { c: number } | undefined;
  const count = countObj?.c || 0;
  if (count >= 100) {
    console.log(`[DB] Heroes already seeded: ${count} rows. Skipping.`);
    return;
  }

  console.log('[DB] Seeding heroes from heroes_master.json...');

  const heroesPath = path.resolve(process.cwd(), 'src/data/heroes_master.json');
  if (!fs.existsSync(heroesPath)) {
      console.log(`[DB] Seeding failed. heroes_master.json not found.`);
      return;
  }
  const heroes = JSON.parse(fs.readFileSync(heroesPath, 'utf8'));

  const insert = db.prepare(`
    INSERT OR IGNORE INTO heroes (hero_id, hero_name, roles, lanes, data_quality)
    VALUES (@slug, @hero_name, @roles, @lanes, 0)
  `);

  const insertMany = db.transaction((rows: any[]) => {
    for (const h of rows) {
      insert.run({
        slug: h.slug ?? h.hero_name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
        hero_name: h.hero_name,
        roles: JSON.stringify(Array.isArray(h.role) ? h.role : [h.role].filter(Boolean)),
        lanes: JSON.stringify(Array.isArray(h.lanes) ? h.lanes : []),
      });
    }
  });

  insertMany(heroes);
  console.log(`[DB] Seeded ${heroes.length} heroes from heroes_master.json`);
}

export function getDbHealth(db: Database.Database): Record<string, number> {
  const tables = ['heroes', 'tournaments', 'matches', 'draft_events', 'teams', 'meta_snapshots', 'scrape_log'];
  const result: Record<string, number> = {};
  for (const table of tables) {
    try {
      result[table] = (db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }).c;
    } catch {
      result[table] = -1;
    }
  }

  try {
    const quality = db.prepare(`
      SELECT data_quality, COUNT(*) as c FROM heroes GROUP BY data_quality
    `).all() as Array<{ data_quality: number; c: number }>;
    for (const q of quality) {
      result[`heroes_quality_${q.data_quality}`] = q.c;
    }
  } catch {}

  return result;
}

export function recordVisitor(db: Database.Database, visitorId: string): void {
  try {
    db.prepare(`
      INSERT INTO visitors (visitor_id, first_seen, last_seen, visit_count)
      VALUES (?, unixepoch(), unixepoch(), 1)
      ON CONFLICT(visitor_id) DO UPDATE SET
        last_seen = unixepoch(),
        visit_count = visit_count + 1
    `).run(visitorId);
  } catch (err) {
    console.error('[DB] Failed to record visitor:', err);
  }
}

export function getVisitorStats(db: Database.Database): { online: number; totalUsers: number } {
  try {
    const totalRow = db.prepare('SELECT COUNT(*) as c FROM visitors').get() as { c: number } | undefined;
    const totalUsers = totalRow?.c || 0;
    return { online: 0, totalUsers };
  } catch {
    return { online: 0, totalUsers: 0 };
  }
}

export function logAIRequest(data: {
  sessionId: string;
  teamBlue?: string;
  teamRed?: string;
  draftPhase?: string;
  requestType: string;
  providerUsed?: string;
  modelUsed?: string;
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
  responseTimeMs?: number;
  cacheHit?: boolean;
  fallbackUsed?: boolean;
  errorCode?: string;
}): void {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO ai_request_logs (
        session_id, team_blue, team_red, draft_phase, request_type,
        provider_used, model_used, tokens_input, tokens_output, cost_usd,
        response_time_ms, cache_hit, fallback_used, error_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.sessionId, data.teamBlue ?? null, data.teamRed ?? null,
      data.draftPhase ?? null, data.requestType,
      data.providerUsed ?? null, data.modelUsed ?? null,
      data.tokensInput ?? null, data.tokensOutput ?? null, data.costUsd ?? null,
      data.responseTimeMs ?? null,
      data.cacheHit ? 1 : 0, data.fallbackUsed ? 1 : 0,
      data.errorCode ?? null
    );
  } catch (err) {
    console.error('[AI Log] Failed to log request:', err);
    // Never throw — logging failure must not crash the main request
  }
}
