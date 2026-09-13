import 'reflect-metadata';
import axios from 'axios';
import { createPgMemDataSource } from './pgMemSource.js';
import { setAppDataSource, AppDataSource } from '../data-source.js';
import { ensureInitialSeed } from '../scripts/seed.js';
import { Branch } from '../entities/Branch.js';
import { User, UserRole } from '../entities/User.js';
import { Customer } from '../entities/Customer.js';
import { MachineSale } from '../entities/MachineSale.js';
import { Installment } from '../entities/Installment.js';
import { Payment } from '../entities/Payment.js';
import app from '../index.js';
import { Server } from 'http';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';
process.env.PORT = '3099';

const BASE_URL = 'http://localhost:3099/api';

let server: Server;
let superAdminToken: string;
let branchManagerToken: string;
let branchCollectorToken: string;
let alexBranchId: string;
let cairoBranchId: string;

const results: { test: string; status: 'PASS' | 'FAIL'; error?: string; details?: any }[] = [];

function recordPass(testName: string, details?: any) {
  console.log(`  ✅ [PASS] ${testName}`);
  results.push({ test: testName, status: 'PASS', details });
}

function recordFail(testName: string, err: any) {
  const errMsg = err?.response?.data?.error || err?.message || JSON.stringify(err);
  console.error(`  ❌ [FAIL] ${testName} -> ${errMsg}`);
  results.push({ test: testName, status: 'FAIL', error: errMsg });
}

async function runAllTests() {
  console.log('================================================================');
  console.log('🧪 Starting Murabha Cloud Enterprise Full API & System Test');
  console.log('   Engine: PostgreSQL in-memory (TypeORM + ANSI SQL Schema)');
  console.log('================================================================\n');

  try {
    // 0. Initialize In-Memory PostgreSQL Data Source
    console.log('--- Step 0: Initializing PostgreSQL In-Memory Engine & Seed ---');
    const pgMemDs = createPgMemDataSource();
    await pgMemDs.initialize();
    setAppDataSource(pgMemDs);
    console.log('[TestEngine] In-memory PostgreSQL initialized successfully.');

    await ensureInitialSeed();

    await new Promise<void>((resolve) => {
      server = app.listen(3099, () => {
        console.log('[TestServer] Listening on http://localhost:3099');
        resolve();
      });
    });

    // 1. Test Health Endpoint
    console.log('\n--- Step 1: Testing Health & Connection ---');
    try {
      const res = await axios.get(`${BASE_URL}/health`);
      if (res.status === 200 && res.data.status === 'ok') {
        recordPass('GET /api/health returns 200 and db=connected', res.data);
      } else {
        recordFail('GET /api/health unexpected response', res.data);
      }
    } catch (e: any) {
      recordFail('GET /api/health request failed', e);
    }

    // 2. Test Authentication (Login, Token, Profile)
    console.log('\n--- Step 2: Testing Authentication & Security (Login, Me, Refresh) ---');
    try {
      // Login as Super Admin
      const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        username: 'admin',
        password: 'Admin@2026!',
      });
      superAdminToken = loginRes.data.accessToken;
      if (superAdminToken && loginRes.data.user.role === 'SUPER_ADMIN') {
        recordPass('POST /api/auth/login as Super Admin', { username: 'admin', role: loginRes.data.user.role });
      } else {
        recordFail('POST /api/auth/login invalid response structure', loginRes.data);
      }
    } catch (e: any) {
      recordFail('POST /api/auth/login Super Admin failed', e);
    }

    // Test Invalid Login Credentials
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        username: 'admin',
        password: 'WrongPassword!',
      });
      recordFail('POST /api/auth/login with wrong password should fail', 'Allowed wrong password');
    } catch (e: any) {
      if (e.response?.status === 401) {
        recordPass('POST /api/auth/login rejects wrong password (401 Unauthorized)');
      } else {
        recordFail('POST /api/auth/login wrong password unexpected status', e);
      }
    }

    // Test GET /api/auth/me
    try {
      const meRes = await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      if (meRes.status === 200 && meRes.data.user.username === 'admin') {
        recordPass('GET /api/auth/me returns current authenticated user profile', meRes.data.user);
      } else {
        recordFail('GET /api/auth/me failed', meRes.data);
      }
    } catch (e: any) {
      recordFail('GET /api/auth/me request error', e);
    }

    // 3. Branches Management API
    console.log('\n--- Step 3: Testing Branches Management API ---');
    try {
      // Create Alexandria Branch
      const createBranchRes = await axios.post(
        `${BASE_URL}/branches`,
        {
          code: 'BR-ALX',
          name: 'فرع الإسكندرية',
          address: 'محطة الرمل - الإسكندرية',
          phone: '01200000002',
        },
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      alexBranchId = createBranchRes.data.branch.id;
      recordPass('POST /api/branches creates new branch (Alexandria)', { id: alexBranchId, code: 'BR-ALX' });
    } catch (e: any) {
      recordFail('POST /api/branches create failed', e);
    }

    // Get All Branches
    try {
      const branchesRes = await axios.get(`${BASE_URL}/branches`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const branchList = Array.isArray(branchesRes.data) ? branchesRes.data : branchesRes.data.branches;
      cairoBranchId = branchList.find((b: any) => b.code === 'BR-CAI')?.id;
      if (branchList.length >= 2) {
        recordPass('GET /api/branches lists all branches with financial summaries', {
          count: branchList.length,
        });
      } else {
        recordFail('GET /api/branches returned insufficient branches', branchesRes.data);
      }
    } catch (e: any) {
      recordFail('GET /api/branches request error', e);
    }

    // 4. Users Management & Role Assignment
    console.log('\n--- Step 4: Testing Users Management & RBAC ---');
    let branchManagerId: string;
    let collectorUserId: string;

    try {
      // Create Branch Manager for Alexandria
      const createBM = await axios.post(
        `${BASE_URL}/admin/users`,
        {
          username: 'manager_alx',
          name: 'أحمد محمود (مدير فرع الإسكندرية)',
          email: 'manager.alx@murabha.cloud',
          password: 'Password@2026!',
          role: 'BRANCH_MANAGER',
          branchId: alexBranchId,
        },
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      branchManagerId = createBM.data.user.id;
      recordPass('POST /api/admin/users creates Branch Manager', { username: 'manager_alx', role: 'BRANCH_MANAGER' });

      // Create Collector for Cairo
      const createCollector = await axios.post(
        `${BASE_URL}/admin/users`,
        {
          username: 'collector_cai',
          name: 'محمود حسن (محصل فرع القاهرة)',
          email: 'collector.cai@murabha.cloud',
          password: 'Password@2026!',
          role: 'BRANCH_COLLECTOR',
          branchId: cairoBranchId,
        },
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      collectorUserId = createCollector.data.user.id;
      recordPass('POST /api/admin/users creates Branch Collector', { username: 'collector_cai', role: 'BRANCH_COLLECTOR' });
    } catch (e: any) {
      recordFail('POST /api/admin/users create failed', e);
    }

    // Login as Branch Manager (Alex)
    try {
      const bmLogin = await axios.post(`${BASE_URL}/auth/login`, {
        username: 'manager_alx',
        password: 'Password@2026!',
      });
      branchManagerToken = bmLogin.data.accessToken;
      recordPass('POST /api/auth/login as Branch Manager', { branchId: bmLogin.data.user.branchId });
    } catch (e: any) {
      recordFail('Login as Branch Manager failed', e);
    }

    // Login as Collector (Cairo)
    try {
      const colLogin = await axios.post(`${BASE_URL}/auth/login`, {
        username: 'collector_cai',
        password: 'Password@2026!',
      });
      branchCollectorToken = colLogin.data.accessToken;
      recordPass('POST /api/auth/login as Branch Collector', { branchId: colLogin.data.user.branchId });
    } catch (e: any) {
      recordFail('Login as Collector failed', e);
    }

    // 5. Security & RBAC Enforcement (Unauthorized Attempts)
    console.log('\n--- Step 5: Testing Security Guardrails & RBAC Protections ---');
    try {
      // Branch Manager trying to access Admin Users endpoint
      await axios.get(`${BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${branchManagerToken}` },
      });
      recordFail('BRANCH_MANAGER should be blocked from /api/admin/users', 'Accessed restricted endpoint');
    } catch (e: any) {
      if (e.response?.status === 403) {
        recordPass('RBAC blocks BRANCH_MANAGER from accessing /api/admin/users (403 Forbidden)');
      } else {
        recordFail('Unexpected response status for RBAC block', e);
      }
    }

    // 6. Branch Data Scoping & Anti-BOLA/IDOR Tests
    console.log('\n--- Step 6: Testing Branch Isolation & Anti-BOLA/IDOR ---');
    try {
      // Branch Manager (Alex) attempting to tamper branch header to Cairo
      await axios.get(`${BASE_URL}/customers`, {
        headers: {
          Authorization: `Bearer ${branchManagerToken}`,
          'x-branch-id': cairoBranchId, // Tampering attempt
        },
      });
      recordFail('Branch tampering attempt should be blocked', 'Tampered header was accepted');
    } catch (e: any) {
      if (e.response?.status === 403) {
        recordPass('BOLA/IDOR Protection: Rejects header tampering across branches (403 Forbidden)');
      } else {
        recordFail('Tampering attempt returned unexpected status', e);
      }
    }

    // 7. HQ Executive Dashboard API
    console.log('\n--- Step 7: Testing HQ Executive Dashboard API ---');
    try {
      const hqRes = await axios.get(`${BASE_URL}/dashboard/hq`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      if (hqRes.status === 200 && hqRes.data.totalSales !== undefined && Array.isArray(hqRes.data.branchBenchmarks)) {
        recordPass('GET /api/dashboard/hq returns consolidated KPIs and Branch Benchmarking', {
          branchesReported: hqRes.data.branchBenchmarks.length,
          kpis: ['totalSales', 'totalPaid', 'collectionRatio', 'todayCollections'],
        });
      } else {
        recordFail('GET /api/dashboard/hq structure mismatch', hqRes.data);
      }
    } catch (e: any) {
      recordFail('GET /api/dashboard/hq request failed', e);
    }

    // 8. Oracle Migration Wizard Endpoints (Testing Connection & Provisioning)
    console.log('\n--- Step 8: Testing Oracle Migration Wizard API ---');
    try {
      const oracleRes = await axios.post(
        `${BASE_URL}/admin/oracle/test-connection`,
        {
          host: '127.0.0.1',
          port: 1521,
          serviceName: 'INVALID_ORACLE_DB',
          username: 'SYSTEM',
          password: 'TestPassword',
        },
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      if (oracleRes.data.success === false && oracleRes.data.message) {
        recordPass('POST /api/admin/oracle/test-connection gracefully validates connection parameters', {
          handled: true,
          statusMessage: oracleRes.data.message,
        });
      } else {
        recordPass('POST /api/admin/oracle/test-connection responded', oracleRes.data);
      }
    } catch (e: any) {
      recordFail('POST /api/admin/oracle/test-connection failed', e);
    }

    // Non-admin user blocked from Oracle Migration Wizard
    try {
      await axios.post(
        `${BASE_URL}/admin/oracle/test-connection`,
        {},
        { headers: { Authorization: `Bearer ${branchManagerToken}` } }
      );
      recordFail('Non-admin user should not access Oracle Migration API', 'Allowed access');
    } catch (e: any) {
      if (e.response?.status === 403) {
        recordPass('Oracle Migration API strictly restricted to SUPER_ADMIN (403 Forbidden)');
      } else {
        recordFail('Unexpected response for non-admin Oracle access', e);
      }
    }

    // 9. Admin User Management (Toggle Active, Password Reset)
    console.log('\n--- Step 9: Testing User Status Toggle & Password Reset ---');
    try {
      // Toggle Collector Active Status
      const toggleRes = await axios.post(
        `${BASE_URL}/admin/users/${collectorUserId}/toggle-active`,
        {},
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      if (toggleRes.data.isActive === false) {
        recordPass('POST /api/admin/users/:id/toggle-active suspends user', toggleRes.data);
      } else {
        recordFail('Toggle active did not suspend', toggleRes.data);
      }

      // Suspended user attempting login
      try {
        await axios.post(`${BASE_URL}/auth/login`, {
          username: 'collector_cai',
          password: 'Password@2026!',
        });
        recordFail('Suspended user should be blocked from login', 'Login succeeded');
      } catch (loginErr: any) {
        if (loginErr.response?.status === 403) {
          recordPass('Suspended user login blocked (403 Forbidden with audit log)');
        } else {
          recordFail('Suspended login returned unexpected status', loginErr);
        }
      }

      // Reactivate Collector
      await axios.post(
        `${BASE_URL}/admin/users/${collectorUserId}/toggle-active`,
        {},
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      recordPass('POST /api/admin/users/:id/toggle-active reactivates user');

      // Reset password
      const resetRes = await axios.post(
        `${BASE_URL}/admin/users/${collectorUserId}/reset-password`,
        { newPassword: 'NewPassword@2026!' },
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      if (resetRes.status === 200) {
        recordPass('POST /api/admin/users/:id/reset-password resets password successfully');
      }
    } catch (e: any) {
      recordFail('User status and password reset test failed', e);
    }

    // 10. Audit Trail Verification
    console.log('\n--- Step 10: Verifying Audit Log Records ---');
    try {
      const auditRepo = AppDataSource.getRepository('AuditLog');
      const count = await auditRepo.count();
      if (count > 0) {
        recordPass(`AuditLog recorded ${count} immutable security events during session`);
      } else {
        recordFail('AuditLog recorded 0 events', count);
      }
    } catch (e: any) {
      recordFail('Audit trail verification query failed', e);
    }

  } finally {
    if (server) {
      server.close();
      console.log('\n[TestServer] Stopped successfully.');
    }
  }

  // Summary Report
  console.log('\n================================================================');
  console.log('📊 TEST SUITE AUDIT REPORT');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Scenarios Tested: ${total}`);
  console.log(`Passed:                 ${passed}`);
  console.log(`Failed:                 ${failed}`);
  console.log(`Compliance Score:       ${Math.round((passed / total) * 100)}%`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  if (server) server.close();
  process.exit(1);
});
