import { useState, useEffect } from 'react';
import { branchesApi } from '../api/client';
import { useToast } from '../lib/toast';
import { LoadingScreen } from '../lib/Spinner';
import { Modal } from '../lib/Modal';
import { PrimaryButton, SecondaryButton, PageHeader } from '../lib/Actions';
import { Building2, Plus, Phone, MapPin, ToggleLeft, ToggleRight, Edit2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export default function BranchesManagement() {
  const { showToast } = useToast();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
  });

  const loadBranches = async () => {
    try {
      setLoading(true);
      const data = await branchesApi.getAll();
      setBranches(data);
    } catch (err: any) {
      showToast('فشل تحميل الفروع', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleOpenCreate = () => {
    setEditingBranch(null);
    setForm({ code: '', name: '', address: '', phone: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (b: any) => {
    setEditingBranch(b);
    setForm({
      code: b.code,
      name: b.name,
      address: b.address || '',
      phone: b.phone || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await branchesApi.update(editingBranch.id, form);
        showToast('تم تحديث بيانات الفرع بنجاح', 'success');
      } else {
        await branchesApi.create(form);
        showToast('تم إنشاء الفرع بنجاح', 'success');
      }
      setShowModal(false);
      loadBranches();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'حدث خطأ أثناء حفظ الفرع', 'error');
    }
  };

  const handleToggleActive = async (b: any) => {
    try {
      const res = await branchesApi.toggleActive(b.id);
      showToast(res.message, 'success');
      loadBranches();
    } catch (err) {
      showToast('فشل تغيير حالة الفرع', 'error');
    }
  };

  if (loading) return <LoadingScreen message="جاري تحميل الفروع..." />;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="إدارة الفروع (Branches)"
          description="إدارة شبكة فروع الشركة، ومتابعة الأداء التشغيلي والمالي لكل فرع بشكل مستقل"
        />
        <PrimaryButton onClick={handleOpenCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>إضافة فرع جديد</span>
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((b) => (
          <div
            key={b.id}
            className={`bg-white rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
              b.isActive ? 'border-slate-200' : 'border-red-200 bg-red-50/20 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0A2472] flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{b.name}</h3>
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {b.code}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(b)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                  title="تعديل الفرع"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleActive(b)}
                  className={`p-1.5 rounded-lg ${b.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                  title={b.isActive ? 'إيقاف الفرع' : 'تفعيل الفرع'}
                >
                  {b.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-500 mb-4">
              {b.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{b.address}</span>
                </div>
              )}
              {b.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{b.phone}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-center">
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[11px] text-slate-400 block mb-1">العملاء</span>
                <span className="text-sm font-bold text-slate-700">{b.customersCount || 0}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[11px] text-slate-400 block mb-1">الموظفين</span>
                <span className="text-sm font-bold text-slate-700">{b.usersCount || 0}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">إجمالي المبيعات:</span>
              <span className="font-bold text-[#0A2472]">{formatCurrency(b.totalSales || 0)}</span>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingBranch ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">كود الفرع (Code)</label>
            <input
              type="text"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="مثال: BR-ALX"
              className="w-full px-3 py-2 border rounded-lg text-sm uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الفرع</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثال: فرع الإسكندرية"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">العنوان</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="عنوان الفرع بالتفصيل"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الهاتف</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="هاتف الفرع للتواصل"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <SecondaryButton type="button" onClick={() => setShowModal(false)}>
              إلغاء
            </SecondaryButton>
            <PrimaryButton type="submit">
              {editingBranch ? 'حفظ التعديلات' : 'إنشاء الفرع'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
