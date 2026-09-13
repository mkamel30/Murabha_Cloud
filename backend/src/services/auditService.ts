import { AppDataSource } from '../data-source.js';
import { AuditLog } from '../entities/AuditLog.js';
import { Request } from 'express';

export async function logAudit(
  req: Request | null,
  action: string,
  targetEntity?: string,
  targetId?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const repo = AppDataSource.getRepository(AuditLog);
    const audit = new AuditLog();
    audit.action = action;
    audit.targetEntity = targetEntity || null;
    audit.targetId = targetId || null;
    audit.details = details ? JSON.stringify(details) : null;

    if (req) {
      audit.userId = req.user?.userId || null;
      audit.username = req.user?.username || null;
      audit.userRole = req.user?.role || null;
      audit.branchId = req.user?.branchId || null;
      audit.ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;
      audit.userAgent = req.headers['user-agent'] || null;
    }

    await repo.save(audit);
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err);
  }
}
