import prisma from '../lib/prisma.js';
import type { Customer, MachineSale, Installment, Payment, FollowUp, Prisma } from '@prisma/client';

export class CustomerRepository {
  async findAll(query?: { search?: string; page?: number; limit?: number; branchId?: string }) {
    const skip = query?.page && query?.limit ? (query.page - 1) * query.limit : undefined;
    const take = query?.limit ? Number(query.limit) : undefined;
    
    let matchingIds: string[] | null = null;
    if (query?.branchId && query.branchId !== 'ALL') {
      try {
        const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM Customer WHERE branchId = '${query.branchId}'`
        );
        matchingIds = rows.map(r => r.id);
      } catch (_) {}
    }

    const where: Prisma.CustomerWhereInput = query?.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { phone: { contains: query.search } },
            { bkCode: { contains: query.search } },
            { customerType: { contains: query.search } },
          ],
        }
      : {};

    if (matchingIds !== null) {
      where.id = { in: matchingIds.length > 0 ? matchingIds : ['__NONE__'] };
    }

    return prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        sales: { select: { id: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          include: {
            installments: true,
            payments: true,
          },
        },
        followUps: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findByBkCodeAndType(bkCode: string, customerType: string) {
    return prisma.customer.findUnique({
      where: {
        bkCode_customerType: { bkCode, customerType }
      },
    });
  }

  async create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { branchId?: string }) {
    const { branchId, ...rest } = data;
    const customer = await prisma.customer.create({
      data: rest,
    });
    if (branchId) {
      try {
        await prisma.$executeRawUnsafe(`UPDATE Customer SET branchId = '${branchId}' WHERE id = '${customer.id}'`);
      } catch (_) {}
    }
    return customer;
  }

  async update(id: string, data: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>) {
    return prisma.customer.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.customer.delete({ where: { id } });
  }

  async count(branchId?: string) {
    if (branchId && branchId !== 'ALL') {
      try {
        const res = await prisma.$queryRawUnsafe<{ count: number }[]>(
          `SELECT count(*) as count FROM Customer WHERE branchId = '${branchId}'`
        );
        return Number(res[0]?.count || 0);
      } catch (_) {}
    }
    return prisma.customer.count();
  }
}

export class SaleRepository {
  async findAll(query?: { customerId?: string; status?: string; saleType?: string; startDate?: Date; endDate?: Date; page?: number; limit?: number; branchId?: string }) {
    const skip = query?.page && query?.limit ? (query.page - 1) * query.limit : undefined;
    const take = query?.limit ? Number(query.limit) : undefined;

    let matchingIds: string[] | null = null;
    if (query?.branchId && query.branchId !== 'ALL') {
      try {
        const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM MachineSale WHERE branchId = '${query.branchId}'`
        );
        matchingIds = rows.map(r => r.id);
      } catch (_) {}
    }

    const where: Prisma.MachineSaleWhereInput = {};
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.status) where.status = query.status;
    if (query?.saleType) where.saleType = query.saleType;
    if (query?.startDate || query?.endDate) {
      where.saleDate = {};
      if (query.startDate) where.saleDate.gte = query.startDate;
      if (query.endDate) where.saleDate.lte = query.endDate;
    }
    if (matchingIds !== null) {
      where.id = { in: matchingIds.length > 0 ? matchingIds : ['__NONE__'] };
    }

    return prisma.machineSale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        customer: true,
        installments: true,
        payments: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.machineSale.findUnique({
      where: { id },
      include: {
        customer: true,
        installments: {
          orderBy: { installmentNo: 'asc' },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
        },
      },
    });
  }

  async findByReceiptNumber(receiptNumber: string) {
    return prisma.machineSale.findUnique({
      where: { receiptNumber },
    });
  }

  async findByMachineSerial(machineSerial: string) {
    return prisma.machineSale.findFirst({
      where: { 
        machineSerial,
        status: { not: 'VOIDED' }
      },
      include: { customer: true }
    });
  }

  async create(data: Omit<MachineSale, 'id' | 'createdAt' | 'updatedAt'> & { branchId?: string }) {
    const { branchId, ...rest } = data;
    const sale = await prisma.machineSale.create({
      data: rest,
    });
    if (branchId) {
      try {
        await prisma.$executeRawUnsafe(`UPDATE MachineSale SET branchId = '${branchId}' WHERE id = '${sale.id}'`);
      } catch (_) {}
    }
    return sale;
  }

  async update(id: string, data: Partial<Omit<MachineSale, 'id' | 'createdAt' | 'updatedAt'>>) {
    return prisma.machineSale.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.machineSale.delete({ where: { id } });
  }

  async void(id: string, reason: string) {
    return prisma.machineSale.update({
      where: { id },
      data: {
        status: 'VOIDED',
        voidReason: reason,
        voidedAt: new Date(),
      },
    });
  }
}

export class InstallmentRepository {
  async findAll(query?: { saleId?: string; isPaid?: boolean; startDate?: Date; endDate?: Date; branchId?: string }) {
    let matchingSaleIds: string[] | null = null;
    if (query?.branchId && query.branchId !== 'ALL') {
      try {
        const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM MachineSale WHERE branchId = '${query.branchId}'`
        );
        matchingSaleIds = rows.map(r => r.id);
      } catch (_) {}
    }

    const where: Prisma.InstallmentWhereInput = {};
    if (query?.saleId) where.saleId = query.saleId;
    if (query?.isPaid !== undefined) where.isPaid = query.isPaid;
    if (query?.startDate || query?.endDate) {
      where.dueDate = {};
      if (query.startDate) where.dueDate.gte = query.startDate;
      if (query.endDate) where.dueDate.lte = query.endDate;
    }
    if (matchingSaleIds !== null) {
      where.saleId = { in: matchingSaleIds.length > 0 ? matchingSaleIds : ['__NONE__'] };
    }

    return prisma.installment.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        sale: {
          include: { customer: true },
        },
      },
    });
  }

  async findOverdue(branchId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let matchingSaleIds: string[] | null = null;
    if (branchId && branchId !== 'ALL') {
      try {
        const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM MachineSale WHERE branchId = '${branchId}'`
        );
        matchingSaleIds = rows.map(r => r.id);
      } catch (_) {}
    }

    const where: Prisma.InstallmentWhereInput = {
      isPaid: false,
      dueDate: { lt: today },
      sale: { status: 'ACTIVE' },
    };
    if (matchingSaleIds !== null) {
      where.saleId = { in: matchingSaleIds.length > 0 ? matchingSaleIds : ['__NONE__'] };
    }

    return prisma.installment.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        sale: {
          include: { customer: true },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.installment.findUnique({
      where: { id },
      include: { sale: { include: { customer: true } } },
    });
  }

  async create(data: Omit<Installment, 'id' | 'createdAt' | 'updatedAt'>) {
    return prisma.installment.create({ data });
  }

  async createMany(data: Omit<Installment, 'id' | 'createdAt' | 'updatedAt'>[]) {
    return prisma.installment.createMany({ data });
  }

  async update(id: string, data: Partial<Omit<Installment, 'id' | 'createdAt' | 'updatedAt'>>) {
    return prisma.installment.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.installment.delete({ where: { id } });
  }

  async deleteBySaleId(saleId: string) {
    return prisma.installment.deleteMany({ where: { saleId } });
  }
}

export class PaymentRepository {
  async findAll(query?: { saleId?: string; startDate?: Date; endDate?: Date; branchId?: string }) {
    let matchingSaleIds: string[] | null = null;
    if (query?.branchId && query.branchId !== 'ALL') {
      try {
        const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM MachineSale WHERE branchId = '${query.branchId}'`
        );
        matchingSaleIds = rows.map(r => r.id);
      } catch (_) {}
    }

    const where: Prisma.PaymentWhereInput = {};
    if (query?.saleId) where.saleId = query.saleId;
    if (query?.startDate || query?.endDate) {
      where.paidAt = {};
      if (query.startDate) where.paidAt.gte = query.startDate;
      if (query.endDate) where.paidAt.lte = query.endDate;
    }
    if (matchingSaleIds !== null) {
      where.saleId = { in: matchingSaleIds.length > 0 ? matchingSaleIds : ['__NONE__'] };
    }

    return prisma.payment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      include: {
        sale: { include: { customer: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: { sale: { include: { customer: true } } },
    });
  }

  async findByReceiptNumber(receiptNumber: string) {
    return prisma.payment.findFirst({
      where: { receiptNumber },
    });
  }

  async create(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) {
    return prisma.payment.create({ data });
  }

  async update(id: string, data: Partial<Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>>) {
    return prisma.payment.update({ where: { id }, data });
  }
}

export class FollowUpRepository {
  async findAll(query?: { customerId?: string; isCompleted?: boolean; branchId?: string }) {
    let matchingCustomerIds: string[] | null = null;
    if (query?.branchId && query.branchId !== 'ALL') {
      try {
        const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM Customer WHERE branchId = '${query.branchId}'`
        );
        matchingCustomerIds = rows.map(r => r.id);
      } catch (_) {}
    }

    const where: Prisma.FollowUpWhereInput = {};
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.isCompleted !== undefined) where.isCompleted = query.isCompleted;
    if (matchingCustomerIds !== null) {
      where.customerId = { in: matchingCustomerIds.length > 0 ? matchingCustomerIds : ['__NONE__'] };
    }

    return prisma.followUp.findMany({
      where,
      orderBy: { nextFollowUp: 'asc' },
      include: { customer: true },
    });
  }

  async findById(id: string) {
    return prisma.followUp.findUnique({
      where: { id },
      include: { customer: true },
    });
  }

  async create(data: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt'>) {
    return prisma.followUp.create({ data });
  }

  async update(id: string, data: Partial<Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt'>>) {
    return prisma.followUp.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.followUp.delete({ where: { id } });
  }

  async findUpcoming(branchId?: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let matchingCustomerIds: string[] | null = null;
    if (branchId && branchId !== 'ALL') {
      try {
        const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM Customer WHERE branchId = '${branchId}'`
        );
        matchingCustomerIds = rows.map(r => r.id);
      } catch (_) {}
    }

    const where: Prisma.FollowUpWhereInput = {
      isCompleted: false,
      nextFollowUp: { gte: today, lte: tomorrow },
    };
    if (matchingCustomerIds !== null) {
      where.customerId = { in: matchingCustomerIds.length > 0 ? matchingCustomerIds : ['__NONE__'] };
    }

    return prisma.followUp.findMany({
      where,
      include: { customer: true },
    });
  }
}