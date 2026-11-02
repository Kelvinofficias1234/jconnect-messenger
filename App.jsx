import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import PageNotFound from './lib/PageNotFound';
import ReferralRouter from '@/components/ReferralRouter';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import Landing from '@/pages/Landing';
import AdminPanel from '@/pages/AdminPanel';
import Marketplace from '@/pages/Marketplace';
import ProductDetailPage from '@/pages/ProductDetailPage';
import { CallProvider } from '@/components/chat/CallProvider';
import OfflineOverlay from '@/components/OfflineOverlay';
import { initAudioUnlock } from '@/lib/audioUnlock';
import { initNotifications } from '@/lib/notificationManager';
import { motion } from 'framer-motion';
import { trackAppDownload, trackFirstOpen, trackInteraction } from '@/lib/analyticsWebhook';
import { syncServerClock } from '@/lib/serverClock';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Analytics: fire interaction event on route change — non-blocking
  useEffect(() => {
    trackInteraction('navigate');
  }, [location.pathname]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <CallProvider>
    <OfflineOverlay />
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/welcome" element={<Landing />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/welcome" replace />} />}>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/marketplace/:productId" element={<ProductDetailPage />} />
      </Route>
      <Route path="*" element={<ReferralRouter />} />
    </Routes>
    </motion.div>
    </CallProvider>
  );
};


function App() {
  // Unlock Web Audio on first user gesture (iOS Safari) + request notification permission
  useEffect(() => {
    initAudioUnlock();
    initNotifications();
    // Sync client clock with server so relative timestamps (status, etc.)
    // are accurate even when the user's device clock is wrong.
    syncServerClock();
    // Analytics: fire download (first visit) + first_open (every launch) — non-blocking
    trackAppDownload();
    trackFirstOpen();
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App