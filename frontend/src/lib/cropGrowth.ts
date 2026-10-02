export interface CropGrowthStage {
  id: string;
  name: string;
  nameHi: string;
  nameMr: string;
  icon: string;
  startPercent: number;
  endPercent: number;
  description: string;
  actionTip: string;
}

export interface CropProfile {
  nameEn: string;
  nameHi: string;
  nameMr: string;
  aliases: string[];
  durationDays: number;
  season: string;
  waterNeed: 'Low' | 'Medium' | 'High';
  icon: string;
  image?: string;
  stages: CropGrowthStage[];
}

export interface StageWithTimeline extends CropGrowthStage {
  startDay: number;
  endDay: number;
  startDateFormatted: string;
  endDateFormatted: string;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
}

export interface CropProgressResult {
  daysElapsed: number;
  totalDays: number;
  daysRemaining: number;
  percent: number;
  sowingDateFormatted: string;
  estimatedHarvestDateFormatted: string;
  estimatedHarvestDateISO: string;
  currentStageIndex: number;
  currentStage: CropGrowthStage;
  stagesWithTimeline: StageWithTimeline[];
  isReadyForHarvest: boolean;
  isOverdue: boolean;
  cropProfile: CropProfile;
}

const COMMON_CROP_PROFILES: CropProfile[] = [
  {
    nameEn: 'Onion',
    nameHi: 'प्याज़',
    nameMr: 'कांदा',
    aliases: ['onion', 'pyaz', 'kanda', 'onions'],
    durationDays: 120,
    season: 'Rabi / Kharif',
    waterNeed: 'Medium',
    icon: '🧅',
    image: '/crops/onion.jpg',
    stages: [
      {
        id: 'seedling',
        name: 'Transplanting & Establishment',
        nameHi: 'प्रत्यारोपण और जमाव',
        nameMr: 'पुनर्लागवड आणि स्थिरावणे',
        icon: '🌱',
        startPercent: 0,
        endPercent: 20,
        description: 'Root system establishing and early vegetative foliage.',
        actionTip: 'Keep soil moist for 10-12 days; apply basal DAP/potash dose.',
      },
      {
        id: 'vegetative',
        name: 'Active Vegetative Growth',
        nameHi: 'सक्रिय वानस्पतिक वृद्धि',
        nameMr: 'जोमदार शाकीय वाढ',
        icon: '🌿',
        startPercent: 20,
        endPercent: 50,
        description: 'Rapid foliage development with 8-10 leaves per plant.',
        actionTip: 'Apply first nitrogen top dressing; check for thrips and purple blotch.',
      },
      {
        id: 'bulb_formation',
        name: 'Bulb Initiation & Bulking',
        nameHi: 'कंद निर्माण और फैलाव',
        nameMr: 'कांदा पोसणे (कंद वाढीची अवस्था)',
        icon: '🧅',
        startPercent: 50,
        endPercent: 85,
        description: 'Swelling of the underground bulb with active nutrient translocation.',
        actionTip: 'Maintain uniform irrigation; apply Sulphur and Potash (00:00:50).',
      },
      {
        id: 'maturity_harvest',
        name: 'Neck Fall & Harvest Maturity',
        nameHi: 'पत्ती गिरना और कटाई',
        nameMr: 'मानेचा वाकणे व काढणी',
        icon: '🚜',
        startPercent: 85,
        endPercent: 100,
        description: '50-70% tops collapse naturally, indicating bulb skin hardening.',
        actionTip: 'Stop irrigation 10-15 days before harvest; cure in field for 3-5 days.',
      },
    ],
  },
  {
    nameEn: 'Tomato',
    nameHi: 'टमाटर',
    nameMr: 'टोमॅटो',
    aliases: ['tomato', 'tamatar', 'tomatoes'],
    durationDays: 90,
    season: 'Year-round',
    waterNeed: 'Medium',
    icon: '🍅',
    image: '/crops/tomato.jpg',
    stages: [
      {
        id: 'establishment',
        name: 'Transplant & Rooting',
        nameHi: 'रोपाई और जड़ विकास',
        nameMr: 'लागवड आणि मुळांची वाढ',
        icon: '🌱',
        startPercent: 0,
        endPercent: 25,
        description: 'Young seedlings develop sturdy adventitious root system.',
        actionTip: 'Provide stake support and protective fungicidal drenching.',
      },
      {
        id: 'vegetative_branching',
        name: 'Branching & Foliage',
        nameHi: 'शाखा विकास और पत्तियां',
        nameMr: 'फांद्या आणि पर्णसंभार वाढ',
        icon: '🌿',
        startPercent: 25,
        endPercent: 45,
        description: 'Strong shoot branching and flower bud formation.',
        actionTip: 'Prune lower suckers; apply 19:19:19 soluble fertiliser.',
      },
      {
        id: 'flowering_fruitset',
        name: 'Flowering & Fruit Setting',
        nameHi: 'फूल आना और फल लगना',
        nameMr: 'फुलोरा आणि फळधारणा',
        icon: '🌸',
        startPercent: 45,
        endPercent: 75,
        description: 'Yellow flowers pollinate into green berry clusters.',
        actionTip: 'Spray micronutrients (Boron + Calcium) to prevent blossom-end rot.',
      },
      {
        id: 'harvest',
        name: 'Fruit Ripening & Harvest',
        nameHi: 'फल पकना और तुड़ाई',
        nameMr: 'फळे पिकणे व तोडणी',
        icon: '🍅',
        startPercent: 75,
        endPercent: 100,
        description: 'Fruits turn breaker to deep red stage for picking.',
        actionTip: 'Harvest every 3-4 days in morning hours; handle in plastic crates.',
      },
    ],
  },
  {
    nameEn: 'Rice (Paddy)',
    nameHi: 'धान (चावल)',
    nameMr: 'भात / तांदूळ',
    aliases: ['rice', 'paddy', 'dhan', 'bhat'],
    durationDays: 120,
    season: 'Kharif',
    waterNeed: 'High',
    icon: '🌾',
    image: '/crops/rice.jpg',
    stages: [
      {
        id: 'seedling_tillering',
        name: 'Seedling & Tillering',
        nameHi: 'अंकुरण और कल्ले फूटना',
        nameMr: 'रोपे व फुटवे येणे',
        icon: '🌱',
        startPercent: 0,
        endPercent: 35,
        description: 'Main shoot produces secondary and tertiary productive tillers.',
        actionTip: 'Maintain 2-3 cm shallow water level; apply first urea split dose.',
      },
      {
        id: 'panicle_initiation',
        name: 'Panicle Initiation & Booting',
        nameHi: 'बाली बनना और गाभा अवस्था',
        nameMr: 'लोंबी फुटणे व पोटरी अवस्था',
        icon: '🌿',
        startPercent: 35,
        endPercent: 65,
        description: 'Developing panicle expands inside the flag leaf sheath.',
        actionTip: 'Critical water stage - do not allow water stress; watch for stem borer.',
      },
      {
        id: 'flowering_milk',
        name: 'Flowering & Grain Filling',
        nameHi: 'फूल खिलना और दूधिया दाना',
        nameMr: 'फुलोरा व दाणे भरण्याची अवस्था',
        icon: '🌾',
        startPercent: 65,
        endPercent: 88,
        description: 'Anthesis occurs and milky starch fills developing glumes.',
        actionTip: 'Maintain 5 cm standing water; protect against brown planthopper and blast.',
      },
      {
        id: 'dough_harvest',
        name: 'Dough Stage & Harvest',
        nameHi: 'दाना पकना और कटाई',
        nameMr: 'दाणे पक्व होणे व कापणी',
        icon: '🚜',
        startPercent: 88,
        endPercent: 100,
        description: 'Grains harden and straw turns golden yellow.',
        actionTip: 'Drain standing water 7-10 days before harvesting when 85% grains turn golden.',
      },
    ],
  },
  {
    nameEn: 'Wheat',
    nameHi: 'गेहूँ',
    nameMr: 'गहू',
    aliases: ['wheat', 'gehu', 'gahu'],
    durationDays: 120,
    season: 'Rabi',
    waterNeed: 'Medium',
    icon: '🌾',
    image: '/crops/wheat.jpg',
    stages: [
      {
        id: 'germination_cri',
        name: 'Crown Root Initiation (CRI)',
        nameHi: 'अंकुरण और मुख्य जड़ निकलना',
        nameMr: 'मुकुट मुळे फुटण्याची अवस्था',
        icon: '🌱',
        startPercent: 0,
        endPercent: 20,
        description: 'Critical crown roots form at 21 days after sowing.',
        actionTip: 'First irrigation at 21 days is mandatory; do not delay.',
      },
      {
        id: 'tillering_jointing',
        name: 'Tillering & Stem Extension',
        nameHi: 'कल्ले फूटना और तना वृद्धि',
        nameMr: 'फुटवे येणे व कांड्या वाढणे',
        icon: '🌿',
        startPercent: 20,
        endPercent: 55,
        description: 'Multiple productive stems form and nodes elongate.',
        actionTip: 'Second irrigation at 40-45 days; apply remaining nitrogen top dressing.',
      },
      {
        id: 'heading_flowering',
        name: 'Heading & Flowering',
        nameHi: 'बाली निकलना और फूल आना',
        nameMr: 'ओंब्या बाहेर पडणे व फुलोरा',
        icon: '🌾',
        startPercent: 55,
        endPercent: 80,
        description: 'Ears emerge from the boot and anthesis begins.',
        actionTip: 'Irrigate at flowering stage; inspect for yellow and brown rust.',
      },
      {
        id: 'ripening_harvest',
        name: 'Grain Filling & Harvest',
        nameHi: 'दाना भराव और कटाई',
        nameMr: 'दाणे भरणे व कापणी',
        icon: '🚜',
        startPercent: 80,
        endPercent: 100,
        description: 'Grains pass dough stage into flinty hard maturity.',
        actionTip: 'Harvest when grains resist breaking with thumb nail and moisture drops to 14%.',
      },
    ],
  },
  {
    nameEn: 'Cotton',
    nameHi: 'कपास',
    nameMr: 'कापूस',
    aliases: ['cotton', 'kapas', 'kapus'],
    durationDays: 165,
    season: 'Kharif',
    waterNeed: 'Medium',
    icon: '☁️',
    image: '/crops/cotton.jpg',
    stages: [
      {
        id: 'seedling',
        name: 'Seedling & Early Vegetative',
        nameHi: 'अंकुरण और पौधा विकास',
        nameMr: 'उगवण आणि प्राथमिक वाढ',
        icon: '🌱',
        startPercent: 0,
        endPercent: 25,
        description: 'Formation of true leaves and tap root establishment.',
        actionTip: 'Gap filling and thinning within 15 days; intercultivation for weeds.',
      },
      {
        id: 'squaring_flowering',
        name: 'Square Formation & Flowering',
        nameHi: 'कली बनना और फूल खिलना',
        nameMr: 'पात्या व फुले येणे',
        icon: '🌸',
        startPercent: 25,
        endPercent: 55,
        description: 'Floral buds (squares) develop and creamy white blossoms open.',
        actionTip: 'Scout for pink bollworm and sucking pests (jassids, thrips).',
      },
      {
        id: 'boll_development',
        name: 'Boll Development',
        nameHi: 'टिंडे का विकास',
        nameMr: 'बोंडे भरणे व विकास',
        icon: '🟢',
        startPercent: 55,
        endPercent: 85,
        description: 'Rapid enlargement of boll and lint fiber synthesis.',
        actionTip: 'Apply 13:00:45 foliar spray; avoid drought stress during peak boll load.',
      },
      {
        id: 'boll_bursting_picking',
        name: 'Boll Bursting & Picking',
        nameHi: 'टिंडे खिलना और कपास चुगाई',
        nameMr: 'बोंडे फुटणे व वेचणी',
        icon: '🧺',
        startPercent: 85,
        endPercent: 100,
        description: 'Mature bolls crack open exposing fluffy white fiber.',
        actionTip: 'Pick clean cotton in dry afternoon; store in dry, moisture-free sheds.',
      },
    ],
  },
  {
    nameEn: 'Sugarcane',
    nameHi: 'गन्ना',
    nameMr: 'ऊस',
    aliases: ['sugarcane', 'ganna', 'us'],
    durationDays: 360,
    season: 'Adsali / Suru',
    waterNeed: 'High',
    icon: '🎋',
    image: '/crops/sugarcane.jpg',
    stages: [
      {
        id: 'germination',
        name: 'Germination & Settling',
        nameHi: 'अंकुरण अवस्था',
        nameMr: 'उगवण अवस्था',
        icon: '🌱',
        startPercent: 0,
        endPercent: 15,
        description: 'Eyes on cane setts sprout and form primary shoots.',
        actionTip: 'Light irrigations every 7-8 days; check sett emergence.',
      },
      {
        id: 'tillering',
        name: 'Tillering & Formative',
        nameHi: 'कल्ले फूटना',
        nameMr: 'फुटवे फुटण्याची अवस्था',
        icon: '🌿',
        startPercent: 15,
        endPercent: 35,
        description: 'Production of maximum tillers per clump.',
        actionTip: 'Earthing up at 90 days; apply second dose of nitrogen.',
      },
      {
        id: 'grand_growth',
        name: 'Grand Growth Period',
        nameHi: 'तीव्र तना वृद्धि',
        nameMr: 'मोठ्या वाढीची अवस्था (कांड्या वाढणे)',
        icon: '🎋',
        startPercent: 35,
        endPercent: 80,
        description: 'Cane elongates rapidly, internodes form and accumulate biomass.',
        actionTip: 'Frequent irrigation; propping and trash mulching to prevent lodging.',
      },
      {
        id: 'ripening',
        name: 'Ripening & Harvesting',
        nameHi: 'परिपक्वता और कटाई',
        nameMr: 'पक्वता आणि तोडणी',
        icon: '🚜',
        startPercent: 80,
        endPercent: 100,
        description: 'Sucrose synthesis peaks in the stalk internodes.',
        actionTip: 'Stop watering 15-20 days before factory cutting; harvest close to ground.',
      },
    ],
  },
  {
    nameEn: 'Maize',
    nameHi: 'मक्का',
    nameMr: 'मका',
    aliases: ['maize', 'corn', 'makka', 'maka'],
    durationDays: 105,
    season: 'Kharif / Rabi',
    waterNeed: 'Medium',
    icon: '🌽',
    image: '/crops/maize.jpg',
    stages: [
      {
        id: 'emergence',
        name: 'Emergence & Early Vegetative',
        nameHi: 'अंकुरण और पौधा विकास',
        nameMr: 'उगवण व प्राथमिक वाढ',
        icon: '🌱',
        startPercent: 0,
        endPercent: 25,
        description: 'V4 to V6 collar stages with deep nodal root emergence.',
        actionTip: 'Thin to one healthy seedling per hill; apply pre-emergence weed control.',
      },
      {
        id: 'whorl_vegetative',
        name: 'Rapid Whorl Growth',
        nameHi: 'तीव्र वानस्पतिक वृद्धि',
        nameMr: 'जोमदार पोंग्यांची वाढ',
        icon: '🌿',
        startPercent: 25,
        endPercent: 50,
        description: 'Stalk diameter thickens and leaf area expands exponentially.',
        actionTip: 'Apply nitrogen top dressing; scout for Fall Armyworm in whorls.',
      },
      {
        id: 'tasseling_silking',
        name: 'Tasseling & Silking',
        nameHi: 'मंजरी निकलना और परागण',
        nameMr: 'तुरा व कणसाचे केस बाहेर पडणे',
        icon: '🌽',
        startPercent: 50,
        endPercent: 75,
        description: 'Pollen shedding from tassels and pollination of ear silks.',
        actionTip: 'Critical moisture period; any drought now causes poor grain set.',
      },
      {
        id: 'grain_maturity',
        name: 'Grain Fill & Harvest',
        nameHi: 'दाना भराव और कटाई',
        nameMr: 'दाणे भरणे व कणसे काढणी',
        icon: '🚜',
        startPercent: 75,
        endPercent: 100,
        description: 'Kernels pass milk to dent stage, black layer forms at base.',
        actionTip: 'Harvest when husk turns paper dry and kernel moisture drops below 20%.',
      },
    ],
  },
  {
    nameEn: 'Soybean',
    nameHi: 'सोयाबीन',
    nameMr: 'सोयाबीन',
    aliases: ['soybean', 'soya'],
    durationDays: 95,
    season: 'Kharif',
    waterNeed: 'Medium',
    icon: '🫘',
    image: '/crops/soybean.jpg',
    stages: [
      {
        id: 'emergence',
        name: 'Emergence & Nodulation',
        nameHi: 'अंकुरण और ग्रंथि निर्माण',
        nameMr: 'उगवण आणि गाठींची निर्मिती',
        icon: '🌱',
        startPercent: 0,
        endPercent: 25,
        description: 'Seedlings emerge and Rhizobium root nodules fix atmospheric nitrogen.',
        actionTip: 'Avoid crusting after rains; ensure good drainage to prevent waterlogging.',
      },
      {
        id: 'flowering',
        name: 'Vegetative & Flowering',
        nameHi: 'वानस्पतिक और पुष्पन',
        nameMr: 'वाढ आणि फुलोरा अवस्था',
        icon: '🌸',
        startPercent: 25,
        endPercent: 55,
        description: 'Small purple/white flowers bloom continuously along leaf axils.',
        actionTip: 'Do not spray chemicals during peak morning bee activity.',
      },
      {
        id: 'pod_filling',
        name: 'Pod Formation & Seed Fill',
        nameHi: 'फली निर्माण और दाना भराव',
        nameMr: 'शेंगा भरणे व दाणे भरणे',
        icon: '🫘',
        startPercent: 55,
        endPercent: 85,
        description: 'Green pods swell as protein and oil accumulate in seeds.',
        actionTip: 'Ensure soil moisture; spray 00:52:34 for bold grain weight.',
      },
      {
        id: 'maturity',
        name: 'Leaf Senescence & Harvest',
        nameHi: 'पत्ती झड़ना और कटाई',
        nameMr: 'पाने गळणे व कापणी',
        icon: '🚜',
        startPercent: 85,
        endPercent: 100,
        description: 'Leaves drop naturally, stems turn brown, and pods rattle when shaken.',
        actionTip: 'Harvest promptly at 13-14% moisture to prevent pod shattering.',
      },
    ],
  },
  {
    nameEn: 'Groundnut (Peanut)',
    nameHi: 'मूंगफली',
    nameMr: 'भुईमूग',
    aliases: ['groundnut', 'peanut', 'mungfali', 'bhuimug'],
    durationDays: 115,
    season: 'Kharif / Summer',
    waterNeed: 'Low',
    icon: '🥜',
    image: '/crops/groundnut.jpg',
    stages: [
      {
        id: 'seedling',
        name: 'Emergence & Early Growth',
        nameHi: 'अंकुरण और प्रारंभिक वृद्धि',
        nameMr: 'उगवण आणि प्राथमिक वाढ',
        icon: '🌱',
        startPercent: 0,
        endPercent: 25,
        description: 'Sturdy tap root develops with spreading leafy branches.',
        actionTip: 'Light hoeing for soil aeration before flowering begins.',
      },
      {
        id: 'flowering_pegging',
        name: 'Flowering & Pegging',
        nameHi: 'फूल आना और सूई (Peg) बनना',
        nameMr: 'फुलोरा आणि आऱ्या जमिनीत जाणे',
        icon: '🌸',
        startPercent: 25,
        endPercent: 60,
        description: 'Fertilised flowers form pegs that curve downward into the soil.',
        actionTip: 'CRITICAL: Keep topsoil loose; DO NOT disturb soil once pegs enter ground.',
      },
      {
        id: 'pod_development',
        name: 'Underground Pod Development',
        nameHi: 'जमीन के अंदर दाना भराव',
        nameMr: 'जमिनीत शेंगा भरणे',
        icon: '🥜',
        startPercent: 60,
        endPercent: 85,
        description: 'Peg tips swell horizontally underground to form pods.',
        actionTip: 'Apply Gypsum (200 kg/acre) around pegging zone for shell calcium.',
      },
      {
        id: 'harvest',
        name: 'Maturity & Pulling',
        nameHi: 'परिपक्वता और उखाड़ना',
        nameMr: 'पक्वता आणि उपटणी',
        icon: '🚜',
        startPercent: 85,
        endPercent: 100,
        description: 'Inner shell turns dark brown with prominent veins.',
        actionTip: 'Irrigate lightly before pulling; dry pods in sun for 4-6 days.',
      },
    ],
  },
  {
    nameEn: 'Tur (Pigeon Pea)',
    nameHi: 'अरहर / तूर',
    nameMr: 'तूर',
    aliases: ['tur', 'arhar', 'pigeon pea', 'toor'],
    durationDays: 160,
    season: 'Kharif',
    waterNeed: 'Low',
    icon: '🫘',
    image: '/crops/tur.jpg',
    stages: [
      {
        id: 'seedling',
        name: 'Slow Early Vegetative',
        nameHi: 'प्रारंभिक धीमी वृद्धि',
        nameMr: 'प्राथमिक सावकाश वाढ',
        icon: '🌱',
        startPercent: 0,
        endPercent: 30,
        description: 'Deep taproot develops while top growth stays compact.',
        actionTip: 'Intercrop with soybean or bajra; keep weed-free for 45 days.',
      },
      {
        id: 'branching',
        name: 'Active Branching & Canopyl',
        nameHi: 'सक्रिय शाखा विस्तार',
        nameMr: 'फांद्यांचा विस्तार',
        icon: '🌿',
        startPercent: 30,
        endPercent: 60,
        description: 'Bushy canopy forms with extensive flowering branches.',
        actionTip: 'Nip terminal shoot at 45-50 days to induce maximum side branching.',
      },
      {
        id: 'flowering_podding',
        name: 'Flowering & Pod Setting',
        nameHi: 'फूल खिलना और फली लगना',
        nameMr: 'फुलोरा आणि शेंगा धरणे',
        icon: '🌸',
        startPercent: 60,
        endPercent: 85,
        description: 'Yellow and red blossoms set long fuzzy pods.',
        actionTip: 'Scout regularly for Helicoverpa (gram pod borer); install pheromone traps.',
      },
      {
        id: 'harvest',
        name: 'Pod Drying & Harvest',
        nameHi: 'फली सूखना और कटाई',
        nameMr: 'शेंगा वाळणे व तोडणी',
        icon: '🚜',
        startPercent: 85,
        endPercent: 100,
        description: '80% pods turn brown and dry on the bush.',
        actionTip: 'Cut plants with sickles; bundle and dry on threshing floor.',
      },
    ],
  },
  {
    nameEn: 'Chilli',
    nameHi: 'मिर्च',
    nameMr: 'मिरची',
    aliases: ['chilli', 'chili', 'mirch', 'mirchi'],
    durationDays: 120,
    season: 'Kharif / Summer',
    waterNeed: 'Medium',
    icon: '🌶️',
    image: '/crops/chilli.jpg',
    stages: [
      {
        id: 'establishment',
        name: 'Transplant Establishment',
        nameHi: 'रोपाई और जड़ जमाव',
        nameMr: 'पुनर्लागवड व स्थिरावणे',
        icon: '🌱',
        startPercent: 0,
        endPercent: 25,
        description: 'Seedlings take root in raised beds or ridges.',
        actionTip: 'Drench with Trichoderma to prevent damping-off.',
      },
      {
        id: 'vegetative',
        name: 'Vegetative Canopy & First Blooms',
        nameHi: 'शाकीय वृद्धि और कलियां',
        nameMr: 'झाडांची वाढ व कळ्या येणे',
        icon: '🌿',
        startPercent: 25,
        endPercent: 50,
        description: 'Sturdy bush branching with small white star-shaped flowers.',
        actionTip: 'Watch for thrips and mites (leaf curling); spray neem formulation.',
      },
      {
        id: 'fruiting',
        name: 'Active Fruiting & Elongation',
        nameHi: 'फल लगना और विकास',
        nameMr: 'मिरच्या धरणे व वाढ',
        icon: '🌶️',
        startPercent: 50,
        endPercent: 80,
        description: 'Green pods elongate and turn glossy.',
        actionTip: 'Apply regular light irrigations; top-dress potash for hotness and shine.',
      },
      {
        id: 'harvest',
        name: 'Multiple Pickings',
        nameHi: 'हरी/लाल मिर्च तुड़ाई',
        nameMr: 'मिरच्यांची तोडणी',
        icon: '🧺',
        startPercent: 80,
        endPercent: 100,
        description: 'Pick green for market or leave to ripen red for drying.',
        actionTip: 'Harvest every 8-10 days; pick with stalks intact.',
      },
    ],
  },
  {
    nameEn: 'Potato',
    nameHi: 'आलू',
    nameMr: 'बटाटा',
    aliases: ['potato', 'aloo', 'batata'],
    durationDays: 90,
    season: 'Rabi',
    waterNeed: 'Medium',
    icon: '🥔',
    image: '/crops/potato.jpg',
    stages: [
      {
        id: 'sprouting',
        name: 'Sprouting & Emergence',
        nameHi: 'अंकुरण और जमाव',
        nameMr: 'कोंब फुटणे व उगवण',
        icon: '🌱',
        startPercent: 0,
        endPercent: 20,
        description: 'Sprouts emerge from seed tubers through the ridge soil.',
        actionTip: 'Ensure moist ridges; protect against late blight spores.',
      },
      {
        id: 'vegetative_stolons',
        name: 'Vegetative Growth & Stolons',
        nameHi: 'पौधा वृद्धि और स्टोलन',
        nameMr: 'झाडाची वाढ व स्टोलन निर्मिती',
        icon: '🌿',
        startPercent: 20,
        endPercent: 45,
        description: 'Underground stolons hook and begin tuber initiation.',
        actionTip: 'Earthing up at 30 days is vital to prevent sun-greening of tubers.',
      },
      {
        id: 'tuber_bulking',
        name: 'Tuber Bulking',
        nameHi: 'कंद का तेजी से बढ़ना',
        nameMr: 'बटाटे पोसणे (कंद फुगवणे)',
        icon: '🥔',
        startPercent: 45,
        endPercent: 80,
        description: 'Nutrients rapidly fill underground tubers.',
        actionTip: 'High water and potassium demand; maintain constant ridge moisture.',
      },
      {
        id: 'maturity_digging',
        name: 'Haulm Cutting & Harvest',
        nameHi: 'बेल काटना और खुदाई',
        nameMr: 'वेल कापणे व बटाटे काढणी',
        icon: '🚜',
        startPercent: 80,
        endPercent: 100,
        description: 'Cut haulms (tops) 10 days before digging to cure tuber skin.',
        actionTip: 'Dig carefully with potato digger to avoid cuts; cure in shade.',
      },
    ],
  },
  {
    nameEn: 'Grapes',
    nameHi: 'अंगूर',
    nameMr: 'द्राक्षे',
    aliases: ['grapes', 'grape', 'angoor', 'draksha'],
    durationDays: 140,
    season: 'October Pruning Season',
    waterNeed: 'Medium',
    icon: '🍇',
    image: '/crops/grapes.jpg',
    stages: [
      {
        id: 'budburst',
        name: 'Bud Burst & Shoot Growth',
        nameHi: 'फुटाव और नई शाखाएं',
        nameMr: 'कोंब फुटणे व शेंड्यांची वाढ',
        icon: '🌱',
        startPercent: 0,
        endPercent: 20,
        description: 'Dormant buds break and green shoots elongate on trellises.',
        actionTip: 'Apply hydrogen cyanamide paste after pruning; protect tender shoots from flea beetle.',
      },
      {
        id: 'flowering_setting',
        name: 'Flowering & Berry Set',
        nameHi: 'फूल खिलना और दाना बनना',
        nameMr: 'फुलोरा आणि मणी धरणे',
        icon: '🌸',
        startPercent: 20,
        endPercent: 45,
        description: 'Caps drop, berries set, and cluster thinning begins.',
        actionTip: 'Dip bunches in Gibberellic Acid (GA3) for berry elongation and thinning.',
      },
      {
        id: 'berry_development',
        name: 'Berry Development & Veraison',
        nameHi: 'दाना बढ़ना और रंग बदलना',
        nameMr: 'मणी फुगवणे व रंग बदलणे',
        icon: '🍇',
        startPercent: 45,
        endPercent: 80,
        description: 'Berries soften, sugar accumulates, and acid decreases.',
        actionTip: 'Carefully regulate drip irrigation; control powdery and downy mildew.',
      },
      {
        id: 'harvest',
        name: 'Sugar Maturity & Harvesting',
        nameHi: 'मिठास और अंगूर कटाई',
        nameMr: 'साखर भरणे व द्राक्ष तोडणी',
        icon: '✂️',
        startPercent: 80,
        endPercent: 100,
        description: 'Total Soluble Solids (TSS) reach 18-20° Brix with ideal berry size.',
        actionTip: 'Harvest with grape scissors early morning; pack in ventilated export cartons.',
      },
    ],
  },
];

// Fallback generic 5-stage profile for unlisted crops
const GENERIC_CROP_PROFILE: CropProfile = {
  nameEn: 'General Farm Crop',
  nameHi: 'सामान्य फसल',
  nameMr: 'सर्वसाधारण शेत पीक',
  aliases: [],
  durationDays: 110,
  season: 'Current Season',
  waterNeed: 'Medium',
  icon: '🌱',
  stages: [
    {
      id: 'sowing_germination',
      name: 'Sowing & Germination',
      nameHi: 'बुवाई और अंकुरण',
      nameMr: 'पेरणी आणि उगवण',
      icon: '🌱',
      startPercent: 0,
      endPercent: 20,
      description: 'Seeds absorb moisture and first green leaves break through.',
      actionTip: 'Ensure adequate seedbed moisture and check seedling emergence rate.',
    },
    {
      id: 'vegetative_tillering',
      name: 'Active Vegetative Growth',
      nameHi: 'वानस्पतिक वृद्धि',
      nameMr: 'शाकीय वाढ आणि फुटवे',
      icon: '🌿',
      startPercent: 20,
      endPercent: 50,
      description: 'Canopy expansion, root elongation, and leaf development.',
      actionTip: 'Timely weeding and apply balanced nitrogen/phosphorus fertilizers.',
    },
    {
      id: 'flowering_reproductive',
      name: 'Flowering & Reproduction',
      nameHi: 'फूल और कलियां',
      nameMr: 'फुलोरा आणि कळ्या येणे',
      icon: '🌸',
      startPercent: 50,
      endPercent: 75,
      description: 'Blossoms emerge and pollination takes place.',
      actionTip: 'Protect against insect pests and avoid moisture stress during pollination.',
    },
    {
      id: 'fruit_grain_filling',
      name: 'Grain / Fruit Filling',
      nameHi: 'दाना / फल भराव',
      nameMr: 'दाणे / फळे भरणे व फुगवणे',
      icon: '🌾',
      startPercent: 75,
      endPercent: 90,
      description: 'Active nutrient translocation into grains, pods, or fruits.',
      actionTip: 'Ensure consistent soil moisture; supplement with potash or micronutrients.',
    },
    {
      id: 'maturity_harvest',
      name: 'Maturity & Harvest',
      nameHi: 'परिपक्वता और कटाई',
      nameMr: 'पक्वता आणि काढणी',
      icon: '🚜',
      startPercent: 90,
      endPercent: 100,
      description: 'Crop reaches full physiological maturity, drying down for harvest.',
      actionTip: 'Plan harvest on clear dry weather; check moisture levels for safe storage.',
    },
  ],
};

export function getCropGrowthProfile(cropName: string): CropProfile {
  if (!cropName || typeof cropName !== 'string') return GENERIC_CROP_PROFILE;
  const clean = cropName.trim().toLowerCase();

  const found = COMMON_CROP_PROFILES.find((p) => {
    if (p.nameEn.toLowerCase() === clean) return true;
    if (p.nameEn.toLowerCase().includes(clean) || clean.includes(p.nameEn.toLowerCase())) return true;
    return p.aliases.some((a) => clean.includes(a) || a.includes(clean));
  });

  if (found) return found;

  return {
    ...GENERIC_CROP_PROFILE,
    nameEn: cropName,
  };
}

export function getAllCropProfiles(): CropProfile[] {
  return COMMON_CROP_PROFILES;
}

const MS_PER_DAY = 86400000;

/**
 * Parse a 'YYYY-MM-DD' string as a *local* calendar date.
 *
 * `new Date('2026-08-23')` is specified to mean UTC midnight, which in any
 * timezone behind UTC lands on the previous local day. Since every date in this
 * module is a plain calendar day (a farmer does not sow at an instant), the
 * string has to be read in local time or the whole calculation shifts by a day.
 */
function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (match) {
    const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  const fallback = new Date(value);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/** Format from local calendar parts. toISOString() would shift the day by timezone. */
function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date.getTime());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Calendar-day arithmetic, so a DST change cannot shorten or lengthen a day. */
function addDays(date: Date, days: number): Date {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Whole calendar days from `from` to `to`, ignoring time of day. */
function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

export function estimateHarvestDate(sowingDateISO: string, cropName: string): string {
  const profile = getCropGrowthProfile(cropName);
  const sowDate = parseDateOnly(sowingDateISO);
  if (!sowDate) {
    return toDateOnly(addDays(new Date(), profile.durationDays));
  }
  return toDateOnly(addDays(sowDate, profile.durationDays));
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function calculateCropProgress(
  sowingDateStr?: string | null,
  harvestDateStr?: string | null,
  cropName = '',
  status = 'Growing',
): CropProgressResult {
  const profile = getCropGrowthProfile(cropName);
  const now = startOfDay(new Date());

  let sowingDate = sowingDateStr ? parseDateOnly(sowingDateStr) : addDays(now, -20);
  if (!sowingDate) {
    sowingDate = addDays(now, -20);
  }
  sowingDate = startOfDay(sowingDate);

  // Total days calculation
  let totalDays = profile.durationDays;
  let estimatedHarvestDate: Date;

  if (harvestDateStr) {
    const customHarvest = parseDateOnly(harvestDateStr);
    if (customHarvest && startOfDay(customHarvest).getTime() > sowingDate.getTime()) {
      estimatedHarvestDate = startOfDay(customHarvest);
      totalDays = Math.max(1, daysBetween(sowingDate, estimatedHarvestDate));
    } else {
      estimatedHarvestDate = addDays(sowingDate, profile.durationDays);
    }
  } else {
    estimatedHarvestDate = addDays(sowingDate, profile.durationDays);
  }

  const daysElapsed = Math.max(0, daysBetween(sowingDate, now));
  const daysRemaining = Math.max(0, daysBetween(now, estimatedHarvestDate));

  let percent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));
  const isHarvested = status.toLowerCase() === 'harvested';
  if (isHarvested) {
    percent = 100;
  }

  // Calculate timeline stages with exact calendar dates
  const stagesWithTimeline: StageWithTimeline[] = profile.stages.map((st) => {
    const startDay = Math.round((st.startPercent / 100) * totalDays);
    const endDay = Math.round((st.endPercent / 100) * totalDays);

    const stageStartDate = new Date(sowingDate.getTime() + startDay * 86400000);
    const stageEndDate = new Date(sowingDate.getTime() + endDay * 86400000);

    const isPast = isHarvested || percent >= st.endPercent;
    const isCurrent = !isHarvested && percent >= st.startPercent && percent < st.endPercent;
    const isFuture = !isHarvested && percent < st.startPercent;

    return {
      ...st,
      startDay,
      endDay,
      startDateFormatted: formatDateDisplay(stageStartDate),
      endDateFormatted: formatDateDisplay(stageEndDate),
      isPast,
      isCurrent,
      isFuture,
    };
  });

  // Find current stage
  let currentStageIndex = stagesWithTimeline.findIndex((s) => s.isCurrent);
  if (currentStageIndex === -1) {
    if (percent >= 100 || isHarvested) {
      currentStageIndex = stagesWithTimeline.length - 1;
    } else {
      currentStageIndex = 0;
    }
  }

  const currentStage = stagesWithTimeline[currentStageIndex];
  const isReadyForHarvest = !isHarvested && (percent >= 90 || daysRemaining <= 7);
  const isOverdue = !isHarvested && daysElapsed > totalDays;

  return {
    daysElapsed,
    totalDays,
    daysRemaining,
    percent,
    sowingDateFormatted: formatDateDisplay(sowingDate),
    estimatedHarvestDateFormatted: formatDateDisplay(estimatedHarvestDate),
    estimatedHarvestDateISO: toDateOnly(estimatedHarvestDate),
    currentStageIndex,
    currentStage,
    stagesWithTimeline,
    isReadyForHarvest,
    isOverdue,
    cropProfile: profile,
  };
}
