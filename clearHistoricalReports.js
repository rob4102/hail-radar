const { initDB } = require('./db');

async function clearHistoricalData() {
  const db = await initDB();

  await db.run(`DELETE FROM historical_hail_reports`);
  console.log('🧹 All historical hail reports have been cleared.');

  const result = await db.get(`SELECT COUNT(*) as count FROM historical_hail_reports`);
  console.log(`✅ Rows remaining: ${result.count}`);
}

clearHistoricalData();
