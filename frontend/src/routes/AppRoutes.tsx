import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import AdminLoginPage from "../pages/admin/AdminLoginPage";
import AdminAccountsPage from "../pages/admin/AdminAccountsPage";
import AdminRbacPage from "../pages/admin/AdminRbacPage";
import AdminAnalyticsPage from "../pages/admin/AdminAnalyticsPage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import AdminClinicsPage from "../pages/admin/AdminClinicsPage";
import AdminUsersPage from "../pages/admin/AdminUsersPage";
import AdminSystemPage from "../pages/admin/AdminSystemPage";
import AdminSecurityPage from "../pages/admin/AdminSecurityPage";
import PatientProfilePage from "../pages/patient/PatientProfilePage";
import HomePage from "../pages/HomePage";
import PatientDashboard from "../pages/patient/PatientDashboard";
import ImageUploadPage from "../pages/patient/ImageUploadPage";
import AnalysisResultPage from "../pages/patient/AnalysisResultPage";
import ChatPage from "../pages/patient/ChatPage";
import ClinicBulkUploadPage from "../pages/clinic/ClinicBulkUploadPage";
import ClinicAlertsPage from "../pages/clinic/ClinicAlertsPage";
import PatientTrendPage from "../pages/clinic/PatientTrendPage";
import ClinicUsageDashboardPage from "../pages/clinic/ClinicUsageDashboardPage";
import PatientReportsPage from "../pages/patient/PatientReportsPage";
import PatientNotesPage from "../pages/patient/PatientNotesPage";
import ClinicReportGenerationPage from "../pages/clinic/ClinicReportGenerationPage";
import PackagesPage from "../pages/patient/PackagesPage";
import ExportHistoryPage from "../pages/patient/ExportHistoryPage";
import PaymentHistoryPage from "../pages/patient/PaymentHistoryPage";
import PatientSearchPage from "../pages/doctor/PatientSearchPage";
import DoctorDashboardPage from "../pages/doctor/DoctorDashboardPage";
import DoctorPatientsPage from "../pages/doctor/DoctorPatientsPage";
import DoctorAnalysisPage from "../pages/doctor/DoctorAnalysisPage";
import MedicalNotesPage from "../pages/doctor/MedicalNotesPage";
import DoctorStatisticsPage from "../pages/doctor/DoctorStatisticsPage";
import DoctorPatientProfilePage from "../pages/doctor/PatientProfilePage";
import DoctorChatPage from "../pages/doctor/DoctorChatPage";
import DoctorExportHistoryPage from "../pages/doctor/DoctorExportHistoryPage";
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

// Admin Public Route component (redirect to admin dashboard if authenticated)
const AdminPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated } = useAdminAuthStore();

  if (isAdminAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
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
      <Route
        path="/doctor/login"
        element={
          <Navigate to="/login?type=doctor" replace />
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
      <Route
        path="/admin/analytics"
        element={
          <AdminProtectedRoute>
            <AdminAnalyticsPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <AdminProtectedRoute>
            <AdminDashboardPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/clinics"
        element={
          <AdminProtectedRoute>
            <AdminClinicsPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminProtectedRoute>
            <AdminUsersPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/system"
        element={
          <AdminProtectedRoute>
            <AdminSystemPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/security"
        element={
          <AdminProtectedRoute>
            <AdminSecurityPage />
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
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <ImageUploadPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analysis/:analysisId"
        element={
          <ProtectedRoute>
            <AnalysisResultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />

      {/* Patient Reports - View analysis results history */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <PatientReportsPage />
          </ProtectedRoute>
        }
      />
      {/* Patient Notes - View medical notes from doctors */}
      <Route
        path="/notes"
        element={
          <ProtectedRoute>
            <PatientNotesPage />
          </ProtectedRoute>
        }
      />
      {/* Packages - View and purchase service packages */}
      <Route
        path="/packages"
        element={
          <ProtectedRoute>
            <PackagesPage />
          </ProtectedRoute>
        }
      />

      {/* Export History - View exported reports */}
      <Route
        path="/exports"
        element={
          <ProtectedRoute>
            <ExportHistoryPage />
          </ProtectedRoute>
        }
      />

      {/* Payment History - View payment and package history */}
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <PaymentHistoryPage />
          </ProtectedRoute>
        }
      />

      {/* Settings Page */}

        {/* Clinic routes */}
        <Route
          path="/clinic/bulk-upload"
          element={
            <ProtectedRoute>
              <ClinicBulkUploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clinic/alerts"
          element={
            <ProtectedRoute>
              <ClinicAlertsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clinic/patient-trend/:patientUserId"
          element={
            <ProtectedRoute>
              <PatientTrendPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clinic/usage-dashboard"
          element={
            <ProtectedRoute>
              <ClinicUsageDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clinic/reports"
          element={
            <ProtectedRoute>
              <ClinicReportGenerationPage />
            </ProtectedRoute>
          }
        />

        {/* Doctor routes */}
        <Route
          path="/doctor/dashboard"
          element={
            <ProtectedRoute>
              <DoctorDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/patients/search"
          element={
            <ProtectedRoute>
              <PatientSearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/patients/:patientId"
          element={
            <ProtectedRoute>
              <DoctorPatientProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/patients"
          element={
            <ProtectedRoute>
              <DoctorPatientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/analyses"
          element={
            <ProtectedRoute>
              <DoctorAnalysisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/analyses/:analysisId"
          element={
            <ProtectedRoute>
              <DoctorAnalysisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/medical-notes"
          element={
            <ProtectedRoute>
              <MedicalNotesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/statistics"
          element={
            <ProtectedRoute>
              <DoctorStatisticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/chat"
          element={
            <ProtectedRoute>
              <DoctorChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/exports"
          element={
            <ProtectedRoute>
              <DoctorExportHistoryPage />
            </ProtectedRoute>
          }
        />

      {/* 404 - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
