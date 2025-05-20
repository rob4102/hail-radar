const axios = require('axios');
const { parse } = require('csv-parse/sync');
const { initDB } = require('./db');

const CSV_URL = 'https://www.spc.noaa.gov/climo/reports/today_hail.csv';

async function fetchAndSaveAllReports() {
  const response = await axios.get(CSV_URL);
  const csv = response.data;

  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const db = await initDB();
  let savedCount = 0;

  for (const row of records) {
    const {
      Time: time,
      Size: sizeRaw,
      Location: location,
      County,
      State,
      Lat: lat,
      Lon: lon,
      Comments: comments
    } = row;

    // Normalize size from e.g. "200" → "2.00"
    const size = parseFloat(sizeRaw) / 100;

    const date = new Date().toISOString().split('T')[0];

    await db.run(`
      INSERT INTO hail_reports (date, time, location, lat, lon, size)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [date, time, location, parseFloat(lat), parseFloat(lon), size.toFixed(2)]);

    savedCount++;
  }

  console.log(`✅ Saved ${savedCount} hail reports from CSV.`);
  return { saved: savedCount };
}

module.exports = fetchAndSaveAllReports;
