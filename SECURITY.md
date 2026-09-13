# Security & Penetration Testing Guide

This guide outlines the security controls, authentication mechanisms, and defenses implemented in **Murabha Cloud**, designed to assist external penetration testing teams and security auditors during comprehensive vulnerability assessments.

---

## 🛡️ Executive Security Summary

Murabha Cloud is engineered following the principle of **defense-in-depth** and aligns with the **OWASP Top 10** standards:

| Security Vector | Implementation Detail |
|:---|:---|
| **Authentication** | JWT (short-lived) + HttpOnly Refresh Cookies |
| **Password Hashing** | Salted `bcryptjs` (Cost Factor: 12) |
| **Access Control** | Strict RBAC + Anti-BOLA/IDOR Middleware |
| **Data Integrity** | Parameterized queries via TypeORM (Zero raw SQL concatenation) |
| **Tamper Detection** | Immutable audit trail (`AuditLog`) logging IPs & user agents |
| **Privileged Safeguards** | TOTP-based MFA verification for critical administrative actions |

---

## 🔒 1. Authentication & Access Control (A01: Broken Access Control)

### Role-Based Access Matrix
Permissions are strictly categorized across 6 system tiers:

| Role | Branch Scope | User Management | Branch CRUD | Financial Reports | Oracle Migration | DB Reset |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **`SUPER_ADMIN`** | Global | Full | Full | Full | Yes | Yes (MFA) |
| **`HQ_MANAGER`** | Global | Manage Staff | Create/Update | Full | No | No |
| **`HQ_ACCOUNTANT`** | Global | Read-Only | Read-Only | Full Reconciliation | No | No |
| **`BRANCH_MANAGER`** | Local Only | Branch Only | Read-Only (Local) | Local Only | No | No |
| **`BRANCH_COLLECTOR`** | Local Only | No | No | Daily Receipts | No | No |
| **`BRANCH_DATA_ENTRY`**| Local Only | No | No | Contract Details | No | No |

### Anti-BOLA & IDOR Mitigation
- **Threat Model**: A rogue collector in Branch A attempts to query or collect payments for contracts originating in Branch B by forging URL parameters or request bodies.
- **Defense**: The central `branchScope.ts` interceptor extracts the authenticated user's branch from the validated token. For non-HQ users, any mismatch between the requested scope (e.g., `x-branch-id` header or query parameter) and their assigned branch results in an immediate **`403 Forbidden`** rejection.

---

## 🔑 2. Cryptography & Session Management (A02: Cryptographic Failures)

- **Password Storage**: Passwords are never stored in plaintext. They are hashed using `bcryptjs` with 12 salt rounds, offering strong resistance against offline dictionary and rainbow-table attacks.
- **Dual-Token Lifetime Cycle**:
  - **Access Tokens**: Expire after 15 minutes. Even in the unlikely event of an in-memory token compromise, exposure is strictly bounded.
  - **Refresh Tokens**: Valid for 7 days. Delivered and stored via cookies configured with `HttpOnly`, `SameSite=Strict`, and `Secure` (in production), preventing theft via client-side JavaScript (XSS mitigation).
- **Backdoor Remediation**: Legacy bypass codes (such as hardcoded emergency passwords) have been completely removed. Database purge endpoints now enforce `SUPER_ADMIN` credentials combined with dynamic Time-based One-Time Password (TOTP) validation.

---

## 💉 3. Injection Prevention (A03: Injection)

- All database operations are mediated through TypeORM using parameterized statements.
- Direct string interpolation of user input into raw SQL queries is strictly prohibited across the codebase.
- File uploads (e.g., Excel templates and bulk payment sheets) are processed with strict file-type validation, size caps, and schema parsing before ingestion into memory.

---

## 🌐 4. Network Perimeter & HTTP Hardening (A05: Security Misconfiguration)

- **Helmet Suite**: Injects recommended security response headers:
  - `Content-Security-Policy`: Restricts allowed resource origins.
  - `X-Frame-Options: DENY`: Protects users against clickjacking attacks.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-sniffing exploits.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
- **Brute-Force Rate Limiting**:
  - `/api/auth/login`: Restricted to a maximum of 5 failed attempts per 15-minute window per IP.
  - Global API routes: Capped at 200 requests per minute to prevent denial-of-service abuse.
- **CORS Configuration**: Restricts API acceptance to explicitly whitelisted client origins, preventing cross-origin invocation by untrusted external websites.

---

## 📜 5. Audit Logging & Security Monitoring (A09: Logging & Monitoring Failures)

Every critical security event is recorded in the `audit_logs` database table:
- **Recorded Events**:
  - `LOGIN_FAILED` / `LOGIN_BLOCKED`
  - `USER_CREATE` / `USER_UPDATE` / `USER_DELETE` / `USER_SUSPEND` / `USER_ACTIVATE` / `USER_RESET_PASSWORD`
  - `BRANCH_CREATE` / `BRANCH_UPDATE` / `BRANCH_DEACTIVATE`
  - `DB_RESET_SUCCESS` / `DB_RESET_FAILED`
- **Metadata Captured**: Timestamp, performing user ID, remote IP address (IPv4/IPv6), User-Agent header, action target, and operation context.

---

## 🧪 Testing Verification Checklist for Auditors

Security testers can verify all controls by executing the automated test suite:
```bash
npm test -w backend
```
Expected output: **100% Pass across all 20 security scenarios**.
