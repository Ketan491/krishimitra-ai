const DISEASE_RULES = [
  {
    name: 'Powdery Mildew',
    keywords: ['white powdery', 'powder', 'white spots', 'dusty', 'mildew'],
    causes: [
      'Fungi (Erysiphales) — thrives in warm, dry days and cool, humid nights, often on grapes, mango, chilli, onion.',
    ],
    management: [
      'Remove and burn infected leaves/bunches outside the field.',
      'Spray wettable sulphur (e.g. 2 g/L) or neem-based formulation.',
      'Improve canopy aeration via correct spacing and pruning.',
      'Avoid overhead irrigation at dusk.',
    ],
    severity: 'Medium',
    urgent: false,
  },
  {
    name: 'Downy Mildew',
    keywords: ['yellow spots', 'grey mold', 'downy', 'underside', 'oily looking', 'velvet'],
    causes: ['Oomycete fungi — favour cool, wet conditions; common on grapes, onion, cucurbits.'],
    management: [
      'Spray mancozeb or metalaxyl-based fungicide at first sign.',
      'Keep foliage dry — irrigate in the morning.',
      'Remove volunteer vines & weeds that harbour the pathogen.',
    ],
    severity: 'High',
    urgent: true,
  },
  {
    name: 'Rust Disease',
    keywords: ['rust', 'orange pustules', 'brown pustules', 'red powder', 'blister'],
    causes: ['Puccinia fungi — common on wheat, soybean, sunflower, groundnut.'],
    management: [
      'Spray propiconazole / tebuconazole (0.1%) or mancozeb.',
      'Grow resistant varieties in the next season.',
      'Follow strict crop rotation with a non-host crop.',
    ],
    severity: 'Medium',
    urgent: false,
  },
  {
    name: 'Bacterial / Fungal Leaf Blight',
    keywords: ['blight', 'brown edges', 'dead patches', 'scorched', 'dark lesions', 'leaf burn'],
    causes: ['Bacteria (Xanthomonas) or fungi (Alternaria) — spread by splash water, infected seed, wind.'],
    management: [
      'Spray copper oxychloride / streptocycline for bacterial blight.',
      "Remove infected debris and don't work the field when wet.",
      'Use disease-free certified seed.',
    ],
    severity: 'Medium',
    urgent: false,
  },
  {
    name: 'Root / Stem / Fruit Rot',
    keywords: ['rot', 'soft stem', 'wilt at base', 'rotting', 'mushy', 'water-soaked', 'fallen over'],
    causes: ['Fungi (Fusarium, Rhizoctonia, Pythium) — aggravated by waterlogging, poor drainage.'],
    management: [
      'Improve drainage — ridge & furrow or raised beds.',
      'Drench with carbendazim / Trichoderma viride at the root zone.',
      'Reduce irrigation frequency until recovery.',
    ],
    severity: 'High',
    urgent: true,
  },
  {
    name: 'Fusarium Wilt',
    keywords: ['yellowing leaves', 'wilt', 'drooping', 'stunted', 'veins yellow', 'one side wilt'],
    causes: ['Soil-borne fungus Fusarium oxysporum — persists in soil for years; common in cotton, tomato, tur.'],
    management: [
      'Uproot and destroy affected plants.',
      'Seed/soil treatment with Trichoderma or carbendazim.',
      'Rotate with non-host crops; avoid repeated cotton/solanaceous cycles.',
    ],
    severity: 'High',
    urgent: true,
  },
  {
    name: 'Aphid / Sucking Pest Infestation',
    keywords: ['aphid', 'sticky', 'honeydew', 'curling leaves', 'sooty', 'black insects', 'sucking'],
    causes: ['Aphids & whiteflies — suck sap, spread viral diseases, produce honeydew that grows sooty mould.'],
    management: [
      'Hang yellow sticky traps (aphids/whitefly are attracted to yellow).',
      'Spray neem oil (2–3 mL/L) or imidacloprid (0.3 mL/L) if levels are high.',
      'Conserve natural enemies — ladybugs and lacewings.',
    ],
    severity: 'Medium',
    urgent: false,
  },
  {
    name: 'Fruit / Shoot Borer (Lepidoptera)',
    keywords: ['bore', 'borer', 'holes in', 'frass', 'shoot drying', 'dropped fruit', 'tunnelled'],
    causes: ['Larvae of moths (e.g. fruit & shoot borer on brinjal, pink bollworm on cotton, pod borer on pulses).'],
    management: [
      'Install pheromone traps (4–6/acre) and monitor catches weekly.',
      'Remove & destroy infested shoots/fruits (beyond the entry hole).',
      'Spray emamectin benzoate or chlorantraniliprole at egg hatch.',
      'Harvest early to reduce carry-over.',
    ],
    severity: 'High',
    urgent: true,
  },
  {
    name: 'Thrips / Leaf Curl Complex',
    keywords: ['thrips', 'silvery streaks', 'curled', 'leathery', 'papery', 'leaf curl'],
    causes: ['Thrips feeding + often transmitted Tomato Leaf Curl Virus — a serious complex on chilli, tomato, onion.'],
    management: [
      'Spray spinosad / fipronil against thrips; roguing of virus-hit plants.',
      'Use virus-resistant varieties and seedling nurseries under 40-mesh net.',
      'Control nearby weeds that host both thrips and the virus.',
    ],
    severity: 'High',
    urgent: true,
  },
  {
    name: 'Nutrient Deficiency (probable)',
    keywords: [
      'yellow between veins',
      'mottling',
      'purple leaves',
      'poor growth',
      'older leaves yellow',
      'yellowing tips',
    ],
    causes: ['Often N, Mg, Fe, S deficiency or soil pH imbalance rather than a disease.'],
    management: [
      'Do a soil/leaf test through your nearest Soil Health Card lab.',
      'Tentative fix while waiting: balanced NPK + micronutrient (Fe/Zn) spray.',
      'Check irrigation water quality and drainage.',
    ],
    severity: 'Low',
    urgent: false,
  },
  {
    name: 'Weed Competition',
    keywords: ['weeds', 'grass in field', 'unwanted plants', 'crowded', 'low vigour'],
    causes: ['Weeds competing for water, nutrients and light.'],
    management: [
      'Timely inter-cultivation (hoeing) in the first 4–6 weeks.',
      'Mulching between rows to suppress weeds and hold moisture.',
      'Checklist against listed weeds before chemical control.',
    ],
    severity: 'Low',
    urgent: false,
  },
];

const STRONG_KEYWORDS = ['borer', 'aphid', 'mildew', 'rust', 'blight', 'rot'];

function diagnose({ cropName, symptoms }) {
  const text = (symptoms || '').toLowerCase();
  const scored = DISEASE_RULES.map((rule) => {
    const matched = rule.keywords.filter((k) => text.includes(k));
    let score = matched.length;
    if (STRONG_KEYWORDS.some((k) => text.includes(k))) score += 1;
    return { rule, matched, score: text ? score : 0 };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];

  const disclaimer =
    'This is a rule-based demo diagnosis from symptom keywords, NOT a verified lab test. ' +
    'Confirm with your local Krishi Vigyan Kendra (KVK) or agricultural officer before applying any chemical treatment.';

  if (!text) {
    return {
      diagnosis: 'No symptoms entered',
      confidence: 'N/A',
      matchedKeywords: [],
      causes: ['Enter or select at least one symptom to get a probable match.'],
      management: [
        'Describe the symptoms you see (e.g. yellowing leaves, white powder, holes in fruit).',
        'A photo helps — upload one for the record.',
        'For serious sudden wilting or spreading spots, contact your KVK immediately.',
      ],
      severity: 'Low',
      disclaimer,
      engine: 'rule-based-keyword',
      exactMatch: false,
    };
  }

  if (!symptoms || top.score < 2) {
    return {
      diagnosis: 'Requires expert confirmation',
      confidence: 'Low',
      matchedKeywords: [],
      causes: ["The symptoms described didn't strongly match a pattern in the knowledge base."],
      management: [
        'Take close-up photos of affected leaves, stems, fruit and roots.',
        'Visit or call your nearest Krishi Vigyan Kendra for identification.',
        'Avoid broad-spectrum spraying until the pest/pathogen is confirmed — it can harm helpful insects.',
      ],
      severity: 'Medium',
      disclaimer,
      engine: 'rule-based-keyword',
      exactMatch: false,
    };
  }

  const confidence = top.score >= 4 ? 'High (multiple matching symptoms)' : top.score === 3 ? 'Medium-High' : 'Medium';

  return {
    diagnosis: top.rule.name,
    confidence,
    matchedKeywords: top.matched,
    causes: top.rule.causes,
    management: top.rule.management,
    severity: top.rule.severity,
    urgent: top.rule.urgent,
    disclaimer,
    engine: 'rule-based-keyword',
    exactMatch: true,
  };
}

module.exports = { DISEASE_RULES, diagnose };
