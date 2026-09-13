import { Router, Request, Response } from 'express';
import { authenticator } from 'otplib';
import { AppDataSource } from '../data-source.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { UserRole } from '../entities/User.js';
import { Payment } from '../entities/Payment.js';
import { Installment } from '../entities/Installment.js';
import { MachineSale } from '../entities/MachineSale.js';
import { FollowUp } from '../entities/FollowUp.js';
import { Customer } from '../entities/Customer.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.use(authenticate, requireRoles(UserRole.SUPER_ADMIN));

const MASTER_MFA_SECRET = process.env.MASTER_MFA_SECRET || 'NVRW643UMF2HK3DM';

router.post('/database/reset', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const isValid = authenticator.check(code, MASTER_MFA_SECRET);

    if (!isValid) {
      await logAudit(req, 'DB_RESET_FAILED', 'Database', undefined, { reason: 'Invalid MFA' });
      return res.status(401).json({ 
        error: 'كود الأمان غير صحيح. يرجى التأكد من ضبط وقت وتاريخ الجهاز والموبايل بشكل دقيق وحاول مجدداً.' 
      });
    }

    // Perform database reset (Wipe sensitive transactional data in TypeORM)
    console.log('MFA Verified. Resetting database via TypeORM...');

    try {
      // Delete in strict dependency order
      await AppDataSource.getRepository(Payment).delete({});
      await AppDataSource.getRepository(Installment).delete({});
      await AppDataSource.getRepository(MachineSale).delete({});
      await AppDataSource.getRepository(FollowUp).delete({});
      await AppDataSource.getRepository(Customer).delete({});

      await logAudit(req, 'DB_RESET_SUCCESS', 'Database', undefined, { status: 'Cleared transactional data' });
      console.log('Database reset complete.');
      res.json({ message: 'تم تصفير قاعدة البيانات بنجاح' });
    } catch (dbError: any) {
      console.error('Database deletion failed:', dbError);
      throw dbError;
    }
  } catch (error: any) {
    console.error('Reset failed:', error);
    res.status(500).json({ 
      error: 'فشل في تصفير قاعدة البيانات',
      details: error?.message 
    });
  }
});

export default router;
