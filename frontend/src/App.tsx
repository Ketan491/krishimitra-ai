import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ToastProvider } from './contexts/ToastContext';
import { I18nProvider } from './contexts/I18nContext';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { ToastContainer } from './components/ui/ToastContainer';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { GuestOnly, RedirectToRole, RoleRoute } from './components/layout/RouteGuards';
import { PublicSiteLayout } from './components/layout/PublicSiteLayout';
import { FarmerLayout } from './layouts/FarmerLayout';
import { CustomerLayout } from './layouts/CustomerLayout';
import { AdminLayout } from './layouts/AdminLayout';

import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { MarketplacePage } from './pages/shared/MarketplacePage';
import { ProductDetailPage } from './pages/shared/ProductDetailPage';
import { CropsDbPage } from './pages/shared/CropsDbPage';
import { CropRecommendPage } from './pages/shared/CropRecommendPage';
import { YieldPredictionPage } from './pages/shared/YieldPredictionPage';
import { DiseaseDiagnosisPage } from './pages/shared/DiseaseDiagnosisPage';
import { MarketPricesPage } from './pages/shared/MarketPricesPage';
import { WeatherPage } from './pages/shared/WeatherPage';
import { SchemesPage } from './pages/shared/SchemesPage';
import { EquipmentPage } from './pages/shared/EquipmentPage';
import { ChatbotPage } from './pages/shared/ChatbotPage';
import { CartPage } from './pages/shared/CartPage';

import { FarmerDashboardPage } from './pages/farmer/FarmerDashboardPage';
import { FarmerCropsPage } from './pages/farmer/FarmerCropsPage';
import { FarmerProductsPage } from './pages/farmer/FarmerProductsPage';
import { FarmerOrdersPage } from './pages/farmer/FarmerOrdersPage';
import { FarmerProfilePage } from './pages/farmer/FarmerProfilePage';

import { CustomerDashboardPage } from './pages/customer/CustomerDashboardPage';
import { CustomerOrdersPage } from './pages/customer/CustomerOrdersPage';
import { CustomerWishlistPage } from './pages/customer/CustomerWishlistPage';
import { CustomerProfilePage } from './pages/customer/CustomerProfilePage';

import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminCropsPage } from './pages/admin/AdminCropsPage';
import { AdminSchemesPage } from './pages/admin/AdminSchemesPage';
import { AdminEquipmentPage } from './pages/admin/AdminEquipmentPage';
import { AdminReviewsPage } from './pages/admin/AdminReviewsPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <I18nProvider>
        <ErrorBoundary>
          <AuthProvider>
            <CartProvider>
              <ToastContainer />
              {children}
            </CartProvider>
          </AuthProvider>
        </ErrorBoundary>
      </I18nProvider>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <ScrollToTop />
        <AnimatePresence mode="wait">
          <Routes>
            {}
            <Route element={<PublicSiteLayout />}>
              <Route index element={<LandingPage />} />
              <Route
                path="login"
                element={
                  <GuestOnly>
                    <LoginPage />
                  </GuestOnly>
                }
              />
              <Route
                path="register"
                element={
                  <GuestOnly>
                    <RegisterPage />
                  </GuestOnly>
                }
              />
              <Route path="market" element={<MarketplacePage />} />
              <Route path="market/:id" element={<ProductDetailPage />} />
              <Route path="crops-db" element={<CropsDbPage />} />
              <Route path="recommend" element={<CropRecommendPage />} />
              <Route path="yield" element={<YieldPredictionPage />} />
              <Route path="disease" element={<DiseaseDiagnosisPage />} />
              <Route path="prices" element={<MarketPricesPage />} />
              <Route path="weather" element={<WeatherPage />} />
              <Route path="schemes" element={<SchemesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {}
            <Route element={<RoleRoute roles={['farmer']} />}>
              <Route path="farmer" element={<FarmerLayout />}>
                <Route index element={<FarmerDashboardPage />} />
                <Route path="crops" element={<FarmerCropsPage />} />
                <Route path="products" element={<FarmerProductsPage />} />
                <Route path="orders" element={<FarmerOrdersPage />} />
                <Route path="profile" element={<FarmerProfilePage />} />
                <Route path="recommend" element={<CropRecommendPage />} />
                <Route path="yield" element={<YieldPredictionPage />} />
                <Route path="disease" element={<DiseaseDiagnosisPage />} />
                <Route path="prices" element={<MarketPricesPage />} />
                <Route path="weather" element={<WeatherPage />} />
                <Route path="chatbot" element={<ChatbotPage />} />
                <Route path="schemes" element={<SchemesPage />} />
                <Route path="equipment" element={<EquipmentPage />} />
              </Route>
            </Route>

            {}
            <Route element={<RoleRoute roles={['customer']} />}>
              <Route path="customer" element={<CustomerLayout />}>
                <Route index element={<CustomerDashboardPage />} />
                <Route path="market" element={<MarketplacePage />} />
                <Route path="market/:id" element={<ProductDetailPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="orders" element={<CustomerOrdersPage />} />
                <Route path="wishlist" element={<CustomerWishlistPage />} />
                <Route path="profile" element={<CustomerProfilePage />} />
                <Route path="recommend" element={<CropRecommendPage />} />
                <Route path="yield" element={<YieldPredictionPage />} />
                <Route path="disease" element={<DiseaseDiagnosisPage />} />
                <Route path="prices" element={<MarketPricesPage />} />
                <Route path="weather" element={<WeatherPage />} />
                <Route path="chatbot" element={<ChatbotPage />} />
                <Route path="schemes" element={<SchemesPage />} />
                <Route path="equipment" element={<EquipmentPage />} />
              </Route>
            </Route>

            {}
            <Route element={<RoleRoute roles={['admin']} />}>
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="crops" element={<AdminCropsPage />} />
                <Route path="schemes" element={<AdminSchemesPage />} />
                <Route path="equipment" element={<AdminEquipmentPage />} />
                <Route path="reviews" element={<AdminReviewsPage />} />
                <Route path="audit" element={<AdminAuditPage />} />
              </Route>
            </Route>

            <Route path="home" element={<RedirectToRole />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </Providers>
    </BrowserRouter>
  );
}
