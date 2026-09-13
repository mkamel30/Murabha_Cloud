import { useState, useEffect } from 'react';
import { hqDashboardApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../lib/toast';
import { LoadingScreen } from '../lib/Spinner';
import { PageHeader } from '../lib/Actions';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
  TrendingUp, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  Filter 
} from 'lucide-react';

export default function HQDashboard() {
  const { isHQ, selectedBranchId, setSelectedBranchId } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await hqDashboardApi.getHQStats(selectedBranchId !== 'ALL' ? selectedBranchId : undefined);
      setStats(data);
    } catch (err) {
      showToast('فشل تحميل بيانات لوحة التحكم المركزية', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [selectedBranchId]);

  if (loading) return <LoadingScreen message="جاري إعداد مؤشرات الإدارة العليا..." />;
  if (!stats) return null;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header with Branch Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="لوحة التحكم المركزية للإدارة العليا (HQ Executive)"
          description="متابعة التدفقات النقدية، ومقارنة كفاءة التحصيل، ورصد المتأخرات عبر كافة الفروع"
        />

        {isHQ && stats.branchBenchmarks && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">نطاق العرض:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="text-xs font-bold text-[#0A2472] bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">🏢 جميع الفروع</option>
              {stats.branchBenchmarks
                .filter((b: any) => b.branchCode !== 'HQ')
                .map((b: any) => (
                  <option key={b.branchId} value={b.branchId}>
                    📍 {b.branchName}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Total Sales */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">إجمالي المبيعات التعاقدية</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0A2472] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">{formatCurrency(stats.totalSales)}</div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t pt-2 border-slate-100">
            <span>كاش: {formatCurrency(stats.cashSales)}</span>
            <span>تقسيط: {formatCurrency(stats.installmentSales)}</span>
          </div>
        </div>

        {/* 2. Total Collected */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">إجمالي المتحصلات الفعلية</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{formatCurrency(stats.totalPaid)}</div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t pt-2 border-slate-100">
            <span>تحصيلات اليوم:</span>
            <span className="font-bold text-emerald-700">{formatCurrency(stats.todayCollections)} ({stats.todayPaymentCount})</span>
          </div>
        </div>

        {/* 3. Collection Ratio */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">معدل كفاءة التحصيل الكلي</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">{stats.collectionRatio}%</div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#0A2472] h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats.collectionRatio)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 4. Overdue Debts */}
        <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm bg-red-50/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-red-600">إجمالي المتأخرات المستحقة</span>
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600">{formatCurrency(stats.overdueTotal)}</div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-red-500 border-t pt-2 border-red-100">
            <span>عدد الأقساط المتأخرة:</span>
            <span className="font-bold">{stats.overdueCount} قسط</span>
          </div>
        </div>
      </div>

      {/* Cross-Branch Benchmark Comparison Table */}
      {stats.branchBenchmarks && stats.branchBenchmarks.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base">مقارنة أداء الفروع (Branch Performance Benchmark)</h3>
              <p className="text-xs text-slate-400 mt-0.5">مرتبة حسب أعلى نسبة تحصيل وكفاءة تحصيل المديونيات</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full">
              {stats.branchBenchmarks.length === 1 ? 'فرع تشغيلي واحد' : `${stats.branchBenchmarks.length} فروع نشطة`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4">الترتيب / الفرع</th>
                  <th className="px-6 py-4">العملاء</th>
                  <th className="px-6 py-4">المبيعات الكلية</th>
                  <th className="px-6 py-4">المحصل الفعلي</th>
                  <th className="px-6 py-4">المتبقي</th>
                  <th className="px-6 py-4">المتأخرات</th>
                  <th className="px-6 py-4">نسبة التحصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.branchBenchmarks.map((b: any, index: number) => (
                  <tr key={b.branchId} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0
                              ? 'bg-amber-100 text-amber-800'
                              : index === 1
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-800">{b.branchName}</div>
                          <div className="text-xs font-mono text-slate-400">{b.branchCode}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-600">{b.customerCount}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{formatCurrency(b.totalSales)}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(b.totalPaid)}</td>
                    <td className="px-6 py-4 text-slate-600">{formatCurrency(b.totalRemaining)}</td>
                    <td className="px-6 py-4 text-red-600 font-semibold">{formatCurrency(b.overdueAmount)}</td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-800 w-10 text-left">{b.collectionRatio}%</span>
                        <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              b.collectionRatio >= 75
                                ? 'bg-emerald-500'
                                : b.collectionRatio >= 50
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, b.collectionRatio)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Collections Across All Branches */}
      {stats.recentPayments && stats.recentPayments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 text-base mb-4">أحدث التحصيلات الواردة من الفروع</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.recentPayments.map((p: any) => (
              <div key={p.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-800">{p.customerName}</span>
                  <span className="text-emerald-600">{formatCurrency(p.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>{p.branchName}</span>
                  <span>{formatDate(p.paidAt)}</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  إيصال: {p.receiptNumber}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
