const express = require('express');
const { initDB } = require('./db');
const fetchHailReports = require('./fetchHailReports');
const fetchAndSaveAllReports = require('./fetchAndSaveAllReports');

const app = express();
const PORT = process.env.PORT || 3000;

app.post('/api/fetch-and-save-all', async (req, res) => {
  try {
    const result = await fetchAndSaveAllReports();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('❌ Error in /api/fetch-and-save-all:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});



// Endpoint to fetch latest 100 hail reports
app.get('/api/hail-reports', async (req, res) => {
  const db = await initDB();
  const results = await db.all('SELECT * FROM hail_reports ORDER BY date DESC, time DESC LIMIT 100');
  res.json(results);
});

// Start server and scraping logic
app.listen(PORT, async () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);

  // Initial scrape on server startup
  try {
    await fetchAndSaveAllReports();
  } catch (err) {
    console.error('❌ Error scraping on startup:', err.message);
  }

  // Schedule scraping every 24 hours (86,400,000 ms)
  setInterval(async () => {
    console.log(`🔄 Running scheduled hail report fetch at ${new Date().toLocaleString()}`);
    try {
      await fetchAndSaveAllReports();
    } catch (err) {
      console.error('❌ Error during scheduled scrape:', err.message);
    }
  }, 24 * 60 * 60 * 1000);
});
