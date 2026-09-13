import { Router, Request, Response } from 'express';
import { AppDataSource } from '../data-source.js';
import { User } from '../entities/User.js';
import { comparePassword, generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/auth.js';
import { logAudit } from '../services/auditService.js';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب').trim(),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0]?.message || 'بيانات غير صالحة' });
    }

    const { username, password } = parseResult.data;
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({
      where: { username: username.toLowerCase() },
      relations: { branch: true },
    });

    if (!user) {
      await logAudit(req, 'LOGIN_FAILED', 'User', undefined, { username, reason: 'User not found' });
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    if (!user.isActive) {
      await logAudit(req, 'LOGIN_BLOCKED', 'User', user.id, { username, reason: 'Account suspended' });
      return res.status(403).json({ error: 'تم تجميد هذا الحساب، يرجى مراجعة إدارة النظام' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      await logAudit(req, 'LOGIN_FAILED', 'User', user.id, { username, reason: 'Invalid password' });
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    // Update last login
    user.lastLogin = new Date();
    await userRepo.save(user);

    const payload = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    await logAudit(req, 'LOGIN_SUCCESS', 'User', user.id, { username, role: user.role, branch: user.branch?.name });

    res.json({
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch?.name || (user.branchId ? null : 'المقر الرئيسي'),
      },
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'جلسة العمل غير متوفرة' });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'انتهت صلاحية الجلسة' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: payload.userId },
      relations: { branch: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'المستخدم غير متاح أو موقوف' });
    }

    const newPayload = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
    };

    const newAccessToken = generateAccessToken(newPayload);

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(500).json({ error: 'فشل تجديد الجلسة' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: req.user!.userId },
      relations: { branch: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch?.name || (user.branchId ? null : 'المقر الرئيسي (HQ)'),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب بيانات المستخدم' });
  }
});

export default router;
