# Murabha Cloud — User Guide

Welcome to **Murabha Cloud**, an intuitive platform for installment contract management, multi-branch tracking, and collections.

This guide walks you through daily workflows, understanding your dashboards, and managing your branch efficiently.

---

## 📑 Quick Navigation
1. [Getting Started & Logging In](#1-getting-started--logging-in)
2. [Navigating Your Workspace](#2-navigating-your-workspace)
3. [HQ Executive Dashboard & Branch Switcher](#3-hq-executive-dashboard--branch-switcher)
4. [Customer Management](#4-customer-management)
5. [Sales & Installment Contracts](#5-sales--installment-contracts)
6. [Installment Tracking & Collections](#6-installment-tracking--collections)
7. [Reports & Financial Reconciliation](#7-reports--financial-reconciliation)
8. [Administration: Users & Branches](#8-administration-users--branches)
9. [Oracle Database Migration Wizard](#9-oracle-database-migration-wizard)

---

## 1. Getting Started & Logging In

When you open Murabha Cloud in your browser, you will see the login screen:

1. Enter your assigned **Username** and **Password**.
2. Click **Sign In**.
3. Once authenticated, the system takes you directly to your tailored dashboard based on your role:
   - **Headquarters Staff** (`SUPER_ADMIN`, `HQ_MANAGER`, `HQ_ACCOUNTANT`): Opened directly to the **HQ Executive Dashboard**.
   - **Branch Personnel** (`BRANCH_MANAGER`, `BRANCH_COLLECTOR`, `BRANCH_DATA_ENTRY`): Opened to your branch's operational dashboard.

> **Note**: Your session is protected by automated security. If you leave your session idle, you may be prompted to sign in again to protect customer financial records.

---

## 2. Navigating Your Workspace

The sidebar organizes the entire system into three logical areas:

- **Operations**:
  - **Dashboard**: Quick metrics, daily collection counters, and overdue alerts.
  - **Customers**: Customer directory, phone numbers, and balance histories.
  - **Sales & Contracts**: Register new sales, view contract status, and generate printable contracts.
  - **Follow-ups**: Client communication logs and payment reminders.
- **Finance**:
  - **Installments**: Upcoming, paid, and overdue installments with instant payment actions.
  - **Collections**: History of receipts issued, payment methods, and voiding tools.
  - **Reports**: Detailed breakdown of monthly closures, collection ratios, and customer statements.
- **Administration & HQ** *(visible to authorized roles)*:
  - **HQ Dashboard**: Global consolidated metrics and branch performance rankings.
  - **Branch Management**: Create branches, view branch phone/address info, and toggle active status.
  - **User Management**: Add team members, set roles, and reset passwords.
  - **Settings**: Branch identity, automated backups, and Oracle migration tooling.

---

## 3. HQ Executive Dashboard & Branch Switcher

If you are an executive or accountant at Headquarters:

- **Consolidated Financial Summary**: Instant visibility into total active debt, amount collected today, and overall collection efficiency across all branches combined.
- **Branch Switcher Dropdown**: Located at the top of your screen. You can either select a specific branch (e.g., "Cairo Branch" or "Alexandria Branch") to filter all numbers, or keep it set to **All Branches (HQ)** for full enterprise aggregation.
- **Branch Benchmarking Table**: Compares branch collection percentages side-by-side, helping you identify which branches are leading and which have overdue amounts requiring follow-up.
- **Live Collections Feed**: Displays payments as they are collected in real-time across branches.

---

## 4. Customer Management

### Adding a New Customer
1. Navigate to **Customers** from the sidebar.
2. Click **New Customer**.
3. Fill in the client's information:
   - **Name** and **Customer Code / National ID**.
   - **Phone Number** (vital for payment reminders).
   - **Address** and **Notes**.
4. Click **Save Customer**.

### Viewing Customer Statements
Click on any customer in the list to open their complete ledger:
- Every contract associated with the customer.
- Paid vs. remaining installments.
- One-click PDF / Excel statement export.

---

## 5. Sales & Contracts (Installments & Cash)

Murabha Cloud supports both traditional installment financing (Murabaha) and immediate cash sales.

### A. Registering an Installment Sale (بيع تقسيط)
1. Go to **Sales** and click **New Sale Contract**.
2. Ensure **Installment (بيع تقسيط)** is selected as the Sale Type.
3. Select the customer from the list.
4. Enter machine details:
   - **Machine Serial Number**
   - **Total Price**
   - **Down Payment** (if any) and initial receipt number.
5. Set the repayment schedule:
   - Number of installments (e.g., 6, 12, 18, 24 months).
   - First installment due date.
6. Review the calculated monthly payment.
7. Click **Confirm & Issue Contract**. The installment schedule is generated automatically.

### B. Registering a Cash Sale (بيع كاش / نقدي)
*(Note: Requires Cash Sales to be enabled by an administrator in Settings)*
1. Go to **Sales** and click **New Sale Contract**.
2. Select **Cash Sale (بيع كاش)** under the Sale Type selector.
3. Select the customer from the list.
4. Enter machine details:
   - **Machine Serial Number**
   - **Total Cash Price (إجمالي المبلغ المدفوع)**: The entire sale value is settled immediately.
   - **Receipt Number (رقم الإيصال)**: Enter the official printed receipt number.
   - **Payment Method (طريقة الدفع)**: Cash, Bank Transfer, or Card.
5. Click **Confirm & Complete Sale**.
6. The sale is created with status **COMPLETED** (مكتمل) immediately, zero installments are generated, and a collection payment record is registered in the system treasury.

---

## 6. Installment Tracking, Collections & Data Import

### Collecting Single Installments
1. Go to **Installments**.
2. Search by customer name, serial number, or receipt number.
3. Locate the due installment and click **Pay**.
4. Select the payment method (Cash, Bank Transfer, Card) and enter the receipt number.
5. Click **Submit Payment**. The system marks the installment as paid and updates the remaining balance instantly.

### Bulk Payment Distribution (FIFO)
When a customer pays a lump sum covering multiple installments:
- The system automatically settles the oldest overdue installments first (First-In, First-Out).
- A combined single receipt is generated for the customer.

### Importing Historical Sales via Excel (استيراد البيانات القديمة)
For migrating legacy contracts into Murabha Cloud:
1. Navigate to the **Import Data** section.
2. Prepare your Excel spreadsheet following the standardized columns:
   - **Customer Info**: Customer Code (كود العميل), Customer Type (نوع العميل), Department (الإدارة), Name (اسم العميل).
   - **Machine Info**: Serial Number (السيريال), Sale Date (تاريخ البيع).
   - **Contract Financials**: Total Price (إجمالي قيمة العقد), Total Installments (إجمالي الأقساط), Installment Count (عدد الأقساط), Paid Amount (المسدد), Remaining Amount (المتبقي).
3. Upload the file. The system applies strict business rules:
   - **Strict Date Range**: Validates dates fall strictly between 2000 and 2050 (prevents corrupt dates).
   - **Financial Sanity Checks**: Guards against negative numbers and zero division.
   - **Rounding Tolerance**: Accommodates small historical rounding variances (up to 5.0 EGP) without failing the row.
   - **Collision-Safe Receipts**: Generates unique receipt codes (`R-IMP-...`) guaranteeing zero receipt duplication.
   - **FIFO Auto-Settlement**: Generates installment schedules and marks historical payments as settled automatically.

---

## 7. Reports & Financial Reconciliation

Access the **Reports** section to generate clear financial insights:

- **Monthly Closing Report (تقرير الإقفال الشهري)**: Formal audit summary showing cash sales, down payments, and installment collections ready for accounting books.
- **Cash Sales Report (تقرير المبيعات الكاش)**:
  - Dedicated tab displaying all machines sold for cash without installments.
  - KPI metric cards: **Total Cash Sales Count**, **Total Cash Revenue (إجمالي المتحصلات)**, and **Average Cash Ticket (متوسط البيع الكاش)**.
  - Instant filtering by branch, customer, machine serial, and transaction date.
  - One-click **Export to Excel (تصدير إكسيل)** for financial accounting.
- **Collection Ratio Report (نسبة التحصيل)**: Measures collected dues against expected dues within any date range.
- **Overdue Installments Report (الأقساط المتأخرة)**: Lists delinquent accounts grouped by branch or days past due.
- **Excel & PDF Exports**: Every report includes a one-click export button.

---

## 8. Administration: Users & Branches

### Managing Branches (`SUPER_ADMIN` / `HQ_MANAGER`)
- Head over to **Branches Management**.
- Click **Add Branch** to establish a new operational location.
- Enter a unique branch code (e.g., `BR-ALX`), official branch name, address, and contact number.

### Managing Users (`SUPER_ADMIN` / `HQ_MANAGER`)
- Go to **Users Management**.
- Click **Add User** to create staff accounts.
- Assign the appropriate role (`BRANCH_MANAGER`, `BRANCH_COLLECTOR`, `BRANCH_DATA_ENTRY`) and link them to their branch.
- **Resetting Passwords**: Click the key icon beside any user to issue a new secure password.
- **Account Suspension**: Temporarily suspend or reactivate staff access with one click.

### System Settings & Feature Configuration (`SUPER_ADMIN`)
- Navigate to **Settings** and choose the **General Settings (الإعدادات العامة)** tab.
- **Enable Cash Sales (تفعيل البيع الكاش)**:
  - Toggle this setting ON to allow branches to register cash sales alongside installment sales.
  - When enabled, the Sale Type selector appears in the New Sale modal, and the dedicated Cash Sales report becomes available.
  - When disabled, the platform operates purely in installment financing mode, hiding cash sale options across operational screens to avoid data entry confusion.
- Settings are saved dynamically without requiring a backend server restart.

---

## 9. Oracle Database Migration Wizard

For system administrators transitioning from PostgreSQL to an enterprise Oracle Database:

1. Navigate to **Settings** and select the **Oracle Migration** tab (available to `SUPER_ADMIN`).
2. **Step 1 — Connection**: Enter your Oracle Database host, port (default `1521`), service name (e.g., `FREEPDB1`), username, and password. Click **Test Oracle Connection**.
3. **Step 2 — Provision Schema**: Click **Provision Tables Now** to automatically generate the database structure.
4. **Step 3 — Migrate & Audit**: Click **Start Full Migration**. The system streams all historical branches, users, customers, and sales into Oracle and presents a side-by-side financial audit showing zero discrepancies.
