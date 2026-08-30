import type {
  Address,
  AdminSummary,
  AdminUser,
  AdvisoryOptions,
  ApiError,
  AuditEntry,
  AuthResponse,
  ChatResponse,
  Crop,
  CropCatalogResponse,
  CropRecord,
  DiagnoseResponse,
  DiseaseResult,
  DiagnosisRecord,
  Equipment,
  FarmerDashboard,
  Order,
  OrderStatus,
  OtpSendResponse,
  PredictYieldResponse,
  PriceSummaryItem,
  PriceTrendResponse,
  Product,
  ProductListResponse,
  RecommendResponse,
  ReviewResult,
  Role,
  SafeUser,
  Scheme,
  Weather,
  WishlistItem,
  YieldModelInfo,
} from './types';

export const API_BASE: string = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

let authToken: string | null = null;

const BACKUP_FILE_NAME = ['krishimitra-backup', 'json'].join('.');

export function setAuthToken(token: string | null) {
  authToken = token;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  timeout?: number;
}

export class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiClientError';
  }
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = true, timeout = 15000 } = opts;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };
  if (auth && authToken) requestHeaders.Authorization = `Bearer ${authToken}`;
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(API_BASE + path, {
      method,
      headers: requestHeaders,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let data: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const message =
        typeof data === 'object' && data !== null && 'error' in data
          ? String((data as ApiError).error)
          : `Request failed (${res.status}). Please try again.`;
      throw new ApiClientError(message, res.status);
    }

    return data as T;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiClientError('Request timed out. Please check your connection and try again.', 408);
    }
    if (err instanceof TypeError) {
      throw new ApiClientError('Cannot reach the server. Is the backend running?', 0);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function upload<T>(path: string, formData: FormData, opts: { method?: string } = {}): Promise<T> {
  return request<T>(path, { method: (opts.method as 'POST' | 'PUT' | 'DELETE') || 'POST', body: formData, auth: true });
}

async function downloadExport(): Promise<void> {
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(API_BASE + '/admin/export', { headers });
  if (!res.ok) {
    throw new ApiClientError(`Export failed (${res.status}).`, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = BACKUP_FILE_NAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const api = {
  register: (payload: { role: Role; name: string; mobile: string; password: string; [k: string]: unknown }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload: { role: Role; identifier: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: payload, auth: false }),
  sendOtp: (payload: { role: Role; mobile: string }) =>
    request<OtpSendResponse>('/auth/otp/send', { method: 'POST', body: payload, auth: false }),
  verifyOtp: (payload: { role: Role; mobile: string; otp: string }) =>
    request<AuthResponse>('/auth/otp/verify', { method: 'POST', body: payload, auth: false }),
  me: () => request<{ role: Role; user: SafeUser }>('/auth/me'),

  getFarmer: (id: number | string) => request<SafeUser>(`/farmers/${id}`, { auth: false }),
  updateFarmer: (id: number | string, payload: Partial<SafeUser>) =>
    request<SafeUser>(`/farmers/${id}`, { method: 'PUT', body: payload }),
  uploadFarmerAvatar: (id: number | string, formData: FormData) =>
    upload<SafeUser>(`/farmers/${id}/avatar`, formData, { method: 'PUT' }),
  farmerDashboard: (id: number | string) => request<FarmerDashboard>(`/farmers/${id}/dashboard`),
  getFarmerCrops: (id: number | string) => request<Crop[]>(`/farmers/${id}/crops`),
  addCrop: (id: number | string, payload: Partial<Crop>) =>
    request<Crop>(`/farmers/${id}/crops`, { method: 'POST', body: payload }),
  deleteCrop: (id: number | string, cropId: number | string) =>
    request<{ success: boolean }>(`/farmers/${id}/crops/${cropId}`, { method: 'DELETE' }),

  getCustomer: (id: number | string) => request<SafeUser>(`/customers/${id}`, { auth: false }),
  updateCustomer: (id: number | string, payload: Partial<SafeUser>) =>
    request<SafeUser>(`/customers/${id}`, { method: 'PUT', body: payload }),
  uploadCustomerAvatar: (id: number | string, formData: FormData) =>
    upload<SafeUser>(`/customers/${id}/avatar`, formData, { method: 'PUT' }),
  getAddresses: (id: number | string) => request<Address[]>(`/customers/${id}/addresses`),
  addAddress: (id: number | string, payload: Partial<Address>) =>
    request<Address>(`/customers/${id}/addresses`, { method: 'POST', body: payload }),
  updateAddress: (id: number | string, addressId: number | string, payload: Partial<Address>) =>
    request<Address[]>(`/customers/${id}/addresses/${addressId}`, { method: 'PUT', body: payload }),
  deleteAddress: (id: number | string, addressId: number | string) =>
    request<Address[]>(`/customers/${id}/addresses/${addressId}`, { method: 'DELETE' }),
  getWishlist: (id: number | string) => request<WishlistItem[]>(`/customers/${id}/wishlist`),
  addWishlist: (id: number | string, productId: number | string) =>
    request<{ id: number }>(`/customers/${id}/wishlist`, { method: 'POST', body: { productId } }),
  removeWishlist: (id: number | string, productId: number | string) =>
    request<{ success: boolean }>(`/customers/${id}/wishlist/${productId}`, { method: 'DELETE' }),

  listProducts: (
    params: {
      search?: string;
      crop?: string;
      organic?: boolean | string;
      minPrice?: number;
      maxPrice?: number;
      sort?: string;
      page?: number;
      limit?: number;
    } = {},
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v));
    });
    const q = qs.toString();
    return request<ProductListResponse>(`/products${q ? `?${q}` : ''}`, { auth: false });
  },
  getProduct: (id: number | string) => request<Product>(`/products/${id}`, { auth: false }),
  getDeals: (limit = 6) => request<Product[]>(`/products/deals${limit ? `?limit=${limit}` : ''}`, { auth: false }),
  getFarmerProducts: (farmerId: number | string) => request<Product[]>(`/products/farmer/${farmerId}`),
  createProduct: (formData: FormData) => upload<Product>('/products', formData),
  updateProduct: (id: number | string, formData: FormData) =>
    upload<Product>(`/products/${id}`, formData, { method: 'PUT' }),
  deleteProduct: (id: number | string) => request<{ success: boolean }>(`/products/${id}`, { method: 'DELETE' }),
  priceSummary: () => request<PriceSummaryItem[]>('/products/market-prices/summary', { auth: false }),
  priceTrend: (cropName: string) =>
    request<PriceTrendResponse>(`/products/market-prices/trend/${encodeURIComponent(cropName)}`, { auth: false }),

  placeOrder: (payload: { productId: number | string; quantity: number | string; address?: string }) =>
    request<Order>('/orders', { method: 'POST', body: payload }),
  customerOrders: (customerId: number | string) => request<Order[]>(`/orders/customer/${customerId}`),
  farmerOrders: (farmerId: number | string) => request<Order[]>(`/orders/farmer/${farmerId}`),
  updateOrderStatus: (orderId: number | string, status: OrderStatus, note?: string) =>
    request<Order>(`/orders/${orderId}/status`, { method: 'PUT', body: { status, note } }),
  cancelOrder: (orderId: number | string, note?: string) =>
    request<Order>(`/orders/${orderId}/cancel`, { method: 'PUT', body: { note } }),
  reviewOrder: (orderId: number | string, payload: { productId: number | string; rating: number; comment?: string }) =>
    request<ReviewResult>(`/orders/${orderId}/review`, { method: 'POST', body: payload }),

  advisoryOptions: () => request<AdvisoryOptions>('/advisory/options', { auth: false }),
  recommend: (payload: { soilType: string; season: string; farmerId?: number | string; location?: string }) =>
    request<RecommendResponse>('/advisory/recommend', { method: 'POST', body: payload }),
  schemes: (landSize?: number | string) =>
    request<Scheme[]>(
      `/advisory/schemes${landSize !== undefined ? `?landSize=${encodeURIComponent(String(landSize))}` : ''}`,
      { auth: false },
    ),
  weather: (location?: string) =>
    request<Weather>(`/advisory/weather${location ? `?location=${encodeURIComponent(location)}` : ''}`, {
      auth: false,
    }),
  chat: (message: string) =>
    request<ChatResponse>('/advisory/chatbot', { method: 'POST', body: { message }, auth: false }),
  yieldModelInfo: () => request<YieldModelInfo>('/advisory/yield-model-info', { auth: false }),
  predictYield: (payload: { rainfall?: number; fertilizer?: number; landSize: number }) =>
    request<PredictYieldResponse>('/advisory/predict-yield', { method: 'POST', body: payload, auth: false }),
  diagnose: (formData: FormData) => upload<DiagnoseResponse>('/advisory/diagnose', formData, { method: 'POST' }),
  myDiagnoses: () => request<DiagnosisRecord[]>('/advisory/diagnoses'),
  diagnoseJson: (payload: { cropName?: string; symptoms: string }) =>
    request<DiagnoseResponse>('/advisory/diagnose', { method: 'POST', body: payload }),

  cropCatalog: (params: { search?: string; season?: string; soilType?: string; waterRequirement?: string } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) qs.set(k, String(v));
    });
    const q = qs.toString();
    return request<CropCatalogResponse>(`/crops${q ? `?${q}` : ''}`, { auth: false });
  },
  cropById: (id: number | string) => request<CropRecord>(`/crops/${id}`, { auth: false }),
  createCrop: (formData: FormData) => upload<CropRecord>('/crops', formData),
  updateCrop: (id: number | string, formData: FormData) =>
    upload<CropRecord>(`/crops/${id}`, formData, { method: 'PUT' }),
  deleteCropCatalogEntry: (id: number | string) => request<{ success: boolean }>(`/crops/${id}`, { method: 'DELETE' }),

  equipment: () => request<Equipment[]>('/equipment', { auth: false }),
  farmerEquipment: (farmerId: number | string) => request<Equipment[]>(`/equipment/farmer/${farmerId}`),
  createEquipment: (formData: FormData) => upload<Equipment>('/equipment', formData),
  updateEquipment: (id: number | string, payload: Partial<Equipment>) =>
    request<Equipment>(`/equipment/${id}`, { method: 'PUT', body: payload }),
  deleteEquipment: (id: number | string) => request<{ success: boolean }>(`/equipment/${id}`, { method: 'DELETE' }),

  listSchemes: () => request<Scheme[]>('/schemes', { auth: false }),
  createScheme: (payload: Partial<Scheme>) => request<Scheme>('/schemes', { method: 'POST', body: payload }),
  updateScheme: (id: number | string, payload: Partial<Scheme>) =>
    request<Scheme>(`/schemes/${id}`, { method: 'PUT', body: payload }),
  deleteScheme: (id: number | string) => request<{ success: boolean }>(`/schemes/${id}`, { method: 'DELETE' }),

  adminSummary: () => request<AdminSummary>('/admin/summary'),
  adminUsers: (role?: Role, search?: string) => {
    const qs = new URLSearchParams();
    if (role && role !== 'admin') qs.set('role', role);
    if (search) qs.set('search', search);
    const q = qs.toString();
    return request<AdminUser[]>(`/admin/users${q ? `?${q}` : ''}`);
  },
  adminUpdateUser: (role: Role, id: number | string, payload: Partial<AdminUser>) =>
    request<AdminUser>(`/admin/users/${role}/${id}`, { method: 'PUT', body: payload }),
  adminDeleteUser: (role: Role, id: number | string) =>
    request<{ success: boolean }>(`/admin/users/${role}/${id}`, { method: 'DELETE' }),
  adminProducts: () => request<Product[]>('/admin/products'),
  adminApproveProduct: (id: number | string, approved: boolean) =>
    request<Product>(`/admin/products/${id}/approve`, { method: 'PUT', body: { approved } }),
  adminOrders: () => request<Order[]>('/admin/orders'),
  adminReviews: () => request<ReviewResult['review'][]>('/admin/reviews'),
  adminDeleteReview: (id: number | string) =>
    request<{ success: boolean }>(`/admin/reviews/${id}`, { method: 'DELETE' }),
  adminAudit: () => request<AuditEntry[]>('/admin/audit'),
  adminExport: () => downloadExport(),
};

export const diagnostApi = {
  run: (symptoms: string, cropName = ''): DiseaseResult => {
    void symptoms;
    void cropName;
    throw new Error('client-side diagnosis is unused; use api.diagnose');
  },
};
