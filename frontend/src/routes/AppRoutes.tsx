import { Routes, Route } from 'react-router-dom';
// TODO: Import pages
// import LoginPage from '../pages/auth/LoginPage';
// import RegisterPage from '../pages/auth/RegisterPage';
// TODO: Import PrivateRoute component

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      {/* <Route path="/login" element={<LoginPage />} /> */}
      {/* <Route path="/register" element={<RegisterPage />} /> */}

      {/* Protected routes */}
      {/* <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} /> */}

      {/* Default route */}
      <Route path="/" element={<div>Welcome to AURA</div>} />
    </Routes>
  );
};

export default AppRoutes;

