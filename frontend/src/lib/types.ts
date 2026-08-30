export type Role = 'farmer' | 'customer' | 'admin';

export interface SafeUser {
  id: number;
  name: string;
  mobile: string;
  location?: string;
  soilType?: string;
  landSize?: number;
  irrigationType?: string;
  preferredCrops?: string[];
  language?: string;
  bio?: string;
  avatarUrl?: string;
  address?: string;
  addresses?: Address[];
  createdAt?: string;
}

export interface Address {
  id: number;
  label: string;
  fullAddress: string;
  pincode?: string;
  phone?: string;
  isDefault?: boolean;
}

export interface AuthResponse {
  token: string;
  role: Role;
  user: SafeUser;
}

export interface OtpSendResponse {
  success: boolean;
  devOtp?: string;
  expiresInSec?: number;
}

export interface Product {
  id: number;
  farmerId: number;
  cropName: string;
  price: number;
  quantity: number;
  unit: string;
  compareToPrice?: number;
  discountPercent?: number;
  photoUrl?: string;
  approved: boolean | null;
  organic?: boolean;
  harvestDate?: string;
  location?: string;
  description?: string;
  createdAt?: string;
  farmerName?: string;
  farmerLocation?: string;
  farmerAvatar?: string;
  avgRating: number | null;
  reviewCount: number;
  reviews?: Review[];
}

export interface Review {
  id: number;
  customerId: number;
  productId: number;
  rating: number;
  comment: string;
  createdAt: string;
  customerName?: string;
  cropName?: string;
}

export interface ProductListResponse {
  items: Product[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sort: string;
}

export interface Order {
  id: number;
  customerId: number;
  productId: number;
  farmerId: number;
  quantity: number;
  totalPrice: number;
  address?: string;
  orderDate: string;
  status: OrderStatus;
  timeline: TimelineEntry[];
  cropName?: string;
  photoUrl?: string;
  unit?: string;
  farmerName?: string;
  farmerMobile?: string;
  customerName?: string;
  reviewed?: boolean;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Reviewed' | 'Cancelled';

export interface TimelineEntry {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface ReviewResult {
  review: Review;
  order: Order;
}

export interface OrderStatusUpdateResult {
  success?: boolean;
}

export interface Crop {
  id: number;
  farmerId: number;
  cropName: string;
  sowingDate?: string | null;
  harvestDate?: string | null;
  status?: string;
  createdAt: string;
}

export interface CropRecord {
  id: number;
  nameEn: string;
  nameMr?: string;
  scientificName?: string;
  soilType?: string;
  season?: string;
  sowingMonth?: string;
  harvestMonth?: string;
  waterRequirement?: string;
  avgYield?: string;
  priceRange?: string;
  description?: string;
  commonDiseases?: string;
  recommendedFertilizer?: string;
  imageUrl?: string;
}

export interface CropCatalogResponse {
  items: CropRecord[];
  total: number;
}

export interface Equipment {
  id: number;
  farmerId: number;
  type: string;
  rentPerDay: number;
  availability: boolean;
  photoUrl?: string;
  description?: string;
  createdAt?: string;
  farmerName?: string;
  farmerLocation?: string;
}

export interface Scheme {
  id: number;
  name: string;
  min_land: number;
  max_land: number;
  crop?: string;
  description: string;
  category?: string;
  equipmentType?: string;
  irrigationType?: string[] | string;
}

export interface Recommendation {
  crop: string;
  guidance: {
    landPrep: string;
    sowing: string;
    fertilizer: string;
    irrigation: string;
  };
}

export interface RecommendResponse {
  soilType: string;
  season: string;
  exactMatch: boolean;
  recommendations: Recommendation[];
}

export interface WeatherDay {
  date: string;
  temp_max: number;
  temp_min: number;
  condition: string;
  rainfall_probability: number;
  humidity: number;
}

export interface Weather {
  location: string;
  current: WeatherDay;
  forecast: WeatherDay[];
}

export interface ChatResponse {
  reply: string;
}

export interface YieldModelInfo {
  type: string;
  features: string[];
  featureRanges: Record<string, [number, number]>;
  target: string;
  unit: string;
  trainingSize: number;
  rSquared: number;
  note: string;
}

export interface PredictYieldResponse {
  predictedYieldPerAcre: number;
  totalEstimatedYield: number;
  unit: string;
  crop: string;
  modelInfo: YieldModelInfo;
}

export interface DiseaseResult {
  diagnosis: string;
  confidence: string;
  matchedKeywords: string[];
  causes: string[];
  management: string[];
  severity: string;
  urgent?: boolean;
  disclaimer: string;
  engine: string;
  exactMatch: boolean;
}

export interface DiagnosisRecord {
  id: number;
  farmerId: number;
  cropName: string;
  symptoms: string;
  photoUrl?: string;
  result: string;
  severity: string;
  confidence: string;
  engine: string;
  createdAt: string;
}

export interface DiagnoseResponse {
  diagnosis: DiagnosisRecord;
  result: DiseaseResult;
}

export interface PriceSummaryItem {
  cropName: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  listings: number;
  unit?: string;
}

export interface PriceTrendResponse {
  cropName: string;
  basePrice: number;
  unit?: string;
  trend: { date: string; price: number }[];
}

export interface AdminSummary {
  farmers: number;
  customers: number;
  products: number;
  pendingProducts: number;
  orders: number;
  pendingOrders: number;
  revenue: number;
  avgOrderValue: number;
  equipment: number;
  schemes: number;
  cropCatalog: number;
  reviews: number;
  recommendations: number;
  audits: number;
  orderTrend: { date: string; label: string; orders: number; revenue: number }[];
  topCrops: { crop: string; listings: number }[];
  statusBreakdown: { status: string; count: number }[];
}

export interface FarmerDashboard {
  farm: {
    landSize: number;
    location: string;
    soilType: string;
    irrigationType: string;
  };
  stats: {
    activeListings: number;
    pendingOrders: number;
    totalOrders: number;
    productsSold: number;
    revenue: number;
  };
  weather: Weather;
  cropSuggestion: { exactMatch: boolean; results: Recommendation[] };
  recentOrders: Order[];
  listedProducts: Product[];
  alerts: { type: string; message: string; to: string }[];
}

export interface AdminUser {
  id: number;
  name: string;
  mobile: string;
  role: Role;
  location?: string;
  address?: string;
  landSize?: number;
  soilType?: string;
  createdAt?: string;
}

export interface AuditEntry {
  admin: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface AdvisoryOptions {
  soilTypes: string[];
  seasons: string[];
  waterLevels: string[];
}

export interface WishlistItem {
  wishlistId: number;
  createdAt: string;
  product: Product | null;
}

export interface ApiError {
  error: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
