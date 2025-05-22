const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function initDB() {
  const db = await open({
    filename: path.join(__dirname, 'data/hail_reports.db'),
    driver: sqlite3.Database
  });

  // Tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS request_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      ip TEXT,
      method TEXT,
      url TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS historical_hail_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      time TEXT,
      location TEXT,
      lat REAL,
      lon REAL,
      size TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS hail_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      time TEXT,
      location TEXT,
      lat REAL,
      lon REAL,
      size TEXT
    );
  `);

  // ✅ Check for missing columns: state
  const addColumnIfMissing = async (table, column, type) => {
    const existing = await db.all(`PRAGMA table_info(${table});`);
    const columnExists = existing.some(col => col.name === column);
    if (!columnExists) {
      console.log(`⚙️ Adding column "${column}" to ${table}`);
      await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
    }
  };

  await addColumnIfMissing('hail_reports', 'state', 'TEXT');
  await addColumnIfMissing('historical_hail_reports', 'state', 'TEXT');

  return db;
}

module.exports = { initDB };
