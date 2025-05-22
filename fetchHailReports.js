const axios = require('axios');
const cheerio = require('cheerio');
const { initDB } = require('./db');
const { reverseGeocode } = require('./reverseGeocode');

async function fetchHailReports() {
  const url = 'https://www.spc.noaa.gov/climo/reports/today.html';
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const db = await initDB();

  const text = $('pre').first().text();
  const lines = text.split('\n').filter(line => line.includes('HAIL'));

  let savedCount = 0;

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 7) continue;

    const time = parts[0];
    const location = parts.slice(1, -4).join(' ');
    const rawLat = parts[parts.length - 4];
    const rawLon = parts[parts.length - 3];
    const size = parts[parts.length - 1];
    const date = new Date().toISOString().split('T')[0];

    const lat = parseFloat(rawLat.slice(0, 2) + '.' + rawLat.slice(2));
    const lon = parseFloat(rawLon.slice(0, 3) + '.' + rawLon.slice(3));

    let stateCode = '';

    try {
      const { state } = await reverseGeocode(lat, -lon);
      stateCode = state || '';
    } catch (err) {
      console.warn(`⚠️ Reverse geocode failed for (${lat}, ${-lon}): ${err.message}`);
    }

    await db.run(
      `INSERT INTO hail_reports (date, time, location, lat, lon, size, state)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [date, time, location, lat, -lon, size, stateCode]
    );

    savedCount++;
    console.log(`📍 Saved: ${location}, ${stateCode} (${lat}, ${-lon})`);
  }

  console.log(`✅ Saved ${savedCount} hail reports from all states.`);
}

module.exports = fetchHailReports;
