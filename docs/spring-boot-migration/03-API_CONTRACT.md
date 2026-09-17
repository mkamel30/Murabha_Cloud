# Complete API Contract Reference

This document outlines the **Complete API Contract** that the new Java Spring Boot backend MUST honor exactly. The React frontend will NOT be modified during the migration, meaning the Spring Boot backend must return identical response shapes, handle the same request payloads, and use the exact same routing structure as the existing Node.js application.

**Total Endpoints:** 88
**Total Domains:** 18

---

## Global Requirements

- **Base URL:** All endpoints are prefixed with `/api`
- **Authentication:** Most endpoints require a Bearer token in the `Authorization` header (`Authorization: Bearer <token>`) unless marked as Public.
- **Content-Type:** Requests with a body must use `Content-Type: application/json` unless noted otherwise (e.g., multipart forms).
- **Date Format:** Dates should be formatted as ISO 8601 strings (e.g., `2024-01-01T12:00:00.000Z`).

---

## 1. Authentication (`/api/auth`)

### 1.1. Login
- **Method & Path:** `POST /api/auth/login`
- **Auth & Roles:** Public
- **Rate Limit:** 30 requests / 15 minutes
- **Request Body:**
  ```typescript
  {
    username: string;
    password: string;
  }
  ```
- **Response (200 OK):**
  ```typescript
  {
    accessToken: string;
    user: {
      id: string;
      username: string;
      name: string;
      email?: string;
      role: string;
      branchId?: string;
      branchName?: string;
    }
  }
  ```
- **Notes:** Must set an `HttpOnly` cookie named `refreshToken` with a 7-day expiration.

### 1.2. Refresh Token
- **Method & Path:** `POST /api/auth/refresh`
- **Auth & Roles:** Public (reads cookie)
- **Request Headers:** Cookie `refreshToken`
- **Response (200 OK):**
  ```typescript
  {
    accessToken: string;
  }
  ```

### 1.3. Logout
- **Method & Path:** `POST /api/auth/logout`
- **Auth & Roles:** Public
- **Response (200 OK):**
  ```typescript
  {
    message: string;
  }
  ```
- **Notes:** Must clear the `refreshToken` HttpOnly cookie.

### 1.4. Get Current User
- **Method & Path:** `GET /api/auth/me`
- **Auth & Roles:** Authenticated (Bearer Token)
- **Response (200 OK):**
  ```typescript
  {
    user: {
      id: string;
      username: string;
      name: string;
      email?: string;
      role: string;
      branchId?: string;
      branchName?: string;
    }
  }
  ```

---

## 2. Health (`/api/health`)

### 2.1. Health Check
- **Method & Path:** `GET /api/health`
- **Auth & Roles:** Public
- **Response (200 OK):**
  ```typescript
  {
    status: 'ok';
    db: 'connected' | 'disconnected';
    dbType: string;
    timestamp: string; // ISO 8601
  }
  ```

---

## 3. Admin Users (`/api/admin/users`)

*Requires `SUPER_ADMIN` or `HQ_MANAGER` roles.*

### 3.1. List Users
- **Method & Path:** `GET /api/admin/users`
- **Response (200 OK):** Array of User objects (passwords must be omitted).
  ```typescript
  Array<{
    id: string;
    username: string;
    name: string;
    email?: string;
    role: string;
    branchId?: string;
    isActive: boolean;
  }>
  ```

### 3.2. Create User
- **Method & Path:** `POST /api/admin/users`
- **Request Body:**
  ```typescript
  {
    username: string;
    name: string;
    email?: string;
    password: string;
    role: string;
    branchId?: string;
  }
  ```
- **Response (201 Created):** User object (omitting password).

### 3.3. Update User
- **Method & Path:** `PUT /api/admin/users/:id`
- **Request Body:**
  ```typescript
  {
    name?: string;
    email?: string;
    role?: string;
    branchId?: string;
  }
  ```
- **Response (200 OK):** Updated User object.

### 3.4. Reset Password
- **Method & Path:** `POST /api/admin/users/:id/reset-password`
- **Request Body:**
  ```typescript
  {
    newPassword: string;
  }
  ```
- **Response (200 OK):** Success message.

### 3.5. Toggle User Active Status
- **Method & Path:** `POST /api/admin/users/:id/toggle-active`
- **Response (200 OK):**
  ```typescript
  {
    message: string;
    isActive: boolean;
  }
  ```

### 3.6. Delete User
- **Method & Path:** `DELETE /api/admin/users/:id`
- **Response (200 OK):** Success message.

---

## 4. Branches (`/api/branches`)

### 4.1. List Branches
- **Method & Path:** `GET /api/branches`
- **Auth & Roles:** Authenticated. HQ roles get all branches with stats; branch users get only their own branch.
- **Response (200 OK):** Array of Branch objects.

### 4.2. Create Branch
- **Method & Path:** `POST /api/branches`
- **Auth & Roles:** `SUPER_ADMIN`
- **Request Body:**
  ```typescript
  {
    code: string;
    name: string;
    address?: string;
    phone?: string;
  }
  ```
- **Response (201 Created):** Created Branch object.

### 4.3. Update Branch
- **Method & Path:** `PUT /api/branches/:id`
- **Auth & Roles:** `SUPER_ADMIN`, `HQ_MANAGER`
- **Request Body:** Partial Branch object.
- **Response (200 OK):** Updated Branch object.

### 4.4. Toggle Branch Active Status
- **Method & Path:** `POST /api/branches/:id/toggle-active`
- **Auth & Roles:** `SUPER_ADMIN`
- **Response (200 OK):** Updated Branch status.

### 4.5. Delete Branch
- **Method & Path:** `DELETE /api/branches/:id`
- **Auth & Roles:** `SUPER_ADMIN`
- **Notes:** Must be blocked if the branch has associated users.
- **Response (200 OK):** Success message.

---

## 5. Branch Config (`/api/branch`)

### 5.1. Get Branch Config
- **Method & Path:** `GET /api/branch/config`
- **Auth & Roles:** Authenticated
- **Response (200 OK):**
  ```typescript
  {
    branchId: string;
    branchName: string;
    createdAt: string;
    updatedAt: string;
  }
  ```

### 5.2. Update Branch Config
- **Method & Path:** `PUT /api/branch/config`
- **Auth & Roles:** Authenticated
- **Request Body:**
  ```typescript
  {
    branchName: string;
  }
  ```
- **Response (200 OK):** Updated config.

### 5.3. Export Monthly Branch Data
- **Method & Path:** `GET /api/branch/export-monthly`
- **Query Params:** `year?` (number), `month?` (number)
- **Response (200 OK):** JSON file download containing monthly data.

---

## 6. Customers (`/api/customers`)

### 6.1. List Customers
- **Method & Path:** `GET /api/customers`
- **Query Params:** `search?` (string)
- **Response (200 OK):**
  ```typescript
  Array<{
    id: string;
    // ...other customer fields
    sales: Array<{ id: string }>;
  }>
  ```

### 6.2. Count Customers
- **Method & Path:** `GET /api/customers/count`
- **Response (200 OK):**
  ```typescript
  {
    count: number;
  }
  ```

### 6.3. Generate BK Code
- **Method & Path:** `GET /api/customers/generate-bkcode`
- **Response (200 OK):**
  ```typescript
  {
    bkCode: string;
  }
  ```

### 6.4. Get Customer by ID
- **Method & Path:** `GET /api/customers/:id`
- **Response (200 OK):** Customer object with nested relationships.
  ```typescript
  {
    id: string;
    // ...
    sales: Array<{
      id: string;
      installments: Array<any>;
      payments: Array<any>;
    }>;
    followUps: Array<any>;
  }
  ```

### 6.5. Create Customer
- **Method & Path:** `POST /api/customers`
- **Request Body:**
  ```typescript
  {
    bkCode: string;
    customerType: string;
    name: string;
    phone?: string;
    address?: string;
    notes?: string;
    department?: string;
  }
  ```
- **Response (201 Created):** Created Customer object.

### 6.6. Update Customer
- **Method & Path:** `PUT /api/customers/:id`
- **Request Body:** Partial Customer object.
- **Response (200 OK):** Updated Customer object.

### 6.7. Delete Customer
- **Method & Path:** `DELETE /api/customers/:id`
- **Auth & Roles:** `SUPER_ADMIN`, `HQ_MANAGER`
- **Response (204 No Content)**

---

## 7. Sales (`/api/sales`)

### 7.1. List Sales
- **Method & Path:** `GET /api/sales`
- **Query Params:** `customerId?`, `status?`, `saleType?`, `startDate?`, `endDate?`, `page?`, `limit?`
- **Response (200 OK):**
  ```typescript
  {
    sales: Array<any>;
    total: number;
    page: number;
    totalPages: number;
  }
  ```

### 7.2. Check Serial
- **Method & Path:** `GET /api/sales/check-serial`
- **Query Params:** `serial` (string)
- **Response (200 OK):**
  ```typescript
  {
    available: boolean;
    message?: string;
    existingSale?: any;
  }
  ```

### 7.3. Check Receipt
- **Method & Path:** `GET /api/sales/check-receipt`
- **Query Params:** `receipt` (string)
- **Response (200 OK):**
  ```typescript
  {
    available: boolean;
    message?: string;
    existingPayment?: any;
  }
  ```

### 7.4. Get Sale by ID
- **Method & Path:** `GET /api/sales/:id`
- **Response (200 OK):** MachineSale object populated with customer, installments, and payments.

### 7.5. Create Sale
- **Method & Path:** `POST /api/sales`
- **Request Body:** MachineSale creation payload.
- **Notes:** Must automatically generate the installment schedule based on sale parameters.
- **Response (201 Created):** Created Sale object.

### 7.6. Preview Payment
- **Method & Path:** `POST /api/sales/:id/preview-payment`
- **Request Body:**
  ```typescript
  {
    amount: number;
    installmentIds?: Array<string>;
  }
  ```
- **Response (200 OK):** Payment distribution preview detailing how the amount will be applied to installments.

### 7.7. Pay Sale
- **Method & Path:** `POST /api/sales/:id/pay`
- **Request Body:**
  ```typescript
  {
    amount: number;
    paymentType: string;
    paymentPlace?: string;
    notes?: string;
    installmentIds?: Array<string>;
    receiptNumber?: string;
    paidAt?: string;
  }
  ```
- **Response (201 Created):** Payment confirmation and updated sale state.

### 7.8. Payment (Alias)
- **Method & Path:** `POST /api/sales/:id/payment`
- **Notes:** Exact alias for `/pay`.
- **Response (201 Created)**

### 7.9. Void Sale
- **Method & Path:** `POST /api/sales/:id/void`
- **Request Body:**
  ```typescript
  {
    reason: string;
  }
  ```
- **Response (200 OK):** Void confirmation.

### 7.10. Recalculate Schedule
- **Method & Path:** `POST /api/sales/:id/recalculate`
- **Request Body:**
  ```typescript
  {
    months: number;
  }
  ```
- **Response (200 OK):** Updated schedule.

### 7.11. Full Recalculate
- **Method & Path:** `POST /api/sales/:id/full-recalculate`
- **Request Body:**
  ```typescript
  {
    firstDueDate?: string;
    saleDate?: string;
    months?: number;
    downPayment?: number;
    downPaymentReceipt?: string;
    totalPrice?: number;
  }
  ```
- **Response (200 OK):** Updated schedule.

### 7.12. Update Sale
- **Method & Path:** `PUT /api/sales/:id`
- **Request Body:**
  ```typescript
  {
    notes?: string;
    paymentPlace?: string;
    saleDate?: string;
  }
  ```
- **Response (200 OK):** Updated Sale object.

### 7.13. Delete Sale
- **Method & Path:** `DELETE /api/sales/:id`
- **Notes:** Must fail/block if the sale has associated payments.
- **Response (204 No Content)**

---

## 8. Installments (`/api/installments`)

### 8.1. Export Installments for Update
- **Method & Path:** `GET /api/installments/export-update`
- **Response (200 OK):** Excel file blob (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).

### 8.2. Import Installments Update
- **Method & Path:** `POST /api/installments/import-update`
- **Request Body:** Multipart form data (file).
- **Response (200 OK):**
  ```typescript
  {
    success: boolean;
    message: string;
    results: any;
  }
  ```

### 8.3. List Installments
- **Method & Path:** `GET /api/installments`
- **Query Params:** `saleId?`, `isPaid?`, `startDate?`, `endDate?`
- **Response (200 OK):** Array of Installments populated with `sale.customer`.

### 8.4. Get Overdue Installments
- **Method & Path:** `GET /api/installments/overdue`
- **Response (200 OK):** Array of overdue Installments.

### 8.5. Get Installment by ID
- **Method & Path:** `GET /api/installments/:id`
- **Response (200 OK):** Installment object.

### 8.6. Patch Installment
- **Method & Path:** `PATCH /api/installments/:id`
- **Request Body:**
  ```typescript
  {
    receiptNumber?: string;
    paidDate?: string;
    isPaid?: boolean;
    paidAmount?: number;
    paymentPlace?: string;
  }
  ```
- **Response (200 OK):** Updated Installment object.

### 8.7. Pay Installment
- **Method & Path:** `POST /api/installments/:id/pay`
- **Request Body:**
  ```typescript
  {
    amount: number;
    paymentPlace?: string;
    notes?: string;
    receiptNumber?: string;
  }
  ```
- **Response (201 Created):** Payment result.

---

## 9. Payments (`/api/payments`)

### 9.1. List Payments
- **Method & Path:** `GET /api/payments`
- **Query Params:** `saleId?`, `startDate?`, `endDate?`
- **Response (200 OK):** Array of Payment objects.

### 9.2. Get Payment by ID
- **Method & Path:** `GET /api/payments/:id`
- **Response (200 OK):** Payment object.

### 9.3. Create Payment
- **Method & Path:** `POST /api/payments`
- **Request Body:**
  ```typescript
  {
    receiptNumber: string;
    saleId: string;
    paymentType: string;
    amount: number;
    paymentPlace?: string;
    notes?: string;
    paidAt?: string;
  }
  ```
- **Response (201 Created):** Created Payment object.

### 9.4. Void Payment
- **Method & Path:** `POST /api/payments/:id/void`
- **Response (200 OK):** Void confirmation.

### 9.5. Update Payment
- **Method & Path:** `PUT /api/payments/:id`
- **Request Body:**
  ```typescript
  {
    receiptNumber?: string;
    paidAt?: string;
  }
  ```
- **Response (200 OK):** Updated Payment object.

---

## 10. Follow-ups (`/api/followups`)

### 10.1. List Follow-ups
- **Method & Path:** `GET /api/followups`
- **Query Params:** `customerId?`, `isCompleted?`
- **Response (200 OK):** Array of FollowUp objects.

### 10.2. Get Upcoming Follow-ups
- **Method & Path:** `GET /api/followups/upcoming`
- **Response (200 OK):** Array of upcoming FollowUp objects.

### 10.3. Get Follow-up by ID
- **Method & Path:** `GET /api/followups/:id`
- **Response (200 OK):** FollowUp object.

### 10.4. Create Follow-up
- **Method & Path:** `POST /api/followups`
- **Request Body:**
  ```typescript
  {
    customerId: string;
    note: string;
    nextFollowUp?: string;
    logs?: Array<any>;
  }
  ```
- **Response (201 Created):** Created FollowUp object.

### 10.5. Update Follow-up
- **Method & Path:** `PUT /api/followups/:id`
- **Request Body:** Partial FollowUp object.
- **Response (200 OK):** Updated FollowUp object.

### 10.6. Complete Follow-up
- **Method & Path:** `POST /api/followups/:id/complete`
- **Response (200 OK):** Completed FollowUp object.

### 10.7. Delete Follow-up
- **Method & Path:** `DELETE /api/followups/:id`
- **Response (204 No Content)**

---

## 11. Dashboard (`/api/dashboard`)

### 11.1. Dashboard Stats
- **Method & Path:** `GET /api/dashboard/stats`
- **Response (200 OK):**
  ```typescript
  {
    todayCollections: number;
    todayPaymentCount: number;
    overdueTotal: number;
    overdueCount: number;
    cashSalesTotal: number;
    installmentSalesTotal: number;
    totalSalesCount: number;
    totalPaidAll: number;
    totalRemainingAll: number;
    activeCustomers: number;
    recentPayments: Array<any>;
    upcomingDue: Array<any>;
    dueThisMonth: Array<any>;
    dueThisMonthTotal: number;
  }
  ```

### 11.2. HQ Dashboard Stats
- **Method & Path:** `GET /api/dashboard/hq`
- **Auth & Roles:** HQ roles
- **Query Params:** `branchId?`
- **Response (200 OK):** HQ statistics including branch benchmarks.

---

## 12. Reports (`/api/reports`)

### 12.1. Sales Report
- **Method & Path:** `GET /api/reports/sales`
- **Query Params:** `startDate?`, `endDate?`, `saleType?`
- **Response (200 OK):** Sales report data.

### 12.2. Collections Report
- **Method & Path:** `GET /api/reports/collections`
- **Query Params:** `startDate?`, `endDate?`, `paymentType?`, `paymentPlace?`
- **Response (200 OK):** Collections report data.

### 12.3. Overdue Report
- **Method & Path:** `GET /api/reports/overdue`
- **Query Params:** `startDate?`, `endDate?`
- **Response (200 OK):** Overdue report data.

### 12.4. Customer Report
- **Method & Path:** `GET /api/reports/customer/:id`
- **Response (200 OK):** Comprehensive report data for a specific customer.

### 12.5. Month Closing Report
- **Method & Path:** `GET /api/reports/month-closing`
- **Query Params:** `year?`, `month?`
- **Response (200 OK):** Monthly closing statement data.

### 12.6. Collection Ratio Report
- **Method & Path:** `GET /api/reports/collection-ratio`
- **Query Params:** `startDate?`, `endDate?`
- **Response (200 OK):** Collection ratio metrics.

---

## 13. Export (`/api/export`)

### 13.1. Export Sales
- **Method & Path:** `GET /api/export/sales`
- **Response:** Excel blob.

### 13.2. Export Collections
- **Method & Path:** `GET /api/export/collections`
- **Response:** Excel blob.

### 13.3. Export Overdue
- **Method & Path:** `GET /api/export/overdue`
- **Response:** Excel blob.

### 13.4. Export Receipt
- **Method & Path:** `GET /api/export/receipt/:paymentId`
- **Response:** HTML template rendering the receipt.

### 13.5. Export Contract
- **Method & Path:** `GET /api/export/contract/:saleId`
- **Response:** HTML template rendering the contract.

### 13.6. Export Statement
- **Method & Path:** `GET /api/export/statement/:customerId`
- **Response:** HTML template rendering the customer statement.

### 13.7. Export Full Data
- **Method & Path:** `GET /api/export/full`
- **Response:** Excel blob with complete system data.

---

## 14. Import (`/api/import`)

*Requires `SUPER_ADMIN`, `HQ_MANAGER`, or `BRANCH_MANAGER` roles.*

### 14.1. Import Preview
- **Method & Path:** `POST /api/import/preview`
- **Request Body:** Multipart form data (file).
- **Response (200 OK):**
  ```typescript
  {
    previewRows: Array<any>;
    dateWarnings: Array<any>;
  }
  ```

### 14.2. Import Excel
- **Method & Path:** `POST /api/import/excel`
- **Request Body:** Multipart form data (file).
- **Response (200 OK):**
  ```typescript
  {
    success: boolean;
    message: string;
    results: any;
  }
  ```

### 14.3. Download Import Template
- **Method & Path:** `GET /api/import/template`
- **Response (200 OK):** Excel template file blob.

---

## 15. Rewards (`/api/rewards`)

### 15.1. Waive Installments
- **Method & Path:** `POST /api/rewards/waive-installments`
- **Request Body:**
  ```typescript
  {
    saleId: string;
    installmentIds: Array<string>;
    reason?: string;
  }
  ```
- **Response (200 OK):** Waiver confirmation.

---

## 16. Analytics (`/api/analytics`)

### 16.1. Analytics Dashboard
- **Method & Path:** `GET /api/analytics/dashboard`
- **Query Params:** `startDate?`, `endDate?`
- **Response (200 OK):**
  Data for KPIs, channel performance, risk analysis, forecasting, and top defaulters.

---

## 17. Settings (`/api/settings`)

### 17.1. Get Settings
- **Method & Path:** `GET /api/settings`
- **Response (200 OK):**
  ```typescript
  {
    enableCashSales: boolean;
    paymentPlaces: Array<string>;
    // ...other configuration keys
  }
  ```

### 17.2. Update Setting
- **Method & Path:** `PUT /api/settings/:key`
- **Request Body:**
  ```typescript
  {
    value: any;
  }
  ```
- **Response (200 OK):** Updated setting confirmation.

---

## 18. Oracle Migration (`/api/admin/oracle`) & Backup (`/api/backup`)

### 18.1. Oracle Migration Endpoints
*Requires `SUPER_ADMIN` role.*
- **Test Connection:** `POST /api/admin/oracle/test-connection`
- **Provision Schema:** `POST /api/admin/oracle/provision-schema`
- **Migrate Data:** `POST /api/admin/oracle/migrate-data`

### 18.2. Backup Endpoints
- **Export Backup:** `GET /api/backup/export` → Returns file download.
- **Import Backup:** `POST /api/backup/import` (Multipart form data) → 200 OK.
- **Auto Backup Trigger:** `POST /api/backup/auto` → 200 OK.
- **List Backups:** `GET /api/backup/list` → 200 OK.

---

## 19. Admin Database (`/api/admin/database`)

### 19.1. Reset Database
- **Method & Path:** `POST /api/admin/database/reset`
- **Auth & Roles:** `SUPER_ADMIN` + TOTP MFA required.
- **Response (200 OK):** Confirmation of reset.
