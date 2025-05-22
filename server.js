const express = require('express');
const { initDB } = require('./db');
const fetchHailReports = require('./fetchHailReports');
const fetchAndSaveAllReports = require('./fetchAndSaveAllReports');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = ['http://localhost:3000', 'https://almonford.com'];
app.use(cors({
 origin: function (origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    console.warn(`❌ CORS blocked request from: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  }
}
}));

app.use(async (req, res, next) => {
  try {
    const db = await initDB();
    const timestamp = new Date().toISOString();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const method = req.method;
    const url = req.originalUrl;

    await db.run(
      `INSERT INTO request_logs (timestamp, ip, method, url) VALUES (?, ?, ?, ?)`,
      [timestamp, ip, method, url]
    );

    console.log(`📥 ${timestamp} - ${ip} → ${method} ${url}`);
  } catch (err) {
    console.warn('⚠️ Failed to log request:', err.message);
  }

  next();
});

app.get('/api/request-logs', async (req, res) => {
  try {
    const db = await initDB();
    const logs = await db.all(
      'SELECT * FROM request_logs ORDER BY timestamp DESC LIMIT 200'
    );
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/states', async (req, res) => {
  try {
    const db = await initDB();
    const rows = await db.all(`
      SELECT DISTINCT state FROM hail_reports
      WHERE state IS NOT NULL AND state != ''
      ORDER BY state ASC
    `);
    const states = rows.map(r => r.state);
    res.json(states);
  } catch (err) {
    console.error('❌ Error in /api/states:', err.message);
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/hail-reports-by-state', async (req, res) => {
  try {
    const { state, date, minSize } = req.query;
    const db = await initDB();

    let query = 'SELECT * FROM hail_reports WHERE 1=1';
    const params = [];

    if (state) {
      query += ' AND state = ?';
      params.push(state.toUpperCase());
    }

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    if (minSize) {
      query += ' AND CAST(size AS REAL) >= ?';
      params.push(parseFloat(minSize));
    }

    query += ' ORDER BY date DESC, time DESC LIMIT 500';

    const results = await db.all(query, params);
    res.json(results);
  } catch (err) {
    console.error('❌ Error in /api/hail-reports-by-state:', err.message);
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/historical-hail-reports', async (req, res) => {
  try {
    const db = await initDB();
    const { date, state, minSize, maxSize } = req.query;

    let query = `SELECT * FROM historical_hail_reports WHERE 1=1`;
    const params = [];

    if (date) {
      query += ` AND date = ?`;
      params.push(date);
    }

    if (state) {
      query += ` AND state = ?`;
      params.push(state.toUpperCase());
    }

    if (minSize) {
      query += ` AND CAST(size AS REAL) >= ?`;
      params.push(parseFloat(minSize));
    }

    if (maxSize) {
      query += ` AND CAST(size AS REAL) <= ?`;
      params.push(parseFloat(maxSize));
    }

    query += ` ORDER BY date DESC, time DESC LIMIT 500`;

    const results = await db.all(query, params);
    res.json(results);
  } catch (err) {
    console.error('❌ Error in /api/historical-hail-reports:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/state-hail-summary', async (req, res) => {
  try {
    const { state, startDate, endDate } = req.query;

    if (!state) {
      return res.status(400).json({ error: 'State parameter is required' });
    }

    const db = await initDB();
    const upperState = state.toUpperCase();
    const params = [upperState, upperState];
    let whereClause = 'WHERE state = ?';
    let whereClauseHist = 'WHERE state = ?';

    if (startDate) {
      whereClause += ' AND date >= ?';
      whereClauseHist += ' AND date >= ?';
      params.push(startDate, startDate);
    }

    if (endDate) {
      whereClause += ' AND date <= ?';
      whereClauseHist += ' AND date <= ?';
      params.push(endDate, endDate);
    }

    const query = `
      SELECT date, SUM(count) as count FROM (
        SELECT date, COUNT(*) as count FROM hail_reports
        ${whereClause}
        GROUP BY date
        UNION ALL
        SELECT date, COUNT(*) as count FROM historical_hail_reports
        ${whereClauseHist}
        GROUP BY date
      )
      GROUP BY date
      ORDER BY date DESC;
    `;

    const results = await db.all(query, params);
    res.json(results);
  } catch (err) {
    console.error('❌ Error in /api/state-hail-summary:', err.message);
    res.status(500).json({ error: err.message });
  }
});




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
    await fetchHailReports();
  } catch (err) {
    console.error('❌ Error scraping on startup:', err.message);
  }

  // Schedule scraping every 24 hours (86,400,000 ms)
  setInterval(async () => {
    console.log(`🔄 Running scheduled hail report fetch at ${new Date().toLocaleString()}`);
    try {
      await fetchHailReports();
    } catch (err) {
      console.error('❌ Error during scheduled scrape:', err.message);
    }
  }, 12 * 60 * 60 * 1000); // 12 hours

});
