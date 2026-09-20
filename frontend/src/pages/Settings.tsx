import { useState, useEffect } from 'react';
import { PageHeader } from '@/lib/Actions';
import { Building2, Users, BookOpen, ChevronDown, ChevronUp, Database, SlidersHorizontal, Banknote, CreditCard, Plus, Trash2, Mail, GitMerge, Send, RefreshCw, Save, Percent, FileText, UserCheck } from 'lucide-react';
import OracleMigrationWizard from '@/components/OracleMigrationWizard';
import BranchesManagement from './BranchesManagement';
import UsersManagement from './UsersManagement';
import { useAuth } from '@/context/AuthContext';
import { settingsApi } from '@/api/client';
import { useToast } from '@/lib/toast';

type SettingsTab = 'general' | 'branches' | 'users' | 'email' | 'workflow' | 'oracle' | 'guide';

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canManageUsers = isSuperAdmin || user?.role === 'HQ_MANAGER';

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => canManageUsers ? 'general' : 'guide');
  const [activeHelpTab, setActiveHelpTab] = useState<string | null>(null);
  const [enableCashSales, setEnableCashSales] = useState<boolean>(false);
  const [enableEarlySettlement, setEnableEarlySettlement] = useState<boolean>(true);
  const [earlySettlementDiscountPercent, setEarlySettlementDiscountPercent] = useState<string>('50');
  const [requireKycAttachments, setRequireKycAttachments] = useState<boolean>(false);
  const [requireGuarantor, setRequireGuarantor] = useState<boolean>(false);
  
  const [paymentPlaces, setPaymentPlaces] = useState<string[]>(['Damen', 'البريد', 'البنك']);
  const [newPlaceInput, setNewPlaceInput] = useState<string>('');
  const [loadingSettings, setLoadingSettings] = useState<boolean>(true);
  
  const [savingCashSetting, setSavingCashSetting] = useState<boolean>(false);
  const [savingEarlySettlement, setSavingEarlySettlement] = useState<boolean>(false);
  const [savingKyc, setSavingKyc] = useState<boolean>(false);
  const [savingGuarantor, setSavingGuarantor] = useState<boolean>(false);
  const [savingPlaces, setSavingPlaces] = useState<boolean>(false);

  // Email Settings State
  const [mailSettings, setMailSettings] = useState({
    provider: 'GMAIL',
    host: 'smtp.gmail.com',
    port: 587,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'نظام المرابحة السحابية',
    useTls: true,
    useSsl: false,
    testRecipient: '',
    templateSubject: 'طلب تقسيط جديد بحاجة للاعتماد - {{customerName}}',
    templateBody: `السلام عليكم ورحمة الله وبركاته،<br/><br/>
تم تسجيل طلب تقسيط جديد في النظام بالبيانات التالية:<br/>
<ul>
  <li><b>اسم العميل:</b> {{customerName}}</li>
  <li><b>الفرع:</b> {{branchName}}</li>
  <li><b>إجمالي المبلغ:</b> {{amount}} جنيه</li>
  <li><b>عدد الأشهر:</b> {{months}} شهر</li>
  <li><b>مُقدم الطلب:</b> {{creatorName}}</li>
</ul>
يرجى التكرم بالدخول على النظام لمراجعة الطلب واتخاذ الإجراء اللازم.<br/><br/>
<a href="{{actionUrl}}" style="display:inline-block;padding:10px 20px;background-color:#0A2472;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">الانتقال إلى طلبات التقسيط</a>
<br/><br/>تحياتنا،<br/>إدارة نظام المرابحة السحابية`,
  });
  const [loadingMail, setLoadingMail] = useState(false);
  const [savingMail, setSavingMail] = useState(false);
  const [testingMail, setTestingMail] = useState(false);

  // Workflow Settings State
  const [workflowSettings, setWorkflowSettings] = useState({
    mode: 'TWO_LEVEL',
    thresholdAmount: 15000,
    requireSupervisor: true,
    requireBranchManager: true,
  });
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [savingWorkflow, setSavingWorkflow] = useState(false);

  useEffect(() => {
    if (canManageUsers) {
      settingsApi.getAll()
        .then((data) => {
          if (data && typeof data.enableCashSales === 'boolean') {
            setEnableCashSales(data.enableCashSales);
          }
          if (data && typeof data.enableEarlySettlement === 'boolean') {
            setEnableEarlySettlement(data.enableEarlySettlement);
          }
          if (data && data.earlySettlementDiscountPercent !== undefined) {
            setEarlySettlementDiscountPercent(String(data.earlySettlementDiscountPercent));
          }
          if (data && typeof data.requireKycAttachments === 'boolean') {
            setRequireKycAttachments(data.requireKycAttachments);
          }
          if (data && typeof data.requireGuarantor === 'boolean') {
            setRequireGuarantor(data.requireGuarantor);
          }
          if (data && Array.isArray(data.paymentPlaces)) {
            setPaymentPlaces(data.paymentPlaces);
          }
        })
        .catch((err) => {
          console.error('Failed to load settings:', err);
        })
        .finally(() => setLoadingSettings(false));

      // Fetch Mail Settings
      setLoadingMail(true);
      settingsApi.getMailSettings()
        .then((data) => {
          if (data && data.host) {
            setMailSettings((prev) => ({ ...prev, ...data }));
          }
        })
        .catch((err) => console.error('Failed to load mail settings:', err))
        .finally(() => setLoadingMail(false));

      // Fetch Workflow Settings
      setLoadingWorkflow(true);
      settingsApi.getWorkflowSettings()
        .then((data) => {
          if (data && data.mode) {
            setWorkflowSettings((prev) => ({ ...prev, ...data }));
          }
        })
        .catch((err) => console.error('Failed to load workflow settings:', err))
        .finally(() => setLoadingWorkflow(false));
    }
  }, [canManageUsers]);

  const handleProviderChange = (provider: string) => {
    if (provider === 'GMAIL') {
      setMailSettings(prev => ({
        ...prev,
        provider,
        host: 'smtp.gmail.com',
        port: 587,
        useTls: true,
        useSsl: false,
      }));
    } else if (provider === 'OFFICE365') {
      setMailSettings(prev => ({
        ...prev,
        provider,
        host: 'smtp.office365.com',
        port: 587,
        useTls: true,
        useSsl: false,
      }));
    } else {
      setMailSettings(prev => ({ ...prev, provider }));
    }
  };

  const handleSaveMailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMail(true);
    try {
      await settingsApi.saveMailSettings(mailSettings);
      showToast('تم حفظ إعدادات خادم البريد الإلكتروني بنجاح', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || err.response?.data?.error || 'فشل حفظ إعدادات البريد', 'error');
    } finally {
      setSavingMail(false);
    }
  };

  const handleTestMail = async () => {
    if (!mailSettings.testRecipient) {
      showToast('يرجى كتابة بريد إلكتروني لاستقبال الرسالة التجريبية', 'error');
      return;
    }
    setTestingMail(true);
    try {
      const res = await settingsApi.testMail(mailSettings);
      showToast(res.message || 'تم إرسال البريد التجريبي بنجاح!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || err.response?.data?.error || 'فشل إرسال البريد التجريبي. تحقق من بيانات الخادم أو كلمة المرور', 'error');
    } finally {
      setTestingMail(false);
    }
  };

  const handleSaveWorkflowSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWorkflow(true);
    try {
      await settingsApi.saveWorkflowSettings(workflowSettings);
      showToast('تم حفظ إعدادات دورة الموافقات والاعتمادات بنجاح', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || err.response?.data?.error || 'فشل حفظ إعدادات دورة الاعتماد', 'error');
    } finally {
      setSavingWorkflow(false);
    }
  };

  const handleToggleCashSales = async () => {
    const nextVal = !enableCashSales;
    setSavingCashSetting(true);
    try {
      await settingsApi.update('enableCashSales', nextVal);
      setEnableCashSales(nextVal);
      showToast(nextVal ? 'تم تفعيل ميزة البيع النقدي (الكاش) بنجاح' : 'تم تعطيل ميزة البيع النقدي (الكاش)', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل تحديث إعدادات النظام', 'error');
    } finally {
      setSavingCashSetting(false);
    }
  };

  const handleToggleEarlySettlement = async () => {
    const nextVal = !enableEarlySettlement;
    setSavingEarlySettlement(true);
    try {
      await settingsApi.update('enableEarlySettlement', nextVal);
      setEnableEarlySettlement(nextVal);
      showToast(nextVal ? 'تم تفعيل ميزة السداد المبكر بنجاح' : 'تم تعطيل ميزة السداد المبكر', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل تحديث الإعدادات', 'error');
    } finally {
      setSavingEarlySettlement(false);
    }
  };

  const handleSaveDiscountPercent = async (val: string) => {
    if (!val || isNaN(Number(val))) return;
    try {
      await settingsApi.update('earlySettlementDiscountPercent', val);
      setEarlySettlementDiscountPercent(val);
      showToast('تم حفظ نسبة الخصم للسداد المبكر بنجاح', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل حفظ نسبة الخصم', 'error');
    }
  };

  const handleToggleKycAttachments = async () => {
    const nextVal = !requireKycAttachments;
    setSavingKyc(true);
    try {
      await settingsApi.update('requireKycAttachments', nextVal);
      setRequireKycAttachments(nextVal);
      showToast(nextVal ? 'تم تفعيل إرفاق المستندات (KYC)' : 'تم تعطيل إرفاق المستندات', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل تحديث الإعدادات', 'error');
    } finally {
      setSavingKyc(false);
    }
  };

  const handleToggleGuarantor = async () => {
    const nextVal = !requireGuarantor;
    setSavingGuarantor(true);
    try {
      await settingsApi.update('requireGuarantor', nextVal);
      setRequireGuarantor(nextVal);
      showToast(nextVal ? 'تم تفعيل وجوب وجود ضامن' : 'تم تعطيل وجوب وجود ضامن', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل تحديث الإعدادات', 'error');
    } finally {
      setSavingGuarantor(false);
    }
  };

  const handleAddPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPlaceInput.trim();
    if (!trimmed) return;
    if (paymentPlaces.includes(trimmed)) {
      showToast('جهة الدفع هذه مضافة بالفعل', 'error');
      return;
    }
    const updated = [...paymentPlaces, trimmed];
    setSavingPlaces(true);
    try {
      await settingsApi.update('paymentPlaces', updated);
      setPaymentPlaces(updated);
      setNewPlaceInput('');
      showToast(`تمت إضافة جهة الدفع "${trimmed}" بنجاح`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل حفظ جهة الدفع', 'error');
    } finally {
      setSavingPlaces(false);
    }
  };

  const handleRemovePlace = async (placeToRemove: string) => {
    if (paymentPlaces.length <= 1) {
      showToast('يجب الإبقاء على جهة دفع واحدة على الأقل في النظام', 'error');
      return;
    }
    const updated = paymentPlaces.filter(p => p !== placeToRemove);
    setSavingPlaces(true);
    try {
      await settingsApi.update('paymentPlaces', updated);
      setPaymentPlaces(updated);
      showToast(`تم حذف جهة الدفع "${placeToRemove}" بنجاح`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل حذف جهة الدفع', 'error');
    } finally {
      setSavingPlaces(false);
    }
  };

  const toggleHelpTab = (tab: string) => {
    setActiveHelpTab(activeHelpTab === tab ? null : tab);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12" dir="rtl">
      <PageHeader
        title="إعدادات النظام والإدارة"
        description="إدارة الفروع، حسابات وصلاحيات المستخدمين، والنسخ الاحتياطي وترحيل البيانات"
      />

      {/* Glassmorphic Tabs Switcher */}
      <div className="flex flex-wrap p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl border border-slate-200/50 gap-2 mb-6">
        {canManageUsers && (
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
              activeTab === 'general'
                ? 'bg-[#0A2472] text-white shadow-lg shadow-[#0A2472]/20 scale-[1.02]'
                : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>إعدادات النظام العامة</span>
          </button>
        )}

        {canManageUsers && (
          <button
            type="button"
            onClick={() => setActiveTab('branches')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
              activeTab === 'branches'
                ? 'bg-[#0A2472] text-white shadow-lg shadow-[#0A2472]/20 scale-[1.02]'
                : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>إدارة الفروع</span>
          </button>
        )}

        {canManageUsers && (
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#0A2472] text-white shadow-lg shadow-[#0A2472]/20 scale-[1.02]'
                : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>المستخدمين والصلاحيات</span>
          </button>
        )}

        {canManageUsers && (
          <button
            type="button"
            onClick={() => setActiveTab('workflow')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
              activeTab === 'workflow'
                ? 'bg-[#0A2472] text-white shadow-lg shadow-[#0A2472]/20 scale-[1.02]'
                : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
            }`}
          >
            <GitMerge className="w-4 h-4" />
            <span>دورة الموافقات والاعتماد</span>
          </button>
        )}

        {canManageUsers && (
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
              activeTab === 'email'
                ? 'bg-[#0A2472] text-white shadow-lg shadow-[#0A2472]/20 scale-[1.02]'
                : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>خادم البريد والإشعارات</span>
          </button>
        )}


        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('oracle')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
              activeTab === 'oracle'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20 scale-[1.02]'
                : 'text-amber-700 hover:bg-amber-100/60'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>ترحيل Oracle</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-[#0A2472] text-white shadow-lg shadow-[#0A2472]/20 scale-[1.02]'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>دليل المساعدة</span>
        </button>
      </div>

      {/* Tab: General System Settings */}
      {activeTab === 'general' && canManageUsers && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0A2472] flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">خيارات النظام والسياسات التشغيلية</h2>
                <p className="text-xs text-slate-500">التحكم في الميزات الإضافية التي تظهر للمستخدمين وفِرق العمل</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Feature: Cash Sales Toggle */}
              <div className="p-5 rounded-xl border border-slate-200/70 bg-gradient-to-r from-slate-50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800">ميزة البيع النقدي (الكاش)</h3>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        enableCashSales 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {loadingSettings ? 'جاري التحميل...' : enableCashSales ? 'مفعّل حالياً' : 'معطّل حالياً'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                      عند <strong>التفعيل</strong>، يتيح النظام خيار تسجيل مبيعات الماكينات كاش (سداد كامل وفوري بدون جدول أقساط) مع توفير تقرير وإحصائيات مستقلة لمبيعات الكاش وتصديرها لإكسيل.
                      عند <strong>التعطيل</strong>، يقتصر تسجيل المبيعات على نظام التقسيط فقط.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <button
                    type="button"
                    disabled={loadingSettings || savingCashSetting}
                    onClick={handleToggleCashSales}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                      enableCashSales ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                    title={enableCashSales ? 'انقر للتعطيل' : 'انقر للتفعيل'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        enableCashSales ? 'translate-x-0' : '-translate-x-5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Feature: Early Settlement */}
              <div className="p-5 rounded-xl border border-slate-200/70 bg-gradient-to-r from-slate-50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Percent className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800">ميزة السداد المبكر</h3>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        enableEarlySettlement 
                          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {loadingSettings ? 'جاري التحميل...' : enableEarlySettlement ? 'مفعّل حالياً' : 'معطّل حالياً'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                      عند <strong>التفعيل</strong>، يُسمح للعميل بسداد باقي الأقساط دفعة واحدة مع تطبيق نسبة خصم على الأرباح المتبقية.
                    </p>
                    {enableEarlySettlement && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/50">
                        <span className="text-xs font-bold text-slate-700">نسبة خصم السداد المبكر (%):</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={earlySettlementDiscountPercent}
                          onChange={(e) => setEarlySettlementDiscountPercent(e.target.value)}
                          onBlur={(e) => handleSaveDiscountPercent(e.target.value)}
                          className="w-16 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={loadingSettings}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <button
                    type="button"
                    disabled={loadingSettings || savingEarlySettlement}
                    onClick={handleToggleEarlySettlement}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                      enableEarlySettlement ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                    title={enableEarlySettlement ? 'انقر للتعطيل' : 'انقر للتفعيل'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        enableEarlySettlement ? 'translate-x-0' : '-translate-x-5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Feature: KYC Attachments Toggle */}
              <div className="p-5 rounded-xl border border-slate-200/70 bg-gradient-to-r from-slate-50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800">إلزامية إرفاق المستندات (KYC)</h3>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        requireKycAttachments 
                          ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {loadingSettings ? 'جاري التحميل...' : requireKycAttachments ? 'مفعّل حالياً' : 'معطّل حالياً'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                      عند <strong>التفعيل</strong>، يجب رفع صورة البطاقة الشخصية للعميل وإيصال المرافق وغيرها من المستندات لإتمام تسجيل الطلب.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <button
                    type="button"
                    disabled={loadingSettings || savingKyc}
                    onClick={handleToggleKycAttachments}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                      requireKycAttachments ? 'bg-purple-600' : 'bg-slate-300'
                    }`}
                    title={requireKycAttachments ? 'انقر للتعطيل' : 'انقر للتفعيل'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        requireKycAttachments ? 'translate-x-0' : '-translate-x-5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Feature: Require Guarantor Toggle */}
              <div className="p-5 rounded-xl border border-slate-200/70 bg-gradient-to-r from-slate-50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800">وجوب وجود ضامن</h3>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        requireGuarantor 
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {loadingSettings ? 'جاري التحميل...' : requireGuarantor ? 'مفعّل حالياً' : 'معطّل حالياً'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                      عند <strong>التفعيل</strong>، يشترط النظام تسجيل بيانات ضامن واحد على الأقل للموافقة على طلب التقسيط.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <button
                    type="button"
                    disabled={loadingSettings || savingGuarantor}
                    onClick={handleToggleGuarantor}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                      requireGuarantor ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                    title={requireGuarantor ? 'انقر للتعطيل' : 'انقر للتفعيل'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        requireGuarantor ? 'translate-x-0' : '-translate-x-5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Feature: Payment Places Management */}
              <div className="p-5 rounded-xl border border-slate-200/70 bg-gradient-to-r from-slate-50 to-white space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-[#0A2472] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-base font-bold text-slate-800">أماكن وقنوات الدفع والتحصيل المعتمدة</h3>
                    <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                      تحديد قنوات وأماكن السداد التي تظهر في شاشات تسجيل العقود، الدفعات المقدمة، وسداد الأقساط (مثل: <strong>Damen</strong>، <strong>البريد</strong>، <strong>البنك</strong>، أو أي جهات أخرى مخصصة).
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <span>القنوات المتاحة حالياً:</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {paymentPlaces.map((place) => (
                      <span
                        key={place}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm text-xs font-bold text-slate-800 transition-all hover:border-slate-300"
                      >
                        <span className="text-[#0A2472]">
                          {place === 'Damen' ? '👤' : place === 'البريد' ? '📬' : place === 'البنك' ? '🏦' : '💳'}
                        </span>
                        <span>{place === 'Damen' ? 'ضامن (Damen)' : place}</span>
                        <button
                          type="button"
                          disabled={savingPlaces || paymentPlaces.length <= 1}
                          onClick={() => handleRemovePlace(place)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-0.5 rounded-full hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="حذف جهة الدفع"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <form onSubmit={handleAddPlace} className="flex gap-2 max-w-md pt-2">
                    <input
                      type="text"
                      value={newPlaceInput}
                      onChange={(e) => setNewPlaceInput(e.target.value)}
                      placeholder="اسم جهة الدفع (مثال: محفظة ذكية، البنك الأهلي)..."
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0A2472]/20 focus:border-[#0A2472]"
                      disabled={savingPlaces}
                    />
                    <button
                      type="submit"
                      disabled={savingPlaces || !newPlaceInput.trim()}
                      className="px-4 py-2 bg-[#0A2472] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-[#0A2472]/90 disabled:opacity-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{savingPlaces ? 'جاري الحفظ...' : 'إضافة'}</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Branches Management */}
      {activeTab === 'branches' && canManageUsers && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <BranchesManagement embedded={true} />
        </div>
      )}

      {/* Tab: Users Management */}
      {activeTab === 'users' && canManageUsers && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <UsersManagement embedded={true} />
        </div>
      )}


      {/* Tab: Help Center */}
      {activeTab === 'guide' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Help Guide & Instructions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-5 h-5 text-[#0A2472]" />
              <h2 className="text-lg font-semibold text-slate-800">دليل المساعدة واستخدام البرنامج</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              أهلاً بك في دليل المساعدة السريع لبرنامج **المرابحة الذكية**. يوضح هذا الدليل بالخطوات والرسومات التوضيحية البسيطة كيفية إنجاز العمليات اليومية الأساسية بكفاءة وسرعة.
            </p>

            <div className="space-y-4">
              {/* Card 1: Add Sale */}
              <div className="border border-slate-100 rounded-xl overflow-hidden transition-all shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleHelpTab('addSale')}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 transition-colors text-right cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0A2472] flex items-center justify-center font-bold">
                      ١
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">تسجيل عملية بيع جديدة</h3>
                      <p className="text-xs text-slate-500 mt-0.5">كيفية فتح عقد جديد وتحديد الأقساط والمقدم</p>
                    </div>
                  </div>
                  {activeHelpTab === 'addSale' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {activeHelpTab === 'addSale' && (
                  <div className="p-5 border-t border-slate-100 bg-white space-y-4 animate-in fade-in duration-200">
                    <div className="flex gap-4 flex-wrap md:flex-nowrap items-center justify-between">
                      {/* Step Indicators */}
                      <div className="flex-1 space-y-4 pr-2">
                        <div className="flex gap-3 items-start">
                          <div className="w-5 h-5 rounded-full bg-[#0A2472] text-white flex items-center justify-center text-xs font-black mt-0.5 shadow-sm">1</div>
                          <p className="text-sm text-slate-600 font-semibold">اختر العميل من القائمة (أو أضف عميلاً جديداً أولاً بضغطة زر).</p>
                        </div>
                        <div className="flex gap-3 items-start">
                          <div className="w-5 h-5 rounded-full bg-[#0A2472] text-white flex items-center justify-center text-xs font-black mt-0.5 shadow-sm">2</div>
                          <p className="text-sm text-slate-600 font-semibold">أدخل رقم الماكينة (السيريال) وتاريخ العقد والبيع.</p>
                        </div>
                        <div className="flex gap-3 items-start">
                          <div className="w-5 h-5 rounded-full bg-[#0A2472] text-white flex items-center justify-center text-xs font-black mt-0.5 shadow-sm">3</div>
                          <p className="text-sm text-slate-600 font-semibold">اكتب القيمة الإجمالية للعقد، وقيمة الدفعة الأولى المستلمة فعلياً (المقدم).</p>
                        </div>
                        <div className="flex gap-3 items-start">
                          <div className="w-5 h-5 rounded-full bg-[#0A2472] text-white flex items-center justify-center text-xs font-black mt-0.5 shadow-sm">4</div>
                          <p className="text-sm text-slate-600 font-semibold">حدد عدد أشهر التقسيط، وسيقوم النظام بحساب القسط الشهري تلقائياً.</p>
                        </div>
                      </div>

                      {/* Minimal Diagram */}
                      <div className="w-full md:w-56 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col justify-center text-center">
                        <span className="text-xs font-black text-blue-700 tracking-wider mb-2 uppercase">مخطط دورة العقد</span>
                        <div className="space-y-1.5 text-xs">
                          <div className="p-1.5 bg-white rounded border border-blue-200 font-bold text-slate-700">بيانات العميل والماكينة</div>
                          <div className="text-blue-400 font-bold">⬇️</div>
                          <div className="p-1.5 bg-white rounded border border-blue-200 font-bold text-slate-700">تحديد المقدم والمتبقي</div>
                          <div className="text-blue-400 font-bold">⬇️</div>
                          <div className="p-1.5 bg-emerald-600 text-white rounded font-bold shadow-sm">إنشاء العقد وجدول الأقساط</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Pay Single */}
              <div className="border border-slate-100 rounded-xl overflow-hidden transition-all shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleHelpTab('paySingle')}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 transition-colors text-right cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      ٢
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">تحصيل قسط منفرد</h3>
                      <p className="text-xs text-slate-500 mt-0.5">خطوات سداد قسط محدد لعميل نشط</p>
                    </div>
                  </div>
                  {activeHelpTab === 'paySingle' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {activeHelpTab === 'paySingle' && (
                  <div className="p-5 border-t border-slate-100 bg-white space-y-4 animate-in fade-in duration-200">
                    <div className="flex gap-4 flex-wrap md:flex-nowrap items-center justify-between">
                      <div className="flex-1 space-y-4 pr-2">
                        <div className="flex gap-3 items-start">
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black mt-0.5 shadow-sm">1</div>
                          <p className="text-sm text-slate-600 font-semibold">اذهب لصفحة الأقساط وابحث بكود أو اسم العميل أو السيريال.</p>
                        </div>
                        <div className="flex gap-3 items-start">
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black mt-0.5 shadow-sm">2</div>
                          <p className="text-sm text-slate-600 font-semibold">اضغط على زر "تحصيل" الأخضر المقابل للقسط المطلوب سداده.</p>
                        </div>
                        <div className="flex gap-3 items-start">
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black mt-0.5 shadow-sm">3</div>
                          <p className="text-sm text-slate-600 font-semibold">في النافذة المنبثقة، حدد مكان الدفع (ضامن، البريد، البنك).</p>
                        </div>
                        <div className="flex gap-3 items-start">
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black mt-0.5 shadow-sm">4</div>
                          <p className="text-sm text-slate-600 font-semibold">أدخل رقم الإيصال وتاريخ الدفع الفعلي ثم أكد الدفع.</p>
                        </div>
                      </div>

                      <div className="w-full md:w-56 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col justify-center text-center">
                        <span className="text-xs font-black text-emerald-700 tracking-wider mb-2 uppercase">مخطط التحصيل المنفرد</span>
                        <div className="space-y-1.5 text-xs">
                          <div className="p-1.5 bg-white rounded border border-emerald-200 font-bold text-slate-700">قسط مستحق (غير مدفوع)</div>
                          <div className="text-emerald-400 font-bold">⬇️</div>
                          <div className="p-1.5 bg-white rounded border border-emerald-200 font-bold text-slate-700">إدخال الإيصال ومكان الدفع</div>
                          <div className="text-emerald-400 font-bold">⬇️</div>
                          <div className="p-1.5 bg-teal-600 text-white rounded font-bold shadow-sm">حفظ السداد وتحديث العقد</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: Pay Multiple */}
              <div className="border border-slate-100 rounded-xl overflow-hidden transition-all shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleHelpTab('payMultiple')}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 transition-colors text-right cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      ٣
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">تحصيل مجموعة أقساط معاً</h3>
                      <p className="text-xs text-slate-500 mt-0.5">آلية الدمج وتوزيع المبالغ المدفوعة مسبقاً</p>
                    </div>
                  </div>
                  {activeHelpTab === 'payMultiple' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {activeHelpTab === 'payMultiple' && (
                  <div className="p-5 border-t border-slate-100 bg-white space-y-4 animate-in fade-in duration-200">
                    <div className="flex gap-4 flex-wrap md:flex-nowrap items-center justify-between">
                      <div className="flex-1 space-y-4 pr-2">
                        <div className="flex gap-3 items-start">
                          <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-black mt-0.5 shadow-sm">1</div>
                          <p className="text-sm text-slate-600 font-semibold">اذهب لصفحة العميل أو تفاصيل العقد لمشاهدة الجدول.</p>
                        </div>
                        <div className="flex gap-3 items-start">
                          <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-black mt-0.5 shadow-sm">2</div>
                          <p className="text-sm text-slate-600 font-semibold">تسجيل دفعة تفوق قيمة قسط واحد، يقوم النظام تلقائياً بتوزيع المبلغ بطريقة FIFO (التحصيل التلقائي للأقدم أولاً).</p>
                        </div>
                        <div className="flex gap-3 items-start">
                          <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-black mt-0.5 shadow-sm">3</div>
                          <p className="text-sm text-slate-600 font-semibold">أو حدد أقساطاً معينة يدوياً من قائمة الاختيار المتعدد وتطبيق السداد عليها لتصدر في إيصال واحد مجمع.</p>
                        </div>
                      </div>

                      <div className="w-full md:w-56 p-4 bg-purple-50/50 rounded-xl border border-purple-100 flex flex-col justify-center text-center">
                        <span className="text-xs font-black text-purple-700 tracking-wider mb-2 uppercase">مخطط سداد مجمع (FIFO)</span>
                        <div className="space-y-1 bg-white p-2 rounded border border-purple-200 text-[10px]">
                          <div className="flex justify-between font-bold text-slate-700"><span>المبلغ المجمع</span> <span className="text-purple-600">٢٠٠٠ج</span></div>
                          <div className="w-full h-px bg-slate-100 my-1"></div>
                          <div className="text-right text-slate-500">
                            <p className="text-emerald-600">✔️ قسط ١: ١٠٠٠ج (مغلق)</p>
                            <p className="text-emerald-600">✔️ قسط ٢: ١٠٠٠ج (مغلق)</p>
                            <p className="text-slate-400">⏳ قسط ٣: ١٠٠٠ج (مستحق)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Workflow & Approval Settings */}
      {activeTab === 'workflow' && canManageUsers && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <GitMerge className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">إعدادات مسار الموافقات والاعتمادات للتقسيط</h2>
                <p className="text-xs text-slate-500">تحديد شروط ومستويات موافقة مشرفي ومديري الفروع على طلبات التقسيط</p>
              </div>
            </div>

            {loadingWorkflow ? (
              <div className="p-8 text-center text-xs text-slate-400">جاري تحميل إعدادات دورة الاعتمادات...</div>
            ) : (
            <form onSubmit={handleSaveWorkflowSettings} className="space-y-6">
              {/* Approval Mode Cards */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700">نمط دورة الاعتماد (Approval Mode):</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Mode 1: Two Level */}
                  <div
                    onClick={() => setWorkflowSettings(prev => ({ ...prev, mode: 'TWO_LEVEL' }))}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      workflowSettings.mode === 'TWO_LEVEL'
                        ? 'border-[#0A2472] bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-800">موافقة ثنائية (Two-Level)</span>
                      <input
                        type="radio"
                        name="workflowMode"
                        checked={workflowSettings.mode === 'TWO_LEVEL'}
                        onChange={() => {}}
                        className="text-[#0A2472]"
                      />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      يمر الطلب أولاً على <strong>مشرف خدمة العملاء</strong> للاعتماد المبدئي، ثم ينتقل إلى <strong>مدير الفرع</strong> للاعتماد النهائي.
                    </p>
                  </div>

                  {/* Mode 2: Supervisor Only */}
                  <div
                    onClick={() => setWorkflowSettings(prev => ({ ...prev, mode: 'ONE_LEVEL' }))}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      workflowSettings.mode === 'ONE_LEVEL'
                        ? 'border-[#0A2472] bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-800">مستوى واحد (Supervisor Only)</span>
                      <input
                        type="radio"
                        name="workflowMode"
                        checked={workflowSettings.mode === 'ONE_LEVEL'}
                        onChange={() => {}}
                        className="text-[#0A2472]"
                      />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      بمجرد اعتماد <strong>مشرف خدمة العملاء</strong>، يصبح الطلب معتمداً ومتاحاً فوراً لتسجيل إيصال المقدم وإصدار العقد.
                    </p>
                  </div>

                  {/* Mode 3: Threshold Based */}
                  <div
                    onClick={() => setWorkflowSettings(prev => ({ ...prev, mode: 'THRESHOLD' }))}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      workflowSettings.mode === 'THRESHOLD'
                        ? 'border-[#0A2472] bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-800">مشروط بالسقف المالي (Threshold)</span>
                      <input
                        type="radio"
                        name="workflowMode"
                        checked={workflowSettings.mode === 'THRESHOLD'}
                        onChange={() => {}}
                        className="text-[#0A2472]"
                      />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      الطلبات الأقل من السقف المالي يكتفى فيها باعتماد المشرف، بينما المبالغ الكبيرة تتطلب تلقائياً تصعيداً لمدير الفرع.
                    </p>
                  </div>
                </div>
              </div>

              {/* Threshold Amount Field (Conditional) */}
              {workflowSettings.mode === 'THRESHOLD' && (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <label className="block text-xs font-bold text-amber-900">
                    حد السقف المالي لتصعيد الطلب للمدير (جنيه مصري):
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1000"
                      step="500"
                      value={workflowSettings.thresholdAmount}
                      onChange={(e) => setWorkflowSettings(prev => ({ ...prev, thresholdAmount: Number(e.target.value) }))}
                      className="w-48 px-3 py-2 border border-amber-300 rounded-lg text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-xs text-amber-700">
                      أي طلب بقيمة إجمالية تفوق هذا المبلغ سيتطلب وجوباً موافقة مدير الفرع بعد اعتماد المشرف.
                    </span>
                  </div>
                </div>
              )}

              {/* Toggles */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-700">خيارات متقدمة:</h4>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="requireSupervisor"
                    checked={workflowSettings.requireSupervisor}
                    onChange={(e) => setWorkflowSettings(prev => ({ ...prev, requireSupervisor: e.target.checked }))}
                    className="w-4 h-4 text-[#0A2472] rounded focus:ring-[#0A2472]"
                  />
                  <label htmlFor="requireSupervisor" className="text-xs font-medium text-slate-700 cursor-pointer">
                    تفعيل وجوب مراجعة مشرف خدمة العملاء لجميع طلبات الفرع (موصى به دائماً)
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="requireBranchManager"
                    checked={workflowSettings.requireBranchManager}
                    onChange={(e) => setWorkflowSettings(prev => ({ ...prev, requireBranchManager: e.target.checked }))}
                    className="w-4 h-4 text-[#0A2472] rounded focus:ring-[#0A2472]"
                  />
                  <label htmlFor="requireBranchManager" className="text-xs font-medium text-slate-700 cursor-pointer">
                    تمكين مدير الفرع من اعتماد الطلبات مباشرة أو مراجعتها
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingWorkflow}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0A2472] text-white text-sm font-bold hover:bg-blue-900 transition shadow-md shadow-[#0A2472]/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingWorkflow ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ سياسة الاعتماد</span>
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Tab: Email Server & Notification Settings */}
      {activeTab === 'email' && canManageUsers && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0A2472] flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">إعدادات خادم البريد (SMTP) ونماذج الإشعارات</h2>
                <p className="text-xs text-slate-500">تهيئة إرسال الإيميلات الفورية للمشرفين والمديرين عند إنشاء طلبات تقسيط جديدة</p>
              </div>
            </div>

            {loadingMail ? (
              <div className="p-8 text-center text-xs text-slate-400">جاري تحميل إعدادات خادم البريد...</div>
            ) : (
            <>
            {/* Provider Presets */}
            <div className="mb-6 space-y-2">
              <label className="block text-xs font-bold text-slate-700">مزود البريد الإلكتروني السريع:</label>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'GMAIL', label: 'Gmail / Google Workspace' },
                  { id: 'OFFICE365', label: 'Microsoft 365 / Outlook' },
                  { id: 'CUSTOM', label: 'خادم مخصص (Custom SMTP)' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderChange(p.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      mailSettings.provider === p.id
                        ? 'bg-[#0A2472] text-white border-[#0A2472] shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveMailSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان خادم البريد (Host):</label>
                  <input
                    type="text"
                    required
                    value={mailSettings.host}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="e.g. smtp.gmail.com"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">منفذ الاتصال (Port):</label>
                  <input
                    type="number"
                    required
                    value={mailSettings.port}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, port: Number(e.target.value) }))}
                    placeholder="587 أو 465"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستخدم / البريد (Username):</label>
                  <input
                    type="text"
                    value={mailSettings.username}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="notifications@yourdomain.com"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور / App Password:</label>
                  <input
                    type="password"
                    value={mailSettings.password}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بريد المُرسل (From Email):</label>
                  <input
                    type="email"
                    value={mailSettings.fromEmail}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                    placeholder="noreply@murabhacloud.com"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المُرسل الظاهر (From Name):</label>
                  <input
                    type="text"
                    value={mailSettings.fromName}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, fromName: e.target.value }))}
                    placeholder="نظام المرابحة السحابية"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472]"
                  />
                </div>
              </div>

              {/* TLS / SSL */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={mailSettings.useTls}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, useTls: e.target.checked }))}
                    className="w-4 h-4 text-[#0A2472] rounded"
                  />
                  <span>تفعيل STARTTLS (موصى به للمنفذ 587)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={mailSettings.useSsl}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, useSsl: e.target.checked }))}
                    className="w-4 h-4 text-[#0A2472] rounded"
                  />
                  <span>تفعيل SSL (موصى به للمنفذ 465)</span>
                </label>
              </div>

              {/* Template Editor */}
              <div className="border-t border-slate-200/80 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">قالب رسالة التنبيه بالطلب الجديد (HTML Template)</h3>
                    <p className="text-xs text-slate-500">صيغة الإيميل الذي يصل لمشرف ومدير الفرع فور تسجيل موظف خدمة العملاء لطلب جديد</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الرسالة (Subject):</label>
                  <input
                    type="text"
                    value={mailSettings.templateSubject}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, templateSubject: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">نص الرسالة (يدعم كود HTML):</label>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span>المتغيرات المتاحة:</span>
                      {['{{customerName}}', '{{branchName}}', '{{amount}}', '{{months}}', '{{creatorName}}', '{{actionUrl}}'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setMailSettings(prev => ({ ...prev, templateBody: prev.templateBody + ' ' + tag }))}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono text-[10px] cursor-pointer"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    dir="ltr"
                    value={mailSettings.templateBody}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, templateBody: e.target.value }))}
                    className="w-full p-3 font-mono text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472]"
                  />
                </div>
              </div>

              {/* Save & Test Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                {/* Test Email Box */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="email"
                    placeholder="أدخل بريدك للتجربة"
                    value={mailSettings.testRecipient}
                    onChange={(e) => setMailSettings(prev => ({ ...prev, testRecipient: e.target.value }))}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A2472] w-64"
                  />
                  <button
                    type="button"
                    disabled={testingMail}
                    onClick={handleTestMail}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {testingMail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>إرسال تجريبي</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={savingMail}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0A2472] text-white text-sm font-bold hover:bg-blue-900 transition shadow-md shadow-[#0A2472]/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingMail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ إعدادات البريد والقالب</span>
                </button>
              </div>
            </form>
            </>
            )}
          </div>
        </div>
      )}

      {/* Tab: Oracle Database Migration */}
      {activeTab === 'oracle' && user?.role === 'SUPER_ADMIN' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <OracleMigrationWizard />
        </div>
      )}

    </div>
  );
}