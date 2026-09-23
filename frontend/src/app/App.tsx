import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@/lib/toast';
import { AuthProvider } from '@/context/AuthContext';
import { RealtimeProvider } from '@/context/RealtimeContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import Layout from './Layout';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const HQDashboard = lazy(() => import('@/pages/HQDashboard'));
const UsersManagement = lazy(() => import('@/pages/UsersManagement'));
const BranchesManagement = lazy(() => import('@/pages/BranchesManagement'));
const Customers = lazy(() => import('@/pages/Customers'));
const CustomerDetail = lazy(() => import('@/pages/CustomerDetail'));
const Sales = lazy(() => import('@/pages/Sales'));
const SaleDetail = lazy(() => import('@/pages/SaleDetail'));
const Installments = lazy(() => import('@/pages/Installments'));
const Payments = lazy(() => import('@/pages/Payments'));
const FollowUps = lazy(() => import('@/pages/FollowUps'));
const Reports = lazy(() => import('@/pages/Reports'));
const Settings = lazy(() => import('@/pages/Settings'));
const ImportPage = lazy(() => import('@/pages/Import'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const InstallmentRequests = lazy(() => import('@/pages/InstallmentRequests'));
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

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RealtimeProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<LoadingFallback />}>
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
                <Route path="installment-requests" element={<InstallmentRequests />} />
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
          </Suspense>
        </BrowserRouter>
        </RealtimeProvider>
      </AuthProvider>
    </ToastProvider>
  );
}