# Security & Penetration Testing Guide (دليل الأمان واختبار الاختراق)

تم إعداد هذا المستند لمساعدة فريق الأمن السيبراني واختبار الاختراق (Penetration Testing Team) في مراجعة النظام والتأكد من توافقه مع معايير **OWASP Top 10**.

---

## 🛡️ 1. التوثيق والتحكم بالوصول (Authentication & Access Control)

- **تجزئة كلمات المرور**:
  - خوارزمية التجزئة: `bcryptjs` مع عامل تمليح (Salt Rounds) مقداره `12`.
- **إدارة الجلسات (Token Management)**:
  - **Access Token**: رمز JWT قصير الصلاحية (15 دقيقة) يُحمل في رأس الطلب `Authorization: Bearer <token>`.
  - **Refresh Token**: رمز JWT بصلاحية 7 أيام، مخزن داخل ملف تعريف ارتباط آمن:
    - `HttpOnly: true` (يحمي من سرقة الرمز عبر هجمات XSS).
    - `SameSite: Strict` (يحمي من هجمات CSRF).
    - `Secure: true` في بيئة الإنتاج.
- **إبطال الأبواب الخلفية (Backdoor Remediation)**:
  - تم إلغاء كود التجاوز القديم (`344405`) الذي كان متواجداً في النسخة المحلية السابقة، واستبداله بتدقيق صلاحية `SUPER_ADMIN` الصارم مع ميزة التحقق الثنائي (TOTP MFA).

---

## 🔒 2. حماية الفروع وتفادي ثغرات BOLA / IDOR

- **التحقق المركزي من الصلاحيات**:
  - جميع نقاط النهاية التشغيلية تخضع لبرمجية `branchScope.ts`.
  - يتم مقارنة معرف الفرع المستهدف في الطلب بمعرف فرع المستخدم المستخرج من التوكن الموثق.
  - محاولة التلاعب بالـ `branchId` في الـ Request Body أو الـ URL Params تؤدي إلى حظر الطلب وتسجيل محاولة غير مصرح بها في سجل التدقيق `AuditLog`.

---

## 📝 3. سجل التدقيق الأمني (Immutable Audit Trail)

- يتم تسجيل جميع العمليات الإدارية والمالية الحساسة داخل جدول `audit_logs`:
  - `action`: نوع العملية (مثال: `LOGIN_FAILED`, `DB_RESET_SUCCESS`, `USER_UPDATE`, `BRANCH_DEACTIVATE`).
  - `entity`: الكيان المتأثر (`User`, `Branch`, `Payment`, `Database`).
  - `performedBy`: معرّف المستخدم المنفذ.
  - `ipAddress`: عنوان بروتوكول الإنترنت للمنفذ (IPv4 / IPv6).
  - `userAgent`: متصفح ونظام المنفذ.
  - `metadata`: تفاصيل التغيير التي تمت بصيغة JSON.
  - `createdAt`: طابع زمني غير قابل للتعديل.

---

## 🌐 4. أمان الشبكة والواجهة (Network & HTTP Headers)

- **Helmet Protection**:
  - تفعيل رؤوس الحماية القياسية (Content Security Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff).
- **معدل الطلبات (Rate Limiting)**:
  - حماية بوابة تسجيل الدخول `/api/auth/login` بحد أقصى 5 محاولات لكل 15 دقيقة لمنع هجمات التخمين (Brute-force).
  - حماية واجهات الـ API العامة بحد أقصى 200 طلب في الدقيقة.
- **الحماية من حقن SQL (SQL Injection)**:
  - الاعتماد الكامل على TypeORM المجهز باستعلامات مُعلمنة (Parameterized Queries). لا توجد استعلامات نصية حرة تدمج مدخلات المستخدم مباشرة.
