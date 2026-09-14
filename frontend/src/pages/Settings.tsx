import { useState } from 'react';
import { PageHeader } from '@/lib/Actions';
import { Building2, Users, BookOpen, ChevronDown, ChevronUp, Database } from 'lucide-react';
import OracleMigrationWizard from '@/components/OracleMigrationWizard';
import BranchesManagement from './BranchesManagement';
import UsersManagement from './UsersManagement';
import { useAuth } from '@/context/AuthContext';

type SettingsTab = 'branches' | 'users' | 'oracle' | 'guide';

export default function SettingsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canManageUsers = isSuperAdmin || user?.role === 'HQ_MANAGER';

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => canManageUsers ? 'branches' : 'guide');
  const [activeHelpTab, setActiveHelpTab] = useState<string | null>(null);

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

      {/* Tab: Oracle Database Migration */}
      {activeTab === 'oracle' && user?.role === 'SUPER_ADMIN' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <OracleMigrationWizard />
        </div>
      )}

    </div>
  );
}