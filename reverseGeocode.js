const axios = require('axios');

/**
 * Reverse geocode a lat/lon to get state or other location info.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ state?: string, city?: string, county?: string }>}
 */
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=5&addressdetails=1`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'hail-mapper-bot (your@email.com)',
      },
    });

    const address = res.data.address;
    return {
      state: address.state_code || address.state || '',
      city: address.city || address.town || address.village || '',
      county: address.county || '',
    };
  } catch (err) {
    console.error(`❌ Reverse geocode failed:`, err.message);
    return {};
  }
}

module.exports = { reverseGeocode };
