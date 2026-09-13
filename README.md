# Murabha Cloud

[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![TypeORM](https://img.shields.io/badge/ORM-TypeORM-orange.svg)](https://typeorm.io/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_%7C_Oracle_DB-red.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

An enterprise-grade, cloud-native platform designed for managing installment sales, Murabaha contracts, and multi-branch debt collections.

Originally built as an offline desktop utility, Murabha has been re-architected from the ground up into a multi-tenant cloud web platform. It features strict data boundary isolation across branches, protection against BOLA/IDOR vulnerabilities, and full preparedness for external penetration testing and enterprise production deployment.

---

## 🌟 Why Murabha Cloud?

Running multi-branch installment operations comes with real-world headaches: data leaks between branches, delayed collections reporting, and clunky database migrations. Murabha Cloud solves these directly:

- **Isolated Multi-Branch Operations**: Branch collectors and managers see only what belongs to their branch. Strict database-level isolation guarantees zero cross-branch data leaks.
- **HQ Visibility & Real-Time Aggregation**: Headquarters managers and accountants enjoy real-time consolidated KPIs, branch-by-branch collection benchmarks, and live payment activity streams.
- **Database Freedom (PostgreSQL today, Oracle tomorrow)**: Fast and nimble development on PostgreSQL today, with an automated, in-app migration wizard to shift to enterprise Oracle Database without rewriting queries or reinstalling native drivers.
- **Built for Security Audits**: OWASP Top 10 compliant with hardened authentication, tamper-proof audit trails, and zero backdoor bypasses.

---

## 🔑 Core Features & Capabilities

### 1. Multi-Tenant Branch Architecture & BOLA/IDOR Defense
- Every core entity (`Customer`, `MachineSale`, `Installment`, `Payment`, `FollowUp`) is strictly scoped to a `branchId`.
- **Enforced Isolation Layer**: Non-HQ users are constrained to their branch context at the query level. Any attempt to supply or tamper with another branch identifier in headers or query parameters is instantly rejected with `403 Forbidden`.
- **HQ Branch Switcher**: Authorised headquarters personnel can switch context across branches on the fly or view consolidated cross-branch data.

### 2. Role-Based Access Control (RBAC)
Granular, well-defined permissions ensure everyone operates within their exact responsibility:
- **`SUPER_ADMIN`**: Full platform control, branch and user administration, database reset with MFA, and Oracle migration tooling.
- **`HQ_MANAGER`**: High-level cross-branch operational oversight, branch creation, and business intelligence monitoring.
- **`HQ_ACCOUNTANT`**: Financial auditing, cross-branch reconciliation, and collection reporting.
- **`BRANCH_MANAGER`**: Local branch operations, branch staff management, contracts, and customer onboarding.
- **`BRANCH_COLLECTOR`**: Daily installment collections and single/bulk receipt issuing within the assigned branch.
- **`BRANCH_DATA_ENTRY`**: Contract entry and customer profile upkeep.

### 3. HQ Executive Dashboard & Live Analytics
- Consolidated financial metrics: Active debt, total collected, collection ratios, and overdue amounts.
- **Branch Performance Benchmarking**: Side-by-side comparison tables highlighting top-performing branches and delinquency alerts.
- **Live Collections Stream**: Instant visibility into incoming payments as they happen across all branches.

### 4. Zero-Friction Oracle Migration Wizard
Migrating from PostgreSQL to Oracle Database is notoriously painful. Murabha Cloud includes a built-in admin wizard to make it painless:
- **Thin Mode Connectivity**: Powered by `node-oracledb 6+` in pure JavaScript thin mode. No cumbersome Oracle Instant Client C-binaries required.
- **Auto DDL Provisioning**: Generates compliant tables, constraints, and indexes on Oracle Database with one click.
- **Chunked Data Migration & Verification**: Copies historical records in safe batches and performs double-entry financial audits to verify that sales, installments, and payment totals match down to the cent.

### 5. Enterprise Security Hardening
- **Password Security**: Salted `bcryptjs` hashing with 12 rounds.
- **Dual-Token Architecture**: Short-lived Access Tokens (15 min) paired with Refresh Tokens stored in secure `HttpOnly, SameSite=Strict, Secure` cookies.
- **Tamper-Proof Audit Logging**: Every sensitive action (logins, account suspensions, password resets, database actions) is recorded with IP addresses and user agents.
- **Perimeter Defense**: Strict Helmet Content Security Policy, rate-limiting on authentication routes (brute-force defense), and parameterized queries throughout.

---

## 🚀 Quick Start with Docker

The fastest way to spin up the complete cloud platform (PostgreSQL database, backend API, and Nginx-powered web client):

### Prerequisites
- [Docker Engine](https://docs.docker.com/get-docker/) (v20+) & [Docker Compose](https://docs.docker.com/compose/)

### Running the Stack:
```bash
# 1. Clone the repository
git clone https://github.com/mkamel30/Murabha_Cloud.git
cd Murabha_Cloud

# 2. Copy the production environment configuration
cp .env.example .env

# 3. Build and launch all containers
docker-compose up -d --build

# 4. Seed the initial HQ branch and Super Admin account
docker exec -it murabha_backend npm run seed
```

### Accessing the Platform:
- **Web UI**: [http://localhost](http://localhost)
- **Health Check API**: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- **Default Super Admin Credentials**:
  - **Username**: `admin`
  - **Password**: `Admin@2026!`

---

## 💻 Local Development Setup

If you want to run the code locally for development or testing:

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Servers with One Click (Windows)
Double-click `start-local.bat` in the root folder, or run:
```bash
npm run dev
```

- **Backend API**: `http://localhost:3007`
- **Frontend SPA**: `http://localhost:2436`

---

## 🧪 Automated Testing

Murabha Cloud ships with an end-to-end automated test suite verifying health endpoints, authentication flows, RBAC enforcement, anti-BOLA protection, and Oracle migration handling:

```bash
npm test -w backend
```

---

## 📚 Documentation
- [System Architecture & Data Scoping](./ARCHITECTURE.md)
- [Security & Penetration Testing Guide](./SECURITY.md)
- [Comprehensive User Guide](./USER_GUIDE.md)

---

## 📄 License
This project is proprietary software developed for enterprise Murabaha financing and installment operations.
