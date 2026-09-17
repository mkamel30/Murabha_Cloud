# Murabha Cloud (Java Spring Boot Edition)

[![Java](https://img.shields.io/badge/Java-17_LTS-ED8B00.svg?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.4-6DB33F.svg?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Hibernate](https://img.shields.io/badge/ORM-Hibernate_6_%2F_JPA-59666C.svg?logo=hibernate&logoColor=white)](https://hibernate.org/)
[![Database](https://img.shields.io/badge/Database-H2_%7C_PostgreSQL_%7C_Oracle-red.svg)](https://www.postgresql.org/)
[![Flyway](https://img.shields.io/badge/Migration-Flyway-CC0202.svg?logo=flyway&logoColor=white)](https://flywaydb.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)

An enterprise-grade, cloud-native platform designed for managing installment sales, Murabaha contracts, and multi-branch debt collections.

This branch (`feature/spring-boot-migration`) hosts the **Java Spring Boot 3.3 enterprise backend** (`backend-java`), providing full contract parity with the React frontend while upgrading the core services to Java 17 LTS, Spring Security 6, Spring Data JPA, and multi-database support (H2, PostgreSQL, Oracle).

---

## 🌟 Why Murabha Cloud?

Running multi-branch installment operations comes with real-world headaches: data leaks between branches, delayed collections reporting, and clunky database migrations. Murabha Cloud solves these directly:

- **Isolated Multi-Branch Operations**: Branch collectors and managers see only what belongs to their branch. Strict database-level isolation guarantees zero cross-branch data leaks.
- **HQ Visibility & Real-Time Aggregation**: Headquarters managers and accountants enjoy real-time consolidated KPIs, branch-by-branch collection benchmarks, and live payment activity streams.
- **Database Freedom (H2 dev, PostgreSQL staging, Oracle enterprise)**: Instant zero-setup development with embedded H2, robust team testing with PostgreSQL, and automated migration tooling for enterprise Oracle Database.
- **Built for Security Audits**: OWASP Top 10 compliant with Spring Security 6, tamper-proof audit trails, and zero backdoor bypasses.
- **Type-Safe Financial Engine**: Zero floating-point rounding errors via `java.math.BigDecimal` exact arithmetic and transactional FIFO installment allocation.

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

- [01-MASTER_PLAN.md](./docs/spring-boot-migration/01-MASTER_PLAN.md) — Master Migration Roadmap & Strategy
- [02-TASKS.md](./docs/spring-boot-migration/02-TASKS.md) — Granular Task Breakdown & Progress Checklist
- [03-API_CONTRACT.md](./docs/spring-boot-migration/03-API_CONTRACT.md) — Complete 88-Endpoint API Contract Reference
- [04-TECH_MAPPING.md](./docs/spring-boot-migration/04-TECH_MAPPING.md) — Node.js to Java Spring Boot Technology Mapping
- [backend-java/README.md](./backend-java/README.md) — Java Backend Developer Manual
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System Architecture & Multi-Tenant Scoping
- [SECURITY.md](./SECURITY.md) — Security & Penetration Testing Guide
- [USER_GUIDE.md](./USER_GUIDE.md) — Comprehensive User & Operational Guide

---

## 📄 License
Proprietary software developed for enterprise Murabaha financing and installment operations.