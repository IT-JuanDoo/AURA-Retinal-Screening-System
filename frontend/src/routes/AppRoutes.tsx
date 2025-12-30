import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import AdminLoginPage from "../pages/admin/AdminLoginPage";
import AdminAccountsPage from "../pages/admin/AdminAccountsPage";
import AdminRbacPage from "../pages/admin/AdminRbacPage";
import PatientProfilePage from "../pages/patient/PatientProfilePage";
import HomePage from "../pages/HomePage";
import PatientDashboard from "../pages/patient/PatientDashboard";
import { useAuthStore } from "../store/authStore";
import { useAdminAuthStore } from "../store/adminAuthStore";

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

// Admin Protected Route component
const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated } = useAdminAuthStore();

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

// Admin Public Route component (redirect to admin accounts if authenticated)
const AdminPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated } = useAdminAuthStore();

  if (isAdminAuthenticated) {
    return <Navigate to="/admin/accounts" replace />;
  }

  return <>{children}</>;
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

      {/* Admin routes */}
      <Route
        path="/admin/login"
        element={
          <AdminPublicRoute>
            <AdminLoginPage />
          </AdminPublicRoute>
        }
      />
      <Route
        path="/admin/accounts"
        element={
          <AdminProtectedRoute>
            <AdminAccountsPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/rbac"
        element={
          <AdminProtectedRoute>
            <AdminRbacPage />
          </AdminProtectedRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <PatientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <PatientProfilePage />
          </ProtectedRoute>
        }
      />

      {/* 404 - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
