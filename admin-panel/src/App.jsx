import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ColorThemeProvider } from './context/ColorThemeContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBarbershops from './pages/admin/AdminBarbershops';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBookings from './pages/admin/AdminBookings';
import AdminReports from './pages/admin/AdminReports';
import AdminServiceCategories from './pages/admin/AdminServiceCategories';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminBanners from './pages/admin/AdminBanners';

// Owner pages
import OwnerDashboard from './pages/owner/OwnerDashboard';
import MyBarbershop from './pages/owner/MyBarbershop';
import OwnerBarbers from './pages/owner/OwnerBarbers';
import OwnerLocations from './pages/owner/OwnerLocations';
import OwnerGallery from './pages/owner/OwnerGallery';
import OwnerBookings from './pages/owner/OwnerBookings';
import OwnerStats from './pages/owner/OwnerStats';
import OwnerCalendar from './pages/owner/OwnerCalendar';
import OwnerClients from './pages/owner/OwnerClients';
import OwnerFinance from './pages/owner/OwnerFinance';
import OwnerPayroll from './pages/owner/OwnerPayroll';
import OwnerInventory from './pages/owner/OwnerInventory';
import OwnerMarketing from './pages/owner/OwnerMarketing';
import OwnerReviews from './pages/owner/OwnerReviews';
import OwnerPromo from './pages/owner/OwnerPromo';
import OwnerNoShows from './pages/owner/OwnerNoShows';
import OwnerRevenue from './pages/owner/OwnerRevenue';

// Barber pages
import BarberDashboard from './pages/barber/BarberDashboard';
import BarberSchedule from './pages/barber/BarberSchedule';
import BarberProfile from './pages/barber/BarberProfile';
import BarberServices from './pages/barber/BarberServices';
import BarberPerformance from './pages/barber/BarberPerformance';
import BarberWorkingHours from './pages/barber/BarberWorkingHours';
import BarberGallery from './pages/barber/BarberGallery';
import BarberPromo from './pages/barber/BarberPromo';
import SettingsPage from './pages/settings/SettingsPage';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  const getDashboard = () => {
    switch (user?.role) {
      case 'admin': return <AdminDashboard />;
      case 'barbershop_owner': return <OwnerDashboard />;
      case 'barber': return <BarberDashboard />;
      default: return <Navigate to="/login" replace />;
    }
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={
        <ProtectedRoute><Layout>{getDashboard()}</Layout></ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/barbershops" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminBarbershops /></Layout></ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminUsers /></Layout></ProtectedRoute>
      } />
      <Route path="/bookings" element={
        <ProtectedRoute roles={['admin', 'barbershop_owner']}>
          <Layout>{user?.role === 'admin' ? <AdminBookings /> : <OwnerBookings />}</Layout>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminReports /></Layout></ProtectedRoute>
      } />
      <Route path="/service-categories" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminServiceCategories /></Layout></ProtectedRoute>
      } />
      <Route path="/banners" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminBanners /></Layout></ProtectedRoute>
      } />

      {/* Admin calendar */}
      <Route path="/calendar" element={
        <ProtectedRoute roles={['admin', 'barbershop_owner', 'barber']}>
          <Layout>
            {user?.role === 'admin' ? <AdminCalendar /> : <OwnerCalendar />}
          </Layout>
        </ProtectedRoute>
      } />

      {/* Owner routes */}
      <Route path="/my-barbershop" element={
        <ProtectedRoute roles={['barbershop_owner']}><Layout><MyBarbershop /></Layout></ProtectedRoute>
      } />
      <Route path="/barbers" element={
        <ProtectedRoute roles={['barbershop_owner']}><Layout><OwnerBarbers /></Layout></ProtectedRoute>
      } />
      <Route path="/locations" element={
        <ProtectedRoute roles={['barbershop_owner']}><Layout><OwnerLocations /></Layout></ProtectedRoute>
      } />
      <Route path="/gallery" element={
        <ProtectedRoute roles={['barbershop_owner', 'barber']}>
          <Layout>{user?.role === 'barbershop_owner' ? <OwnerGallery /> : <BarberGallery />}</Layout>
        </ProtectedRoute>
      } />
      <Route path="/promos" element={
        <ProtectedRoute roles={['barbershop_owner', 'barber']}>
          <Layout>{user?.role === 'barbershop_owner' ? <OwnerPromo /> : <BarberPromo />}</Layout>
        </ProtectedRoute>
      } />
      <Route path="/stats" element={
        <ProtectedRoute roles={['barbershop_owner', 'barber']}>
          <Layout>{user?.role === 'barbershop_owner' ? <OwnerStats /> : <BarberPerformance />}</Layout>
        </ProtectedRoute>
      } />

      {/* Owner — new Altegio-style routes */}
      <Route path="/clients" element={
        <ProtectedRoute roles={['barbershop_owner', 'barber']}><Layout><OwnerClients /></Layout></ProtectedRoute>
      } />
      <Route path="/finance" element={
        <ProtectedRoute roles={['barbershop_owner']}><Layout><OwnerFinance /></Layout></ProtectedRoute>
      } />
      <Route path="/payroll" element={
        <ProtectedRoute roles={['barbershop_owner']}><Layout><OwnerPayroll /></Layout></ProtectedRoute>
      } />
      <Route path="/inventory" element={
        <ProtectedRoute roles={['barbershop_owner']}><Layout><OwnerInventory /></Layout></ProtectedRoute>
      } />
      <Route path="/marketing" element={
        <ProtectedRoute roles={['barbershop_owner']}><Layout><OwnerMarketing /></Layout></ProtectedRoute>
      } />
      <Route path="/reviews" element={
        <ProtectedRoute roles={['barbershop_owner']}><Layout><OwnerReviews /></Layout></ProtectedRoute>
      } />
      <Route path="/no-shows" element={
        <ProtectedRoute roles={['barbershop_owner']}><Layout><OwnerNoShows /></Layout></ProtectedRoute>
      } />
      <Route path="/revenue" element={
        <ProtectedRoute roles={['barbershop_owner']}><Layout><OwnerRevenue /></Layout></ProtectedRoute>
      } />

      {/* Barber routes */}
      <Route path="/schedule" element={
        <ProtectedRoute roles={['barber']}><Layout><BarberSchedule /></Layout></ProtectedRoute>
      } />
      <Route path="/schedule/manage" element={
        <ProtectedRoute roles={['barber']}><Layout><BarberWorkingHours /></Layout></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute roles={['barber']}><Layout><BarberProfile /></Layout></ProtectedRoute>
      } />
      <Route path="/services" element={
        <ProtectedRoute roles={['barber']}><Layout><BarberServices /></Layout></ProtectedRoute>
      } />

      {/* Owner — edit barber schedule */}
      <Route path="/barbers/:barberId/schedule" element={
        <ProtectedRoute roles={['barbershop_owner']}><Layout><BarberWorkingHours /></Layout></ProtectedRoute>
      } />

      {/* Settings — all roles */}
      <Route path="/settings" element={
        <ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <ColorThemeProvider>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <Router>
              <AppRoutes />
            </Router>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </ColorThemeProvider>
  );
};

export default App;
