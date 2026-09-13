import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  role: string;
  branchId?: string | null;
  branchName?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isHQ: boolean;
  selectedBranchId: string;
  setSelectedBranchId: (branchId: string) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('murabha_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchIdState] = useState<string>(() => {
    return localStorage.getItem('murabha_selected_branch_id') || 'ALL';
  });

  const setSelectedBranchId = (branchId: string) => {
    setSelectedBranchIdState(branchId);
    localStorage.setItem('murabha_selected_branch_id', branchId);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('murabha_access_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const data = await authApi.me();
        setUser(data.user);
        localStorage.setItem('murabha_user', JSON.stringify(data.user));
      } catch (err) {
        setUser(null);
        localStorage.removeItem('murabha_user');
        localStorage.removeItem('murabha_access_token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const data = await authApi.login({ username, password });
    localStorage.setItem('murabha_access_token', data.accessToken);
    localStorage.setItem('murabha_user', JSON.stringify(data.user));
    setUser(data.user);
    if (data.user.branchId) {
      setSelectedBranchId(data.user.branchId);
    } else {
      setSelectedBranchId('ALL');
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {}
    localStorage.removeItem('murabha_access_token');
    localStorage.removeItem('murabha_user');
    localStorage.removeItem('murabha_selected_branch_id');
    setUser(null);
    window.location.href = '/login';
  };

  const isHQ = user ? ['SUPER_ADMIN', 'HQ_MANAGER', 'HQ_ACCOUNTANT'].includes(user.role) : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isHQ,
        selectedBranchId,
        setSelectedBranchId,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
