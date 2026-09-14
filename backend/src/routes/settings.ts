import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { requireRoles } from '../middleware/auth.js';
import { UserRole } from '../entities/User.js';

const router = Router();

export async function getSystemSetting(key: string, defaultValue = 'false'): Promise<string> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ value: string }[]>(
      `SELECT value FROM SystemSetting WHERE key = '${key}' LIMIT 1`
    );
    if (rows && rows.length > 0) {
      return rows[0].value;
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

// GET all system settings
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.$queryRawUnsafe<{ key: string; value: string; description: string }[]>(
      `SELECT key, value, description FROM SystemSetting`
    ).catch(() => []);

    const settings: Record<string, any> = {
      enableCashSales: false,
      paymentPlaces: ['Damen', 'البريد', 'البنك'],
    };

    for (const row of rows) {
      if (row.value === 'true') {
        settings[row.key] = true;
      } else if (row.value === 'false') {
        settings[row.key] = false;
      } else {
        try {
          settings[row.key] = JSON.parse(row.value);
        } catch {
          settings[row.key] = row.value;
        }
      }
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// UPDATE a system setting (Super Admin & HQ Manager only)
router.put('/:key', requireRoles(UserRole.SUPER_ADMIN, UserRole.HQ_MANAGER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    let { value } = req.body;

    if (typeof value === 'boolean') {
      value = value ? 'true' : 'false';
    } else if (typeof value === 'object' && value !== null) {
      value = JSON.stringify(value);
    } else {
      value = String(value);
    }

    const escapedVal = value.replace(/'/g, "''");
    const escapedKey = String(key).replace(/'/g, "''");

    await prisma.$executeRawUnsafe(`
      INSERT INTO SystemSetting (key, value, updatedAt)
      VALUES ('${escapedKey}', '${escapedVal}', datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updatedAt = excluded.updatedAt
    `);

    let responseValue: any = value;
    if (value === 'true') responseValue = true;
    else if (value === 'false') responseValue = false;
    else {
      try {
        responseValue = JSON.parse(value);
      } catch {
        responseValue = value;
      }
    }

    res.json({
      success: true,
      key,
      value: responseValue,
      message: 'تم تحديث الإعداد بنجاح'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
