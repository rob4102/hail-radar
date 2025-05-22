const axios = require('axios');
const { parse } = require('csv-parse/sync');
const { initDB } = require('./db');
const { format, subDays } = require('date-fns');

async function fetchHistoricalReports(days = 7) {
  const db = await initDB();
  let totalSaved = 0;

  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), i);
    const yyyy = format(date, 'yyyy');
    const mm = format(date, 'MM');
    const dd = format(date, 'dd');

    const formatted = `${dd}${mm}${yy(yyyy)}`; // e.g. 190524 for May 19, 2024
    const url = `https://www.spc.noaa.gov/climo/reports/${formatted}_rpts_filtered_hail.csv`;

    try {
      const response = await axios.get(url);
      const records = parse(response.data, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      let savedCount = 0;
      for (const row of records) {
        const {
          Time: time,
          Size: sizeRaw,
          Location: location,
          Lat: lat,
          Lon: lon
        } = row;

        const size = parseFloat(sizeRaw) / 100;
        const isoDate = format(date, 'yyyy-MM-dd');

      await db.run(`
  INSERT INTO historical_hail_reports (date, time, location, lat, lon, size)
  VALUES (?, ?, ?, ?, ?, ?)
`, [isoDate, time, location, parseFloat(lat), parseFloat(lon), size.toFixed(2)]);


        savedCount++;
      }

      console.log(`📥 ${format(date, 'yyyy-MM-dd')}: Saved ${savedCount} records.`);
      totalSaved += savedCount;
    } catch (err) {
      console.warn(`⚠️ Failed to fetch ${url}: ${err.message}`);
    }
  }

  console.log(`✅ Finished downloading ${totalSaved} total records over ${days} days.`);
}

function yy(fullYear) {
  return fullYear.toString().slice(-2); // e.g. 2025 → 25
}

module.exports = fetchHistoricalReports;
