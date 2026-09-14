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

## ⚙️ Dynamic System Configuration & Feature Toggles

To support flexible operational models across diverse business units, Murabha Cloud implements dynamic database-backed feature configuration:
- **Entity**: `SystemSetting` (`key: varchar(64) PK`, `value: text`, `updatedAt: timestamp`).
- **REST Endpoints**:
  - `GET /api/settings`: Returns a key-value dictionary of all active system flags.
  - `PUT /api/settings/:key`: Updates or inserts a configuration property (restricted to `SUPER_ADMIN`).
- **Example Flag — `enableCashSales`**:
  - Controls whether the platform accepts immediate full-cash machine purchases or restricts activity purely to installment contracts.
  - Enforced symmetrically across UI rendering (Sale Type selector) and API controllers (`saleService.ts` rejects cash requests with `400 Bad Request` if disabled).

---

## 💵 Sales Lifecycle: Installment vs. Cash Sales

The system distinguishes between traditional Murabaha installment schedules and immediate cash contracts:

```
                  ┌───────────────────────────────┐
                  │      POST /api/sales          │
                  └───────────────┬───────────────┘
                                  │
                   Is saleType === 'CASH'?
                                 / \
                         Yes    /   \   No (INSTALLMENT)
                               ▼     ▼
  ┌────────────────────────────────┐ ┌────────────────────────────────┐
  │ Verify enableCashSales setting │ │ Calculate Monthly Installments │
  │ totalPrice = downPayment       │ │ totalPrice = downPayment +     │
  │ remainingAmount = 0            │ │              remainingBalance  │
  │ status = 'COMPLETED'           │ │ status = 'ACTIVE'              │
  │ Zero Installment Rows          │ │ N Installment Rows Generated   │
  │ 1 Treasury Payment Registered  │ │ Initial Down Payment Receipt   │
  └────────────────────────────────┘ └────────────────────────────────┘
```

1. **Installment Sales (`INSTALLMENT`)**:
   - Requires upfront down payment (if any) and a set installment count (months).
   - Generates individual `Installment` records with sequential due dates and tracking statuses (`UNPAID`, `PARTIALLY_PAID`, `PAID`).
2. **Cash Sales (`CASH`)**:
   - `totalPrice` must equal the upfront payment.
   - Contract is created in status `COMPLETED` with `remainingAmount = 0`.
   - Generates zero installment schedule rows.
   - Registers a single payment entry in the `Payment` ledger linked to the branch treasury.
   - Included in specialized Cash Sales reports and month-end accounting reconciliation.

---

## 📥 Legacy Excel Import & Data Normalization Pipeline

To onboard historical Excel sheets cleanly into relational storage, the `POST /api/import/excel` engine executes a multi-stage validation and normalization pipeline:

1. **Structural & Header Validation**: Validates existence of expected bilingual column mappings (e.g. `كود العميل`, `السيريال`, `إجمالي قيمة العقد`).
2. **Strict Date Parsing**:
   - Handles Excel serial timestamps (e.g., `44123`), ISO strings (`YYYY-MM-DD`), and Arabic/standard date formats (`DD/MM/YYYY`).
   - Bounds-checked strictly between **2000-01-01** and **2050-12-31** to prevent corrupt or overflow dates.
3. **Financial Sanity & Rounding Tolerance**:
   - Guards against negative numbers and division by zero.
   - Implements a configurable **5.0 EGP tolerance threshold** to smoothly accommodate historical penny rounding discrepancies.
4. **Collision-Safe Receipt Generation**:
   - Generates unique deterministic receipt indices:
     - Down payment receipt: `R-IMP-{saleId}-0`
     - Historical installment receipts: `R-IMP-{saleId}-{installmentNumber}`
   - Guarantees zero primary key / receipt collision even when importing large multi-sheet workbooks.
5. **Atomic FIFO Settlement**:
   - Distributes cumulative paid amounts (`المسدد`) across generated installments in chronological order, automatically tagging fully paid vs. partially paid debts.

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
