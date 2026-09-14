import { Router, Request, Response, NextFunction } from 'express';
import { PaymentRepository, SaleRepository } from '../repositories/index.js';
import { SaleService } from '../services/saleService.js';
import prisma from '../lib/prisma.js';
import { requireRoles } from '../middleware/auth.js';
import { UserRole } from '../entities/User.js';

const router = Router();
const paymentRepo = new PaymentRepository();
const saleRepo = new SaleRepository();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { saleId, startDate, endDate } = req.query;
    const payments = await paymentRepo.findAll({
      saleId: saleId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      branchId: req.branchId || undefined,
    });
    res.json(payments);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await paymentRepo.findById(req.params.id as string);
    if (!payment) {
      return res.status(404).json({ error: 'الدفع غير موجود' });
    }
    if (req.branchId && (payment as any).sale?.branchId && (payment as any).sale.branchId !== req.branchId) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى دفعات فرع آخر' });
    }
    res.json(payment);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    const payment = await paymentRepo.create(data);
    
    // Auto-update the sale remaining amount
    const sale = await saleRepo.findById(data.saleId);
    if (sale) {
      const newPaid = Number(sale.paidAmount) + Number(data.amount);
      let newRemaining = Number(sale.remainingAmount) - Number(data.amount);
      if (newRemaining < 0) newRemaining = 0;
      await saleRepo.update(sale.id, {
        paidAmount: newPaid as any,
        remainingAmount: newRemaining as any,
      });
    }

    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
});

const saleService = new SaleService();

router.post('/:id/void', requireRoles(UserRole.SUPER_ADMIN, UserRole.HQ_MANAGER, UserRole.HQ_ACCOUNTANT, UserRole.BRANCH_MANAGER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await paymentRepo.findById(req.params.id as string);
    if (!payment) {
      return res.status(404).json({ error: 'الدفع غير موجود' });
    }
    if (req.branchId && (payment as any).sale?.branchId && (payment as any).sale.branchId !== req.branchId) {
      return res.status(403).json({ error: 'غير مصرح لك بإلغاء دفعات فرع آخر' });
    }
    const result = await saleService.voidPayment(req.params.id as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.HQ_MANAGER, UserRole.HQ_ACCOUNTANT, UserRole.BRANCH_MANAGER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { receiptNumber, paidAt } = req.body;
    
    if (!receiptNumber && !paidAt) {
      return res.status(400).json({ error: 'يجب تقديم رقم إيصال أو تاريخ دفع لتحديث الدفعة' });
    }
    
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
        include: { sale: true }
      });
      
      if (!payment) {
        throw new Error('الدفع غير موجود');
      }

      if (req.branchId && (payment.sale as any)?.branchId && (payment.sale as any).branchId !== req.branchId) {
        throw new Error('غير مصرح لك بتعديل دفعات فرع آخر');
      }
      
      const newPaidAt = paidAt ? new Date(paidAt) : payment.paidAt;
      const newReceiptNumber = receiptNumber !== undefined ? receiptNumber : payment.receiptNumber;

      if (receiptNumber && receiptNumber !== payment.receiptNumber) {
        const existingReceipt = await tx.payment.findFirst({
          where: { 
            receiptNumber,
            id: { not: id }
          }
        });
        if (existingReceipt) {
          throw new Error('رقم الإيصال هذا مستخدم بالفعل في عملية دفع أخرى');
        }
      }

      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          receiptNumber: newReceiptNumber,
          paidAt: newPaidAt
        }
      });
      
      await tx.installment.updateMany({
        where: { paymentId: id },
        data: {
          receiptNumber: newReceiptNumber,
          paidDate: newPaidAt
        }
      });
      
      if (payment.paymentType === 'DOWN_PAYMENT' || payment.paymentType === 'CASH_SALE') {
        await tx.machineSale.update({
          where: { id: payment.saleId },
          data: {
            downPaymentReceipt: newReceiptNumber
          }
        });
      }
      
      return updatedPayment;
    });
    
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'فشل تحديث الدفعة' });
  }
});

export default router;