import { Router, Request, Response } from 'express';
import { OracleMigrationService } from '../services/oracleMigrationService.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { UserRole } from '../entities/User.js';
import { logAudit } from '../services/auditService.js';
import { z } from 'zod';

const router = Router();
const migrationService = new OracleMigrationService();

router.use(authenticate, requireRoles(UserRole.SUPER_ADMIN));

const oracleConfigSchema = z.object({
  host: z.string().min(1, 'عنوان الخادم مطلوب').trim(),
  port: z.number().int().positive().default(1521),
  serviceName: z.string().min(1, 'اسم الخدمة (Service Name / SID) مطلوب').trim(),
  username: z.string().min(1, 'اسم المستخدم مطلوب').trim(),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

// POST /api/admin/oracle/test-connection
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const parsed = oracleConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message });
    }

    const result = await migrationService.testConnection(parsed.data);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل فحص الاتصال بأوراكل' });
  }
});

// POST /api/admin/oracle/provision-schema
router.post('/provision-schema', async (req: Request, res: Response) => {
  try {
    const parsed = oracleConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message });
    }

    const result = await migrationService.provisionSchema(parsed.data);
    await logAudit(req, 'ORACLE_PROVISION_SCHEMA', 'Database', undefined, { host: parsed.data.host });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل إنشاء هيكل الجداول في أوراكل' });
  }
});

// POST /api/admin/oracle/migrate-data
router.post('/migrate-data', async (req: Request, res: Response) => {
  try {
    const parsed = oracleConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message });
    }

    const result = await migrationService.migrateData(parsed.data);
    await logAudit(req, 'ORACLE_DATA_MIGRATION', 'Database', undefined, {
      totalTransferred: result.totalTransferred,
      success: result.success,
      salesMatched: result.financialAudit.salesMatched,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل ترحيل البيانات إلى أوراكل' });
  }
});

export default router;
