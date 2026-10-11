import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_DIR = path.resolve(process.cwd(), 'database');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const dbPath = path.join(DB_DIR, 'bot.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS limits (
    jid TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    bonus INTEGER DEFAULT 0,
    updated_at INTEGER
  )
`);

export function readDb(key, fallback = null) {
  const file = path.join(DB_DIR, `${key}.json`);
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeDb(key, data) {
  const file = path.join(DB_DIR, `${key}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function getLimitEntry(jid) {
  if (!jid) return { count: 0, bonus: 0 };
  const row = db.prepare('SELECT count, bonus FROM limits WHERE jid = ?').get(jid);
  if (row) return { count: row.count, bonus: row.bonus };
  db.prepare('INSERT INTO limits (jid, count, bonus, updated_at) VALUES (?, 0, 0, ?)')
    .run(jid, Date.now());
  return { count: 0, bonus: 0 };
}

export function incrementLimit(jid, amount = 1) {
  getLimitEntry(jid);
  db.prepare('UPDATE limits SET count = count + ?, updated_at = ? WHERE jid = ?')
    .run(amount, Date.now(), jid);
}

export function deductLimit(jid, amount = 1) {
  getLimitEntry(jid);
  db.prepare('UPDATE limits SET count = count + ?, updated_at = ? WHERE jid = ?')
    .run(amount, Date.now(), jid);
}

export function isLimitExceeded(jid, max) {
  const entry = getLimitEntry(jid);
  return entry.count >= max + (entry.bonus || 0);
}

export function decrementLimit(jid, amount = 1) {
  getLimitEntry(jid);
  db.prepare('UPDATE limits SET count = MAX(0, count - ?), updated_at = ? WHERE jid = ?')
    .run(amount, Date.now(), jid);
}

export function setLimitBonus(jid, bonus) {
  getLimitEntry(jid);
  db.prepare('UPDATE limits SET bonus = ?, updated_at = ? WHERE jid = ?')
    .run(bonus, Date.now(), jid);
}

export function resetAllLimits() {
  db.prepare('UPDATE limits SET count = 0, updated_at = ?').run(Date.now());
}

export default db;