const { CROP_RULES } = require('./cropData');
const db = require('../db');
const { resolveCategory } = require('./productCategories');

const FAQ = [
  {
    keywords: ['hello', 'hi', 'namaste', 'namaskar'],
    reply:
      'Namaste! I am KrishiMitra, your farming assistant. Ask me about crops, fertilizer, irrigation, weather, or government schemes.',
  },
  {
    keywords: ['scheme', 'yojana', 'subsidy', 'government'],
    reply: () => {
      const schemes = db.all('schemes');
      const list = schemes.map((s) => `• ${s.name} — ${s.description}`).join('\n');
      return `Here are some government schemes you may be eligible for:\n${list}\n\nOpen the "Schemes" tab and enter your land size for a personalised eligibility check.`;
    },
  },
  {
    keywords: ['weather', 'rain', 'temperature', 'climate'],
    reply:
      'Check the Weather widget on your dashboard for a live 7-day forecast for your registered location. As a general rule, avoid spraying pesticide right before expected rainfall.',
  },
  {
    keywords: ['fertilizer', 'fertiliser', 'khaad', 'khat', 'urea'],
    reply:
      'Fertilizer dosage depends on your crop and soil. Use the Crop Recommendation tool — it gives an NPK dosage schedule specific to the crop you select.',
  },
  {
    keywords: ['irrigation', 'water', 'pani'],
    reply:
      "Irrigation needs vary by crop stage. Most crops are most sensitive to water stress at flowering and grain/fruit filling — check your crop's guidance card for the exact schedule.",
  },
  {
    keywords: ['disease', 'pest', 'keed', 'rog'],
    reply:
      'For pest/disease issues: isolate affected plants, avoid overhead irrigation (many fungal diseases spread through wet leaves), and consult your local Krishi Vigyan Kendra (KVK) for identification before applying any chemical treatment.',
  },
  {
    keywords: ['price', 'bhav', 'market rate', 'sell'],
    reply:
      'Check the Market tab for current listed prices from other farmers on the platform. You can list your own produce directly from your Farmer Dashboard to sell without a middleman.',
  },
  {
    keywords: ['equipment', 'tractor', 'rent', 'machine'],
    reply:
      'You can rent or list farm equipment (tractor, rotavator, thresher, sprayer) from the Equipment tab on your Farmer Dashboard.',
  },
];

// ---------------------------------------------------------------------------
// Marketplace answers, built from the live product table rather than canned text.
// ---------------------------------------------------------------------------

const CATEGORY_WORDS = [
  { category: 'fruit', words: ['fruit', 'fruits'] },
  { category: 'vegetable', words: ['vegetable', 'vegetables', 'sabzi', 'sabziyan'] },
  { category: 'crop', words: ['crop', 'crops', 'grain', 'grains'] },
];

const ORDER_INTENT =
  /\b(my orders?|order status|order history|status of my|where is my|track my|delivery of my|mer order|मेरा ऑर्डर|मेरे ऑर्डर)\b/i;
const LOGIN_INTENT = /\b(login|log in|sign in)\b/i;
// Explicit shopping phrasings. These must be checked before crop guidance so
// "do you have onion?" is answered with stock, not sowing instructions.
const SHOP_INTENT =
  /\b(do you have|do you sell|do i get|how much (is|are|does|for|of)|price of|prices of|is (it |they |there )?available|any \w+ (available|in stock)|in stock|stock left|still available|cheapest|lowest price|best price|sasta|available|buy)\b/i;
const BROWSE_INTENT = /\b(show|list|what|which|kind|kis|kya|दिखा|सूची|क्या)\b/i;
const CHEAPEST_INTENT = /\b(cheapest|lowest|best price|sasta|saste)\b/i;
const ORGANIC_INTENT = /\borganic\b/i;

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

function liveProducts() {
  return db.all('products').filter((p) => p.approved === true);
}

function describeProduct(p) {
  const unit = p.unit || 'kg';
  return `${p.cropName} — ${inr(p.price)}/${unit} (${p.quantity} ${unit} available)${p.organic ? ', organic' : ''}`;
}

function matchProducts(message) {
  const lower = message.toLowerCase();
  const products = liveProducts();
  // Longest crop name first so "pigeon pea" wins over "pea".
  const named = products
    .map((p) => ({ product: p, name: p.cropName.toLowerCase() }))
    .filter(({ name }) => name.length >= 3 && new RegExp(`\\b${escapeRegex(name)}\\b`, 'i').test(lower))
    .sort((a, b) => b.name.length - a.name.length);

  if (named.length) return { products: named.map((n) => n.product), explicitName: true };
  return { products, explicitName: false };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function categoryFromMessage(lower) {
  for (const { category, words } of CATEGORY_WORDS) {
    if (words.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(lower))) return category;
  }
  return null;
}

function answerBrowse(message) {
  const lower = message.toLowerCase();
  const category = categoryFromMessage(lower);
  let items;
  let label;

  if (category) {
    items = liveProducts().filter((p) => resolveCategory(p) === category);
    const labelMap = { fruit: 'fruits', vegetable: 'vegetables', crop: 'crops' };
    label = labelMap[category];
  } else {
    const { products, explicitName } = matchProducts(message);
    if (!explicitName) return null;
    items = products;
    label = products[0].cropName;
  }

  if (CHEAPEST_INTENT.test(lower)) items = [...items].sort((a, b) => a.price - b.price);
  if (ORGANIC_INTENT.test(lower)) items = items.filter((p) => p.organic === true);

  if (!items.length) {
    return category
      ? `There are no approved ${label} listings on the marketplace right now. Check back soon — farmers add fresh stock daily.`
      : 'There are no approved listings matching that right now. Browse the Marketplace tab for everything currently available.';
  }

  const shown = items.slice(0, 5);
  const more = items.length > shown.length ? `\n…and ${items.length - shown.length} more.` : '';
  return (
    `Marketplace — ${label} currently listed:\n` +
    shown.map((p) => `• ${describeProduct(p)}`).join('\n') +
    more +
    '\n\nOpen the Marketplace tab to see photos, filter by category and check out.'
  );
}

function answerOrders(user) {
  if (!user || user.role !== 'customer') {
    return 'I can only look up your orders once you are logged in as a customer. Sign in from the top-right corner, then ask me again.';
  }

  const orders = db
    .filter('orders', (o) => o.customerId === Number(user.id))
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
    .slice(0, 5);

  if (!orders.length) {
    return 'You have no orders yet. Add something fresh from the Marketplace and it will show up here.';
  }

  const lines = orders.map((o) => {
    const product = db.find('products', (p) => p.id === o.productId);
    const name = product ? product.cropName : `product #${o.productId}`;
    return `• Order #${o.id} — ${name} × ${o.quantity} ${product?.unit || 'kg'} · ${o.status} · ${inr(o.totalPrice)}`;
  });

  return `Your recent orders:\n${lines.join('\n')}\n\nOpen the Orders tab for the full delivery timeline.`;
}

// ---------------------------------------------------------------------------

function cropMention(message) {
  const lower = message.toLowerCase();
  return CROP_RULES.find((r) => {
    const keyword = r.crop.toLowerCase().split(' ')[0];
    const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
    return wordBoundaryRegex.test(lower);
  });
}

function isMarketplaceQuestion(lower) {
  return SHOP_INTENT.test(lower) || BROWSE_INTENT.test(lower);
}

function matchesFaq(lower, faq) {
  // Word-boundary matching: "cheapest" must not trigger the 'pest' rule.
  return faq.keywords.some((k) => new RegExp(`\\b${escapeRegex(k.toLowerCase())}\\b`, 'i').test(lower));
}

function answer(message, user) {
  const lower = message.toLowerCase();
  const hasLiveProducts = liveProducts().length > 0;

  // 1. Order questions need the caller to be identified, so they go first.
  if (ORDER_INTENT.test(lower)) return answerOrders(user);

  // 2. Explicit shopping questions read live product data, and outrank crop
  //    guidance ("do you have onion?" is a stock question, not a how-to-grow one).
  if (hasLiveProducts && isMarketplaceQuestion(lower)) {
    const reply = answerBrowse(message);
    if (reply) return reply;
  }

  // 3. Agronomy questions.
  const cropMatch = cropMention(message);
  if (cropMatch) {
    const g = cropMatch.guidance;
    return (
      `${cropMatch.crop} — quick guidance:\n` +
      `• Land preparation: ${g.landPrep}\n` +
      `• Sowing: ${g.sowing}\n` +
      `• Fertilizer: ${g.fertilizer}\n` +
      `• Irrigation: ${g.irrigation}`
    );
  }

  if (LOGIN_INTENT.test(lower) && !user) {
    return 'Use the Login button in the top-right corner to sign in as a customer, farmer or admin.';
  }

  for (const faq of FAQ) {
    if (matchesFaq(lower, faq)) {
      return typeof faq.reply === 'function' ? faq.reply() : faq.reply;
    }
  }

  return (
    "I'm not fully sure about that yet. Try asking about a specific crop " +
    '(e.g. "How do I grow wheat?"), or ask about weather, fertilizer, ' +
    'irrigation, market prices, what is available in the marketplace, your orders, ' +
    'equipment rental, or government schemes.'
  );
}

module.exports = { answer, answerBrowse, answerOrders, describeProduct };
