import { useState, useEffect } from 'react';
import logo from '@/assets/logo.png';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ar } from '@/i18n/ar';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Calendar, 
  CreditCard, 
  UserCheck, 
  BarChart3,
  Menu,
  Settings,
  FileSpreadsheet,
  Activity,
  Building2,
  ShieldAlert,
  LogOut,
  User as UserIcon,
  Filter,
  X,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'مدير عام',
  HQ_MANAGER: 'إدارة HQ',
  HQ_ACCOUNTANT: 'محاسب عام',
  BRANCH_MANAGER: 'مدير فرع',
  BRANCH_COLLECTOR: 'محصل فرع',
  BRANCH_DATA_ENTRY: 'مدخل بيانات',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('murabha_sidebar_collapsed') === 'true';
  });

  const location = useLocation();
  const { user, isHQ, activeBranches, selectedBranchId, setSelectedBranchId, logout } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canManageUsers = isSuperAdmin || user?.role === 'HQ_MANAGER';

  // Automatically close mobile sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('murabha_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden" dir="rtl">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)} 
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static top-0 right-0 z-50 h-full 
        bg-white border-l border-slate-200 shadow-xl lg:shadow-none
        flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 select-none
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-[76px]' : 'w-72 lg:w-64'}
      `}>
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo & Branding Header */}
          <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white relative">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
              <div className="flex items-center gap-2 overflow-hidden">
                <img 
                  src={logo} 
                  alt="Smart Digital Services" 
                  className={`object-contain transition-all duration-200 ${isCollapsed ? 'h-7 w-auto' : 'h-8 max-w-[145px]'}`} 
                />
              </div>

              {!isCollapsed && (
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-50 text-[#0A2472] border border-blue-200/80 shadow-xs shrink-0">
                  v2.0.0
                </span>
              )}

              {/* Mobile Drawer Close Button */}
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden"
                aria-label="إغلاق القائمة"
              >
                <X size={18} />
              </button>
            </div>

            {/* Subtitle & Badge (when expanded) */}
            {!isCollapsed && (
              <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold text-slate-700 text-[11px]">المرابحة السحابية</span>
                </div>
                <span className="text-[9px] font-extrabold text-[#0A2472] uppercase tracking-wider bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/60">
                  Enterprise
                </span>
              </div>
            )}
          </div>
          
          {/* Nav Items */}
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]">
            {/* HQ Executive View */}
            {isHQ && (
              <div>
                {!isCollapsed && (
                  <p className="px-3 mb-1.5 text-[10px] font-bold text-[#0A2472] uppercase tracking-wider">
                    الإدارة المركزية (HQ)
                  </p>
                )}
                <div className="space-y-1">
                  <NavLink
                    to="/hq-dashboard"
                    title={isCollapsed ? 'لوحة تحكم HQ المجمعة' : undefined}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                      ${isCollapsed ? 'justify-center px-2' : ''}
                      ${isActive 
                        ? 'bg-[#0A2472] text-white shadow-md shadow-[#0A2472]/20 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2472] font-medium'
                      }
                    `}
                  >
                    <Activity size={18} className="shrink-0 text-amber-500" />
                    {!isCollapsed && <span className="truncate">لوحة تحكم HQ المجمعة</span>}
                  </NavLink>
                </div>
              </div>
            )}

            {/* Daily Operations Group */}
            <div>
              {!isCollapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  العمليات اليومية
                </p>
              )}
              <div className="space-y-1">
                {[
                  { path: '/dashboard', label: ar.nav.dashboard, icon: LayoutDashboard },
                  { path: '/customers', label: ar.nav.customers, icon: Users },
                  { path: '/sales', label: ar.nav.sales, icon: ShoppingCart },
                  { path: '/followups', label: ar.nav.followUps, icon: UserCheck },
                ].map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.label : undefined}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                      ${isCollapsed ? 'justify-center px-2' : ''}
                      ${isActive 
                        ? 'bg-[#0A2472] text-white shadow-md shadow-[#0A2472]/20 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2472] font-medium'
                      }
                    `}
                  >
                    <item.icon size={18} className="shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Finance Group */}
            <div>
              {!isCollapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  المالية والتحصيل
                </p>
              )}
              <div className="space-y-1">
                {[
                  { path: '/installments', label: ar.nav.installments, icon: Calendar },
                  { path: '/payments', label: ar.nav.payments, icon: CreditCard },
                  { path: '/reports', label: ar.nav.reports, icon: BarChart3 },
                  { path: '/analytics', label: ar.nav.analytics, icon: Activity },
                ].map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.label : undefined}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                      ${isCollapsed ? 'justify-center px-2' : ''}
                      ${isActive 
                        ? 'bg-[#0A2472] text-white shadow-md shadow-[#0A2472]/20 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2472] font-medium'
                      }
                    `}
                  >
                    <item.icon size={18} className="shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Admin Management Group */}
            {(canManageUsers || isSuperAdmin) && (
              <div>
                {!isCollapsed && (
                  <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    إدارة الفروع والمستخدمين
                  </p>
                )}
                <div className="space-y-1">
                  {isSuperAdmin && (
                    <NavLink
                      to="/admin/branches"
                      title={isCollapsed ? 'إدارة الفروع' : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                        ${isCollapsed ? 'justify-center px-2' : ''}
                        ${isActive 
                          ? 'bg-[#0A2472] text-white shadow-md shadow-[#0A2472]/20 font-semibold' 
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2472] font-medium'
                        }
                      `}
                    >
                      <Building2 size={18} className="shrink-0" />
                      {!isCollapsed && <span className="truncate">إدارة الفروع</span>}
                    </NavLink>
                  )}
                  {canManageUsers && (
                    <NavLink
                      to="/admin/users"
                      title={isCollapsed ? 'المستخدمين والصلاحيات' : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                        ${isCollapsed ? 'justify-center px-2' : ''}
                        ${isActive 
                          ? 'bg-[#0A2472] text-white shadow-md shadow-[#0A2472]/20 font-semibold' 
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2472] font-medium'
                        }
                      `}
                    >
                      <ShieldAlert size={18} className="shrink-0" />
                      {!isCollapsed && <span className="truncate">المستخدمين والصلاحيات</span>}
                    </NavLink>
                  )}
                </div>
              </div>
            )}

            {/* System Group */}
            <div>
              {!isCollapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  النظام
                </p>
              )}
              <div className="space-y-1">
                {[
                  { path: '/import', label: ar.nav.import, icon: FileSpreadsheet },
                  { path: '/settings', label: ar.nav.settings, icon: Settings },
                ].map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.label : undefined}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                      ${isCollapsed ? 'justify-center px-2' : ''}
                      ${isActive 
                        ? 'bg-[#0A2472] text-white shadow-md shadow-[#0A2472]/20 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2472] font-medium'
                      }
                    `}
                  >
                    <item.icon size={18} className="shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>
        </div>

        {/* User Info & Logout at bottom of sidebar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2 p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-[#0A2472]/10 text-[#0A2472] flex items-center justify-center font-bold text-xs shrink-0">
                <UserIcon size={16} />
              </div>
              {!isCollapsed && (
                <div className="truncate text-right">
                  <div className="text-xs font-bold text-slate-800 truncate">{user?.name || 'مستخدم'}</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate">
                    <span className="truncate">{user?.branchName || 'المقر الرئيسي'}</span>
                    <span>•</span>
                    <span className="text-[#0A2472] font-semibold">
                      {ROLE_LABELS[user?.role || ''] || user?.role || ''}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                title="تسجيل الخروج"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-x-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200/80 flex items-center justify-between px-3 sm:px-6 shadow-xs z-10 shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-slate-600 hover:text-[#0A2472] hover:bg-slate-100 rounded-xl lg:hidden cursor-pointer"
              title="فتح القائمة الجانبية"
              aria-label="القائمة الجانبية"
            >
              <Menu size={20} />
            </button>

            {/* Desktop Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden lg:flex p-2 text-slate-400 hover:text-[#0A2472] hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title={isCollapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
            >
              {isCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
            </button>

            {/* Branch Filter Switcher (HQ) */}
            {isHQ && activeBranches.length > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200/80 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs shadow-2xs">
                <Filter size={13} className="text-slate-400 shrink-0" />
                <span className="text-slate-500 font-semibold hidden md:inline shrink-0">عرض فرع:</span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="bg-transparent font-bold text-[#0A2472] focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[180px] md:max-w-[220px] truncate text-xs"
                >
                  <option value="ALL">🏢 كل الفروع (HQ)</option>
                  {activeBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Branch Badge (Non-HQ users) */}
            {!isHQ && user?.branchName && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <Building2 size={13} className="text-[#0A2472] shrink-0" />
                <span className="font-bold text-[#0A2472] truncate max-w-[140px] sm:max-w-none">{user.branchName}</span>
              </div>
            )}
          </div>

          {/* User Status / Greeting */}
          <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
            <span className="hidden sm:inline">
              مرحباً، <strong className="text-slate-800">{user?.name}</strong>
            </span>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 sm:hidden">
              v2.0.0
            </span>
          </div>
        </header>
        
        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet key={selectedBranchId} />
          </div>
        </div>
        
        {/* System Footer */}
        <Footer />
      </main>
    </div>
  );
}