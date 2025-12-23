import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ProfilePage from '../pages/user/ProfilePage';
import HomePage from '../pages/HomePage';
import GiaoDienViewerPage from '../pages/giaodien/GiaoDienViewerPage';
import { useAuthStore } from '../store/authStore';

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Public Route component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Placeholder Dashboard component
const DashboardPage = () => {
  const { user, logout } = useAuthStore();
  
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-soft p-8">
          <h1 className="text-2xl font-bold text-text-main dark:text-white mb-4">
            Chào mừng đến với AURA Dashboard
          </h1>
          <p className="text-text-secondary dark:text-gray-400 mb-4">
            Xin chào, {user?.firstName || user?.email}!
          </p>
          <p className="text-text-secondary dark:text-gray-400 mb-6">
            Email: {user?.email}
          </p>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        } 
      />
      
      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      
      {/* Giao diện pages - Protected routes */}
      <Route
        path="/giaodien/:page"
        element={
          <ProtectedRoute>
            <GiaoDienViewerPage />
          </ProtectedRoute>
        }
      />
      
      {/* 404 - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
