import { useState, useEffect } from 'react';
import { adminUsersApi, branchesApi } from '../api/client';
import { useToast } from '../lib/toast';
import { LoadingScreen } from '../lib/Spinner';
import { Modal } from '../lib/Modal';
import { PrimaryButton, SecondaryButton, PageHeader } from '../lib/Actions';
import { User, Plus, Key, Building2, CheckCircle2, XCircle, Trash2, ShieldCheck } from 'lucide-react';
import { formatDate } from '../lib/utils';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: 'مدير عام النظام', color: 'bg-red-100 text-red-800' },
  HQ_MANAGER: { label: 'إدارة الشركة (HQ)', color: 'bg-purple-100 text-purple-800' },
  HQ_ACCOUNTANT: { label: 'محاسب عام', color: 'bg-blue-100 text-blue-800' },
  BRANCH_MANAGER: { label: 'مدير فرع', color: 'bg-emerald-100 text-emerald-800' },
  BRANCH_COLLECTOR: { label: 'محصل فرع', color: 'bg-amber-100 text-amber-800' },
  BRANCH_DATA_ENTRY: { label: 'مدخل بيانات فرع', color: 'bg-slate-100 text-slate-800' },
};

export default function UsersManagement({ embedded = false }: { embedded?: boolean }) {
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'BRANCH_COLLECTOR',
    branchId: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, branchesData] = await Promise.all([adminUsersApi.getAll(), branchesApi.getAll()]);
      setUsers(usersData);
      setBranches(branchesData);
    } catch (err) {
      showToast('فشل جلب بيانات المستخدمين والفروع', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminUsersApi.create({
        ...form,
        branchId: form.branchId || null,
      });
      showToast('تم إنشاء المستخدم بنجاح', 'success');
      setShowCreateModal(false);
      setForm({ username: '', name: '', email: '', password: '', role: 'BRANCH_COLLECTOR', branchId: '' });
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل إنشاء المستخدم', 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('كلمة المرور يجب أن لا تقل عن 6 أحرف', 'error');
      return;
    }

    try {
      await adminUsersApi.resetPassword(selectedUser.id, newPassword);
      showToast('تمت إعادة تعيين كلمة المرور بنجاح', 'success');
      setShowResetModal(false);
      setNewPassword('');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل تعيين كلمة المرور', 'error');
    }
  };

  const handleToggleActive = async (u: any) => {
    try {
      const res = await adminUsersApi.toggleActive(u.id);
      showToast(res.message, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل تغيير حالة الحساب', 'error');
    }
  };

  const handleDelete = async (u: any) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${u.name}"؟`)) return;
    try {
      await adminUsersApi.delete(u.id);
      showToast('تم حذف المستخدم بنجاح', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل حذف المستخدم', 'error');
    }
  };

  if (loading) return <LoadingScreen message="جاري تحميل المستخدمين..." />;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {!embedded ? (
          <PageHeader
            title="إدارة المستخدمين والصلاحيات (RBAC)"
            description="إدارة حسابات موظفي الفروع والإدارة العامة، وتحديد الصلاحيات وإعادة تعيين كلمات المرور"
          />
        ) : (
          <div>
            <h3 className="text-lg font-bold text-slate-800">إدارة المستخدمين والصلاحيات</h3>
            <p className="text-xs text-slate-500 mt-0.5">إدارة حسابات موظفي الفروع وتحديد الصلاحيات وإعادة تعيين كلمات المرور</p>
          </div>
        )}
        <PrimaryButton onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>إضافة مستخدم جديد</span>
        </PrimaryButton>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-4">المستخدم</th>
                <th className="px-6 py-4">الدور / الصلاحية</th>
                <th className="px-6 py-4">الفرع</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4">آخر تسجيل دخول</th>
                <th className="px-6 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const roleMeta = ROLE_LABELS[u.role] || { label: u.role, color: 'bg-slate-100 text-slate-800' };
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{u.name}</div>
                          <div className="text-xs font-mono text-slate-400">@{u.username}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleMeta.color}`}>
                        {roleMeta.label}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{u.branch?.name || (u.branchId ? 'غير معروف' : 'المقر الرئيسي (HQ)')}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>نشط</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>موقوف</span>
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      {u.lastLogin ? formatDate(u.lastLogin) : 'لم يسجل دخول بعد'}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setShowResetModal(true);
                          }}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="إعادة تعيين كلمة المرور"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`p-1.5 rounded-lg transition ${
                            u.isActive ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={u.isActive ? 'تجميد الحساب' : 'تنشيط الحساب'}
                        >
                          {u.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="حذف المستخدم"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="إضافة مستخدم جديد">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المستخدم (Login Username)</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="مثال: ahmed.collector"
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">الاسم بالكامل</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثال: أحمد محمود"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">كلمة المرور الأولية</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">الدور الوظيفي والصلاحية</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="BRANCH_COLLECTOR">محصل فرع (تسجيل دفعات ومتابعة)</option>
              <option value="BRANCH_DATA_ENTRY">مدخل بيانات فرع (تسجيل عملاء ومبيعات)</option>
              <option value="BRANCH_MANAGER">مدير فرع (إشراف كامل على الفرع)</option>
              <option value="HQ_ACCOUNTANT">محاسب عام للشركة (مراجعة حسابات كل الفروع)</option>
              <option value="HQ_MANAGER">إدارة عليا (إشراف وداشبورد مجمع)</option>
              <option value="SUPER_ADMIN">مدير نظام عام (Super Admin)</option>
            </select>
          </div>

          {!['SUPER_ADMIN', 'HQ_MANAGER', 'HQ_ACCOUNTANT'].includes(form.role) ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">فرع التشغيل التابع له</label>
              <select
                required
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">-- اختر فرع التشغيل --</option>
                {branches
                  .filter((b) => b.code !== 'HQ' && b.isActive !== false)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-[#0A2472] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0A2472] shrink-0" />
              <span>هذا المستخدم يتبع <strong>الإدارة العامة (المقر الرئيسي)</strong> ويمتلك صلاحيات مركزية، ولا يرتبط بفرع تشغيلي محدد.</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <SecondaryButton type="button" onClick={() => setShowCreateModal(false)}>
              إلغاء
            </SecondaryButton>
            <PrimaryButton type="submit">حفظ المستخدم</PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Modal: Reset Password */}
      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title={`إعادة تعيين كلمة مرور: ${selectedUser?.name}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-xs text-slate-500">
            أدخل كلمة المرور الجديدة للمستخدم <span className="font-bold text-slate-700">@{selectedUser?.username}</span>:
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">كلمة المرور الجديدة</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <SecondaryButton type="button" onClick={() => setShowResetModal(false)}>
              إلغاء
            </SecondaryButton>
            <PrimaryButton type="submit">تحديث كلمة المرور</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
