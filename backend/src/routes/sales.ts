import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { SaleService } from '../services/saleService.js';
import { saleSchema, voidSaleSchema, recalculateInstallmentsSchema, paymentSchema, fullRecalculateSchema } from '../validators/schemas.js';
import { SaleRepository } from '../repositories/index.js';
import { requireRoles } from '../middleware/auth.js';
import { UserRole } from '../entities/User.js';

const router = Router();
const saleService = new SaleService();
const saleRepo = new SaleRepository();

function validateSale(data: unknown) {
  const result = saleSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Validation error: ${errors}`);
  }
  return result.data as any;
}

function validatePayment(data: unknown) {
  const result = paymentSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    console.error('Payment Validation Error:', errors, 'Data received:', data);
    throw new Error(`Validation error: ${errors}`);
  }
  return result.data as any;
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.query.customerId ? String(req.query.customerId) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const saleType = req.query.saleType ? String(req.query.saleType) : undefined;
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const sales = await saleService.getAll({
      customerId: customerId || undefined,
      status: status || undefined,
      saleType: saleType || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
      branchId: req.branchId || undefined,
    });
    res.json(sales);
  } catch (error) {
    next(error);
  }
});

// Check machine serial availability across the entire database
router.get('/check-serial', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serial = String(req.query.serial || '').trim().toUpperCase();
    if (!serial) {
      return res.json({ available: true });
    }

    const existing = await prisma.machineSale.findFirst({
      where: {
        machineSerial: serial,
        status: { not: 'VOIDED' },
      },
      include: {
        customer: true,
      },
    });

    if (existing) {
      const customerName = existing.customer?.name || 'غير معروف';
      const saleDate = existing.saleDate ? new Date(existing.saleDate).toISOString().split('T')[0] : '';
      return res.json({
        available: false,
        message: `رقم الماكينة (${serial}) مسجل بالفعل للعميل: ${customerName} بتاريخ ${saleDate} ولا يمكن بيع الماكينة مرتين`,
        existingSale: {
          id: existing.id,
          customerName,
          saleDate,
          receiptNumber: existing.receiptNumber,
        },
      });
    }

    res.json({ available: true });
  } catch (error) {
    next(error);
  }
});

// Check receipt number availability across the entire database
router.get('/check-receipt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const receipt = String(req.query.receipt || '').trim();
    if (!receipt) {
      return res.json({ available: true });
    }

    const [existingPayment, existingSaleReceipt, existingSaleDP] = await Promise.all([
      prisma.payment.findFirst({
        where: { receiptNumber: receipt },
        include: { sale: { include: { customer: true } } },
      }),
      prisma.machineSale.findFirst({
        where: { receiptNumber: receipt, status: { not: 'VOIDED' } },
        include: { customer: true },
      }),
      prisma.machineSale.findFirst({
        where: { downPaymentReceipt: receipt, status: { not: 'VOIDED' } },
        include: { customer: true },
      }),
    ]);

    if (existingPayment) {
      const customerName = existingPayment.sale?.customer?.name || 'غير معروف';
      const paidAt = existingPayment.paidAt ? new Date(existingPayment.paidAt).toISOString().split('T')[0] : '';
      return res.json({
        available: false,
        message: `رقم الإيصال (${receipt}) مسجل مسبقاً لدفعة بتاريخ ${paidAt} للعميل: ${customerName}`,
        existingPayment: {
          id: existingPayment.id,
          customerName,
          amount: existingPayment.amount,
          paidAt,
        },
      });
    }

    if (existingSaleReceipt || existingSaleDP) {
      const sale = existingSaleReceipt || existingSaleDP;
      const customerName = sale?.customer?.name || 'غير معروف';
      const saleDate = sale?.saleDate ? new Date(sale.saleDate).toISOString().split('T')[0] : '';
      return res.json({
        available: false,
        message: `رقم الإيصال (${receipt}) مسجل مسبقاً في عملية بيع للعميل: ${customerName} بتاريخ ${saleDate}`,
      });
    }

    res.json({ available: true });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await saleService.getById(req.params.id as string);
    if (!sale) {
      return res.status(404).json({ error: 'العملية غير موجودة' });
    }
    if (req.branchId && (sale as any).branchId && (sale as any).branchId !== req.branchId) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى بيانات هذه المبيعة (تابعة لفرع آخر)' });
    }
    res.json(sale);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = validateSale(req.body);
    const sale = await saleService.create(data, req.branchId || req.body.branchId || undefined);
    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/preview-payment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await saleService.getById(req.params.id as string);
    if (!sale) return res.status(404).json({ error: 'العملية غير موجودة' });
    if (req.branchId && (sale as any).branchId && (sale as any).branchId !== req.branchId) {
      return res.status(403).json({ error: 'غير مصرح لك بإجراء عمليات على مبيعات فرع آخر' });
    }
    const { amount, installmentIds } = req.body;
    const preview = await saleService.previewPayment(req.params.id as string, Number(amount), installmentIds);
    res.json(preview);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/pay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await saleService.getById(req.params.id as string);
    if (!sale) return res.status(404).json({ error: 'العملية غير موجودة' });
    if (req.branchId && (sale as any).branchId && (sale as any).branchId !== req.branchId) {
      return res.status(403).json({ error: 'غير مصرح لك بالسداد لمبيعات فرع آخر' });
    }
    if (!req.body.saleId) req.body.saleId = req.params.id;
    const data = validatePayment(req.body);
    const result = await saleService.pay(
      req.params.id as string,
      data.amount,
      data.paymentType,
      data.paymentPlace,
      data.notes,
      data.installmentIds,
      data.receiptNumber,
      data.paidAt
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Alias for /pay to handle 404 from frontend
router.post('/:id/payment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await saleService.getById(req.params.id as string);
    if (!sale) return res.status(404).json({ error: 'العملية غير موجودة' });
    if (req.branchId && (sale as any).branchId && (sale as any).branchId !== req.branchId) {
      return res.status(403).json({ error: 'غير مصرح لك بالسداد لمبيعات فرع آخر' });
    }
    if (!req.body.saleId) req.body.saleId = req.params.id;
    const data = validatePayment(req.body);
    const result = await saleService.pay(
      req.params.id as string,
      data.amount,
      data.paymentType,
      data.paymentPlace,
      data.notes,
      data.installmentIds,
      data.receiptNumber,
      data.paidAt
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

function validateVoid(data: unknown) {
  const result = voidSaleSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Validation error: ${errors}`);
  }
  return result.data;
}

function validateRecalculate(data: unknown) {
  const result = recalculateInstallmentsSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Validation error: ${errors}`);
  }
  return result.data;
}

router.post('/:id/void', requireRoles(UserRole.SUPER_ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await saleService.getById(req.params.id as string);
    if (!existing) return res.status(404).json({ error: 'العملية غير موجودة' });
    if (req.branchId && (existing as any).branchId && (existing as any).branchId !== req.branchId) {
      return res.status(403).json({ error: 'غير مصرح لك بإلغاء مبيعات فرع آخر' });
    }
    const data = validateVoid(req.body);
    const sale = await saleService.void(req.params.id as string, data.reason);
    res.json(sale);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/recalculate', requireRoles(UserRole.SUPER_ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await saleService.getById(req.params.id as string);
    if (!existing) return res.status(404).json({ error: 'العملية غير موجودة' });
    if (req.branchId && (existing as any).branchId && (existing as any).branchId !== req.branchId) {
      return res.status(403).json({ error: 'غير مصرح لك بتعديل مبيعات فرع آخر' });
    }
    const data = validateRecalculate(req.body);
    const sale = await saleService.recalculateInstallments(req.params.id as string, data.months);
    res.json(sale);
  } catch (error) {
    next(error);
  }
});

function validateFullRecalculate(data: unknown) {
  const result = fullRecalculateSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Validation error: ${errors}`);
  }
  return result.data;
}

router.post('/:id/full-recalculate', requireRoles(UserRole.SUPER_ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await saleService.getById(req.params.id as string);
    if (!existing) return res.status(404).json({ error: 'العملية غير موجودة' });
    if (req.branchId && (existing as any).branchId && (existing as any).branchId !== req.branchId) {
      return res.status(403).json({ error: 'غير مصرح لك بتعديل مبيعات فرع آخر' });
    }
    const data = validateFullRecalculate(req.body);
    const sale = await saleService.fullRecalculate(req.params.id as string, data);
    res.json(sale);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.HQ_MANAGER, UserRole.BRANCH_MANAGER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await saleService.getById(req.params.id as string);
    if (!existing) return res.status(404).json({ error: 'العملية غير موجودة' });
    if (req.branchId && (existing as any).branchId && (existing as any).branchId !== req.branchId) {
      return res.status(403).json({ error: 'غير مصرح لك بتعديل مبيعات فرع آخر' });
    }
    // Only allow updating notes and payment place safely
    const data = req.body;
    const sale = await saleRepo.update(req.params.id as string, {
      notes: data.notes,
      paymentPlace: data.paymentPlace,
      saleDate: data.saleDate ? new Date(data.saleDate) : undefined
    });
    res.json(sale);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.HQ_MANAGER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await saleRepo.findById(req.params.id as string);
    if (!sale) return res.status(404).json({ error: 'العملية غير موجودة' });
    if (req.branchId && (sale as any).branchId && (sale as any).branchId !== req.branchId) {
      return res.status(403).json({ error: 'غير مصرح لك بحذف مبيعات فرع آخر' });
    }
    if (sale.payments.length > 0) return res.status(403).json({ error: 'Cannot delete sale with existing payments' });
    
    await saleRepo.delete(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;