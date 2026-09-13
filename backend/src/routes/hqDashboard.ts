import { Router, Request, Response } from 'express';
import { HQDashboardService } from '../services/hqDashboardService.js';
import { authenticate } from '../middleware/auth.js';
import { branchScopeMiddleware } from '../middleware/branchScope.js';

const router = Router();
const hqDashboardService = new HQDashboardService();

router.use(authenticate, branchScopeMiddleware);

router.get('/hq', async (req: Request, res: Response) => {
  try {
    const stats = await hqDashboardService.getHQStats(req.branchId);
    res.json(stats);
  } catch (err: any) {
    console.error('[HQDashboard] Error:', err);
    res.status(500).json({ error: 'فشل جلب إحصائيات لوحة التحكم التنفيذية' });
  }
});

export default router;
