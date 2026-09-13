import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@/lib/toast';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import Layout from './Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import HQDashboard from '@/pages/HQDashboard';
import UsersManagement from '@/pages/UsersManagement';
import BranchesManagement from '@/pages/BranchesManagement';
import Customers from '@/pages/Customers';
import CustomerDetail from '@/pages/CustomerDetail';
import Sales from '@/pages/Sales';
import SaleDetail from '@/pages/SaleDetail';
import Installments from '@/pages/Installments';
import Payments from '@/pages/Payments';
import FollowUps from '@/pages/FollowUps';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import ImportPage from '@/pages/Import';
import Analytics from '@/pages/Analytics';
import { ar } from '@/i18n/ar';
import { PrimaryButton } from '@/lib/Actions';
import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4" dir="rtl">
      <div className="text-6xl font-bold text-gray-300">404</div>
      <h2 className="text-xl font-bold text-gray-700">{ar.common.notFound}</h2>
      <p className="text-gray-500">{ar.common.notFoundMessage}</p>
      <PrimaryButton onClick={() => navigate('/dashboard')}>{ar.common.goHome}</PrimaryButton>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* HQ Executive Dashboard */}
              <Route
                path="hq-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HQ_MANAGER', 'HQ_ACCOUNTANT']}>
                    <HQDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HQ_MANAGER']}>
                    <UsersManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/branches"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <BranchesManagement />
                  </ProtectedRoute>
                }
              />

              {/* Operational Routes */}
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="sales" element={<Sales />} />
              <Route path="sales/:id" element={<SaleDetail />} />
              <Route path="installments" element={<Installments />} />
              <Route path="payments" element={<Payments />} />
              <Route path="followups" element={<FollowUps />} />
              <Route path="reports" element={<Reports />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}