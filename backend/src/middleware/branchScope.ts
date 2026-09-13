import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../entities/User.js';

export function branchScopeMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next();
  }

  const { role, branchId: userBranchId } = req.user;

  const isHQ = [UserRole.SUPER_ADMIN, UserRole.HQ_MANAGER, UserRole.HQ_ACCOUNTANT].includes(role);

  if (!isHQ) {
    // Branch-scoped user: force strict branchId
    if (!userBranchId) {
      return res.status(403).json({ error: 'حساب المستخدم غير مرتبط بأي فرع فعال' });
    }

    // Anti-BOLA / IDOR: Check if non-HQ user is attempting to pass a different branchId header/param
    const requestedBranch = (req.headers['x-branch-id'] as string) || (req.query.branchId as string);
    if (requestedBranch && requestedBranch !== userBranchId) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى بيانات فرع آخر (Access Denied)' });
    }

    req.branchId = userBranchId;
  } else {
    // HQ user: can specify branch via header or query, or see all
    const requestedBranch = (req.headers['x-branch-id'] as string) || (req.query.branchId as string) || null;
    req.branchId = requestedBranch && requestedBranch !== 'ALL' ? requestedBranch : null;
  }

  next();
}
