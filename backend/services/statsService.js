const db = require('../db');
const { getForecast } = require('../knowledge/weather');
const { recommendCrops } = require('../knowledge/cropData');

function daysAgoIso(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    });
  }
  return days;
}

function orderTrend(days = 7) {
  const buckets = lastNDays(days).map(({ date, label }) => ({ date, label, orders: 0, revenue: 0 }));
  const index = new Map(buckets.map((b, i) => [b.date, i]));
  db.all('orders').forEach((o) => {
    const key = o.orderDate.slice(0, 10);
    if (index.has(key)) {
      buckets[index.get(key)].orders += 1;
      buckets[index.get(key)].revenue += o.totalPrice;
    }
  });
  return buckets.map((b) => ({ ...b, revenue: Math.round(b.revenue) }));
}

function topCrops(limit = 5) {
  const counts = {};
  db.all('products').forEach((p) => {
    counts[p.cropName] = (counts[p.cropName] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([crop, listings]) => ({ crop, listings }))
    .sort((a, b) => b.listings - a.listings)
    .slice(0, limit);
}

function statusBreakdown() {
  const counts = {};
  db.all('orders').forEach((o) => {
    counts[o.status] = (counts[o.status] || 0) + 1;
  });
  return Object.entries(counts).map(([status, count]) => ({ status, count }));
}

function revenueTotal() {
  const orders = db
    .all('orders')
    .filter((o) => ['Delivered', 'Shipped', 'Confirmed', 'Reviewed', 'Packed'].includes(o.status));
  return Math.round(orders.reduce((s, o) => s + o.totalPrice, 0));
}

function adminSummary() {
  const orders = db.all('orders');
  const delivered = orders.filter((o) => ['Delivered', 'Reviewed'].includes(o.status));
  const products = db.all('products');

  return {
    farmers: db.all('farmers').length,
    customers: db.all('customers').length,
    products: products.length,
    pendingProducts: products.filter((p) => p.approved === null).length,
    orders: orders.length,
    pendingOrders: orders.filter((o) => o.status === 'Pending').length,
    revenue: revenueTotal(),
    avgOrderValue: orders.length ? Math.round(revenueTotal() / orders.length) : 0,
    equipment: db.all('equipment').length,
    schemes: db.all('schemes').length,
    cropCatalog: db.all('cropCatalog').length,
    reviews: db.all('reviews').length,
    recommendations: db.all('recommendations').length,
    audits: db.all('auditLog').length,
    orderTrend: orderTrend(7),
    topCrops: topCrops(5),
    statusBreakdown: statusBreakdown(),
  };
}

function farmerDashboard(farmer) {
  const farmerId = farmer.id;
  const myOrders = db.filter('orders', (o) => o.farmerId === farmerId);
  const myProducts = db.filter('products', (p) => p.farmerId === farmerId);
  const weather = getForecast(farmer.location || 'Nashik');
  const { results, exactMatch } = recommendCrops({
    soilType: farmer.soilType || 'loamy',
    season: currentSeason(),
  });

  const alerts = [];
  const pendingOrders = myOrders.filter((o) => o.status === 'Pending' || o.status === 'Confirmed');
  if (pendingOrders.length) {
    alerts.push({
      type: 'order',
      message: `${pendingOrders.length} order${pendingOrders.length > 1 ? 's' : ''} need${pendingOrders.length === 1 ? 's' : ''} your attention.`,
      to: '/farmer/orders',
    });
  }
  const lowStock = myProducts.filter((p) => p.quantity <= 20);
  if (lowStock.length) {
    alerts.push({
      type: 'stock',
      message: `${lowStock.length} product listing${lowStock.length > 1 ? 's are' : ' is'} low on stock.`,
      to: '/farmer/products',
    });
  }
  if (weather.forecast[0] && weather.forecast[0].rainfall_probability >= 60) {
    alerts.push({
      type: 'weather',
      message: 'High chance of rain in your area — check field operations and spray timings.',
      to: '/farmer/prices',
    });
  }

  return {
    farm: {
      landSize: farmer.landSize || 0,
      location: farmer.location || '—',
      soilType: farmer.soilType || '—',
      irrigationType: farmer.irrigationType || '—',
    },
    stats: {
      activeListings: myProducts.filter((p) => p.approved !== false).length,
      pendingOrders: pendingOrders.length,
      totalOrders: myOrders.length,
      productsSold: myOrders.filter((o) => ['Delivered', 'Reviewed'].includes(o.status)).length,
      revenue: Math.round(
        myOrders.filter((o) => ['Delivered', 'Reviewed'].includes(o.status)).reduce((s, o) => s + o.totalPrice, 0),
      ),
    },
    weather,
    cropSuggestion: { exactMatch, results },
    recentOrders: myOrders
      .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
      .slice(0, 5)
      .map((o) => {
        const product = db.find('products', (p) => p.id === o.productId);
        return { ...o, cropName: product ? product.cropName : 'Unknown' };
      }),
    listedProducts: myProducts.slice(0, 5),
    alerts,
  };
}

function currentSeason() {
  const month = new Date().getMonth() + 1;
  if (month === 10 || month === 11) return 'rabi';
  if (month === 3 || month === 4 || month === 5) return 'zaid';
  return 'kharif';
}

function priceSummary() {
  const grouped = {};
  db.all('products').forEach((p) => {
    if (p.approved !== true) return;
    if (!grouped[p.cropName]) grouped[p.cropName] = [];
    grouped[p.cropName].push({ price: p.price, unit: p.unit || 'kg' });
  });
  return Object.entries(grouped)
    .map(([cropName, rows]) => {
      const prices = rows.map((r) => r.price);
      const units = {};
      rows.forEach((r) => {
        const u = r.unit.toLowerCase();
        units[u] = (units[u] || 0) + 1;
      });
      const unit = Object.entries(units).sort((a, b) => b[1] - a[1])[0][0] || 'kg';
      return {
        cropName,
        avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        listings: prices.length,
        unit,
      };
    })
    .sort((a, b) => a.cropName.localeCompare(b.cropName));
}

function advisoryUsage() {
  const byDay = lastNDays(7).map(({ date, label }) => ({ date, label, count: 0 }));
  const idx = new Map(byDay.map((d, i) => [d.date, i]));
  db.all('recommendations').forEach((r) => {
    const key = (r.createdAt || '').slice(0, 10);
    if (idx.has(key)) byDay[idx.get(key)].count += 1;
  });
  return byDay;
}

module.exports = {
  adminSummary,
  farmerDashboard,
  orderTrend,
  topCrops,
  statusBreakdown,
  priceSummary,
  advisoryUsage,
  currentSeason,
  revenueTotal,
  daysAgoIso,
};
