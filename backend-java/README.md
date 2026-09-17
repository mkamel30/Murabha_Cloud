# Murabha Cloud — Java Spring Boot Backend

[![Java](https://img.shields.io/badge/Java-17_LTS-ED8B00.svg?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.4-6DB33F.svg?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Spring Security](https://img.shields.io/badge/Security-Spring_Security_6-6DB33F.svg)](https://spring.io/projects/spring-security)
[![Hibernate](https://img.shields.io/badge/ORM-Hibernate_6_%2F_JPA-59666C.svg?logo=hibernate&logoColor=white)](https://hibernate.org/)
[![Database](https://img.shields.io/badge/Database-H2_%7C_PostgreSQL_%7C_Oracle-red.svg)](https://www.postgresql.org/)
[![Flyway](https://img.shields.io/badge/Migration-Flyway-CC0202.svg?logo=flyway&logoColor=white)](https://flywaydb.org/)

Enterprise cloud backend for **Murabha Cloud (مرابحة كلاود)**, rewritten in Java 21/17 and Spring Boot 3.3.4. It serves the identical REST API contract expected by the React frontend while delivering multi-tenant branch isolation, high-throughput concurrent transaction handling, and type-safe financial operations.

---

## 🏗️ Project Architecture & Package Structure

```
com.murabha.cloud
├── MurabhaCloudApplication.java     # Main Spring Boot entry point
├── config/                          # Security, CORS, OpenAPI, and Rate Limiting beans
├── controller/                      # REST API controllers matching the 88 endpoints
├── dto/                             # Request and Response DTOs with Bean Validation
│   ├── request/
│   └── response/
├── entity/                          # JPA entities with branch isolation
├── repository/                      # Spring Data JPA repositories with custom queries
├── service/                         # Transactional business logic (FIFO, schedules)
├── security/                        # JWT authentication filter, token provider, RBAC
├── middleware/                      # Multi-tenant branch scope servlet filter (BOLA guard)
├── exception/                       # Global @ControllerAdvice exception handler
├── util/                            # Currency, date, and hashing utilities
└── migration/                       # Oracle Database migration service
```

---

## ⚡ Prerequisites

- **Java Development Kit (JDK)**: OpenJDK 17 LTS or higher.
- **Maven**: Bundled via the Maven Wrapper (`mvnw` / `mvnw.cmd`). No global Maven installation required.
- **Docker** *(optional)*: For running PostgreSQL or containerized builds.

---

## ⚙️ Configuration & Profiles

The application is configured using Spring profiles in `src/main/resources/`:

| Profile | Target Database | Description | Activation Command |
| :--- | :--- | :--- | :--- |
| **`dev`** *(default)* | In-Memory H2 | Zero-setup, instant start. H2 Web Console at `/h2-console`. | `./mvnw spring-boot:run` |
| **`staging`** | PostgreSQL | Connects to local or Dockerized PostgreSQL (`localhost:5432`). | `./mvnw spring-boot:run -Dspring-boot.run.profiles=staging` |
| **`prod`** | PostgreSQL / Oracle | Production deployment with Flyway migration validation. | `java -jar app.jar --spring.profiles.active=prod` |

### Environment Variables

When running in `staging` or `prod`, customize using environment variables:

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=murabha
export DB_USER=postgres
export DB_PASSWORD=YourPassword!
export JWT_ACCESS_SECRET=your-256-bit-secret-key...
export SERVER_PORT=3008
```

---

## 🚀 Building & Running Locally

### 1. Compile and Run with Maven Wrapper
```bash
# Windows (PowerShell / Command Prompt)
.\mvnw.cmd spring-boot:run

# Linux / macOS
./mvnw spring-boot:run
```

The server starts on **`http://localhost:3008`** (configured to run in parallel with the Node.js backend on `3007`).

### 2. Run Automated Tests
```bash
.\mvnw.cmd test
```

### 3. Package Production JAR
```bash
.\mvnw.cmd clean package -DskipTests
# The packaged executable JAR is output to: target/murabha-cloud-backend-2.0.0-SNAPSHOT.jar
```

---

## 📑 Interactive API Documentation (OpenAPI / Swagger)

When the server is running, access the interactive OpenAPI documentation:
- **Swagger UI**: [http://localhost:3008/swagger-ui.html](http://localhost:3008/swagger-ui.html)
- **OpenAPI JSON Spec**: [http://localhost:3008/v3/api-docs](http://localhost:3008/v3/api-docs)

---

## 🐳 Docker Deployment

Build and run using the optimized multi-stage Dockerfile:

```bash
# Build Docker image
docker build -t murabha-cloud-backend-java -f Dockerfile .

# Run container connected to PostgreSQL
docker run -d --name murabha_backend_java \
  -p 3008:3008 \
  -e SPRING_PROFILES_ACTIVE=staging \
  -e DB_HOST=host.docker.internal \
  -e DB_USER=postgres \
  -e DB_PASSWORD=Murabha@Cloud2026! \
  murabha-cloud-backend-java
```

---

## 🛡️ Security & Multi-Tenancy Architecture

1. **Branch Isolation (`BranchScopeFilter`)**: Every request is intercepted. Branch users are locked to their own assigned `branchId`. Attempts to supply a foreign `x-branch-id` header or parameter trigger a `403 Forbidden` BOLA rejection.
2. **Dual-Token Architecture**: 15-minute JJWT Access Tokens + 7-day `HttpOnly` Refresh Token Cookies.
3. **Exact Financial Precision**: All amounts use `java.math.BigDecimal` with `ROUND_HALF_UP` scale 2 to prevent IEEE 754 floating-point errors.
4. **FIFO Payment Allocation**: Payments are applied across unpaid installments in strict chronological order inside transactional boundaries (`@Transactional`).