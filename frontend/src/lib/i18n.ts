import { EXTRA_EN, EXTRA_HI, EXTRA_MR } from './i18n-extras';

export type Language = 'en' | 'hi' | 'mr';

export interface Dictionary {
  app: { name: string; tagline: string };
  nav: Record<string, string>;
  common: Record<string, string>;
  actions: Record<string, string>;
  roles: Record<string, string>;
  farmer: Record<string, string>;
  customer: Record<string, string>;
  admin: Record<string, string>;
  disease: Record<string, string>;
  status: Record<string, string>;
  [key: string]: Record<string, string>;
}

const EN: Dictionary = {
  app: {
    name: 'KrishiMitra AI',
    tagline: 'Smart agriculture, direct from farm to your table.',
  },
  nav: {
    dashboard: 'Dashboard',
    profile: 'Profile',
    crops: 'My Crops',
    recommend: 'Crop Advisor',
    yield: 'Yield Predictor',
    disease: 'Disease Diagnosis',
    products: 'My Products',
    orders: 'Orders',
    marketplace: 'Marketplace',
    cart: 'Cart',
    wishlist: 'Wishlist',
    schemes: 'Schemes',
    equipment: 'Equipment',
    prices: 'Market Prices',
    process: 'Crop Database',
    weather: 'Weather',
    chat: 'KrishiMitra Assistant',
    customers: 'Customers',
    farmers: 'Farmers',
    users: 'Users',
    reviews: 'Reviews',
    audit: 'Audit Log',
    export: 'Export Data',
  },
  common: {
    loading: 'Loading…',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search…',
    filter: 'Filter',
    all: 'All',
    yes: 'Yes',
    no: 'No',
    confirm: 'Confirm',
    name: 'Name',
    mobile: 'Mobile number',
    password: 'Password',
    location: 'Location',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    submit: 'Submit',
    pleaseWait: 'Please wait…',
    notFound: 'Not found',
    optional: 'optional',
    required: 'required',
  },
  actions: {
    login: 'Login',
    register: 'Create Account',
    logout: 'Logout',
    view: 'View',
    details: 'Details',
    addToCart: 'Add to Cart',
    buyNow: 'Buy Now',
    placeOrder: 'Place Order',
    cancelOrder: 'Cancel Order',
    markShipped: 'Mark Shipped',
    markDelivered: 'Mark Delivered',
    confirmOrder: 'Confirm Order',
    reviewProduct: 'Write a Review',
    listProduct: 'List a Product',
    approve: 'Approve',
    reject: 'Reject',
    unlist: 'Unlist',
    rent: 'Rent',
    listEquipment: 'List Equipment',
    translate: 'Language',
  },
  roles: {
    farmer: 'Farmer',
    customer: 'Customer',
    admin: 'Admin',
  },
  farmer: {
    title: 'Farmer Dashboard',
    landSize: 'Land size (acres)',
    soilType: 'Soil type',
    irrigationType: 'Irrigation',
    preferredCrops: 'Preferred crops',
    bio: 'About me',
    myListings: 'My Listings',
    revenue: 'Revenue',
    pendingOrders: 'Pending Orders',
    activeListings: 'Active Listings',
    productsSold: 'Products Sold',
    weather: '7-Day Weather',
    cropSuggestion: 'Crop Suggestion',
  },
  customer: {
    title: 'Customer Dashboard',
    addresses: 'My Addresses',
    total: 'Total',
    items: 'items',
    yourOrders: 'Your Orders',
  },
  admin: {
    title: 'Admin Dashboard',
    summary: 'Overview',
    revenue: 'Revenue',
    avgOrder: 'Avg Order Value',
    pending: 'Pending',
  },
  disease: {
    disclaimer: 'Rule-based demo diagnosis — always confirm with your KVK before spraying.',
    severity: 'Severity',
    confidence: 'Confidence',
    management: 'Management Steps',
  },
  status: {
    Pending: 'Pending',
    Confirmed: 'Confirmed',
    Packed: 'Packed',
    Shipped: 'Shipped',
    Delivered: 'Delivered',
    Reviewed: 'Reviewed',
    Cancelled: 'Cancelled',
  },
};

const HI: Dictionary = {
  app: {
    name: 'कृषि मित्र AI',
    tagline: 'स्मार्ट खेती, सीधे खेत से आपकी मेज़ तक।',
  },
  nav: {
    dashboard: 'डैशबोर्ड',
    profile: 'प्रोफ़ाइल',
    crops: 'मेरी फ़सलें',
    recommend: 'फ़सल सलाह',
    yield: 'उपज अनुमानक',
    disease: 'रोग पहचान',
    products: 'मेरे उत्पाद',
    orders: 'ऑर्डर',
    marketplace: 'मंडी',
    cart: 'कार्ट',
    wishlist: 'पसंदीदा',
    schemes: 'योजनाएँ',
    equipment: 'उपकरण',
    prices: 'बाज़ार दरें',
    process: 'फ़सल डेटाबेस',
    weather: 'मौसम',
    chat: 'कृषि मित्र सहायक',
    customers: 'ग्राहक',
    farmers: 'किसान',
    users: 'उपयोगकर्ता',
    reviews: 'समीक्षाएँ',
    audit: 'ऑडिट लॉग',
    export: 'डेटा निर्यात',
  },
  common: {
    loading: 'लोड हो रहा है…',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    delete: 'हटाएँ',
    edit: 'संपादित करें',
    add: 'जोड़ें',
    search: 'खोजें…',
    filter: 'फ़िल्टर',
    all: 'सभी',
    yes: 'हाँ',
    no: 'नहीं',
    confirm: 'पुष्टि करें',
    name: 'नाम',
    mobile: 'मोबाइल नंबर',
    password: 'पासवर्ड',
    location: 'स्थान',
    back: 'वापस',
    next: 'आगे',
    previous: 'पिछला',
    close: 'बंद करें',
    submit: 'जमा करें',
    pleaseWait: 'कृपया प्रतीक्षा करें…',
    notFound: 'नहीं मिला',
    optional: 'वैकल्पिक',
    required: 'आवश्यक',
  },
  actions: {
    login: 'लॉगिन',
    register: 'खाता बनाएँ',
    logout: 'लॉगआउट',
    view: 'देखें',
    details: 'विवरण',
    addToCart: 'कार्ट में जोड़ें',
    buyNow: 'अभी खरीदें',
    placeOrder: 'ऑर्डर करें',
    cancelOrder: 'ऑर्डर रद्द करें',
    markShipped: 'शिप किया',
    markDelivered: 'डिलीवर किया',
    confirmOrder: 'ऑर्डर पुष्टि',
    reviewProduct: 'समीक्षा लिखें',
    listProduct: 'उत्पाद सूचीबद्ध करें',
    approve: 'स्वीकृत करें',
    reject: 'अस्वीकार करें',
    unlist: 'हटाएँ',
    rent: 'किराए पर लें',
    listEquipment: 'उपकरण सूचीबद्ध करें',
    translate: 'भाषा',
  },
  roles: {
    farmer: 'किसान',
    customer: 'ग्राहक',
    admin: 'प्रशासक',
  },
  farmer: {
    title: 'किसान डैशबोर्ड',
    landSize: 'भूमि (एकड़)',
    soilType: 'मिट्टी का प्रकार',
    irrigationType: 'सिंचाई',
    preferredCrops: 'पसंदीदा फ़सलें',
    bio: 'मेरे बारे में',
    myListings: 'मेरी सूचियाँ',
    revenue: 'आय',
    pendingOrders: 'लंबित ऑर्डर',
    activeListings: 'सक्रिय सूचियाँ',
    productsSold: 'बिके उत्पाद',
    weather: '7 दिन का मौसम',
    cropSuggestion: 'फ़सल सुझाव',
  },
  customer: {
    title: 'ग्राहक डैशबोर्ड',
    addresses: 'मेरे पते',
    total: 'कुल',
    items: 'वस्तुएँ',
    yourOrders: 'आपके ऑर्डर',
  },
  admin: {
    title: 'प्रशासक डैशबोर्ड',
    summary: 'अवलोकन',
    revenue: 'आय',
    avgOrder: 'औसत ऑर्डर मूल्य',
    pending: 'लंबित',
  },
  disease: {
    disclaimer: 'नियम-आधारित डेमो निदान — छिड़काव से पहले हमेशा अपने KVK से पुष्टि करें।',
    severity: 'गंभीरता',
    confidence: 'विश्वास',
    management: 'प्रबंधन के कदम',
  },
  status: {
    Pending: 'लंबित',
    Confirmed: 'पुष्टि हुई',
    Packed: 'पैक किया गया',
    Shipped: 'भेजा गया',
    Delivered: 'डिलीवर हुआ',
    Reviewed: 'समीक्षित',
    Cancelled: 'रद्द',
  },
};

const MR: Dictionary = {
  app: {
    name: 'कृषिमित्र AI',
    tagline: 'स्मार्ट शेती, थेट शेतातून तुमच्या समोर.',
  },
  nav: {
    dashboard: 'डॅशबोर्ड',
    profile: 'प्रोफाइल',
    crops: 'माझी पिके',
    recommend: 'पीक सल्ला',
    yield: 'उत्पादन अंदाज',
    disease: 'रोग निदान',
    products: 'माझी उत्पादने',
    orders: 'ऑर्डर',
    marketplace: 'बाजार',
    cart: 'कार्ट',
    wishlist: 'आवडती',
    schemes: 'योजना',
    equipment: 'यंत्रे',
    prices: 'बाजारभाव',
    process: 'पीक डेटाबेस',
    weather: 'हवामान',
    chat: 'कृषीमित्र सहाय्यक',
    customers: 'ग्राहक',
    farmers: 'शेतकरी',
    users: 'वापरकर्ते',
    reviews: 'पुनरावलोकने',
    audit: 'ऑडिट लॉग',
    export: 'डेटा निर्यात',
  },
  common: {
    loading: 'लोड होत आहे…',
    save: 'जतन करा',
    cancel: 'रद्द करा',
    delete: 'हटवा',
    edit: 'संपादित करा',
    add: 'जोडा',
    search: 'शोधा…',
    filter: 'फिल्टर',
    all: 'सर्व',
    yes: 'होय',
    no: 'नाही',
    confirm: 'पुष्टी करा',
    name: 'नाव',
    mobile: 'मोबाईल क्रमांक',
    password: 'पासवर्ड',
    location: 'ठिकाण',
    back: 'मागे',
    next: 'पुढे',
    previous: 'मागील',
    close: 'बंद करा',
    submit: 'सबमिट करा',
    pleaseWait: 'कृपया प्रतीक्षा करा…',
    notFound: 'आढळले नाही',
    optional: 'पर्यायी',
    required: 'आवश्यक',
  },
  actions: {
    login: 'लॉगिन',
    register: 'खाते तयार करा',
    logout: 'लॉगआउट',
    view: 'पहा',
    details: 'तपशील',
    addToCart: 'कार्टमध्ये जोडा',
    buyNow: 'आता खरेदी करा',
    placeOrder: 'ऑर्डर करा',
    cancelOrder: 'ऑर्डर रद्द करा',
    markShipped: 'पाठविले',
    markDelivered: 'वितरित',
    confirmOrder: 'ऑर्डर पुष्टी',
    reviewProduct: 'पुनरावलोकन लिहा',
    listProduct: 'उत्पादन सूचीबद्ध करा',
    approve: 'मंजूर करा',
    reject: 'नाकारा',
    unlist: 'काढा',
    rent: 'भाड्याने घ्या',
    listEquipment: 'यंत्र सूचीबद्ध करा',
    translate: 'भाषा',
  },
  roles: {
    farmer: 'शेतकरी',
    customer: 'ग्राहक',
    admin: 'प्रशासक',
  },
  farmer: {
    title: 'शेतकरी डॅशबोर्ड',
    landSize: 'जमीन (एकर)',
    soilType: 'जमिनीचा प्रकार',
    irrigationType: 'सिंचन',
    preferredCrops: 'आवडती पिके',
    bio: 'माझ्याबद्दल',
    myListings: 'माझ्या सूची',
    revenue: 'उत्पन्न',
    pendingOrders: 'प्रलंबित ऑर्डर',
    activeListings: 'सक्रिय सूची',
    productsSold: 'विकलेली पिके',
    weather: '7 दिवसांचे हवामान',
    cropSuggestion: 'पीक सूचना',
  },
  customer: {
    title: 'ग्राहक डॅशबोर्ड',
    addresses: 'माझे पत्ते',
    total: 'एकूण',
    items: 'वस्तू',
    yourOrders: 'तुमच्या ऑर्डर',
  },
  admin: {
    title: 'प्रशासक डॅशबोर्ड',
    summary: 'विहंगावलोकन',
    revenue: 'उत्पन्न',
    avgOrder: 'सरासरी ऑर्डर मूल्य',
    pending: 'प्रलंबित',
  },
  disease: {
    disclaimer: 'नियम-आधारित डेमो निदान — फवारणी करण्यापूर्वी नेहमी तुमच्या KVK कडून खात्री करा.',
    severity: 'तीव्रता',
    confidence: 'विश्वास',
    management: 'व्यवस्थापन पद्धती',
  },
  status: {
    Pending: 'प्रलंबित',
    Confirmed: 'पुष्टी',
    Packed: 'पॅक',
    Shipped: 'पाठविले',
    Delivered: 'वितरित',
    Reviewed: 'पुनरावलोकित',
    Cancelled: 'रद्द',
  },
};

function withExtras(base: Dictionary, extra: Record<string, Record<string, string>>): Dictionary {
  const merged: Dictionary = { ...base };
  for (const [section, values] of Object.entries(extra)) {
    if (!merged[section]) merged[section] = {};
    Object.assign(merged[section], values);
  }
  return merged;
}

export const DICTIONARIES: Record<Language, Dictionary> = {
  en: withExtras(EN, EXTRA_EN),
  hi: withExtras(HI, EXTRA_HI),
  mr: withExtras(MR, EXTRA_MR),
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'हिंदी',
  mr: 'मराठी',
};

export function getLanguage(): Language {
  const stored = localStorage.getItem('km_lang');
  if (stored === 'hi' || stored === 'mr' || stored === 'en') return stored;
  const nav = navigator.language?.toLowerCase() || '';
  if (nav.startsWith('hi')) return 'hi';
  if (nav.startsWith('mr')) return 'mr';
  return 'en';
}

export function setLanguage(lang: Language) {
  localStorage.setItem('km_lang', lang);
}

export function t(keyPath: string, dict: Dictionary, lang: Language): string {
  void lang;
  const parts = keyPath.split('.');
  let node: unknown = dict;
  for (const part of parts) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      node = undefined;
      break;
    }
  }
  if (typeof node === 'string' && node) return node;
  const fallbackNode = resolveIn(EN, parts);
  if (typeof fallbackNode === 'string' && fallbackNode) return fallbackNode;
  return keyPath;
}

function resolveIn(obj: unknown, parts: string[]): unknown {
  let node: unknown = obj;
  for (const part of parts) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return node;
}

export function translate(keyPath: string, lang: Language): string {
  return t(keyPath, DICTIONARIES[lang], lang);
}
