import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from './store';
import type { RootState } from './store';
import { seedDatabase } from './database/seed';
import { loadCustomDepartmentsIntoLabels } from './database/operations';
import LoginPage from './components/auth/LoginPage';
import Layout from './components/common/Layout';
import Dashboard from './components/dashboard/Dashboard';
import BatchList from './components/batches/BatchList';
import BatchDetail from './components/batches/BatchDetail';
import UserManagement from './components/users/UserManagement';
import Statistics from './components/statistics/Statistics';
import UserStatReport from './components/statistics/UserStatReport';
import Reports from './components/statistics/Reports';
import Accounting from './components/accounting/Accounting';
import AuditLogs from './components/audit/AuditLogs';
import Materials from './components/store-dept/Materials';
import ConsumerGoods from './components/store-dept/ConsumerGoods';
import Departments from './components/departments/Departments';
import FinalProducts from './components/products/FinalProducts';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  if (!currentUser || currentUser.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    seedDatabase().then(() => loadCustomDepartmentsIntoLabels());
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/batches" element={<ProtectedRoute><BatchList /></ProtectedRoute>} />
        <Route path="/batches/:id" element={<ProtectedRoute><BatchDetail /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
        <Route path="/statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
        <Route path="/statistics/user/:userId" element={<ProtectedRoute><UserStatReport /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
        <Route path="/accounting/:hodId" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute><AdminRoute><AuditLogs /></AdminRoute></ProtectedRoute>} />
        <Route path="/materials" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
        <Route path="/consumer-goods" element={<ProtectedRoute><ConsumerGoods /></ProtectedRoute>} />
        <Route path="/departments" element={<ProtectedRoute><AdminRoute><Departments /></AdminRoute></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><FinalProducts /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppRoutes />
    </Provider>
  );
}
