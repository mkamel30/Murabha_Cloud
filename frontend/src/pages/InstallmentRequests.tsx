import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileCheck, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Building2, 
  User, 
  History, 
  CreditCard,
  Sparkles
} from 'lucide-react';
import { installmentRequestsApi, customersApi, salesApi } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/lib/toast';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/lib/Modal';
import { SmartSelect } from '@/lib/SmartSelect';
import { PaymentPlaceSelect } from '@/lib/PaymentPlace';
import { PrimaryButton, SecondaryButton } from '@/lib/Actions';
import type { Customer } from '@/types';

interface ApprovalHistoryEntry {
  step: string;
  action: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  notes?: string;
  reason?: string;
}

interface InstallmentRequestItem {
  id: string;
  requestNumber: string;
  customerId: string;
  customer?: {
    id: string;
    name: string;
    phone?: string;
    bkCode?: string;
  };
  machineSerial: string;
  totalPrice: number;
  downPayment: number;
  months: number;
  installmentAmount: number;
  paymentPlace?: string;
  notes?: string;
  status: 'PENDING_SUPERVISOR' | 'PENDING_MANAGER' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_SALE';
  rejectionReason?: string;
  approvalHistory?: string;
  downPaymentReceipt?: string;
  saleId?: string;
  branchId?: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
  requestedByUserId?: string;
  requestedByUserName?: string;
  createdAt: string;
  updatedAt: string;
}

export default function InstallmentRequests() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<InstallmentRequestItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<InstallmentRequestItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    customerId: '',
    machineSerial: '',
    totalPrice: 15000,
    downPayment: 3000,
    months: 12,
    installmentAmount: 1000,
    paymentPlace: 'Damen',
    notes: '',
  });

  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [downPaymentReceipt, setDownPaymentReceipt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serialValidation, setSerialValidation] = useState<{ loading: boolean; error: string; verified: boolean }>({
    loading: false,
    error: '',
    verified: false,
  });

  // Calculate monthly installment whenever total, downPayment, or months change
  useEffect(() => {
    const remaining = Math.max(0, formData.totalPrice - formData.downPayment);
    if (formData.months > 0) {
      setFormData(prev => ({ ...prev, installmentAmount: Math.round((remaining / prev.months) * 100) / 100 }));
    }
  }, [formData.totalPrice, formData.downPayment, formData.months]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await installmentRequestsApi.getAll();
      setRequests(data);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل تحميل طلبات التقسيط', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    customersApi.getAll()
      .then((data) => setCustomers(data))
      .catch((err) => console.error('Failed to load customers:', err));
  }, []);

  const checkSerial = async (serial: string) => {
    const s = serial.trim().toUpperCase();
    if (!s) {
      setSerialValidation({ loading: false, error: '', verified: false });
      return;
    }
    setSerialValidation({ loading: true, error: '', verified: false });
    try {
      const res = await salesApi.checkSerial(s);
      if (!res.available) {
        setSerialValidation({ loading: false, error: res.message || 'سيريال الماكينة مستخدم بالفعل في عقد آخر', verified: false });
      } else {
        setSerialValidation({ loading: false, error: '', verified: true });
      }
    } catch {
      setSerialValidation({ loading: false, error: '', verified: false });
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      showToast('يرجى اختيار العميل أولاً', 'error');
      return;
    }
    if (!formData.machineSerial.trim()) {
      showToast('يرجى إدخال رقم سيريال الماكينة', 'error');
      return;
    }
    if (serialValidation.error) {
      showToast(serialValidation.error, 'error');
      return;
    }

    setSubmitting(true);
    try {
      await installmentRequestsApi.create(formData);
      showToast('تم تسجيل طلب التقسيط بنجاح وتم إرسال التنبيه لمشرف الفرع', 'success');
      setShowCreateModal(false);
      setFormData({
        customerId: '',
        machineSerial: '',
        totalPrice: 15000,
        downPayment: 3000,
        months: 12,
        installmentAmount: 1000,
        paymentPlace: 'Damen',
        notes: '',
      });
      loadRequests();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.response?.data?.error || 'فشل تسجيل طلب التقسيط', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      await installmentRequestsApi.approve(selectedRequest.id, approvalNotes);
      showToast('تم اعتماد الطلب بنجاح', 'success');
      setShowApproveModal(false);
      setApprovalNotes('');
      loadRequests();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.response?.data?.error || 'فشل اعتماد الطلب', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      showToast('سبب الرفض إلزامي', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await installmentRequestsApi.reject(selectedRequest.id, rejectionReason);
      showToast('تم رفض طلب التقسيط وتسجيل السبب', 'success');
      setShowRejectModal(false);
      setRejectionReason('');
      loadRequests();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.response?.data?.error || 'فشل رفض الطلب', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToSale = async () => {
    if (!selectedRequest) return;
    if (!downPaymentReceipt.trim()) {
      showToast('يرجى إدخال رقم إيصال سداد المقدم', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await installmentRequestsApi.convertToSale(selectedRequest.id, downPaymentReceipt);
      showToast('تم تحويل الطلب إلى عقد بيع رسمي بنجاح وإنشاء جدول الأقساط!', 'success');
      setShowConvertModal(false);
      setDownPaymentReceipt('');
      loadRequests();
      if (res.saleId) {
        navigate(`/sales/${res.saleId}`);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.response?.data?.error || 'فشل تحويل الطلب إلى عقد بيع', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Check user permissions for actions
  const canApprove = (req: InstallmentRequestItem) => {
    const role = user?.role;
    if (role === 'SUPER_ADMIN' || role === 'HQ_MANAGER') return true;
    if (req.status === 'PENDING_SUPERVISOR') {
      return role === 'BRANCH_SUPERVISOR' || role === 'BRANCH_MANAGER';
    }
    if (req.status === 'PENDING_MANAGER') {
      return role === 'BRANCH_MANAGER';
    }
    return false;
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch =
        !search ||
        r.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
        r.machineSerial.toLowerCase().includes(search.toLowerCase()) ||
        r.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.customer?.phone && r.customer.phone.includes(search));

      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [requests, search, statusFilter]);

  // Statistics count
  const stats = useMemo(() => {
    return {
      total: requests.length,
      pendingSupervisor: requests.filter((r) => r.status === 'PENDING_SUPERVISOR').length,
      pendingManager: requests.filter((r) => r.status === 'PENDING_MANAGER').length,
      approved: requests.filter((r) => r.status === 'APPROVED').length,
      converted: requests.filter((r) => r.status === 'CONVERTED_TO_SALE').length,
      rejected: requests.filter((r) => r.status === 'REJECTED').length,
    };
  }, [requests]);

  const parseHistory = (historyStr?: string): ApprovalHistoryEntry[] => {
    if (!historyStr) return [];
    try {
      return JSON.parse(historyStr);
    } catch {
      return [];
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_SUPERVISOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> بانتظار المشرف
          </span>
        );
      case 'PENDING_MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Clock className="w-3 h-3" /> بانتظار المدير
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> معتمد (جاهز للتعاقد)
          </span>
        );
      case 'CONVERTED_TO_SALE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-[#0A2472] border border-blue-200">
            <FileText className="w-3 h-3" /> تم إصدار العقد
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3" /> مرفوض
          </span>
        );
      default:
        return <span className="text-xs font-bold text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0A2472] to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-900/20">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">طلبات التقسيط ومسار الاعتمادات</h1>
            <p className="text-xs text-slate-500 mt-1">
              إدارة طلبات البيع بالتقسيط المنشأة بالفروع ومتابعة موافقة المشرف ومدير الفرع حتى إصدار العقد
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A2472] text-white text-sm font-bold hover:bg-blue-900 transition shadow-md shadow-[#0A2472]/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>طلب تقسيط جديد</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-xl border cursor-pointer transition ${statusFilter === 'ALL' ? 'border-[#0A2472] bg-blue-50/50 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <div className="text-xs font-bold text-slate-500">إجمالي الطلبات</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{stats.total}</div>
        </div>
        <div 
          onClick={() => setStatusFilter('PENDING_SUPERVISOR')}
          className={`p-4 rounded-xl border cursor-pointer transition ${statusFilter === 'PENDING_SUPERVISOR' ? 'border-amber-500 bg-amber-50/50 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <div className="text-xs font-bold text-amber-700">بانتظار المشرف</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.pendingSupervisor}</div>
        </div>
        <div 
          onClick={() => setStatusFilter('PENDING_MANAGER')}
          className={`p-4 rounded-xl border cursor-pointer transition ${statusFilter === 'PENDING_MANAGER' ? 'border-indigo-500 bg-indigo-50/50 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <div className="text-xs font-bold text-indigo-700">بانتظار المدير</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{stats.pendingManager}</div>
        </div>
        <div 
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-4 rounded-xl border cursor-pointer transition ${statusFilter === 'APPROVED' ? 'border-emerald-500 bg-emerald-50/50 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <div className="text-xs font-bold text-emerald-700">معتمد للتعاقد</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.approved}</div>
        </div>
        <div 
          onClick={() => setStatusFilter('CONVERTED_TO_SALE')}
          className={`p-4 rounded-xl border cursor-pointer transition ${statusFilter === 'CONVERTED_TO_SALE' ? 'border-blue-500 bg-blue-50/50 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <div className="text-xs font-bold text-[#0A2472]">تم التعاقد</div>
          <div className="text-2xl font-black text-[#0A2472] mt-1">{stats.converted}</div>
        </div>
        <div 
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-4 rounded-xl border cursor-pointer transition ${statusFilter === 'REJECTED' ? 'border-red-500 bg-red-50/50 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <div className="text-xs font-bold text-red-700">طلبات مرفوضة</div>
          <div className="text-2xl font-black text-red-600 mt-1">{stats.rejected}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث برقم الطلب، اسم العميل، أو السيريال..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472]"
          />
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'PENDING_SUPERVISOR', label: 'المشرف' },
            { id: 'PENDING_MANAGER', label: 'المدير' },
            { id: 'APPROVED', label: 'المعتمدة' },
            { id: 'CONVERTED_TO_SALE', label: 'العقود' },
            { id: 'REJECTED', label: 'المرفوضة' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === item.id
                  ? 'bg-[#0A2472] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-sm">جاري تحميل طلبات التقسيط...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">لا توجد طلبات تقسيط مطابقة للبحث أو الفلتر المحدد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <tr>
                  <th className="p-3">رقم الطلب</th>
                  <th className="p-3">العميل</th>
                  <th className="p-3">الماكينة</th>
                  <th className="p-3">المبلغ الإجمالي</th>
                  <th className="p-3">المقدم / القسط</th>
                  <th className="p-3">الفرع والمُنشئ</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition">
                    {/* Request Number */}
                    <td className="p-3 font-mono font-bold text-[#0A2472]">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequest(req);
                          setShowHistoryModal(true);
                        }}
                        className="hover:underline flex items-center gap-1 cursor-pointer"
                        title="عرض سجل الموافقات والتفاصيل"
                      >
                        <span>{req.requestNumber}</span>
                        <History className="w-3 h-3 text-slate-400" />
                      </button>
                    </td>

                    {/* Customer */}
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{req.customer?.name || '—'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{req.customer?.phone || ''}</div>
                    </td>

                    {/* Machine Serial */}
                    <td className="p-3 font-mono font-bold text-slate-700">
                      {req.machineSerial}
                    </td>

                    {/* Total Price */}
                    <td className="p-3 font-bold text-slate-800">
                      {formatCurrency(req.totalPrice)}
                    </td>

                    {/* Down Payment & Monthly */}
                    <td className="p-3">
                      <div className="text-emerald-700 font-bold">مقدم: {formatCurrency(req.downPayment)}</div>
                      <div className="text-slate-500 text-[11px]">
                        قسط: {formatCurrency(req.installmentAmount)} × {req.months} شهر
                      </div>
                    </td>

                    {/* Branch & Requester */}
                    <td className="p-3">
                      <div className="font-bold text-slate-700 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{req.branch?.name || 'الفرع الرئيسي'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{req.requestedByUserName || '—'}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>

                    {/* Actions */}
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Approve Button (if authorized) */}
                        {canApprove(req) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowApproveModal(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-bold text-[11px] transition cursor-pointer"
                            title="اعتماد الطلب"
                          >
                            اعتماد
                          </button>
                        )}

                        {/* Reject Button (if authorized) */}
                        {canApprove(req) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowRejectModal(true);
                            }}
                            className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg font-bold text-[11px] transition cursor-pointer"
                            title="رفض الطلب"
                          >
                            رفض
                          </button>
                        )}

                        {/* Convert to Sale Button (if APPROVED) */}
                        {req.status === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowConvertModal(true);
                            }}
                            className="px-2.5 py-1 bg-[#0A2472] text-white hover:bg-blue-900 rounded-lg font-bold text-[11px] transition shadow-xs cursor-pointer flex items-center gap-1"
                            title="تسجيل إيصال المقدم وتحويله لعقد بيع رسمي"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>إصدار العقد</span>
                          </button>
                        )}

                        {/* View Contract if already converted */}
                        {req.status === 'CONVERTED_TO_SALE' && req.saleId && (
                          <button
                            type="button"
                            onClick={() => navigate(`/sales/${req.saleId}`)}
                            className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>عرض العقد</span>
                          </button>
                        )}

                        {/* History Icon */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRequest(req);
                            setShowHistoryModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="عرض سجل الخطوات"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Create New Installment Request */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="تسجيل طلب بيع بالتقسيط جديد"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">العميل:</label>
            <SmartSelect
              options={customers.map((c) => ({
                id: c.id,
                label: `${c.name} - ${c.bkCode || c.phone || ''}`,
              }))}
              value={formData.customerId}
              onChange={(val) => setFormData((prev) => ({ ...prev, customerId: val }))}
              placeholder="ابحث باسم العميل أو رقمه القومي..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">سيريال الماكينة (Machine Serial):</label>
            <input
              type="text"
              required
              value={formData.machineSerial}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setFormData((prev) => ({ ...prev, machineSerial: val }));
                checkSerial(val);
              }}
              placeholder="مثال: POS-98765432"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472] font-mono"
            />
            {serialValidation.loading && <p className="text-[11px] text-slate-400 mt-1">جاري التحقق من السيريال...</p>}
            {serialValidation.error && <p className="text-[11px] text-red-600 mt-1">{serialValidation.error}</p>}
            {serialValidation.verified && <p className="text-[11px] text-emerald-600 mt-1">✓ السيريال متاح وجاهز للتقسيط</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">إجمالي المبلغ (ج):</label>
              <input
                type="number"
                required
                min="500"
                value={formData.totalPrice}
                onChange={(e) => setFormData((prev) => ({ ...prev, totalPrice: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472] font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المقدم المدفوع (ج):</label>
              <input
                type="number"
                min="0"
                value={formData.downPayment}
                onChange={(e) => setFormData((prev) => ({ ...prev, downPayment: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472] font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عدد الأشهر:</label>
              <input
                type="number"
                min="1"
                max="60"
                value={formData.months}
                onChange={(e) => setFormData((prev) => ({ ...prev, months: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472] font-bold"
              />
            </div>
          </div>

          {/* Computed Installment preview */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
            <span className="font-bold text-[#0A2472]">القسط الشهري التقريبي:</span>
            <span className="text-base font-black text-[#0A2472]">
              {formatCurrency(formData.installmentAmount)} / شهر
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">جهة التحصيل المقترحة:</label>
            <PaymentPlaceSelect
              value={formData.paymentPlace}
              onChange={(val) => setFormData((prev) => ({ ...prev, paymentPlace: val }))}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية:</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="أي تفاصيل خاصة بدخل العميل أو الماكينة..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <SecondaryButton onClick={() => setShowCreateModal(false)}>إلغاء</SecondaryButton>
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? 'جاري الإرسال...' : 'إرسال طلب التقسيط'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Approve Request */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title={`اعتماد طلب التقسيط: ${selectedRequest?.requestNumber || ''}`}
        maxWidth="max-w-md"
      >
        <div className="p-5 space-y-4 text-right">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
            <div className="font-bold text-emerald-800">تأكيد الاعتماد والموافقة</div>
            <p className="text-emerald-700">
              سيتم تسجيل موافقتك على طلب العميل <strong>{selectedRequest?.customer?.name}</strong> بقيمة{' '}
              <strong>{formatCurrency(selectedRequest?.totalPrice || 0)}</strong>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات الاعتماد (اختياري):</label>
            <textarea
              rows={3}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="أي توجيهات أو شروط إضافية للموظف..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <SecondaryButton onClick={() => setShowApproveModal(false)}>إلغاء</SecondaryButton>
            <button
              type="button"
              disabled={submitting}
              onClick={handleApprove}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'جاري الاعتماد...' : 'تأكيد الاعتماد'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Reject Request */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={`رفض طلب التقسيط: ${selectedRequest?.requestNumber || ''}`}
        maxWidth="max-w-md"
      >
        <div className="p-5 space-y-4 text-right">
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs space-y-1">
            <div className="font-bold text-red-800">تنبيه بالرفض</div>
            <p className="text-red-700">
              سيتم رفض الطلب نهائياً وإخطار موظف خدمة العملاء بسبب الرفض المدون أدناه.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">سبب الرفض (إلزامي):</label>
            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="اكتب سبب الرفض بالتفصيل (مثل: تجاوز الحد الائتماني، عدم كفاية الضمانات)..."
              className="w-full px-3 py-2 text-xs border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <SecondaryButton onClick={() => setShowRejectModal(false)}>إلغاء</SecondaryButton>
            <button
              type="button"
              disabled={submitting}
              onClick={handleReject}
              className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'جاري الرفض...' : 'تأكيد الرفض'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Convert to Sale (Down Payment Receipt Entry) */}
      <Modal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        title={`إصدار العقد الرسمي: ${selectedRequest?.requestNumber || ''}`}
        maxWidth="max-w-md"
      >
        <div className="p-5 space-y-4 text-right">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-1">
            <div className="font-bold text-[#0A2472]">طلب معتمد وجاهز للتعاقد النهائي</div>
            <p className="text-slate-600 leading-relaxed">
              تمت الموافقة على الطلب بالكامل. يرجى إدخال <strong>رقم إيصال سداد المقدم</strong> لتوليد عقد بيع
              الماكينة تلقائياً وجدولة الأقساط الشهرية.
            </p>
          </div>

          <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">العميل:</span>
              <span className="font-bold text-slate-800">{selectedRequest?.customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">سيريال الماكينة:</span>
              <span className="font-mono font-bold text-slate-800">{selectedRequest?.machineSerial}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">قيمة المقدم المطلوب:</span>
              <span className="font-bold text-emerald-600">{formatCurrency(selectedRequest?.downPayment || 0)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رقم إيصال سداد المقدم (Down Payment Receipt):
            </label>
            <input
              type="text"
              required
              value={downPaymentReceipt}
              onChange={(e) => setDownPaymentReceipt(e.target.value)}
              placeholder="مثال: RCP-2026-9081"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472] font-mono font-bold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <SecondaryButton onClick={() => setShowConvertModal(false)}>إلغاء</SecondaryButton>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConvertToSale}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#0A2472] hover:bg-blue-900 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{submitting ? 'جاري إصدار العقد...' : 'إصدار العقد وجدول الأقساط'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: Approval History Timeline */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`سجل ومسار موافقات الطلب: ${selectedRequest?.requestNumber || ''}`}
        maxWidth="max-w-lg"
      >
        <div className="p-5 space-y-4 text-right">
          {selectedRequest && (
            <div className="border-b border-slate-100 pb-3 mb-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">العميل:</span>
                <span className="font-bold text-slate-800">{selectedRequest.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الفرع:</span>
                <span className="font-bold text-slate-800">{selectedRequest.branch?.name || 'المقر الرئيسي'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الحالة الراهنة:</span>
                <div>{getStatusBadge(selectedRequest.status)}</div>
              </div>
              {selectedRequest.rejectionReason && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 mt-2">
                  <span className="font-bold">سبب الرفض: </span>
                  {selectedRequest.rejectionReason}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700">المحطات الزمنية وسجل الإجراءات:</h4>
            {parseHistory(selectedRequest?.approvalHistory).length === 0 ? (
              <p className="text-xs text-slate-400">لا يوجد سجل تاريخي مسجل لهذا الطلب بعد.</p>
            ) : (
              <div className="relative border-r-2 border-slate-200 mr-3 pr-4 space-y-6">
                {parseHistory(selectedRequest?.approvalHistory).map((entry, idx) => (
                  <div key={idx} className="relative">
                    {/* Dot on timeline */}
                    <div className="absolute -right-[23px] top-1 w-3 h-3 rounded-full bg-[#0A2472] ring-4 ring-white" />
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>{entry.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(entry.timestamp).toLocaleString('ar-EG')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      بواسطة: <strong className="text-slate-700">{entry.userName}</strong> ({entry.userRole})
                    </div>
                    {entry.notes && (
                      <div className="mt-1 p-2 bg-slate-50 rounded text-[11px] text-slate-600 border border-slate-100">
                        ملاحظات: {entry.notes}
                      </div>
                    )}
                    {entry.reason && (
                      <div className="mt-1 p-2 bg-red-50 rounded text-[11px] text-red-700 border border-red-100">
                        السبب: {entry.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <SecondaryButton onClick={() => setShowHistoryModal(false)}>إغلاق</SecondaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
