# Technology Mapping Reference

This is a detailed guide showing exactly how each Node.js/Express technology, library, and pattern maps to its Java/Spring Boot equivalent.

## 1. Core Framework Mapping

| Node.js / Express | Java / Spring Boot | Notes |
|---|---|---|
| Express.js 4.x | Spring Boot 3.3.x + Spring MVC | Full REST framework |
| TypeScript 5.6 | Java 21 LTS | Strong typing |
| tsx (dev runner) | Spring Boot DevTools | Hot reload |
| esbuild (bundler) | Maven + spring-boot-maven-plugin | Build tool |
| npm workspaces (monorepo) | Maven multi-module or single module | |
| node:http | Embedded Tomcat/Jetty | |
| process.env | application.yml + @Value / @ConfigurationProperties | |
| concurrently | N/A (backend is single process) | |

## 2. Database & ORM Mapping

| Node.js | Java | Notes |
|---|---|---|
| Prisma Client (@prisma/client) | Spring Data JPA + Hibernate 6 | |
| TypeORM 1.x | Spring Data JPA + Hibernate 6 | Unified into single ORM |
| Prisma schema.prisma | JPA @Entity annotations | |
| Prisma migrate | Flyway | Versioned SQL migrations |
| migrator.ts (raw SQL migrations) | Flyway V*.sql files | |
| prisma.$queryRawUnsafe() | @Query (JPQL/native) or JdbcTemplate | |
| better-sqlite3 | H2 Database (dev profile) | |
| pg (PostgreSQL driver) | postgresql JDBC driver | |
| oracledb (Oracle driver) | ojdbc11 (Oracle JDBC) | |
| pg-mem (embedded fallback) | H2 in-memory | |
| UUID generation (uuid package) | @GeneratedValue(strategy = GenerationType.UUID) | |
| Decimal (Prisma) | BigDecimal (Java) | Exact financial math |
| DateTime (Prisma) | LocalDateTime / Instant (Java) | |
| String JSON fields (logs) | @Convert with AttributeConverter or @Type | |

## 3. Security & Authentication Mapping

| Node.js | Java | Notes |
|---|---|---|
| jsonwebtoken (sign/verify) | jjwt-api + jjwt-impl | JWT creation & validation |
| bcryptjs (hash/compare) | BCryptPasswordEncoder (Spring Security) | |
| express middleware chain | Spring Security filter chain | |
| authenticate middleware | JwtAuthenticationFilter extends OncePerRequestFilter | |
| requireRoles() middleware | @PreAuthorize / @Secured / custom annotation | |
| branchScopeMiddleware | BranchScopeFilter implements Filter | |
| cookie-parser | Built-in HttpServletRequest.getCookies() | |
| HttpOnly refresh cookie | ResponseCookie.from().httpOnly(true) | |
| otplib (TOTP) | dev.samstevens.totp | |
| helmet (HTTP headers) | Spring Security headers() config | |
| express-rate-limit | Bucket4j + Spring Boot Starter or Resilience4j | |
| CORS config (cors package) | @CrossOrigin or CorsConfigurationSource bean | |

## 4. Validation & Error Handling

| Node.js | Java | Notes |
|---|---|---|
| Zod schemas | Jakarta Bean Validation (@Valid, @NotNull, etc.) | |
| Zod .parse() in route | @Validated on controller params | |
| Global error handler middleware | @ControllerAdvice + @ExceptionHandler | |
| Custom error classes | Custom exception classes extending RuntimeException | |
| try/catch in routes | Service layer throws, controller advice catches | |
| HTTP status codes | ResponseEntity<T> or @ResponseStatus | |

## 5. File Upload & Excel Processing

| Node.js | Java | Notes |
|---|---|---|
| multer (multipart) | @RequestParam MultipartFile | |
| exceljs (Excel generation) | Apache POI (XSSF for .xlsx) | |
| xlsx / SheetJS (Excel parsing) | Apache POI (XSSF for reading) | |
| Buffer / Stream | byte[] / InputStream / StreamingResponseBody | |
| Content-Disposition headers | HttpHeaders.CONTENT_DISPOSITION | |

## 6. HTML Document Generation

| Node.js | Java | Notes |
|---|---|---|
| Template literals (inline HTML) | Thymeleaf templates | |
| res.send(html) | Return rendered template string | |
| RTL Arabic styling inline | Thymeleaf + CSS files | |
| Print dialog trigger JS | Same JS in rendered HTML | |

## 7. Date & Utility Libraries

| Node.js | Java | Notes |
|---|---|---|
| date-fns | java.time API (LocalDate, LocalDateTime, Period, Duration) | Built-in, no library needed |
| uuid (v4) | java.util.UUID.randomUUID() | Built-in |
| crypto (Node built-in) | java.security.MessageDigest (SHA-256) | |
| JSON.parse / JSON.stringify | Jackson ObjectMapper | Auto-configured by Spring Boot |
| BigInt.prototype.toJSON | Jackson BigDecimal serialization | Auto-handled |

## 8. API Response & Serialization

| Node.js | Java | Notes |
|---|---|---|
| res.json(data) | Return DTO from @RestController (auto-serialized) | |
| res.status(201).json() | ResponseEntity.status(201).body(dto) | |
| res.setHeader() | HttpServletResponse.setHeader() or ResponseEntity.headers() | |
| req.user (from JWT middleware) | SecurityContextHolder.getContext().getAuthentication() or @AuthenticationPrincipal | |
| req.branchId (from scope middleware) | Custom BranchContext ThreadLocal or request attribute | |
| req.params.id | @PathVariable String id | |
| req.query.search | @RequestParam(required = false) String search | |
| req.body | @RequestBody @Valid SomeDto dto | |

## 9. Testing Mapping

| Node.js | Java | Notes |
|---|---|---|
| (no tests currently) | JUnit 5 + Mockito + AssertJ | |
| (no test DB) | @DataJpaTest with H2 | |
| (no API tests) | @SpringBootTest + MockMvc or TestRestTemplate | |
| (no containers) | Testcontainers (PostgreSQL, Oracle) | |

## 10. DevOps & Deployment

| Node.js | Java | Notes |
|---|---|---|
| node:20-alpine Docker | eclipse-temurin:21-jre-alpine | |
| npm ci / npm run build | mvn clean package -DskipTests | |
| dist/index.mjs | target/app.jar | |
| PORT env var | server.port in application.yml | |
| NODE_ENV=production | spring.profiles.active=prod | |
| process.on('SIGINT') | @PreDestroy or shutdown hooks | |
| healthcheck curl | Spring Actuator /actuator/health | |

## 11. Project Structure Mapping

```
Node.js (Current)                    →  Java Spring Boot (Target)
─────────────────────                    ────────────────────────
backend/                                 backend-java/
├── src/                                 └── src/main/java/com/murabha/cloud/
│   ├── index.ts (app entry)             │   ├── MurabhaCloudApplication.java
│   ├── routes/                          │   ├── controller/
│   │   ├── auth.ts                      │   │   ├── AuthController.java
│   │   ├── customers.ts                 │   │   ├── CustomerController.java
│   │   ├── sales.ts                     │   │   ├── SaleController.java
│   │   ├── installments.ts              │   │   ├── InstallmentController.java
│   │   ├── payments.ts                  │   │   ├── PaymentController.java
│   │   ├── followups.ts                 │   │   ├── FollowUpController.java
│   │   ├── dashboard.ts                 │   │   ├── DashboardController.java
│   │   ├── hqDashboard.ts               │   │   ├── HQDashboardController.java
│   │   ├── reports.ts                   │   │   ├── ReportController.java
│   │   ├── analytics.ts                 │   │   ├── AnalyticsController.java
│   │   ├── export.ts                    │   │   ├── ExportController.java
│   │   ├── import.ts                    │   │   ├── ImportController.java
│   │   ├── settings.ts                  │   │   ├── SettingsController.java
│   │   ├── branches.ts                  │   │   ├── BranchesController.java
│   │   ├── branch.ts                    │   │   ├── BranchController.java
│   │   ├── adminUsers.ts                │   │   ├── AdminUsersController.java
│   │   ├── admin.ts                     │   │   ├── AdminController.java
│   │   ├── backup.ts                    │   │   ├── BackupController.java
│   │   ├── rewards.ts                   │   │   ├── RewardController.java
│   │   └── oracleMigration.ts           │   │   └── OracleMigrationController.java
│   ├── services/                        │   ├── service/
│   │   ├── saleService.ts               │   │   ├── SaleService.java
│   │   ├── customerService.ts           │   │   ├── CustomerService.java
│   │   ├── followUpService.ts           │   │   ├── FollowUpService.java
│   │   ├── dashboardService.ts          │   │   ├── DashboardService.java
│   │   ├── hqDashboardService.ts        │   │   ├── HQDashboardService.java
│   │   ├── reportService.ts             │   │   ├── ReportService.java
│   │   ├── analyticsService.ts          │   │   ├── AnalyticsService.java
│   │   ├── exportService.ts             │   │   ├── ExportService.java
│   │   ├── monthlyExportService.ts      │   │   ├── MonthlyExportService.java
│   │   ├── auditService.ts              │   │   ├── AuditService.java
│   │   ├── branchConfigService.ts       │   │   ├── BranchConfigService.java
│   │   └── oracleMigrationService.ts    │   │   └── OracleMigrationService.java
│   ├── middleware/                      │   ├── security/
│   │   ├── auth.ts                      │   │   ├── JwtAuthenticationFilter.java
│   │   └── branchScope.ts               │   │   ├── BranchScopeFilter.java
│   │                                    │   │   ├── JwtTokenProvider.java
│   │                                    │   │   └── SecurityConfig.java
│   ├── entities/ (TypeORM)              │   ├── entity/
│   ├── repositories/ (Prisma)           │   ├── repository/
│   ├── lib/prisma.ts                    │   │   (Spring Data JPA auto-implements)
│   └── data-source.ts (TypeORM)         │   ├── config/
│                                        │   │   ├── DataSourceConfig.java
│                                        │   │   ├── CorsConfig.java
│                                        │   │   └── RateLimitConfig.java
│                                        │   ├── dto/
│                                        │   │   ├── request/
│                                        │   │   └── response/
│                                        │   ├── exception/
│                                        │   │   ├── GlobalExceptionHandler.java
│                                        │   │   └── (custom exceptions)
│                                        │   └── util/
├── prisma/schema.prisma                 └── src/main/resources/
└── package.json                             ├── application.yml
                                             ├── application-dev.yml
                                             ├── application-prod.yml
                                             ├── db/migration/ (Flyway)
                                             ├── templates/ (Thymeleaf)
                                             └── pom.xml (or build.gradle)
```

## 12. Key Behavioral Differences to Watch

Critical behavioral differences between Node.js and Java that could cause bugs if not handled correctly during migration:

1. **Floating point vs BigDecimal**: Node.js uses IEEE 754 doubles; Prisma Decimal is string-based. Java `BigDecimal` must be used for ALL financial calculations with proper scale/rounding mode to avoid precision errors.

2. **Date/timezone**: Node.js `Date` is always UTC internally. Java `LocalDateTime` has no timezone; use `Instant` or `ZonedDateTime` for database storage. Ensure Jackson serializes dates in ISO 8601 format matching the current API.

3. **Null handling**: TypeScript optional fields (`field?`) map to Java `Optional<T>` or nullable fields with `@Nullable` annotation. Be careful with `NullPointerException` (NPEs).

4. **JSON serialization**: Express auto-serializes with `JSON.stringify`; Spring Boot uses Jackson. Configure Jackson to: exclude null fields (if current API does), handle `BigDecimal` as numbers (not strings), format dates correctly.

5. **Error response format**: Current Node.js returns `{ error: 'message' }` or `{ message: 'message', code: 'CODE' }`. Spring Boot `@ControllerAdvice` must match this EXACTLY to avoid breaking front-end clients.

6. **Transaction handling**: Node.js uses Prisma's `$transaction()` for atomic operations. Spring Boot uses `@Transactional` annotation — much cleaner but be aware of proxy-based AOP limitations (self-invocation doesn't trigger transactions).

7. **Async model**: Node.js is single-threaded async (event loop). Spring Boot is multi-threaded synchronous by default. This is actually simpler — no async/await needed. But be careful with thread-local storage for branch context.

8. **Cookie behavior**: `HttpOnly` cookie setting in Express vs Spring. Ensure `SameSite`, `Secure`, `Path`, `MaxAge` all match the existing implementation exactly.

9. **CORS**: Express `cors()` middleware vs Spring `CorsConfigurationSource`. Must allow same origins with credentials.

10. **File upload size limits**: Express `json({ limit: '10mb' })` maps to `spring.servlet.multipart.max-file-size=10MB` in `application.yml`.
