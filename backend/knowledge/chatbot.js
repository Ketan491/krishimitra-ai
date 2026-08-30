const { CROP_RULES } = require('./cropData');
const db = require('../db');

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

function cropMention(message) {
  const lower = message.toLowerCase();
  return CROP_RULES.find((r) => {
    const keyword = r.crop.toLowerCase().split(' ')[0];
    const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
    return wordBoundaryRegex.test(lower);
  });
}

function answer(message) {
  const lower = message.toLowerCase();

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

  for (const faq of FAQ) {
    if (faq.keywords.some((k) => lower.includes(k))) {
      return typeof faq.reply === 'function' ? faq.reply() : faq.reply;
    }
  }

  return (
    "I'm not fully sure about that yet. Try asking about a specific crop " +
    '(e.g. "How do I grow wheat?"), or ask about weather, fertilizer, ' +
    'irrigation, market prices, equipment rental, or government schemes.'
  );
}

module.exports = { answer };
