# System Architecture & Technical Design

This document describes the architectural principles, data flow, multi-branch isolation design, and database portability models powering **Murabha Cloud**.

---

## 🏛️ High-Level Topology

```
                  ┌─────────────────────────────────┐
                  │   Web Browser Client / SPA UI   │
                  │ (React 18 + Vite + Tailwind CSS)│
                  └────────────────┬────────────────┘
                                   │ HTTPS / REST API
                                   ▼
                  ┌─────────────────────────────────┐
                  │    Nginx Reverse Proxy & Edge   │
                  │   Static Assets + SSL + /api/   │
                  └────────────────┬────────────────┘
                                   │ HTTP
                                   ▼
                  ┌─────────────────────────────────┐
                  │  Node.js 20 LTS / Express API   │
                  │  ├── Helmet CSP & Rate Limiter  │
                  │  ├── JWT Auth & RBAC Guard      │
                  │  ├── Branch Scoping Middleware  │
                  │  ├── Audit Logging Service      │
                  │  └── TypeORM Data Access Layer  │
                  └────────┬───────────────┬────────┘
                           │               │
                           ▼               ▼
                 ┌────────────────┐ ┌────────────────┐
                 │   PostgreSQL   │ │ Oracle Database│
                 │ Current Engine │ │ Target / Migr. │
                 └────────────────┘ └────────────────┘
```

---

## 🏢 Multi-Tenant Branch Scoping & Anti-BOLA/IDOR Design

When handling financial records and customer debt, cross-tenant leaks are unacceptable. Murabha Cloud approaches branch isolation defensively:

### 1. Data-Level Scoping
Every operational record belongs strictly to a branch:
- `Customer.branchId`
- `MachineSale.branchId`
- `Installment.branchId`
- `Payment.branchId`
- `FollowUp.branchId`

Foreign key constraints prevent any orphaned or branch-less operational records.

### 2. Request Interception & Guardrails (`branchScope.ts`)
Isolation is enforced centrally before requests hit controller business logic:
- The user's authenticated token carries their designated `branchId` and `role`.
- **For Branch Users** (`BRANCH_MANAGER`, `BRANCH_COLLECTOR`, `BRANCH_DATA_ENTRY`):
  - The middleware automatically locks the active scope to `user.branchId`.
  - **Tampering Defense**: If a malicious client attaches a header (e.g., `x-branch-id: other-branch`) or query parameter aiming to access another branch's assets, the middleware flags an unauthorized attempt and halts the request immediately with `403 Forbidden`.
- **For HQ Executives** (`SUPER_ADMIN`, `HQ_MANAGER`, `HQ_ACCOUNTANT`):
  - These roles are permitted to supply `x-branch-id` to filter views for a specific branch, or omit it to query aggregated data across all company branches.

---

## 🔄 The Dual-Database Strategy: PostgreSQL & Oracle

Enterprise organizations often mandate Oracle Database, while fast-paced engineering teams prefer PostgreSQL for local workflows, staging, and automated testing. Murabha Cloud embraces both without compromises:

### 1. Common Entity Definition via TypeORM
All models are declared with ANSI SQL compatibility:
- Portable column definitions (`varchar`, `decimal`, `timestamp with time zone`).
- Precision-safe currency handling using explicit decimal transformers, preventing JavaScript IEEE 754 floating-point rounding errors.

### 2. Pure JavaScript Thin Mode for Oracle
Older Oracle Node.js stacks required platform-dependent C binaries (Oracle Instant Client). Murabha Cloud uses `node-oracledb 6+` in **Thin Mode**:
- Pure JavaScript network driver connecting directly over TCP/IP.
- Zero local native dependencies needed on Windows or Linux containers.

### 3. Automated In-App Migration Architecture
The built-in **Oracle Migration Wizard** executes an automated 4-step migration:
1. **Connectivity Probe**: Validates network reachability, user credentials, service name, and Oracle engine version.
2. **Schema Provisioning (Auto DDL)**: Creates tables, primary keys, foreign keys, unique indices, and check constraints tailored for Oracle syntax.
3. **Chunked Pipeline Streaming**: Reads records from PostgreSQL and streams them in transactions to Oracle Database, preserving ID parity across relations.
4. **Double-Entry Financial Audit**: Runs side-by-side reconciliation queries comparing total sales, total installment dues, and total collected payments between both engines to certify 100% financial integrity before switching.

---

## 🔐 Session Management & Auditing

- **Access Tokens**: Short-lived (15 minutes) signed with HMAC-SHA256. Carried in the `Authorization: Bearer <token>` header.
- **Refresh Tokens**: Long-lived (7 days) stored exclusively in `HttpOnly, SameSite=Strict, Secure` cookies to mitigate XSS-based token theft.
- **Audit Logging**: Every privileged or state-changing action is captured asynchronously into the `AuditLog` table, recording:
  - Timestamp
  - User ID and username
  - Action identifier (`USER_SUSPEND`, `BRANCH_CREATE`, `DB_RESET`, etc.)
  - Client IP address and User-Agent
  - Structured JSON metadata capturing before/after values.
