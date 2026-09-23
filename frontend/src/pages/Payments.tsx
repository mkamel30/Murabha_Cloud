import { useEffect, useState, useMemo } from 'react';
import { paymentsApi, exportApi } from '@/api/client';
import { formatCurrency, formatDate, formatPaymentPlace } from '@/lib/utils';
import type { Payment } from '@/types';
import { ar } from '@/i18n/ar';
import { useToast } from '@/lib/toast';
import { LoadingScreen } from '@/lib/Spinner';
import { PrimaryButton, SecondaryButton, PageHeader, EmptyState, TableActions } from '@/lib/Actions';
import { SearchFilterBar } from '@/lib/SearchFilterBar';
import { Modal } from '@/lib/Modal';
import { useRealtimeSync } from '@/context/RealtimeContext';
import { useAuth } from '@/context/AuthContext';

type PaymentTypeFilter = '' | 'CASH_SALE' | 'DOWN_PAYMENT' | 'INSTALLMENT';

export default function Payments() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<PaymentTypeFilter>('');
  const [groupBy, setGroupBy] = useState<'none' | 'customer' | 'month'>('none');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<{ id: string; receiptNumber: string; paidAt: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter and sort states
  const [customerTypeFilter, setCustomerTypeFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  // Void / Delete payment state
  const [voidingPayment, setVoidingPayment] = useState<Payment | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  const canVoid = user && ['SUPER_ADMIN', 'HQ_MANAGER', 'BRANCH_MANAGER', 'BRANCH_SUPERVISOR'].includes(user.role);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const data = await paymentsApi.getAll();
      setPayments(data);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time synchronization: automatically reload payments when any payment or sale changes
  useRealtimeSync(['PAYMENT', 'SALE'], () => {
    loadPayments();
  });

  const availableCustomerTypes = useMemo(() => {
    const types = new Set<string>();
    payments.forEach((p) => {
      const t = p.sale?.customer?.customerType;
      if (t) types.add(t);
    });
    return Array.from(types).map((t) => ({ value: t, label: t }));
  }, [payments]);

  const availableDepartments = useMemo(() => {
    const deps = new Set<string>();
    payments.forEach((p) => {
      const d = p.sale?.customer?.department;
      if (d) deps.add(d);
    });
    return Array.from(deps).map((d) => ({ value: d, label: d }));
  }, [payments]);

  const filteredPayments = useMemo(() => {
    let data = payments;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((p) =>
        p.sale?.customer?.name?.toLowerCase().includes(q) ||
        p.sale?.customer?.bkCode?.toLowerCase().includes(q) ||
        p.sale?.customer?.phone?.toLowerCase().includes(q) ||
        p.sale?.customer?.department?.toLowerCase().includes(q) ||
        p.sale?.customer?.customerType?.toLowerCase().includes(q) ||
        p.sale?.machineSerial?.toLowerCase().includes(q) ||
        p.sale?.receiptNumber?.toLowerCase().includes(q) ||
        p.receiptNumber?.toLowerCase().includes(q)
      );
    }
    if (typeFilter) data = data.filter((p) => p.paymentType === typeFilter);
    if (customerTypeFilter) data = data.filter((p) => p.sale?.customer?.customerType === customerTypeFilter);
    if (departmentFilter) data = data.filter((p) => p.sale?.customer?.department === departmentFilter);

    return [...data].sort((a, b) => {
      if (sortBy === 'date_asc') {
        return new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime();
      }
      if (sortBy === 'date_desc') {
        return new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime();
      }
      if (sortBy === 'amount_desc') {
        return Number(b.amount) - Number(a.amount);
      }
      if (sortBy === 'amount_asc') {
        return Number(a.amount) - Number(b.amount);
      }
      if (sortBy === 'customer_asc') {
        return (a.sale?.customer?.name || '').localeCompare(b.sale?.customer?.name || '', 'ar');
      }
      return 0;
    });
  }, [payments, search, typeFilter, customerTypeFilter, departmentFilter, sortBy]);

  const stats = useMemo(() => {
    const totalCollected = filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const uniqueCustomers = new Set(
      filteredPayments.map(p => p.sale?.customerId || p.sale?.customer?.id || p.sale?.customer?.bkCode).filter(Boolean)
    ).size;
    return {
      totalAmount: Math.round(totalCollected),
      customerCount: uniqueCustomers,
      paymentCount: filteredPayments.length
    };
  }, [filteredPayments]);

  const handlePrintReceipt = async (paymentId: string) => {
    try {
      const html = await exportApi.receipt(paymentId);
      const printWindow = window.open('', '_blank', 'width=1000,height=800,menubar=no,toolbar=no,location=no,status=no');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Wait for styles and content to render before printing
        setTimeout(() => {
          printWindow.print();
        }, 300);
      }
    } catch (err) {
      console.error('Failed to print receipt:', err);
    }
  };

  const handleEditClick = (payment: Payment) => {
    setEditingPayment({
      id: payment.id,
      receiptNumber: payment.receiptNumber || '',
      paidAt: payment.paidAt ? new Date(payment.paidAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setShowEditModal(true);
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    setIsUpdating(true);
    try {
      await paymentsApi.update(editingPayment.id, {
        receiptNumber: editingPayment.receiptNumber,
        paidAt: editingPayment.paidAt,
      });
      showToast('تم تحديث بيانات الدفعة بنجاح', 'success');
      setShowEditModal(false);
      setEditingPayment(null);
      loadPayments();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل تحديث البيانات', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidingPayment) return;
    setIsVoiding(true);
    try {
      await paymentsApi.void(voidingPayment.id, voidReason || 'إلغاء دفعة من شاشة التحصيلات');
      showToast('تم حذف وإلغاء الدفعة وإعادة تسوية العقد بنجاح', 'success');
      setVoidingPayment(null);
      setVoidReason('');
      loadPayments();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.response?.data?.message || 'فشل حذف الدفعة', 'error');
    } finally {
      setIsVoiding(false);
    }
  };

  if (loading) {
    return <LoadingScreen message={ar.common.loading} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title={ar.payments.title} />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالاسم، الكود، الهاتف، الإدارة، نوع العميل، الإيصال..."
        filters={[
          {
            key: 'type',
            value: typeFilter,
            onChange: (v) => setTypeFilter(v as PaymentTypeFilter),
            allLabel: ar.payments.paymentType,
            options: [
              { value: 'CASH_SALE', label: ar.payments.cashSale },
              { value: 'DOWN_PAYMENT', label: ar.payments.downPayment },
              { value: 'INSTALLMENT', label: ar.payments.installment },
            ],
          },
          {
            key: 'customerType',
            value: customerTypeFilter,
            onChange: setCustomerTypeFilter,
            allLabel: 'كل أنواع العملاء',
            options: availableCustomerTypes.length > 0 ? availableCustomerTypes : [
              { value: 'عام', label: 'عام' },
              { value: 'كبار عملاء', label: 'كبار عملاء' },
              { value: 'موظف', label: 'موظف' },
              { value: 'جهات حكومية', label: 'جهات حكومية' },
            ],
          },
          {
            key: 'department',
            value: departmentFilter,
            onChange: setDepartmentFilter,
            allLabel: 'كل الإدارات',
            options: availableDepartments,
          },
          {
            key: 'sortBy',
            value: sortBy,
            onChange: setSortBy,
            allLabel: 'الترتيب',
            options: [
              { value: 'date_desc', label: 'التاريخ: الأحدث أولاً' },
              { value: 'date_asc', label: 'التاريخ: الأقدم أولاً' },
              { value: 'amount_desc', label: 'المبلغ: من الأكبر' },
              { value: 'amount_asc', label: 'المبلغ: من الأصغر' },
              { value: 'customer_asc', label: 'اسم العميل: أ - ي' },
            ],
          },
        ]}
      />

      <div className="flex gap-2 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100 items-center justify-between flex-wrap">
        <div className="flex gap-2">
          <span className="text-xs font-bold text-slate-500 flex items-center px-2">تجميع حسب:</span>
          <button
            onClick={() => setGroupBy('none')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              groupBy === 'none' ? 'bg-white shadow-sm text-[#0A2472] border border-slate-200 font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {ar.common.all}
          </button>
          <button
            onClick={() => setGroupBy('customer')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              groupBy === 'customer' ? 'bg-white shadow-sm text-[#0A2472] border border-slate-200 font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {ar.customers.title}
          </button>
          <button
            onClick={() => setGroupBy('month')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              groupBy === 'month' ? 'bg-white shadow-sm text-[#0A2472] border border-slate-200 font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {ar.common.month}
          </button>
        </div>

        <div className="flex gap-4 px-2">
          <div className="text-center">
            <div className="text-[10px] text-slate-500 font-bold mb-0.5">إجمالي المحصل</div>
            <div className="text-sm font-black text-emerald-600 font-mono leading-none">{formatCurrency(stats.totalAmount)}</div>
          </div>
          <div className="w-px h-8 bg-slate-200 my-auto"></div>
          <div className="text-center">
            <div className="text-[10px] text-slate-500 font-bold mb-0.5">عدد العملاء</div>
            <div className="text-sm font-black text-[#0A2472] leading-none">{stats.customerCount}</div>
          </div>
          <div className="w-px h-8 bg-slate-200 my-auto"></div>
          <div className="text-center">
            <div className="text-[10px] text-slate-500 font-bold mb-0.5">عدد العمليات</div>
            <div className="text-sm font-black text-slate-700 leading-none">{stats.paymentCount}</div>
          </div>
        </div>
      </div>

      {groupBy === 'none' ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">{ar.payments.receiptNumber}</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">{ar.customers.title}</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">نوع العميل والإدارة</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">{ar.payments.paymentType}</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">{ar.payments.amount}</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">{ar.payments.paymentPlace}</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">{ar.payments.paidAt}</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">{ar.common.actions}</th>
              </tr>
             </thead>
             <tbody className="divide-y divide-gray-200">
               {filteredPayments.map((payment) => (
                 <tr key={payment.id} className="hover:bg-gray-50">
                   <td className="px-4 py-3 whitespace-nowrap font-mono text-sm font-bold text-slate-800">
                     {payment.receiptNumber}
                   </td>
                   <td className="px-4 py-3">
                     <div className="flex flex-col">
                       <span className="font-bold text-slate-900 text-sm">
                         {payment.sale?.customer?.name || 'غير معروف'}
                       </span>
                       <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                         <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-700">
                           كود: {payment.sale?.customer?.bkCode || '-'}
                         </span>
                         {payment.sale?.customer?.phone && (
                           <span className="font-mono text-slate-500 text-[11px]">
                             📞 {payment.sale.customer.phone}
                           </span>
                         )}
                       </div>
                     </div>
                   </td>
                   <td className="px-4 py-3">
                     <div className="flex flex-col gap-1 items-start">
                       <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                         {payment.sale?.customer?.customerType || 'عام'}
                       </span>
                       {payment.sale?.customer?.department && (
                         <span className="text-[11px] text-slate-600 font-medium truncate max-w-[150px]" title={payment.sale.customer.department}>
                           🏛️ {payment.sale.customer.department}
                         </span>
                       )}
                     </div>
                   </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className={`px-2 py-1 rounded text-xs font-medium w-fit ${payment.paymentType === 'CASH_SALE' ? 'bg-blue-50 text-blue-700' : payment.paymentType === 'DOWN_PAYMENT' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'}`}>
                          {payment.paymentType === 'CASH_SALE' ? ar.payments.cashSale : payment.paymentType === 'DOWN_PAYMENT' ? ar.payments.downPayment : ar.payments.installment}
                        </span>
                        {payment.sale?.months && payment.sale?.saleType === 'INSTALLMENT' && (
                          <span className="text-[10px] text-slate-500 italic mt-0.5 px-1">على {payment.sale.months} شهر</span>
                        )}
                      </div>
                    </td>
                   <td className="px-4 py-3 font-bold text-teal-600">{formatCurrency(payment.amount)}</td>
                   <td className="px-4 py-3">{formatPaymentPlace(payment.paymentPlace)}</td>
                   <td className="px-4 py-3 text-slate-600 text-sm">{formatDate(payment.paidAt)}</td>
                   <td className="px-4 py-3">
                      <TableActions>
                        <SecondaryButton size="sm" onClick={() => handlePrintReceipt(payment.id)}>
                          {ar.payments.printReceipt}
                        </SecondaryButton>
                        <SecondaryButton size="sm" onClick={() => handleEditClick(payment)}>
                          تعديل
                        </SecondaryButton>
                        {canVoid && (
                          <button
                            type="button"
                            onClick={() => setVoidingPayment(payment)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded transition"
                          >
                            حذف
                          </button>
                        )}
                      </TableActions>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
          </div>
          {filteredPayments.length === 0 && (
            <EmptyState message={ar.common.noData} />
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(
            filteredPayments.reduce((groups: any, pay) => {
              const cust = pay.sale?.customer;
              const key = groupBy === 'customer' 
                ? (cust ? `${cust.name} (${cust.bkCode})` : 'عميل غير محدد (-)')
                : new Date(pay.paidAt).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
              if (!groups[key]) groups[key] = { items: [], total: 0, customer: cust };
              groups[key].items.push(pay);
              groups[key].total = Math.round((groups[key].total + Number(pay.amount || 0)) * 100) / 100;
              return groups;
            }, {})
          ).map(([groupName, group]: any) => (
            <div key={groupName} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-emerald-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-emerald-800 text-sm">{groupName} ({group.items.length} تحصيل)</h3>
                    {groupBy === 'customer' && group.customer && (
                      <>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                          {group.customer.customerType || 'عام'}
                        </span>
                        {group.customer.department && (
                          <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-bold">
                            🏛️ {group.customer.department}
                          </span>
                        )}
                        {group.customer.phone && (
                          <span className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded-full font-mono border">
                            📞 {group.customer.phone}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {groupBy === 'customer' && (() => {
                    const months = [...new Set(group.items.map((p: any) => p.sale?.months).filter(Boolean))];
                    if (months.length > 0) {
                      return (
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                            {months.length === 1 
                              ? `نظام تقسيط ${months[0]} شهر` 
                              : `أنظمة تقسيط: ${months.join('، ')} شهر`}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="font-bold text-emerald-700 font-mono">إجمالي: {formatCurrency(group.total)}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-2 text-right text-xs text-slate-500">الإيصال</th>
                      {groupBy === 'month' && (
                        <>
                          <th className="px-4 py-2 text-right text-xs text-slate-500">العميل / الماكينة</th>
                          <th className="px-4 py-2 text-right text-xs text-slate-500">نوع العميل والإدارة</th>
                        </>
                      )}
                      <th className="px-4 py-2 text-right text-xs text-slate-500">النوع</th>
                      <th className="px-4 py-2 text-right text-xs text-slate-500">المبلغ</th>
                      <th className="px-4 py-2 text-right text-xs text-slate-500">التاريخ</th>
                      <th className="px-4 py-2 text-center text-xs text-slate-500">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.items.map((pay: any) => (
                      <tr key={pay.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono font-bold text-slate-800">{pay.receiptNumber}</td>
                        {groupBy === 'month' && (
                          <>
                            <td className="px-4 py-2">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-xs">{pay.sale?.customer?.name || 'غير معروف'}</span>
                                <span className="text-[10px] text-slate-500 font-mono">كود: {pay.sale?.customer?.bkCode || '-'} | {pay.sale?.machineSerial || '-'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-blue-700">{pay.sale?.customer?.customerType || 'عام'}</span>
                                {pay.sale?.customer?.department && (
                                  <span className="text-[10px] text-slate-500">🏛️ {pay.sale.customer.department}</span>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                        <td className="px-4 py-2 text-xs">
                           {pay.paymentType === 'CASH_SALE' ? 'كامل' : pay.paymentType === 'DOWN_PAYMENT' ? 'مقدم' : 'قسط'}
                        </td>
                        <td className="px-4 py-2 font-bold text-emerald-600">{formatCurrency(pay.amount)}</td>
                        <td className="px-4 py-2 text-slate-500">{formatDate(pay.paidAt)}</td>
                        <td className="px-4 py-2">
                           <div className="flex justify-center gap-2">
                              <button onClick={() => handlePrintReceipt(pay.id)} className="text-blue-600 hover:text-blue-800 text-xs">طباعة</button>
                              <button onClick={() => handleEditClick(pay)} className="text-amber-600 hover:text-amber-800 text-xs">تعديل</button>
                              {canVoid && (
                                <button onClick={() => setVoidingPayment(pay)} className="text-rose-600 hover:text-rose-800 text-xs font-semibold">حذف</button>
                              )}
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {filteredPayments.length === 0 && <EmptyState message={ar.common.noData} />}
        </div>
      )}

      {/* Edit Payment Modal */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => { setShowEditModal(false); setEditingPayment(null); }} 
        title="تعديل بيانات التحصيل"
      >
        {editingPayment && (
          <form onSubmit={handleUpdatePayment} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">رقم الإيداع / الإيصال</label>
              <input
                type="text"
                value={editingPayment.receiptNumber}
                onChange={(e) => setEditingPayment({ ...editingPayment, receiptNumber: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2472]/20 focus:border-[#0A2472]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الإيداع</label>
              <input
                type="date"
                value={editingPayment.paidAt}
                onChange={(e) => setEditingPayment({ ...editingPayment, paidAt: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2472]/20 focus:border-[#0A2472]"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <SecondaryButton type="button" onClick={() => { setShowEditModal(false); setEditingPayment(null); }}>
                إلغاء
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={isUpdating}>
                {isUpdating ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </PrimaryButton>
            </div>
          </form>
        )}
      </Modal>

      {/* Void / Delete Confirmation Modal */}
      {voidingPayment && (
        <Modal
          isOpen={true}
          onClose={() => { if (!isVoiding) { setVoidingPayment(null); setVoidReason(''); } }}
          title="تأكيد حذف / إلغاء الدفعة"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
              <p className="font-bold mb-1">تنبيه هام:</p>
              <p>أنت على وشك حذف الدفعة ذات الإيصال رقم <span className="font-mono font-bold">{voidingPayment.receiptNumber}</span> بمبلغ <span className="font-bold">{formatCurrency(voidingPayment.amount)}</span>.</p>
              <p className="mt-1 text-xs text-rose-700">سيتم عكس أثرها فوراً، وإعادة احتساب المتبقي على العقد، وإلغاء سداد القسط المرتبط بها وتحديث التقارير.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                سبب الحذف / الإلغاء (اختياري)
              </label>
              <input
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="مثال: خطأ في إدخال الإيصال / دفعة ملغاة..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <SecondaryButton
                disabled={isVoiding}
                onClick={() => { setVoidingPayment(null); setVoidReason(''); }}
              >
                إلغاء
              </SecondaryButton>
              <button
                type="button"
                disabled={isVoiding}
                onClick={handleConfirmVoid}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isVoiding ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}