import { useState } from 'react';
import { oracleMigrationApi } from '../api/client';
import { useToast } from '../lib/toast';
import { PrimaryButton, SecondaryButton } from '../lib/Actions';
import { Database, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export default function OracleMigrationWizard() {
  const { showToast } = useToast();
  const [oracleConfig, setOracleConfig] = useState({
    host: 'localhost',
    port: 1521,
    serviceName: 'FREEPDB1',
    username: 'SYSTEM',
    password: '',
  });

  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; version?: string } | null>(null);
  const [schemaProvisioned, setSchemaProvisioned] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  const [loadingTest, setLoadingTest] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [loadingMigration, setLoadingMigration] = useState(false);

  const handleTestConnection = async () => {
    setLoadingTest(true);
    setTestResult(null);
    try {
      const res = await oracleMigrationApi.testConnection({
        ...oracleConfig,
        port: Number(oracleConfig.port),
      });
      setTestResult(res);
      if (res.success) {
        showToast('تم الاتصال بنجاح بقاعدة أوراكل', 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.response?.data?.error || err.message });
      showToast('فشل اختبار الاتصال', 'error');
    } finally {
      setLoadingTest(false);
    }
  };

  const handleProvisionSchema = async () => {
    setLoadingSchema(true);
    try {
      const res = await oracleMigrationApi.provisionSchema({
        ...oracleConfig,
        port: Number(oracleConfig.port),
      });
      setSchemaProvisioned(true);
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل توليد جداول أوراكل', 'error');
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleMigrateData = async () => {
    if (!window.confirm('هل أنت متأكد من بدء ترحيل كافة البيانات من PostgreSQL إلى Oracle الآن؟')) return;

    setLoadingMigration(true);
    setMigrationResult(null);
    try {
      const res = await oracleMigrationApi.migrateData({
        ...oracleConfig,
        port: Number(oracleConfig.port),
      });
      setMigrationResult(res);
      if (res.success) {
        showToast('تم ترحيل البيانات وتدقيق الأرصدة بنجاح 100%!', 'success');
      } else {
        showToast('اكتمل الترحيل مع وجود فروق يرجى مراجعتها أدناه', 'warning');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'فشل ترحيل البيانات', 'error');
    } finally {
      setLoadingMigration(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6" dir="rtl">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-base">معالج الترحيل الآلي إلى Oracle Database</h3>
          <p className="text-xs text-slate-500">
            أداة آلية لاختبار الاتصال بأوراكل، وتوليد الجداول، ونقل كافة الفروع والمبيعات والأقساط وتدقيق مطابقتها
          </p>
        </div>
      </div>

      {/* Step 1: Oracle Connection Config */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">1. بيانات الاتصال بقاعدة بيانات أوراكل</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">خادم أوراكل (Host / IP)</label>
            <input
              type="text"
              value={oracleConfig.host}
              onChange={(e) => setOracleConfig({ ...oracleConfig, host: e.target.value })}
              placeholder="مثال: localhost أو 192.168.1.100"
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">المنفذ (Port)</label>
            <input
              type="number"
              value={oracleConfig.port}
              onChange={(e) => setOracleConfig({ ...oracleConfig, port: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">اسم الخدمة (Service Name / SID)</label>
            <input
              type="text"
              value={oracleConfig.serviceName}
              onChange={(e) => setOracleConfig({ ...oracleConfig, serviceName: e.target.value })}
              placeholder="مثال: FREEPDB1 أو ORCL"
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">اسم المستخدم (User / Schema)</label>
            <input
              type="text"
              value={oracleConfig.username}
              onChange={(e) => setOracleConfig({ ...oracleConfig, username: e.target.value })}
              placeholder="مثال: SYSTEM أو MURABHA_APP"
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">كلمة المرور</label>
            <input
              type="password"
              value={oracleConfig.password}
              onChange={(e) => setOracleConfig({ ...oracleConfig, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            />
          </div>

          <div className="flex items-end">
            <SecondaryButton
              onClick={handleTestConnection}
              disabled={loadingTest}
              className="w-full py-2.5 flex items-center justify-center gap-2"
            >
              {loadingTest ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>اختبار الاتصال بأوراكل</span>
                </>
              )}
            </SecondaryButton>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-3 ${
              testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {testResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <div>
              <p className="font-bold">{testResult.message}</p>
              {testResult.version && <p className="font-mono text-[11px] mt-0.5">{testResult.version}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: DDL Schema Provisioning */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800">2. توليد الجداول والقيود في أوراكل (Auto DDL)</h4>
          <p className="text-xs text-slate-500">يقوم بإنشاء كافة الجداول (Branches, Users, Sales...) بنفس المعايير المتوافقة</p>
        </div>
        <PrimaryButton
          onClick={handleProvisionSchema}
          disabled={loadingSchema || !testResult?.success}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          {loadingSchema ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          <span>{schemaProvisioned ? 'تم إنشاء الجداول (إعادة التوليد)' : 'توليد الجداول الآن'}</span>
        </PrimaryButton>
      </div>

      {/* Step 3: Data Migration & Financial Audit */}
      <div className="pt-4 border-t border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800">3. ترحيل البيانات الحالية والتحقق المالي المزدوج</h4>
            <p className="text-xs text-slate-500">
              يقوم بنسخ البيانات دفعة واحدة وفحص تطابق مبالغ المبيعات والتحصيلات في أوراكل بنسبة 100%
            </p>
          </div>
          <button
            onClick={handleMigrateData}
            disabled={loadingMigration || !testResult?.success}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loadingMigration ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>بدء الترحيل الشامل والتدقيق</span>
          </button>
        </div>

        {migrationResult && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
              <span className="font-bold text-slate-700">نتيجة تدقيق الترحيل:</span>
              <span className="text-slate-500 font-mono">المدة: {(migrationResult.durationMs / 1000).toFixed(2)} ثانية</span>
            </div>

            {/* Financial verification badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className={`p-3 rounded-lg border text-xs ${
                  migrationResult.financialAudit.salesMatched ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="font-bold mb-1">
                  {migrationResult.financialAudit.salesMatched ? '✅ مطابقة إجمالي المبيعات' : '❌ اختلاف في المبيعات'}
                </div>
                <div className="text-[11px]">الأصل: {formatCurrency(migrationResult.financialAudit.sourceTotalSales)}</div>
                <div className="text-[11px]">أوراكل: {formatCurrency(migrationResult.financialAudit.targetTotalSales)}</div>
              </div>

              <div
                className={`p-3 rounded-lg border text-xs ${
                  migrationResult.financialAudit.paymentsMatched ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="font-bold mb-1">
                  {migrationResult.financialAudit.paymentsMatched ? '✅ مطابقة إجمالي التحصيلات' : '❌ اختلاف في التحصيلات'}
                </div>
                <div className="text-[11px]">الأصل: {formatCurrency(migrationResult.financialAudit.sourceTotalPayments)}</div>
                <div className="text-[11px]">أوراكل: {formatCurrency(migrationResult.financialAudit.targetTotalPayments)}</div>
              </div>
            </div>

            {/* Table row counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-xs">
              {migrationResult.auditResults.map((t: any) => (
                <div key={t.table} className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">{t.table}</span>
                  <span className="font-bold text-slate-700">
                    {t.targetCount} / {t.sourceCount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
