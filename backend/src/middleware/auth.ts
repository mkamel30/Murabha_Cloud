import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/auth.js';
import { UserRole } from '../entities/User.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      branchId?: string | null;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول للوصول إلى هذا المحتوى' });
  }

  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول', code: 'TOKEN_EXPIRED' });
  }

  req.user = payload;
  next();
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'ليس لديك الصلاحية الكافية لتنفيذ هذا الإجراء' });
    }

    next();
  };
}
