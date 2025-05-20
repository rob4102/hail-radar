const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function initDB() {
  const db = await open({
    filename: path.join(__dirname, 'data/hail_reports.db'),
    driver: sqlite3.Database
  });

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

  return db;
}

module.exports = { initDB };
