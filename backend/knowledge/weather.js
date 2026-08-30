function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getForecast(location) {
  const seed = (location || 'default').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Thunderstorms'];
  const days = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const r = seededRandom(seed + i);
    days.push({
      date: d.toISOString().split('T')[0],
      temp_max: Math.round(28 + r * 8),
      temp_min: Math.round(18 + r * 6),
      condition: conditions[Math.floor(r * conditions.length)],
      rainfall_probability: Math.round(r * 100),
      humidity: Math.round(50 + r * 40),
    });
  }

  return {
    location: location || 'Unknown',
    current: days[0],
    forecast: days,
  };
}

module.exports = { getForecast };
