# Security & Penetration Testing Guide (Spring Security 6)

This guide outlines the security controls, authentication mechanisms, and defenses implemented in **Murabha Cloud (Java Spring Boot Edition)**, designed to assist external penetration testing teams and security auditors during comprehensive vulnerability assessments.

---

## 🛡️ Executive Security Summary

Murabha Cloud is engineered following the principle of **defense-in-depth** and aligns with the **OWASP Top 10** standards:

| Security Vector | Implementation Detail |
|:---|:---|
| **Authentication** | JJWT (short-lived 15m) + HttpOnly Refresh Cookies (7d) |
| **Password Hashing** | Salted `BCryptPasswordEncoder` (Cost Factor: 12) |
| **Access Control** | Spring Security 6 RBAC + `BranchScopeFilter` (Anti-BOLA/IDOR) |
| **Data Integrity** | Parameterized queries via Spring Data JPA & Hibernate (Zero SQL injection) |
| **Tamper Detection** | Immutable audit trail (`AuditLog`) logging IPs & user agents |
| **Privileged Safeguards** | TOTP-based MFA verification for critical administrative actions |
| **Rate Limiting** | Bucket4j token bucket algorithm on auth and API endpoints |

---

## 🔒 1. Authentication & Access Control (A01: Broken Access Control)

### Role-Based Access Matrix
Permissions are strictly categorized across 6 system tiers enforced via Spring Security `@PreAuthorize` and role checks:

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
- **Defense**: The central `BranchScopeFilter` servlet filter extracts the authenticated user's branch from the validated token. For non-HQ users, any mismatch between the requested scope (e.g., `x-branch-id` header or query parameter) and their assigned branch results in an immediate **`403 Forbidden`** rejection before hitting controller endpoints.

---

## 🔑 2. Cryptography & Session Management (A02: Cryptographic Failures)

- **Password Storage**: Passwords are never stored in plaintext. They are hashed using `BCryptPasswordEncoder` with 12 salt rounds, offering strong resistance against offline dictionary and rainbow-table attacks.
- **Dual-Token Lifetime Cycle**:
  - **Access Tokens**: Expire after 15 minutes. Signed using HMAC-SHA256 with a 256-bit secret key via JJWT.
  - **Refresh Tokens**: Valid for 7 days. Delivered and stored via cookies configured with `HttpOnly`, `SameSite=Strict`, and `Secure` (in production), preventing theft via client-side JavaScript (XSS mitigation).
- **Backdoor Remediation**: Legacy bypass codes have been eliminated. Sensitive database reset endpoints enforce `SUPER_ADMIN` credentials combined with dynamic Time-based One-Time Password (TOTP) validation (`dev.samstevens.totp`).

---

## 💉 3. Injection Prevention (A03: Injection)

- All database queries are executed through Spring Data JPA repositories and Hibernate 6 utilizing parameterized JPQL or Criteria API queries.
- Direct string interpolation of user input into SQL queries is strictly prohibited.
- File uploads (Excel templates and update spreadsheets) are processed via Apache POI with strict MIME validation, file size caps (10MB), and schema parsing before processing into database transactions.

---

## 🌐 4. Network Perimeter & HTTP Hardening (A05: Security Misconfiguration)

- **Spring Security Headers**:
  - `Content-Security-Policy`: Restricts allowed resource origins.
  - `X-Frame-Options: DENY`: Protects users against clickjacking attacks.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-sniffing exploits.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
- **Brute-Force Rate Limiting (Bucket4j)**:
  - `/api/auth/login`: Restricted to a maximum of 30 attempts per 15-minute window per IP.
  - Global API routes: Rate-limited to prevent denial-of-service abuse.
- **CORS Configuration**: Restricts API acceptance to explicitly whitelisted client origins (`http://localhost:2436`, `http://localhost:3000`, etc.), preventing cross-origin invocation by untrusted external websites.

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
cd backend-java
.\mvnw.cmd test
```
Expected output: **100% Pass across all security and isolation scenarios**.