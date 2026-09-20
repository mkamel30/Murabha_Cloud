# Murabha Cloud (Java Spring Boot Edition)

[![Java](https://img.shields.io/badge/Java-17_LTS-ED8B00.svg?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.4-6DB33F.svg?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Hibernate](https://img.shields.io/badge/ORM-Hibernate_6_%2F_JPA-59666C.svg?logo=hibernate&logoColor=white)](https://hibernate.org/)
[![Database](https://img.shields.io/badge/Database-H2_%7C_PostgreSQL_%7C_Oracle-red.svg)](https://www.postgresql.org/)
[![Flyway](https://img.shields.io/badge/Migration-Flyway-CC0202.svg?logo=flyway&logoColor=white)](https://flywaydb.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)

An open-source, production-ready platform designed specifically to handle the headaches of multi-branch installment sales and debt collections.

This repository holds the **Java Spring Boot 3.3 backend** (`backend-java`) and a modern **React frontend**. It's built to be robust, secure, and ready for real-world financial operations.

---

## 🌟 Why Murabha Cloud?

If you've ever managed a multi-branch installment business, you know the struggle: data leaking between branches, delayed reporting, and messy spreadsheets. We built Murabha Cloud to solve this:

- **True Branch Isolation**: Your branch managers and collectors only see what belongs to them. No accidental (or intentional) peeking at other branches.
- **HQ Visibility**: The headquarters gets a real-time, bird's-eye view of all branches. Compare collections, spot delays, and export data instantly.
- **Database Flexibility**: Start developing instantly with H2, run your staging/production on PostgreSQL, or hook it up to an Enterprise Oracle Database if your company requires it.
- **Built for Security**: We take security seriously. No hardcoded secrets, strict JWT + HttpOnly refresh cookies, and robust defenses against BOLA/IDOR vulnerabilities.
- **Financial Precision**: We use exact math (`java.math.BigDecimal`) for all money operations, so you'll never lose a cent to floating-point rounding errors.

---

## 🏛️ System Architecture

```
                  ┌─────────────────────────────────┐
                  │   Web Browser Client / SPA UI   │
                  │ (React 18 + Vite + Tailwind CSS)│
                  │      Port: 2436 (Dev) / 80      │
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
                  │   Java Spring Boot 3.3.4 API    │
                  │  ├── Bucket4j Rate Limiting     │
                  │  ├── Spring Security 6 & JWT    │
                  │  ├── Multi-Tenant Branch Filter │
                  │  ├── Audit Logging Interceptor  │
                  │  └── Spring Data JPA / Hibernate│
                  └────────┬───────────────┬────────┘
                           │               │
                           ▼               ▼
                 ┌────────────────┐ ┌────────────────┐
                 │   PostgreSQL   │ │ Oracle Database│
                 │ Staging/Cloud  │ │ Enterprise DB  │
                 └────────────────┘ └────────────────┘
```

---

## 🔑 Core Features & Capabilities

### 1. Multi-Tenant Branch Architecture & BOLA/IDOR Defense
- Every operational entity (`Customer`, `MachineSale`, `Installment`, `Payment`, `FollowUp`) is strictly scoped to a `branchId`.
- **Enforced Isolation Layer (`BranchScopeFilter`)**: Non-HQ users are constrained to their branch context at the servlet filter level. Any attempt to supply or tamper with another branch identifier in headers (`x-branch-id`) or query parameters is instantly rejected with `403 Forbidden`.
- **HQ Branch Switcher**: Authorized headquarters personnel can switch context across branches on the fly or view consolidated cross-branch data.

### 2. Role-Based Access Control (RBAC)
Granular, well-defined permissions managed by Spring Security 6:
- **`SUPER_ADMIN`**: Full platform control, branch and user administration, database reset with TOTP MFA, and Oracle migration tooling.
- **`HQ_MANAGER`**: High-level cross-branch operational oversight, branch creation, and business intelligence monitoring.
- **`HQ_ACCOUNTANT`**: Financial auditing, cross-branch reconciliation, and collection reporting.
- **`BRANCH_MANAGER`**: Local branch operations, branch staff management, contracts, and customer onboarding.
- **`BRANCH_COLLECTOR`**: Daily installment collections and single/bulk receipt issuing within the assigned branch.
- **`BRANCH_DATA_ENTRY`**: Contract entry and customer profile upkeep.

### 3. HQ Executive Dashboard & Live Analytics
- Consolidated financial metrics: Active debt, total collected, collection ratios, and overdue amounts.
- **Branch Performance Benchmarking**: Side-by-side comparison tables highlighting top-performing branches and delinquency alerts.
- **Live Collections Stream**: Instant visibility into incoming payments as they happen across all branches.

### 4. Flexible Sales Engine (Installments & Configurable Cash Sales)
- **Murabaha Installment Schedules**: Flexible repayment timelines (e.g., 6, 12, 18, 24 months) with automatic schedule generation and down payment tracking.
- **Configurable Cash Sales**: Admin-controlled toggle (`enableCashSales`) in System Settings. When active, branches can register immediate full-payment cash sales without generating phantom installment schedules.
- **Dedicated Cash Reports & KPI Metrics**: Specialized reporting tabs tracking cash revenue, average ticket sizes, and 1-click Excel financial exports via Apache POI.

### 5. Intelligent Legacy Excel Ingestion Pipeline
- **Bilingual Spreadsheet Onboarding**: Directly imports historical customer and contract records from Excel (`.xlsx`) using Apache POI.
- **Resilient Data Sanitization**: Strict year boundaries (2000–2050), automatic rounding variance tolerance (±5.0 EGP), non-negative integrity guards, and collision-free receipt indexing (`R-IMP-...`).
- **FIFO Debt Settlement**: Automatically walks historical paid amounts across chronological installment schedules within a single database transaction.

### 6. Zero-Friction Oracle Migration Wizard
- **Thin Mode JDBC Connectivity**: Powered by official Oracle `ojdbc11` drivers.
- **Auto DDL Provisioning**: Generates compliant tables, constraints, and indexes on Oracle Database with one click.
- **Chunked Data Migration & Verification**: Copies historical records in safe batches and performs double-entry financial audits to verify that sales, installments, and payment totals match down to the cent.

### 7. Enterprise Security Hardening
- **Password Security**: Salted `BCryptPasswordEncoder` with 12 rounds.
- **Dual-Token Architecture**: Short-lived Access Tokens (15 min) paired with Refresh Tokens stored in secure `HttpOnly, SameSite=Strict, Secure` cookies.
- **Tamper-Proof Audit Logging**: Every sensitive action (logins, account suspensions, password resets, database actions) is recorded with IP addresses and user agents.
- **Perimeter Defense**: Strict Content Security Policy, rate-limiting on authentication routes via Bucket4j, and parameterized queries throughout Hibernate/JPA.

---

## 🚀 Quick Start with Docker

Run the complete platform stack (PostgreSQL database, Spring Boot API, and Nginx frontend):

```bash
# 1. Clone repository and checkout the migration branch
git clone https://github.com/mkamel30/Murabha_Cloud.git
cd Murabha_Cloud
git checkout feature/spring-boot-migration

# 2. Configure environment
cp .env.example .env

# 3. Launch Docker Compose with the Java backend
docker-compose --profile migration up -d --build
```

### Accessing the Services:
- **Web UI**: [http://localhost](http://localhost) (port 80)
- **Spring Boot API**: [http://localhost:3008/api](http://localhost:3008/api)
- **API Health Check**: [http://localhost:3008/api/health](http://localhost:3008/api/health)
- **OpenAPI / Swagger UI**: [http://localhost:3008/swagger-ui.html](http://localhost:3008/swagger-ui.html)
- **Default Super Admin Credentials**:
  - **Username**: `admin`
  - **Password**: `Admin@2026!`

---

## 💻 Local Development Setup

### 1. Run Java Spring Boot Backend
```bash
cd backend-java

# Windows (PowerShell / Command Prompt)
.\mvnw.cmd spring-boot:run

# Linux / macOS
./mvnw spring-boot:run
```
*The Spring Boot server starts on `http://localhost:3008` using in-memory H2 (zero setup required).*

### 2. Run React Frontend
In a separate terminal:
```bash
npm install
npm run dev:frontend
```
*The frontend starts on `http://localhost:2436` and communicates seamlessly with the backend.*

---

## 🧪 Automated Testing & Verification

Run the comprehensive unit, repository, and integration test suite:

```bash
cd backend-java
.\mvnw.cmd test
```

---

## 📚 Documentation Index

- [03-API_CONTRACT.md](./docs/spring-boot-migration/03-API_CONTRACT.md) — Complete 88-Endpoint API Contract Reference
- [04-TECH_MAPPING.md](./docs/spring-boot-migration/04-TECH_MAPPING.md) — Node.js to Java Spring Boot Technology Mapping
- [backend-java/README.md](./backend-java/README.md) — Java Backend Developer Manual
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System Architecture & Multi-Tenant Scoping
- [SECURITY.md](./SECURITY.md) — Security & Penetration Testing Guide
- [USER_GUIDE.md](./USER_GUIDE.md) — Comprehensive User & Operational Guide

---

## 📄 License
Proprietary software developed for enterprise Murabaha financing and installment operations.