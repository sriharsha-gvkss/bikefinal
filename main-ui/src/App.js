import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import UserDashboard from './components/UserDashboard';
import DriverDashboard from './components/DriverDashboard';
import AdminDashboard from './components/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';

function ProtectedRoute({ children, role }) {
  const { auth } = useAuth();
  console.log('ProtectedRoute auth:', auth, 'role:', role); // Debug log
  if (!auth) return <Navigate to="/" />;
  if (role && auth.role !== role) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  console.log('AppRoutes rendering...'); // Debug log
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/user" element={<ProtectedRoute role="RIDER"><UserDashboard /></ProtectedRoute>} />
      <Route path="/driver" element={<ProtectedRoute role="DRIVER"><ErrorBoundary><DriverDashboard /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
