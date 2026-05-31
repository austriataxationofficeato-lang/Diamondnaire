// db.js — SQLite database setup
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'slots.db');

import fs from 'fs';
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY,
    telegram_id     INTEGER UNIQUE NOT NULL,
    username        TEXT,
    first_name      TEXT NOT NULL,
    last_name       TEXT,
    photo_url       TEXT,
    credits         INTEGER NOT NULL DEFAULT 100,
    total_wagered   INTEGER NOT NULL DEFAULT 0,
    total_won       INTEGER NOT NULL DEFAULT 0,
    total_spins     INTEGER NOT NULL DEFAULT 0,
    biggest_win     INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen       DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS spins (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    bet         INTEGER NOT NULL,
    reels       TEXT NOT NULL,
    win         INTEGER NOT NULL DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    type            TEXT NOT NULL CHECK(type IN ('deposit','withdraw','win','bet','bonus')),
    amount          INTEGER NOT NULL,
    telegram_charge_id TEXT,
    status          TEXT NOT NULL DEFAULT 'completed',
    note            TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_credits ON users(credits DESC);
  CREATE INDEX IF NOT EXISTS idx_users_total_won ON users(total_won DESC);
  CREATE INDEX IF NOT EXISTS idx_spins_user ON spins(user_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
`);

// ── User queries ─────────────────────────────────────────────────────────────
export const upsertUser = db.prepare(`
  INSERT INTO users (telegram_id, username, first_name, last_name, photo_url)
  VALUES (@telegram_id, @username, @first_name, @last_name, @photo_url)
  ON CONFLICT(telegram_id) DO UPDATE SET
    username   = excluded.username,
    first_name = excluded.first_name,
    last_name  = excluded.last_name,
    photo_url  = excluded.photo_url,
    last_seen  = CURRENT_TIMESTAMP
  RETURNING *
`);

export const getUserByTelegramId = db.prepare(
  `SELECT * FROM users WHERE telegram_id = ?`
);

export const getUserById = db.prepare(
  `SELECT * FROM users WHERE id = ?`
);

export const deductCredits = db.prepare(`
  UPDATE users SET credits = credits - ?, total_wagered = total_wagered + ?, total_spins = total_spins + 1
  WHERE id = ? AND credits >= ?
`);

export const addWin = db.prepare(`
  UPDATE users SET
    credits    = credits + ?,
    total_won  = total_won + ?,
    biggest_win = MAX(biggest_win, ?)
  WHERE id = ?
`);

export const addCredits = db.prepare(`
  UPDATE users SET credits = credits + ? WHERE id = ?
`);

export const recordSpin = db.prepare(`
  INSERT INTO spins (user_id, bet, reels, win) VALUES (?, ?, ?, ?)
`);

export const recordTransaction = db.prepare(`
  INSERT INTO transactions (user_id, type, amount, telegram_charge_id, status, note)
  VALUES (@user_id, @type, @amount, @telegram_charge_id, @status, @note)
`);

export const getLeaderboard = db.prepare(`
  SELECT 
    telegram_id, first_name, username, photo_url,
    credits, total_won, total_wagered, total_spins, biggest_win,
    RANK() OVER (ORDER BY total_won DESC) as rank
  FROM users
  ORDER BY total_won DESC
  LIMIT 50
`);

export const getUserRank = db.prepare(`
  SELECT rank FROM (
    SELECT id, RANK() OVER (ORDER BY total_won DESC) as rank FROM users
  ) WHERE id = ?
`);

export const getRecentSpins = db.prepare(`
  SELECT reels, win, bet, created_at FROM spins
  WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
`);

export const getStats = db.prepare(`
  SELECT 
    COUNT(*) as total_users,
    SUM(total_spins) as total_spins,
    SUM(total_wagered) as total_wagered,
    SUM(total_won) as total_paid_out
  FROM users
`);

export default db;
