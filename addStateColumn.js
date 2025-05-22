const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

async function addStateColumn() {
  const dbPath = path.join(__dirname, 'data/hail_reports.db');

  // Ensure DB file exists
  if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file not found at:', dbPath);
    return;
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  const tables = ['hail_reports', 'historical_hail_reports'];

  for (const table of tables) {
    const columns = await db.all(`PRAGMA table_info(${table});`);
    const hasStateColumn = columns.some((col) => col.name === 'state');

    if (hasStateColumn) {
      console.log(`✅ '${table}' already has 'state' column.`);
    } else {
      await db.run(`ALTER TABLE ${table} ADD COLUMN state TEXT;`);
      console.log(`🛠️ Added 'state' column to '${table}'.`);
    }
  }

  await db.close();
  console.log('✅ All done.');
}

addStateColumn();
