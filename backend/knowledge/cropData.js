const CROP_RULES = [
  {
    crop: 'Rice (Paddy)',
    soils: ['clay', 'loamy'],
    seasons: ['kharif'],
    rainfall: 'high',
    guidance: {
      landPrep: 'Puddle the field and level it well to retain standing water.',
      sowing: 'Transplant 20–25 day old seedlings, 20x15 cm spacing.',
      fertilizer: 'NPK 100:50:50 kg/ha; apply nitrogen in 3 split doses.',
      irrigation: 'Maintain 5 cm standing water through most of the growth period.',
    },
  },
  {
    crop: 'Wheat',
    soils: ['loamy', 'clay'],
    seasons: ['rabi'],
    rainfall: 'low',
    guidance: {
      landPrep: '2–3 ploughings followed by planking for a fine seedbed.',
      sowing: 'Sow at 100 kg seed/ha, row spacing 20–22.5 cm, first week of November.',
      fertilizer: 'NPK 120:60:40 kg/ha; nitrogen split at sowing, first & second irrigation.',
      irrigation: '5–6 irrigations at critical growth stages (CRI, tillering, flowering, grain fill).',
    },
  },
  {
    crop: 'Cotton',
    soils: ['black', 'loamy'],
    seasons: ['kharif'],
    rainfall: 'medium',
    guidance: {
      landPrep: 'Deep ploughing once in 2–3 years; ridges and furrows for drainage.',
      sowing: 'Spacing 90x60 cm (rainfed) or 120x45 cm (irrigated); sow with onset of monsoon.',
      fertilizer: 'NPK 100:50:50 kg/ha in split doses at sowing, squaring and flowering.',
      irrigation: 'Irrigate at 15–20 day intervals; avoid waterlogging.',
    },
  },
  {
    crop: 'Sugarcane',
    soils: ['loamy', 'clay'],
    seasons: ['annual'],
    rainfall: 'high',
    guidance: {
      landPrep: 'Deep summer ploughing; form furrows 90 cm apart.',
      sowing: 'Use 3-budded setts, treat with fungicide before planting.',
      fertilizer: 'NPK 250:115:115 kg/ha applied in split doses across the crop cycle.',
      irrigation: 'Irrigate every 7–10 days; critical at germination, tillering and grand growth.',
    },
  },
  {
    crop: 'Tur (Pigeon Pea)',
    soils: ['black', 'sandy', 'loamy'],
    seasons: ['kharif'],
    rainfall: 'medium',
    guidance: {
      landPrep: 'One deep ploughing plus harrowing; good drainage essential.',
      sowing: 'Row spacing 60–90 cm, plant spacing 20 cm; sow with first monsoon showers.',
      fertilizer: 'NPK 25:50:0 kg/ha as basal dose; being a legume, avoid excess nitrogen.',
      irrigation: 'Mostly rainfed; 1–2 protective irrigations if dry spells occur at flowering/pod fill.',
    },
  },
  {
    crop: 'Onion',
    soils: ['loamy', 'sandy'],
    seasons: ['rabi', 'kharif'],
    rainfall: 'low',
    guidance: {
      landPrep: 'Fine tilth with raised beds for good drainage.',
      sowing: 'Transplant 6-week old seedlings at 15x10 cm spacing.',
      fertilizer: 'NPK 100:50:50 kg/ha; nitrogen in 2 split doses.',
      irrigation: 'Light, frequent irrigation every 7–10 days; stop 2–3 weeks before harvest.',
    },
  },
  {
    crop: 'Tomato',
    soils: ['loamy', 'sandy'],
    seasons: ['rabi', 'kharif'],
    rainfall: 'medium',
    guidance: {
      landPrep: 'Raised beds/ridges for drainage; incorporate well-rotted FYM.',
      sowing: 'Transplant 4-week seedlings at 60x45 cm spacing.',
      fertilizer: 'NPK 100:50:50 kg/ha; calcium application reduces blossom-end rot.',
      irrigation: 'Drip irrigation preferred; avoid water stress during flowering/fruiting.',
    },
  },
  {
    crop: 'Groundnut',
    soils: ['sandy', 'loamy'],
    seasons: ['kharif'],
    rainfall: 'medium',
    guidance: {
      landPrep: 'Fine, well-drained seedbed; gypsum application benefits pod development.',
      sowing: 'Spacing 30x10 cm; treat seed with Rhizobium culture before sowing.',
      fertilizer: 'NPK 25:50:75 kg/ha as basal dose.',
      irrigation: 'Critical at pegging and pod development stages; avoid waterlogging.',
    },
  },
];

const SOIL_TYPES = ['sandy', 'loamy', 'clay', 'black', 'red'];
const SEASONS = ['kharif', 'rabi', 'zaid', 'annual'];

function recommendCrops({ soilType, season, rainfall }) {
  const soil = (soilType || '').toLowerCase();
  const seas = (season || '').toLowerCase();

  let matches = CROP_RULES.filter((r) => r.soils.includes(soil) && r.seasons.includes(seas));
  let exactMatch = matches.length > 0;

  if (matches.length === 0) {
    matches = CROP_RULES.filter((r) => r.soils.includes(soil));
  }

  if (matches.length === 0) {
    matches = CROP_RULES.slice(0, 3);
  }

  return {
    exactMatch,
    results: matches.slice(0, 3).map((r) => ({
      crop: r.crop,
      guidance: r.guidance,
    })),
  };
}

module.exports = { CROP_RULES, SOIL_TYPES, SEASONS, recommendCrops };
