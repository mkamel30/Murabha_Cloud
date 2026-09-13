import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../lib/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingScreen message="جاري التحقق من الصلاحيات..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6" dir="rtl">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
          ⛔
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">غير مصرح بالدخول</h2>
        <p className="text-sm text-slate-500 max-w-md">
          هذه الصفحة مخصصة فقط لأصحاب الصلاحيات الإدارية المحددة. يرجى مراجعة إدارة النظام إذا كنت تعتقد أن هناك خطأ.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
