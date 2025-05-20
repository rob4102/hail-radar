const axios = require('axios');
const cheerio = require('cheerio');
const { initDB } = require('./db');

// McHenry, IL coordinates
const MCHENRY_LAT = 42.3334;
const MCHENRY_LON = -88.2668;

// Haversine formula to calculate distance between two lat/lon points (in miles)
function getDistanceInMiles(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

    const distance = getDistanceInMiles(lat, -lon, MCHENRY_LAT, MCHENRY_LON);

    if (distance <= 25) { // Only save reports within 25 miles of McHenry
      await db.run(`
        INSERT INTO hail_reports (date, time, location, lat, lon, size)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [date, time, location, lat, -lon, size]);

      savedCount++;
      console.log(`📍 Hail near McHenry: ${location} (${distance.toFixed(1)} mi)`);
    }
  }

  console.log(`✅ Saved ${savedCount} hail reports near McHenry, IL.`);
}

module.exports = fetchHailReports;
