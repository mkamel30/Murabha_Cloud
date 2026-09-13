# Murabha Cloud (المرابحة الذكية - المنظومة السحابية)

[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![TypeORM](https://img.shields.io/badge/ORM-TypeORM-orange.svg)](https://typeorm.io/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_%7C_Oracle_DB-red.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

منظومة سحابية متكاملة لإدارة مبيعات التقسيط، المرابحة، والتحصيلات للمؤسسات والشركات متعددة الفروع.
تمت إعادة هيكلة النظام وتطويره من تطبيق محلي إلى منصة سحابية مؤسسية آمنة خالية تماماً من ثغرات BOLA/IDOR ومعدة للخضوع لاختبارات الاختراق (Penetration Testing) والنشر الفوري.

---

## 🌟 أبرز الميزات التقنية (Core Capabilities)

1. **معمارية سحابية متعددة الفروع (Multi-Tenant Branch Architecture)**:
   - عزل صارم لقواعد وبيانات الفروع على مستوى طبقة البيانات (`branchId` scoping).
   - منع ثغرات BOLA/IDOR: لا يمكن لموظف أو محصل في فرع الاطلاع على عملاء أو أقساط فرع آخر.
   - مبدل الفروع الذكي (HQ Branch Switcher) لكبار المدراء والمحاسبين للإشراف الشامل.

2. **الصلاحيات والأدوار الصارمة (Role-Based Access Control - RBAC)**:
   - `SUPER_ADMIN`: إدارة النظام بالكامل، المستخدمين، الفروع، وتصفير/ترحيل قواعد البيانات.
   - `HQ_MANAGER`: إدارة الفروع، مراقبة مؤشرات الأداء، واطلاع على كافة العمليات.
   - `HQ_ACCOUNTANT`: مطابقة الإيرادات والتحصيلات على مستوى كافة الفروع.
   - `BRANCH_MANAGER`: إدارة مبيعات وعقود وموظفي الفرع التابع له فقط.
   - `BRANCH_COLLECTOR`: تحصيل الأقساط وإصدار الإيصالات داخل الفرع فقط.
   - `BRANCH_DATA_ENTRY`: إدخال بيانات العملاء والعقود.

3. **لوحة تحكم تنفيذية مجمعة (HQ Executive Dashboard)**:
   - مؤشرات أداء مالية حية (إجمالي الذمم النشطة، التحصيلات، نسب التحصيل، والديون المتعثرة).
   - جدول مقارنة تفاعلي لأداء الفروع (Branch Benchmarking).
   - بث حي لعمليات التحصيل على مستوى كافة الفروع (Live Collections Feed).

4. **دعم مزدوج لقواعد البيانات (PostgreSQL + Oracle Database)**:
   - اعتماد **TypeORM** لدعم العمل على **PostgreSQL** وميناء أوراكل بدون أي تعديل في الأكواد.
   - **معالج ترحيل أوراكل الآلي (Oracle Migration Wizard)** من داخل لوحة التحكم:
     - اختبار الاتصال بمحرك أوراكل عبر `node-oracledb` في وضع Thin Mode (لا يحتاج Oracle Instant Client C-binaries).
     - توليد هيكل الجداول والقيود في أوراكل بنقرة زر (Auto-DDL Provisioning).
     - ترحيل البيانات دفعة واحدة مع تدقيق ومطابقة مالية مزدوجة (Double-Entry Financial Audit).

5. **أعلى معايير الأمان (Enterprise Security)**:
   - تشفير كلمات المرور باستخدام `bcrypt` (عامل التمليح 12).
   - توثيق مزدوج عبر Access Tokens (قصيرة الأجل) و Refresh Tokens مخزنة في كوكيز `HttpOnly, SameSite=Strict, Secure`.
   - سجل تدقيق أمني غير قابل للتعديل (`AuditLog`) يرصد كافة العمليات الحساسة مع عنوان الـ IP والـ User-Agent.
   - حماية ضد الهجمات: Helmet CSP، ومعدل طلبات صارم (Rate Limiting)، وحظر حقن SQL بواسطة الـ ORM المبرمج بالـ Parameterized Queries.

---

## 🚀 التشغيل السريع باستخدام Docker (Quickstart)

### المتطلبات الأساسية
- تثبيت [Docker](https://docs.docker.com/get-docker/) و [Docker Compose](https://docs.docker.com/compose/install/).

### خطوات التشغيل:
1. استنساخ المستودع:
   ```bash
   git clone https://github.com/mkamel30/Murabha_Cloud.git
   cd Murabha_Cloud
   ```

2. إعداد متغيرات البيئة:
   ```bash
   cp .env.example .env
   # قم بتعديل المفاتيح السرية وكلمات المرور داخل .env للبيئات الإنتاجية
   ```

3. تشغيل الحاويات:
   ```bash
   docker-compose up -d --build
   ```

4. بذر المستخدم الافتراضي والفروع الأساسية:
   ```bash
   docker exec -it murabha_backend npm run seed
   ```

5. الدخول إلى النظام:
   - الواجهة الرسومية: `http://localhost`
   - واجهة الـ API: `http://localhost:3000/api/health`
   - **الحساب الافتراضي للمسؤول (Super Admin)**:
     - اسم المستخدم: `admin`
     - كلمة المرور: `Admin@2026!`

---

## 🛠️ التشغيل المحلي للمطورين (Local Development)

```bash
# 1. تثبيت الحزم للمشروع بالكامل
npm install

# 2. تشغيل محرك PostgreSQL محلياً أو عبر دوكر
# 3. تشغيل بيئة التطوير الموحدة
npm run dev
```

- السيرفر الخلفي: `http://localhost:3000`
- السيرفر الأمامي: `http://localhost:5173`

---

## 📄 التوثيق الإضافي
- [دليل البنية المعمارية (ARCHITECTURE.md)](./ARCHITECTURE.md)
- [دليل الأمان واختبارات الاختراق (SECURITY.md)](./SECURITY.md)
