import { Router, Request, Response } from 'express';
import { AppDataSource } from '../data-source.js';
import { Branch } from '../entities/Branch.js';
import { User, UserRole } from '../entities/User.js';
import { Customer } from '../entities/Customer.js';
import { MachineSale } from '../entities/MachineSale.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';
import { saveLocalState } from '../pgMemSource.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

const branchSchema = z.object({
  code: z.string().min(2, 'كود الفرع مطلوب').max(20).trim(),
  name: z.string().min(2, 'اسم الفرع مطلوب').max(100).trim(),
  address: z.string().max(255).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
});

// GET /api/branches - accessible to all authenticated users for dropdowns, with extra stats for HQ
router.get('/', async (req: Request, res: Response) => {
  try {
    const branchRepo = AppDataSource.getRepository(Branch);
    const branches = await branchRepo.find({ order: { name: 'ASC' } });

    const isHQ = [UserRole.SUPER_ADMIN, UserRole.HQ_MANAGER, UserRole.HQ_ACCOUNTANT].includes(req.user!.role);

    if (!isHQ) {
      // Branch user only sees their own branch or basic list
      return res.json(branches.filter(b => b.id === req.user!.branchId));
    }

    // Enhance with statistics for HQ
    const userRepo = AppDataSource.getRepository(User);
    const customerRepo = AppDataSource.getRepository(Customer);
    const saleRepo = AppDataSource.getRepository(MachineSale);

    const branchesWithStats = await Promise.all(
      branches.map(async (b) => {
        const [usersCount, customersCount, salesStats] = await Promise.all([
          userRepo.count({ where: { branchId: b.id } }),
          customerRepo.count({ where: { branchId: b.id } }),
          saleRepo
            .createQueryBuilder('s')
            .select('SUM(s.totalPrice)', 'totalSales')
            .addSelect('SUM(s.paidAmount)', 'totalPaid')
            .addSelect('SUM(s.remainingAmount)', 'totalRemaining')
            .where('s.branchId = :branchId AND s.status != :voided', { branchId: b.id, voided: 'VOIDED' })
            .getRawOne(),
        ]);

        return {
          ...b,
          usersCount,
          customersCount,
          totalSales: Number(salesStats?.totalSales || 0),
          totalPaid: Number(salesStats?.totalPaid || 0),
          totalRemaining: Number(salesStats?.totalRemaining || 0),
        };
      })
    );

    res.json(branchesWithStats);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب قائمة الفروع' });
  }
});

// POST /api/branches - Only SUPER_ADMIN
router.post('/', requireRoles(UserRole.SUPER_ADMIN), async (req: Request, res: Response) => {
  try {
    const parsed = branchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message });
    }

    const { code, name, address, phone } = parsed.data;
    const branchRepo = AppDataSource.getRepository(Branch);

    const existing = await branchRepo.findOne({ where: { code: code.toUpperCase() } });
    if (existing) {
      return res.status(400).json({ error: 'كود الفرع مستخدم بالفعل' });
    }

    const branch = branchRepo.create({
      code: code.toUpperCase(),
      name,
      address: address || null,
      phone: phone || null,
      isActive: true,
    });

    await branchRepo.save(branch);
    await logAudit(req, 'BRANCH_CREATE', 'Branch', branch.id, { code: branch.code, name: branch.name });
    saveLocalState(AppDataSource).catch(() => {});

    res.status(201).json({ message: 'تم إنشاء الفرع بنجاح', branch });
  } catch (err) {
    res.status(500).json({ error: 'فشل إنشاء الفرع' });
  }
});

// PUT /api/branches/:id - Only SUPER_ADMIN and HQ_MANAGER
router.put('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.HQ_MANAGER), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = branchSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message });
    }

    const branchRepo = AppDataSource.getRepository(Branch);
    const branch = await branchRepo.findOne({ where: { id } });
    if (!branch) {
      return res.status(404).json({ error: 'الفرع غير موجود' });
    }

    if (parsed.data.name) branch.name = parsed.data.name;
    if (parsed.data.code) branch.code = parsed.data.code.toUpperCase();
    if (parsed.data.address !== undefined) branch.address = parsed.data.address || null;
    if (parsed.data.phone !== undefined) branch.phone = parsed.data.phone || null;

    await branchRepo.save(branch);
    await logAudit(req, 'BRANCH_UPDATE', 'Branch', branch.id, parsed.data);
    saveLocalState(AppDataSource).catch(() => {});

    res.json({ message: 'تم تحديث بيانات الفرع بنجاح', branch });
  } catch (err) {
    res.status(500).json({ error: 'فشل تحديث بيانات الفرع' });
  }
});

// POST /api/branches/:id/toggle-active - Only SUPER_ADMIN
router.post('/:id/toggle-active', requireRoles(UserRole.SUPER_ADMIN), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const branchRepo = AppDataSource.getRepository(Branch);
    const branch = await branchRepo.findOne({ where: { id } });
    if (!branch) {
      return res.status(404).json({ error: 'الفرع غير موجود' });
    }

    branch.isActive = !branch.isActive;
    await branchRepo.save(branch);
    await logAudit(req, branch.isActive ? 'BRANCH_ACTIVATE' : 'BRANCH_DEACTIVATE', 'Branch', branch.id, { name: branch.name });
    saveLocalState(AppDataSource).catch(() => {});

    res.json({ message: branch.isActive ? 'تم تفعيل الفرع' : 'تم إيقاف الفرع', isActive: branch.isActive });
  } catch (err) {
    res.status(500).json({ error: 'فشل تغيير حالة الفرع' });
  }
});

// DELETE /api/branches/:id - Only SUPER_ADMIN
router.delete('/:id', requireRoles(UserRole.SUPER_ADMIN), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const branchRepo = AppDataSource.getRepository(Branch);
    const branch = await branchRepo.findOne({ where: { id } });
    if (!branch) {
      return res.status(404).json({ error: 'الفرع غير موجود' });
    }

    if (branch.code === 'HQ') {
      return res.status(400).json({ error: 'لا يمكن حذف المقر الرئيسي (HQ)' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const usersInBranch = await userRepo.count({ where: { branchId: id } });
    if (usersInBranch > 0) {
      return res.status(400).json({ error: `لا يمكن حذف الفرع لوجود (${usersInBranch}) مستخدمين مرتبطين به. يرجى نقلهم أو حذفهم أولاً.` });
    }

    await branchRepo.remove(branch);
    await logAudit(req, 'BRANCH_DELETE', 'Branch', id, { code: branch.code, name: branch.name });
    saveLocalState(AppDataSource).catch(() => {});

    res.json({ message: 'تم حذف الفرع بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'فشل حذف الفرع' });
  }
});

export default router;
