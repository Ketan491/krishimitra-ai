CREATE DATABASE IF NOT EXISTS krishimitra_ai;
USE krishimitra_ai;

CREATE TABLE farmers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  mobile        VARCHAR(15) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  location      VARCHAR(100),
  soil_type     VARCHAR(30),
  land_size     DECIMAL(6,2) DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  mobile        VARCHAR(15) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  address       VARCHAR(255),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admins (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE products (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id  INT NOT NULL,
  crop_name  VARCHAR(100) NOT NULL,
  price      DECIMAL(10,2) NOT NULL,
  quantity   DECIMAL(10,2) NOT NULL,
  unit       VARCHAR(10) DEFAULT 'kg',
  photo_url  VARCHAR(255),
  approved   BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
);

CREATE TABLE crops (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id    INT NOT NULL,
  crop_name    VARCHAR(100) NOT NULL,
  sowing_date  DATE,
  harvest_date DATE,
  status       VARCHAR(30) DEFAULT 'Sown',
  FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
);

CREATE TABLE orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  product_id  INT NOT NULL,
  farmer_id   INT NOT NULL,
  quantity    DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  address     VARCHAR(255),
  order_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status      VARCHAR(20) DEFAULT 'Pending',
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
);

CREATE TABLE equipment (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id    INT NOT NULL,
  type         VARCHAR(50) NOT NULL,
  rent_per_day DECIMAL(10,2) NOT NULL,
  availability BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
);

CREATE TABLE recommendations (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id         INT NOT NULL,
  location          VARCHAR(100),
  soil_type         VARCHAR(30),
  season            VARCHAR(20),
  recommended_crops VARCHAR(255),
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
);

CREATE TABLE schemes (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(150) NOT NULL,
  min_land            DECIMAL(6,2) DEFAULT 0,
  max_land            DECIMAL(6,2) DEFAULT 1000,
  crop                VARCHAR(50) DEFAULT 'any',
  description         TEXT
);

CREATE TABLE reviews (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  product_id  INT NOT NULL,
  rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE weather_cache (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  location             VARCHAR(100),
  temperature          DECIMAL(5,2),
  rainfall_probability DECIMAL(5,2),
  forecast_date        DATE
);

INSERT INTO schemes (name, min_land, max_land, crop, description) VALUES
('PM-KISAN Samman Nidhi', 0, 5, 'any', 'Income support of Rs.6,000/year to small and marginal farmer families.'),
('Pradhan Mantri Fasal Bima Yojana (PMFBY)', 0, 1000, 'any', 'Crop insurance scheme covering losses due to natural calamities, pests and diseases.'),
('Kisan Credit Card (KCC)', 0, 1000, 'any', 'Short-term credit at subsidised interest rates for crop, equipment and post-harvest needs.'),
('Soil Health Card Scheme', 0, 1000, 'any', 'Free soil testing every 2 years with fertiliser-use recommendations per field.'),
('Sub-Mission on Agricultural Mechanization (SMAM)', 0.5, 1000, 'any', 'Subsidy (up to 50%) on purchase of tractors, tillers and other farm equipment.');

CREATE TABLE crop_catalog (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  name_en                VARCHAR(100) NOT NULL,
  name_mr                VARCHAR(100),
  scientific_name        VARCHAR(100),
  soil_type              VARCHAR(60)  NOT NULL,
  season                 VARCHAR(40)  NOT NULL,
  sowing_month           VARCHAR(60),
  harvest_month          VARCHAR(60),
  water_requirement      ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  avg_yield              VARCHAR(60),
  price_range            VARCHAR(60),
  description            TEXT,
  common_diseases        VARCHAR(300),
  recommended_fertilizer VARCHAR(300),
  image_url              VARCHAR(255),
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_crop_name_en (name_en),
  INDEX idx_crop_season (season),
  INDEX idx_crop_soil (soil_type)
);

INSERT INTO crop_catalog (name_en, name_mr, scientific_name, soil_type, season, sowing_month, harvest_month, water_requirement, avg_yield, price_range, description, common_diseases, recommended_fertilizer, image_url) VALUES
('Rice (Paddy)', 'भात / तांदूळ', 'Oryza sativa', 'clay, loamy', 'Kharif', 'June–July', 'October–November', 'High', '18–22 quintal/acre', '₹1800–2200/quintal', 'Staple cereal grown in high-rainfall and irrigated tracts of Konkan and Vidarbha; needs standing water for most of its growth.', 'Blast, Bacterial Leaf Blight, Sheath Blight', 'NPK 100:50:50 kg/ha in 3 split nitrogen doses', NULL),
('Wheat', 'गहू', 'Triticum aestivum', 'loamy, clay', 'Rabi', 'November', 'March', 'Medium', '14–18 quintal/acre', '₹2000–2400/quintal', 'Cool-season cereal sown after monsoon withdrawal; performs best with 5–6 timed irrigations.', 'Rust (yellow/brown), Karnal Bunt, Powdery Mildew', 'NPK 120:60:40 kg/ha, nitrogen split at sowing and irrigations', NULL),
('Jowar (Sorghum)', 'ज्वारी', 'Sorghum bicolor', 'black, loamy', 'Kharif, Rabi', 'June or October', 'September or February', 'Low', '10–14 quintal/acre', '₹2500–3000/quintal', 'Hardy, drought-tolerant cereal widely grown across Marathwada; Rabi jowar is a Maharashtra specialty for roti flour.', 'Grain Smut, Anthracnose, Shoot Fly', 'NPK 80:40:40 kg/ha as basal + top dress', NULL),
('Bajra (Pearl Millet)', 'बाजरी', 'Pennisetum glaucum', 'sandy, loamy', 'Kharif', 'June–July', 'September', 'Low', '8–12 quintal/acre', '₹2000–2400/quintal', 'Fast-growing millet suited to light sandy soils and low-rainfall belts of western Maharashtra.', 'Downy Mildew, Ergot, Smut', 'NPK 60:30:30 kg/ha', NULL),
('Maize', 'मका', 'Zea mays', 'loamy, sandy', 'Kharif, Rabi', 'June or November', 'September or March', 'Medium', '22–28 quintal/acre', '₹1800–2100/quintal', 'Versatile cereal used for grain, fodder and sweet corn; responds strongly to fertilizer and irrigation.', 'Turcicum Leaf Blight, Fall Armyworm, Stalk Rot', 'NPK 120:60:40 kg/ha in split doses', NULL),
('Cotton', 'कापूस', 'Gossypium hirsutum', 'black, loamy', 'Kharif', 'June', 'November–January', 'Medium', '6–9 quintal/acre (lint)', '₹6500–7500/quintal', 'Maharashtra''s leading cash crop, grown extensively on Vidarbha and Marathwada''s black cotton soils.', 'Pink Bollworm, Wilt, Leaf Curl Virus', 'NPK 100:50:50 kg/ha in splits at sowing, squaring, flowering', NULL),
('Sugarcane', 'ऊस', 'Saccharum officinarum', 'loamy, clay', 'Annual', 'October or February', '12–14 months after planting', 'High', '35–45 tonnes/acre', '₹2800–3200/tonne (FRP-linked)', 'Long-duration, water-intensive cash crop concentrated in western Maharashtra''s sugar belt.', 'Red Rot, Smut, Woolly Aphid', 'NPK 250:115:115 kg/ha in staged doses across the crop cycle', NULL),
('Soybean', 'सोयाबीन', 'Glycine max', 'black, loamy', 'Kharif', 'June–July', 'October', 'Medium', '9–12 quintal/acre', '₹4200–4800/quintal', 'Oilseed-cum-pulse crop that has rapidly expanded across Vidarbha and Marathwada in recent decades.', 'Yellow Mosaic Virus, Rust, Pod Blight', 'NPK 30:60:30 kg/ha basal; being a legume, avoid excess nitrogen', NULL),
('Tur (Pigeon Pea)', 'तूर', 'Cajanus cajan', 'black, sandy, loamy', 'Kharif', 'June–July', 'December–January', 'Low', '6–8 quintal/acre', '₹6500–7500/quintal', 'Deep-rooted pulse mostly rainfed; a key protein source and common intercrop with cotton or soybean.', 'Fusarium Wilt, Sterility Mosaic, Pod Borer', 'NPK 25:50:0 kg/ha basal only', NULL),
('Moong (Green Gram)', 'मूग', 'Vigna radiata', 'loamy, sandy', 'Kharif, Zaid', 'June or March', 'September or May', 'Low', '3–5 quintal/acre', '₹7000–8000/quintal', 'Short-duration summer/monsoon pulse, useful as a quick catch crop between main seasons.', 'Yellow Mosaic Virus, Cercospora Leaf Spot', 'NPK 20:40:0 kg/ha', NULL),
('Udid (Black Gram)', 'उडीद', 'Vigna mungo', 'loamy, black', 'Kharif', 'June–July', 'September–October', 'Low', '3–5 quintal/acre', '₹6800–7800/quintal', 'Short-duration pulse grown similarly to moong; enriches soil nitrogen for the following crop.', 'Yellow Mosaic Virus, Leaf Crinkle, Powdery Mildew', 'NPK 20:40:0 kg/ha', NULL),
('Chana (Chickpea)', 'हरभरा', 'Cicer arietinum', 'black, loamy', 'Rabi', 'October–November', 'February–March', 'Low', '8–10 quintal/acre', '₹5000–5500/quintal', 'Major Rabi pulse grown on residual moisture after Kharif harvest across the black-soil belt.', 'Wilt, Ascochyta Blight, Pod Borer', 'NPK 20:40:0 kg/ha basal', NULL),
('Groundnut', 'भुईमूग', 'Arachis hypogaea', 'sandy, loamy', 'Kharif, Zaid', 'June or January', 'October or April', 'Medium', '10–14 quintal/acre', '₹5500–6200/quintal', 'Oilseed legume needing well-drained sandy loam; gypsum application improves pod filling.', 'Tikka Leaf Spot, Rust, Collar Rot', 'NPK 25:50:75 kg/ha basal', NULL),
('Sunflower', 'सूर्यफूल', 'Helianthus annuus', 'loamy, black', 'Kharif, Rabi, Zaid', 'June or November', 'September or February', 'Medium', '6–8 quintal/acre', '₹5500–6200/quintal', 'Short-duration oilseed that tolerates moisture stress better than most other oilseeds.', 'Alternaria Blight, Downy Mildew, Head Rot', 'NPK 60:30:30 kg/ha', NULL),
('Safflower', 'करडई', 'Carthamus tinctorius', 'black, loamy', 'Rabi', 'October', 'February–March', 'Low', '5–7 quintal/acre', '₹5500–6500/quintal', 'Deep-rooted, drought-hardy Rabi oilseed traditionally grown on residual black-soil moisture.', 'Aphid infestation, Wilt, Alternaria Leaf Spot', 'NPK 40:20:0 kg/ha basal', NULL),
('Onion', 'कांदा', 'Allium cepa', 'loamy, sandy', 'Rabi, Kharif', 'October or June (nursery)', 'February or October', 'Low', '80–120 quintal/acre', '₹1000–2500/quintal (highly variable)', 'Maharashtra''s flagship vegetable/cash crop (Nashik belt); prices swing sharply with supply.', 'Purple Blotch, Thrips, Basal Rot', 'NPK 100:50:50 kg/ha, nitrogen in 2 splits', NULL),
('Tomato', 'टोमॅटो', 'Solanum lycopersicum', 'loamy, sandy', 'Rabi, Kharif', 'June or October', 'September or January', 'Medium', '150–200 quintal/acre', '₹800–2000/quintal (highly variable)', 'High-value vegetable best grown on raised beds with drip irrigation to avoid fruit cracking.', 'Early Blight, Blossom-End Rot, Fruit Borer', 'NPK 100:50:50 kg/ha; calcium helps reduce blossom-end rot', NULL),
('Potato', 'बटाटा', 'Solanum tuberosum', 'loamy, sandy', 'Rabi', 'October–November', 'January–February', 'Medium', '80–100 quintal/acre', '₹800–1400/quintal', 'Cool-season tuber crop needing loose, well-drained soil for good tuber development.', 'Late Blight, Early Blight, Common Scab', 'NPK 120:60:60 kg/ha', NULL),
('Brinjal (Eggplant)', 'वांगे', 'Solanum melongena', 'loamy, sandy', 'Kharif, Rabi', 'June or October', 'September onward (long picking window)', 'Medium', '120–160 quintal/acre', '₹1000–1800/quintal', 'Widely grown vegetable with a long harvest window of repeated pickings.', 'Fruit & Shoot Borer, Bacterial Wilt, Little Leaf', 'NPK 100:50:50 kg/ha', NULL),
('Cabbage', 'कोबी', 'Brassica oleracea var. capitata', 'loamy', 'Rabi', 'September–October', 'December–January', 'Medium', '150–200 quintal/acre', '₹600–1200/quintal', 'Cool-season leafy vegetable that heads best in mild winter temperatures.', 'Black Rot, Diamondback Moth, Clubroot', 'NPK 100:50:50 kg/ha', NULL),
('Cauliflower', 'फ्लॉवर', 'Brassica oleracea var. botrytis', 'loamy', 'Rabi', 'September–October', 'December–January', 'Medium', '100–140 quintal/acre', '₹800–1500/quintal', 'Related to cabbage; needs consistent moisture for compact, well-formed curds.', 'Black Rot, Curd Blackening, Aphids', 'NPK 100:60:60 kg/ha', NULL),
('Okra (Bhendi)', 'भेंडी', 'Abelmoschus esculentus', 'loamy, sandy', 'Kharif, Zaid', 'June or February', 'August onward (long picking window)', 'Medium', '60–90 quintal/acre', '₹1200–2000/quintal', 'Fast-growing summer/monsoon vegetable with frequent picking over an extended season.', 'Yellow Vein Mosaic Virus, Fruit Borer, Powdery Mildew', 'NPK 80:40:40 kg/ha', NULL),
('Chilli', 'मिरची', 'Capsicum annuum', 'loamy, black', 'Kharif, Rabi', 'June or November', 'October onward (multiple pickings)', 'Medium', '25–35 quintal/acre (dry)', '₹8000–14000/quintal (dry, variable)', 'High-value spice crop grown for both fresh green and dried red chilli markets.', 'Thrips/Leaf Curl Complex, Anthracnose, Wilt', 'NPK 100:50:50 kg/ha', NULL),
('Turmeric', 'हळद', 'Curcuma longa', 'loamy, clay', 'Kharif', 'May–June', 'January–March (8–9 month duration)', 'High', '80–100 quintal/acre (fresh rhizome)', '₹6000–8000/quintal', 'Long-duration rhizome spice crop; Sangli/Hingoli belts are known turmeric markets.', 'Rhizome Rot, Leaf Blotch, Leaf Spot', 'NPK 60:50:50 kg/ha', NULL),
('Ginger', 'आले', 'Zingiber officinale', 'loamy', 'Kharif', 'May–June', 'December–January', 'High', '70–90 quintal/acre', '₹5000–9000/quintal (variable)', 'Rhizome spice crop needing well-drained, humus-rich soil and partial shade.', 'Rhizome Rot, Bacterial Wilt, Leaf Spot', 'NPK 75:50:50 kg/ha', NULL),
('Garlic', 'लसूण', 'Allium sativum', 'loamy, sandy', 'Rabi', 'October–November', 'February–March', 'Low', '40–60 quintal/acre', '₹4000–10000/quintal (highly variable)', 'Bulb crop that prefers cool weather during vegetative growth and dry weather at maturity.', 'Purple Blotch, Thrips, White Rot', 'NPK 60:40:40 kg/ha', NULL),
('Grapes', 'द्राक्ष', 'Vitis vinifera', 'loamy, sandy', 'Perennial (pruned twice yearly)', 'Planted June–July; pruned Oct and April', 'January–March (main season)', 'Medium', '80–120 quintal/acre', '₹3000–6000/quintal (table grapes)', 'Nashik region''s signature export crop; trellised vines need precise double-pruning cycles.', 'Downy Mildew, Powdery Mildew, Anthracnose', 'NPK 400:200:200 g/vine/year staged across phenophases', NULL),
('Banana', 'केळी', 'Musa spp.', 'loamy, clay', 'Perennial', 'June or February (tissue-culture plantlets)', '11–13 months after planting', 'High', '250–350 quintal/acre', '₹800–1500/quintal', 'Jalgaon is a major banana belt; the crop needs consistent irrigation and wind protection.', 'Panama Wilt, Sigatoka Leaf Spot, Bunchy Top Virus', 'NPK 200:60:300 g/plant/year in split doses', NULL),
('Mango', 'आंबा', 'Mangifera indica', 'loamy, red', 'Perennial', 'June–July (grafted saplings)', 'March–June', 'Medium', '40–60 quintal/acre (mature orchard)', '₹3000–8000/quintal (variety-dependent, e.g. Alphonso)', 'Konkan''s Alphonso (Hapus) is Maharashtra''s most iconic fruit crop, grown on lateritic hill soils.', 'Powdery Mildew, Anthracnose, Fruit Fly', 'NPK 500:250:500 g/tree/year for a mature tree', NULL),
('Pomegranate', 'डाळिंब', 'Punica granatum', 'loamy, black', 'Perennial (bahar-based flowering)', 'June–July', '5–6 months after flowering (bahar)', 'Low', '80–100 quintal/acre', '₹4000–9000/quintal', 'Drought-tolerant fruit crop centered in Solapur/Ahmednagar, managed through timed ''bahar'' flowering cycles.', 'Bacterial Blight, Wilt, Fruit Borer', 'NPK 625:250:250 g/plant/year', NULL),
('Orange (Nagpur Mandarin)', 'संत्रा', 'Citrus reticulata', 'loamy, black', 'Perennial (two flowering flushes)', 'June–July or February', 'November–January (Ambia) or June–July (Mrig)', 'Medium', '60–90 quintal/acre', '₹1500–3500/quintal', 'Vidarbha''s Nagpur mandarin is one of India''s best-known citrus varieties.', 'Citrus Canker, Gummosis, Leaf Miner', 'NPK 600:200:200 g/tree/year for bearing trees', NULL),
('Sapota (Chikoo)', 'चिकू', 'Manilkara zapota', 'loamy, sandy', 'Perennial', 'June–July (grafted saplings)', 'Year-round with peak in Nov–Feb', 'Medium', '100–150 quintal/acre (mature orchard)', '₹1500–2500/quintal', 'Hardy evergreen fruit tree well suited to coastal Konkan; bears almost continuously once mature.', 'Leaf Spot, Bark Borer, Fruit Fly', 'NPK 500:250:250 g/tree/year', NULL),
('Guava', 'पेरू', 'Psidium guajava', 'loamy, sandy', 'Perennial (two crops: Ambe & Mrig bahar)', 'June–July or February', 'October–December or June–July', 'Low', '100–150 quintal/acre', '₹1000–2000/quintal', 'Resilient fruit tree that tolerates poor soils better than most orchard crops.', 'Wilt, Anthracnose, Fruit Fly', 'NPK 300:150:300 g/tree/year', NULL),
('Papaya', 'पपई', 'Carica papaya', 'loamy, sandy', 'Perennial (planted year-round in irrigated areas)', 'June–July or February–March', '9–11 months after planting', 'Medium', '400–600 quintal/acre', '₹500–1200/quintal', 'Fast-yielding fruit crop that bears within a year; sensitive to waterlogging.', 'Papaya Ring Spot Virus, Root Rot, Powdery Mildew', 'NPK 250:250:500 g/plant/year', NULL),
('Watermelon', 'कलिंगड', 'Citrullus lanatus', 'sandy, loamy', 'Zaid', 'January–February', 'April–May', 'Medium', '150–200 quintal/acre', '₹600–1200/quintal', 'Summer melon grown on riverbed sandy tracts, timed to ripen before peak summer heat.', 'Fusarium Wilt, Downy Mildew, Fruit Fly', 'NPK 60:40:40 kg/ha', NULL),
('Sesame (Til)', 'तीळ', 'Sesamum indicum', 'sandy, loamy', 'Kharif, Zaid', 'June–July or February', 'September or May', 'Low', '3–4 quintal/acre', '₹9000–12000/quintal', 'Short-duration, drought-hardy oilseed traditionally intercropped with pulses.', 'Phyllody, Leaf Spot, Stem/Root Rot', 'NPK 25:25:0 kg/ha', NULL),
('Castor', 'एरंड', 'Ricinus communis', 'sandy, loamy, black', 'Kharif', 'June–July', 'December onward (multiple pickings)', 'Low', '10–14 quintal/acre', '₹6000–7000/quintal', 'Hardy industrial oilseed tolerant of poor soils and moisture stress.', 'Wilt, Grey Rot, Semi-looper', 'NPK 60:40:0 kg/ha', NULL),
('Mustard', 'मोहरी / राई', 'Brassica juncea', 'loamy, sandy', 'Rabi', 'October', 'February', 'Low', '5–7 quintal/acre', '₹5000–5800/quintal', 'Cool-season oilseed often grown as a border/mixed crop alongside chickpea or wheat.', 'Alternaria Blight, Aphids, White Rust', 'NPK 60:40:20 kg/ha', NULL),
('Lentil (Masoor)', 'मसूर', 'Lens culinaris', 'loamy, clay', 'Rabi', 'October–November', 'February–March', 'Low', '6–8 quintal/acre', '₹6000–6800/quintal', 'Cool-season pulse grown mainly on conserved soil moisture after the monsoon.', 'Rust, Wilt, Aphids', 'NPK 20:40:0 kg/ha basal', NULL);
