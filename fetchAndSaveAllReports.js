const axios = require('axios');
const { parse } = require('csv-parse/sync');
const { initDB } = require('./db');
const { reverseGeocode } = require('./reverseGeocode'); // ⬅️ Add this import

const CSV_URL = 'https://www.spc.noaa.gov/climo/reports/today_hail.csv';

async function fetchAndSaveAllReports() {
  const response = await axios.get(CSV_URL);
  const csv = response.data;

  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const db = await initDB();
  let savedCount = 0;

  for (const row of records) {
    const {
      Time: time,
      Size: sizeRaw,
      Location: location,
      Lat: lat,
      Lon: lon,
    } = row;

    const size = parseFloat(sizeRaw) / 100;
    const date = new Date().toISOString().split('T')[0];

    let stateCode = '';

    try {
      const { state } = await reverseGeocode(lat, lon);
      stateCode = state || '';
    } catch (err) {
      console.warn(`⚠️ Could not geocode (${lat}, ${lon}): ${err.message}`);
    }

    await db.run(
      `
      INSERT INTO hail_reports (date, time, location, lat, lon, size, state)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        date,
        time,
        location,
        parseFloat(lat),
        parseFloat(lon),
        size.toFixed(2),
        stateCode,
      ]
    );

    savedCount++;
  }

  console.log(`✅ Saved ${savedCount} hail reports from CSV.`);
  return { saved: savedCount };
}

module.exports = fetchAndSaveAllReports;
