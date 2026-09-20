import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Attach JWT token and selected branch to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('murabha_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const selectedBranchId = localStorage.getItem('murabha_selected_branch_id');
  if (selectedBranchId && selectedBranchId !== 'ALL') {
    config.headers['x-branch-id'] = selectedBranchId;
  }

  return config;
});

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Auto-refresh token or redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${getApiBaseUrl()}/auth/refresh`, {}, { withCredentials: true });
        const newToken = res.data.accessToken;
        localStorage.setItem('murabha_access_token', newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('murabha_access_token');
        localStorage.removeItem('murabha_user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Global error handler for generic API errors
    if (error.response?.data?.message || error.message) {
      import('@/lib/toast').then((mod) => {
        if (mod.globalToast) {
          mod.globalToast(error.response?.data?.message || error.message, 'error');
        }
      });
    }

    return Promise.reject(error);
  }
);

// ---- Authentication API ----
export const authApi = {
  login: (data: { username: string; password: string }) => api.post('/auth/login', data).then((r) => r.data),
  refresh: () => api.post('/auth/refresh').then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

// ---- Users Management API (Admin) ----
export const adminUsersApi = {
  getAll: () => api.get('/admin/users').then((r) => r.data),
  create: (data: any) => api.post('/admin/users', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/admin/users/${id}`, data).then((r) => r.data),
  resetPassword: (id: string, newPassword: string) => api.post(`/admin/users/${id}/reset-password`, { newPassword }).then((r) => r.data),
  toggleActive: (id: string) => api.post(`/admin/users/${id}/toggle-active`).then((r) => r.data),
  delete: (id: string) => api.delete(`/admin/users/${id}`).then((r) => r.data),
  downloadTemplate: () => api.get('/admin/users/template', { responseType: 'blob' }).then((r) => r.data),
  bulkImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/users/bulk-import', formData).then((r) => r.data);
  },
};

// ---- Branches Management API ----
export const branchesApi = {
  getAll: () => api.get('/branches').then((r) => r.data),
  create: (data: { code: string; name: string; address?: string; phone?: string }) => api.post('/branches', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/branches/${id}`, data).then((r) => r.data),
  toggleActive: (id: string) => api.post(`/branches/${id}/toggle-active`).then((r) => r.data),
  delete: (id: string) => api.delete(`/branches/${id}`).then((r) => r.data),
  downloadTemplate: () => api.get('/branches/template', { responseType: 'blob' }).then((r) => r.data),
  bulkImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/branches/bulk-import', formData).then((r) => r.data);
  },
};


// ---- Oracle Migration Wizard API ----
export const oracleMigrationApi = {
  testConnection: (config: any) => api.post('/admin/oracle/test-connection', config).then((r) => r.data),
  provisionSchema: (config: any) => api.post('/admin/oracle/provision-schema', config).then((r) => r.data),
  migrateData: (config: any) => api.post('/admin/oracle/migrate-data', config).then((r) => r.data),
};

// ---- HQ Executive Dashboard API ----
export const hqDashboardApi = {
  getHQStats: (branchId?: string) => api.get('/dashboard/hq', { params: { branchId } }).then((r) => r.data),
};

// ---- System Settings API ----
export const settingsApi = {
  getAll: () => api.get<Record<string, any>>('/settings').then((r) => r.data),
  update: (key: string, value: any) => api.put(`/settings/${key}`, { value }).then((r) => r.data),
  getMailSettings: () => api.get('/settings/mail').then((r) => r.data),
  saveMailSettings: (data: any) => api.put('/settings/mail', data).then((r) => r.data),
  testMail: (data: any) => api.post('/settings/mail/test', data).then((r) => r.data),
  getWorkflowSettings: () => api.get('/settings/workflow').then((r) => r.data),
  saveWorkflowSettings: (data: any) => api.put('/settings/workflow', data).then((r) => r.data),
};

// ---- Installment Requests (Workflow) API ----
export const installmentRequestsApi = {
  getAll: (status?: string) => api.get('/installment-requests', { params: { status } }).then((r) => r.data),
  getById: (id: string) => api.get(`/installment-requests/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/installment-requests', data).then((r) => r.data),
  approve: (id: string, notes?: string) => api.post(`/installment-requests/${id}/approve`, { notes }).then((r) => r.data),
  reject: (id: string, reason: string) => api.post(`/installment-requests/${id}/reject`, { reason }).then((r) => r.data),
  convertToSale: (id: string, downPaymentReceipt: string) => api.post(`/installment-requests/${id}/convert-to-sale`, { downPaymentReceipt }).then((r) => r.data),
};

// ---- In-App Notifications API ----
export const notificationsApi = {
  getAll: () => api.get('/notifications').then((r) => r.data),
  getUnreadCount: () => api.get<{ unreadCount: number }>('/notifications/unread-count').then((r) => r.data),
  markAllRead: () => api.post('/notifications/mark-all-read').then((r) => r.data),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`).then((r) => r.data),
};

// ---- Core Operational APIs ----
export const healthApi = {
  check: () => api.get('/health').then((r) => r.data),
};

export const customersApi = {
  getAll: (search?: string) => api.get('/customers', { params: { search } }).then((r) => r.data),
  getById: (id: string) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/customers', data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/customers/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/customers/${id}`).then((r) => r.data),
  generateBkCode: () => api.get('/customers/generate-bkcode').then((r) => r.data),
};

export const salesApi = {
  getAll: (search?: string) =>
    api.get('/sales', { params: { search } }).then((r) => {
      if (Array.isArray(r.data)) return r.data;
      if (r.data && Array.isArray(r.data.sales)) return r.data.sales;
      return [];
    }),
  getById: (id: string) => api.get(`/sales/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/sales', data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/sales/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/sales/${id}`).then((r) => r.data),
  void: (id: string, reason: string) => api.post(`/sales/${id}/void`, { reason }).then((r) => r.data),
  pay: (saleId: string, data: unknown) => api.post(`/sales/${saleId}/pay`, data).then((r) => r.data),
  previewPayment: (id: string, amount: number, installmentIds?: string[]) =>
    api.post(`/sales/${id}/preview-payment`, { amount, installmentIds }).then((r) => r.data),
  fullRecalculate: (id: string, data: any) =>
    api.post(`/sales/${id}/full-recalculate`, data).then((r) => r.data),
  checkSerial: (serial: string) =>
    api.get<{ available: boolean; message?: string; existingSale?: any }>('/sales/check-serial', { params: { serial } }).then((r) => r.data),
  checkReceipt: (receipt: string) =>
    api.get<{ available: boolean; message?: string; existingPayment?: any }>('/sales/check-receipt', { params: { receipt } }).then((r) => r.data),
};

export const installmentsApi = {
  getAll: (filters?: { isPaid?: boolean; saleId?: string }) =>
    api.get('/installments', { params: filters }).then((r) => r.data),
  getBySale: (saleId: string) => api.get('/installments', { params: { saleId } }).then((r) => r.data),
  pay: (id: string, data: { amount: number; receiptNumber?: string; paymentPlace?: string }) =>
    api.post(`/installments/${id}/pay`, data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.patch(`/installments/${id}`, data).then((r) => r.data),
  getOverdue: () => api.get('/installments/overdue').then((r) => r.data),
  exportUpdateTemplate: () => api.get('/installments/export-update', { responseType: 'blob' }).then((r) => r.data),
  importUpdate: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/installments/import-update', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};

export const rewardsApi = {
  waiveInstallments: (data: { saleId: string; installmentIds: string[]; reason?: string }) =>
    api.post('/rewards/waive-installments', data).then((r) => r.data),
};

export const paymentsApi = {
  getAll: (filters?: { startDate?: string; endDate?: string }) =>
    api.get('/payments', { params: filters }).then((r) => r.data),
  getById: (id: string) => api.get(`/payments/${id}`).then((r) => r.data),
  void: (id: string) => api.post(`/payments/${id}/void`).then((r) => r.data),
  update: (id: string, data: { receiptNumber?: string; paidAt?: string }) =>
    api.put(`/payments/${id}`, data).then((r) => r.data),
};

export const followupsApi = {
  getAll: (filters?: { customerId?: string; isCompleted?: boolean }) =>
    api.get('/followups', { params: filters }).then((r) => r.data),
  create: (data: unknown) => api.post('/followups', data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/followups/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/followups/${id}`).then((r) => r.data),
  complete: (id: string) => api.post(`/followups/${id}/complete`).then((r) => r.data),
};

export const followUpsApi = followupsApi;

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats').then((r) => r.data),
};

export const reportsApi = {
  sales: (params: any) => api.get('/reports/sales', { params }).then((r) => r.data),
  collections: (params: any) => api.get('/reports/collections', { params }).then((r) => r.data),
  overdue: (params: any) => api.get('/reports/overdue', { params }).then((r) => r.data),
  collectionRatio: (params: any) => api.get('/reports/collection-ratio', { params }).then((r) => r.data),
  monthClosing: (params: any) => api.get('/reports/month-closing', { params }).then((r) => r.data),
  statement: (customerId: string, params?: any) => api.get(`/reports/customer/${customerId}`, { params }).then((r) => r.data),
};

export const exportApi = {
  sales: (params: any) => api.get('/export/sales', { params, responseType: 'blob' }).then((r) => r.data),
  collections: (params: any) => api.get('/export/collections', { params, responseType: 'blob' }).then((r) => r.data),
  overdue: (params: any = {}) => api.get('/export/overdue', { params, responseType: 'blob' }).then((r) => r.data),
  full: () => api.get('/export/full', { responseType: 'blob' }).then((r) => r.data),
  receipt: (paymentId: string) => api.get(`/export/receipt/${paymentId}`).then((r) => r.data),
  contract: (saleId: string) => api.get(`/export/contract/${saleId}`).then((r) => r.data),
  statement: (customerId: string) => api.get(`/export/statement/${customerId}`).then((r) => r.data),
};

export const backupApi = {
  export: () => api.get('/backup/export', { responseType: 'blob' }).then((r) => r.data),
  import: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/backup/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  auto: () => api.post('/backup/auto').then((r) => r.data),
  list: () => api.get('/backup/list').then((r) => r.data),
};

export const importApi = {
  uploadExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  preview: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  downloadTemplate: () => api.get('/import/template', { responseType: 'blob' }).then((r) => r.data),
};

export const adminApi = {
  resetDatabase: (code: string) => api.post('/admin/database/reset', { code }).then((r) => r.data),
};

export const analyticsApi = {
  getDashboardData: (filters?: any) => api.get('/analytics/dashboard', { params: filters }).then((r) => r.data),
};

export default api;