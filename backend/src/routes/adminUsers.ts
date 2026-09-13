import { Router, Request, Response } from 'express';
import { AppDataSource } from '../data-source.js';
import { User, UserRole } from '../entities/User.js';
import { Branch } from '../entities/Branch.js';
import { hashPassword } from '../utils/auth.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';
import { z } from 'zod';

const router = Router();

// Only SUPER_ADMIN and HQ_MANAGER can access user management
router.use(authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.HQ_MANAGER));

const createUserSchema = z.object({
  username: z.string().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل').max(50).trim(),
  name: z.string().min(2, 'الاسم مطلوب').max(100).trim(),
  email: z.string().email('بريد إلكتروني غير صالح').optional().or(z.literal('')),
  password: z.string().min(6, 'كلمة المرور يجب أن لا تقل عن 6 أحرف'),
  role: z.nativeEnum(UserRole),
  branchId: z.string().uuid().optional().nullable(),
});

const updateUserSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب').max(100).trim().optional(),
  email: z.string().email('بريد إلكتروني غير صالح').optional().or(z.literal('')),
  role: z.nativeEnum(UserRole).optional(),
  branchId: z.string().uuid().optional().nullable(),
});

// GET /api/admin/users
router.get('/', async (req: Request, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const users = await userRepo.find({
      relations: { branch: true },
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب قائمة المستخدمين' });
  }
});

// POST /api/admin/users
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message });
    }

    const { username, name, email, password, role, branchId } = parsed.data;
    const userRepo = AppDataSource.getRepository(User);

    const existing = await userRepo.findOne({ where: { username: username.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'اسم المستخدم مسجل بالفعل' });
    }

    if (branchId) {
      const branchRepo = AppDataSource.getRepository(Branch);
      const branch = await branchRepo.findOne({ where: { id: branchId } });
      if (!branch) {
        return res.status(400).json({ error: 'الفرع المحدد غير موجود' });
      }
    }

    const hashedPassword = await hashPassword(password);
    const newUser = userRepo.create({
      username: username.toLowerCase(),
      name,
      email: email || null,
      password: hashedPassword,
      role,
      branchId: branchId || null,
      isActive: true,
    });

    await userRepo.save(newUser);
    await logAudit(req, 'USER_CREATE', 'User', newUser.id, { username, role, branchId });

    res.status(201).json({
      message: 'تم إنشاء المستخدم بنجاح',
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        branchId: newUser.branchId,
        isActive: newUser.isActive,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إنشاء المستخدم' });
  }
});

// PUT /api/admin/users/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    if (parsed.data.name) user.name = parsed.data.name;
    if (parsed.data.email !== undefined) user.email = parsed.data.email || null;
    if (parsed.data.role) user.role = parsed.data.role;
    if (parsed.data.branchId !== undefined) user.branchId = parsed.data.branchId;

    await userRepo.save(user);
    await logAudit(req, 'USER_UPDATE', 'User', user.id, parsed.data);

    res.json({ message: 'تم تحديث بيانات المستخدم بنجاح', user });
  } catch (err) {
    res.status(500).json({ error: 'فشل تحديث بيانات المستخدم' });
  }
});

// POST /api/admin/users/:id/reset-password
router.post('/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    user.password = await hashPassword(newPassword);
    await userRepo.save(user);
    await logAudit(req, 'USER_RESET_PASSWORD', 'User', user.id, { username: user.username });

    res.json({ message: 'تمت إعادة تعيين كلمة المرور بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'فشل تعيين كلمة المرور' });
  }
});

// POST /api/admin/users/:id/toggle-active
router.post('/:id/toggle-active', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (id === req.user?.userId) {
      return res.status(400).json({ error: 'لا يمكنك تجميد حسابك الشخصي' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    user.isActive = !user.isActive;
    await userRepo.save(user);
    await logAudit(req, user.isActive ? 'USER_ACTIVATE' : 'USER_SUSPEND', 'User', user.id, { username: user.username });

    res.json({ message: user.isActive ? 'تم تنشيط الحساب' : 'تم تجميد الحساب', isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ error: 'فشل تغيير حالة الحساب' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (id === req.user?.userId) {
      return res.status(400).json({ error: 'لا يمكنك حذف حسابك الحالي' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    await userRepo.remove(user);
    await logAudit(req, 'USER_DELETE', 'User', id, { username: user.username });

    res.json({ message: 'تم حذف المستخدم بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'فشل حذف المستخدم' });
  }
});

export default router;
