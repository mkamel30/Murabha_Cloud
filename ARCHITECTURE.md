# Architecture & Technical Design (دليل المعمارية الفنية)

وثيقة التصميم المعماري لمنظومة **Murabha Cloud** لمساعدة الفرق التقنية ومسؤولي الأنظمة.

---

## 🏗️ 1. المخطط العام للنظام (System Architecture)

```
[ Web Browser Client / Frontend SPA ]
          │  (React 18 + Vite + Tailwind + Axios)
          ▼
[ Nginx Reverse Proxy (Port 80) ]
    ├── Static SPA Assets (/usr/share/nginx/html)
    └── Reverse Proxy /api/ ───────┐
                                   ▼
                   [ Express 4 / Node.js 20 LTS ]
                     ├── Rate Limiter & Helmet CSP
                     ├── Auth Middleware (JWT + RBAC)
                     ├── Branch Scope Isolation Middleware
                     ├── Audit Logging Service
                     └── TypeORM Database Driver Layer
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
       [ PostgreSQL Database ]        [ Oracle Database ]
       (Current Engine / Active)     (Enterprise Target / Thin Mode)
```

---

## 🏢 2. نموذج عزل الفروع (Multi-Tenant Branch Scoping)

تم بناء عزل الفروع في عمق طبقة البيانات لمنع ثغرات الوصول غير المصرح به (Broken Object Level Authorization):

1. **الكيانات المرتبطة بالفرع**:
   - `Customer`, `MachineSale`, `Installment`, `Payment`, `FollowUp` ترتبط جميعها بعمود `branchId` كقيد أجنبي غير قابل للتجاوز.
2. **برمجية العزل الوسيطة (`branchScope.ts`)**:
   - يقوم بفحص رمز التحقق (JWT) الخاص بالمستخدم.
   - إذا كان دور المستخدم ينتمي للفرع (`BRANCH_MANAGER`, `BRANCH_COLLECTOR`, `BRANCH_DATA_ENTRY`)، يتم إجبار أي استعلام على تضمين `branchId = user.branchId`.
   - محاولة تمرير أو طلب معرّف فرع آخر يتم رفضها فورياً برمز خطأ `403 Forbidden`.
3. **أدوار الإدارة العليا (HQ Roles)**:
   - المستخدمون برتبة `SUPER_ADMIN` أو `HQ_MANAGER` أو `HQ_ACCOUNTANT` يمتلكون حق تمرير رأس الطلب `x-branch-id` لاستهداف فرع معين، أو تركه فارغاً للاستعلام التجميعي الشامل لكافة الفروع.

---

## 🔄 3. استراتيجية الترحيل إلى Oracle Database

لضمان المرونة الكاملة بين بيئة التطوير السريعة (PostgreSQL) ومتطلبات المؤسسات الكبرى (Oracle Enterprise):

1. **طبقة الكيانات الموحدة**:
   - تم تصميم كيانات TypeORM باستخدام معايير ANSI SQL مدعومة في كلا المحركين، مع محولات الأرقام العشرية `decimalTransformer` التي تضمن دقة العمليات الحسابية للأموال.
2. **اتصال أوراكل بدون تبعيات C**:
   - نستخدم حزمة `node-oracledb` إصدار 6+ في وضعية **Thin Mode**، مما يتيح الاتصال المباشر عبر بروتوكول الشبكة دون الحاجة لتثبيت برمجيات خارجية مثل Oracle Instant Client.
3. **معالج الترحيل في لوحة التحكم (`OracleMigrationWizard`)**:
   - **الخطوة الأولى**: اختبار الاتصال (Ping & Version validation).
   - **الخطوة الثانية**: توليد الجداول والفهارس آلياً (`synchronize: false` مع تنفيذ DDL المخصص).
   - **الخطوة الثالثة**: سحب البيانات من PostgreSQL على دفعات متتالية ونقلها لأوراكل داخل معاملة واحدة آمنة (Atomic Transaction).
   - **الخطوة الرابعة**: تدقيق مالي مزدوج: حساب إجمالي مبالغ المبيعات والأقساط والتحصيلات في كلا المحركين ومقارنة النتائج لضمان سلامة الأرصدة بنسبة 100%.
