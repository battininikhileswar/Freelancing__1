import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';
import ChatbotWidget from './components/ChatbotWidget';
import VoiceAssistant from './components/VoiceAssistant';
import OfflineSyncManager from './components/OfflineSyncManager';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CitizenDashboard from './pages/citizen/Dashboard';
import SubmitComplaint from './pages/citizen/SubmitComplaint';
import TrackComplaint from './pages/citizen/TrackComplaint';
import ComplaintDetail from './pages/citizen/ComplaintDetail';
import ProfileSettings from './pages/citizen/ProfileSettings';
import PSDashboard from './pages/authority/PSDashboard';
import ACBDashboard from './pages/authority/ACBDashboard';
import MunicipalDashboard from './pages/authority/MunicipalDashboard';
import FireDashboard from './pages/authority/FireDashboard';
import HospitalDashboard from './pages/authority/HospitalDashboard';
import AdminPanel from './pages/admin/AdminPanel';
import CreateAuthority from './pages/admin/CreateAuthority';
import EscalationsPage from './pages/admin/EscalationsPage';
import NotFound from './pages/NotFound';
import EmergencyReport from './pages/citizen/EmergencyReport';

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const token = localStorage.getItem('token');
  if (!token || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || user?.role;

  console.log(`🛡️ [AdminProtectedRoute] Guard check: token=${!!token}, role=${role}, isAuthenticated=${isAuthenticated}, isLoading=${isLoading}`);

  if (isLoading) {
    console.log("🛡️ [AdminProtectedRoute] Login API is still loading, bypassing redirection.");
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || role !== 'super_admin') {
    console.log("🛡️ [AdminProtectedRoute] Access Denied. Redirecting to /admin/login");
    return <Navigate to="/admin/login" replace />;
  }

  console.log("🛡️ [AdminProtectedRoute] Access Granted to Admin Dashboard.");
  return children;
};

const AdminPublicRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || user?.role;

  console.log(`🛡️ [AdminPublicRoute] Guard check: token=${!!token}, role=${role}, isLoading=${isLoading}`);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (token && role === 'super_admin') {
    console.log("🛡️ [AdminPublicRoute] Already logged in as super_admin. Redirecting to /admin/dashboard");
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || user?.role;
  
  if (token && isAuthenticated) {
    const redirectMap = {
      citizen: '/dashboard',
      ps_officer: '/ps-dashboard',
      acb_officer: '/acb-dashboard',
      municipal_officer: '/municipal-dashboard',
      fire_officer: '/fire-dashboard',
      hospital_officer: '/hospital-dashboard',
      super_admin: '/admin/dashboard',
    };
    return <Navigate to={redirectMap[role] || '/dashboard'} replace />;
  }
  return children;
};

const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="text-center">
      <div className="text-6xl font-bold text-red-200 dark:text-red-900 font-display mb-2">403</div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
      <p className="text-slate-500 dark:text-slate-400">You don't have permission to access this page.</p>
    </div>
  </div>
);

export default function App() {
  const { initializeAuth } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initializeAuth();
    initTheme();
  }, []);

  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/emergency" element={<EmergencyReport />} />
        <Route path="/map" element={<EmergencyReport />} />
        <Route path="/track" element={<TrackComplaint />} />
        <Route path="/track/:complaintId" element={<TrackComplaint />} />

        {/* Auth */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Citizen */}
        <Route path="/dashboard" element={<ProtectedRoute roles={['citizen']}><CitizenDashboard /></ProtectedRoute>} />
        <Route path="/submit-complaint" element={<ProtectedRoute roles={['citizen']}><SubmitComplaint /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute roles={['citizen']}><SubmitComplaint /></ProtectedRoute>} />
        <Route path="/complaints/:id" element={<ProtectedRoute roles={['citizen']}><ComplaintDetail /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />

        {/* Authorities */}
        <Route path="/ps-dashboard" element={<ProtectedRoute roles={['ps_officer', 'super_admin']}><PSDashboard /></ProtectedRoute>} />
        <Route path="/acb-dashboard" element={<ProtectedRoute roles={['acb_officer', 'super_admin']}><ACBDashboard /></ProtectedRoute>} />
        <Route path="/municipal-dashboard" element={<ProtectedRoute roles={['municipal_officer', 'super_admin']}><MunicipalDashboard /></ProtectedRoute>} />
        <Route path="/fire-dashboard" element={<ProtectedRoute roles={['fire_officer', 'super_admin']}><FireDashboard /></ProtectedRoute>} />
        <Route path="/hospital-dashboard" element={<ProtectedRoute roles={['hospital_officer', 'super_admin']}><HospitalDashboard /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminPublicRoute><Login /></AdminPublicRoute>} />
        <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminPanel /></AdminProtectedRoute>} />
        <Route path="/admin/create-authority" element={<AdminProtectedRoute><CreateAuthority /></AdminProtectedRoute>} />
        <Route path="/admin/escalations" element={<AdminProtectedRoute><EscalationsPage /></AdminProtectedRoute>} />
        <Route path="/admin/*" element={<AdminProtectedRoute><AdminPanel /></AdminProtectedRoute>} />

        {/* Misc */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ChatbotWidget />
      <VoiceAssistant />
      <OfflineSyncManager />
    </>
  );
}
