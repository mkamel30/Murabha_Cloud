import { useState } from 'react';
import logo from '@/assets/logo.png';
import { NavLink, Outlet } from 'react-router-dom';
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
  Filter
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isHQ, activeBranches, selectedBranchId, setSelectedBranchId, logout } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canManageUsers = isSuperAdmin || user?.role === 'HQ_MANAGER';

  return (
    <div className="flex h-screen bg-slate-50 font-sans" dir="rtl">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative top-0 right-0 z-50 h-full 
        bg-white border-l border-slate-200 shadow-lg
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        lg:w-auto min-w-[210px] max-w-[260px] flex flex-col justify-between
      `}>
        <div>
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 border-b border-slate-100 px-5">
            <img src={logo} alt="Logo" className="h-9 w-auto" />
            <div>
              <span className="font-black text-slate-800 text-sm tracking-tight block">Smart Murabha</span>
              <span className="text-[10px] font-bold text-[#0A2472] uppercase">Cloud Enterprise</span>
            </div>
          </div>
          
          {/* Nav Items */}
          <nav className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {/* HQ Executive View (if HQ) */}
            {isHQ && (
              <div>
                <p className="px-3 mb-1.5 text-[10px] font-bold text-[#0A2472] uppercase tracking-wider">الإدارة المركزية (HQ)</p>
                <div className="space-y-1">
                  <NavLink
                    to="/hq-dashboard"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                      ${isActive ? 'bg-[#0A2472] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-[#0A2472]'}
                    `}
                  >
                    <Activity size={18} className="shrink-0" />
                    <span>لوحة تحكم HQ المجمعة</span>
                  </NavLink>
                </div>
              </div>
            )}

            {/* Operations Group */}
            <div>
              <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">العمليات اليومية</p>
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
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                      ${isActive ? 'bg-[#0A2472] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-[#0A2472]'}
                    `}
                  >
                    <item.icon size={18} className="shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Finance Group */}
            <div>
              <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">المالية والتحصيل</p>
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
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                      ${isActive ? 'bg-[#0A2472] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-[#0A2472]'}
                    `}
                  >
                    <item.icon size={18} className="shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Admin Management Group */}
            {(canManageUsers || isSuperAdmin) && (
              <div>
                <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">إدارة الفروع والمستخدمين</p>
                <div className="space-y-1">
                  {isSuperAdmin && (
                    <NavLink
                      to="/admin/branches"
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                        ${isActive ? 'bg-[#0A2472] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-[#0A2472]'}
                      `}
                    >
                      <Building2 size={18} className="shrink-0" />
                      <span>إدارة الفروع</span>
                    </NavLink>
                  )}
                  {canManageUsers && (
                    <NavLink
                      to="/admin/users"
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                        ${isActive ? 'bg-[#0A2472] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-[#0A2472]'}
                      `}
                    >
                      <ShieldAlert size={18} className="shrink-0" />
                      <span>المستخدمين والصلاحيات</span>
                    </NavLink>
                  )}
                </div>
              </div>
            )}

            {/* Settings Group */}
            <div>
              <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">النظام</p>
              <div className="space-y-1">
                {[
                  { path: '/import', label: ar.nav.import, icon: FileSpreadsheet },
                  { path: '/settings', label: ar.nav.settings, icon: Settings },
                ].map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                      ${isActive ? 'bg-[#0A2472] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-[#0A2472]'}
                    `}
                  >
                    <item.icon size={18} className="shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>
        </div>

        {/* User Info & Logout at bottom of sidebar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#0A2472]/10 text-[#0A2472] flex items-center justify-center font-bold text-xs">
                <UserIcon size={16} />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-800 truncate">{user?.name || 'مستخدم'}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.branchName || 'HQ'}</div>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-3 right-4 z-30 p-2 bg-white rounded-lg shadow-md lg:hidden"
      >
        <Menu size={20} className="text-slate-600" />
      </button>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-3">
            {isHQ && activeBranches.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl text-xs">
                <Filter size={14} className="text-slate-400" />
                <span className="text-slate-500 font-semibold">عرض فرع:</span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="bg-transparent font-bold text-[#0A2472] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">🏢 كل الفروع (المقر الرئيسي)</option>
                  {activeBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {!isHQ && user?.branchName && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1 rounded-xl border">
                <Building2 size={14} className="text-[#0A2472]" />
                <span className="font-bold text-[#0A2472]">{user.branchName}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="hidden sm:inline">مرحباً، <strong className="text-slate-800">{user?.name}</strong></span>
          </div>
        </header>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet key={selectedBranchId} />
          </div>
        </div>
        
        <Footer />
      </main>
    </div>
  );
}