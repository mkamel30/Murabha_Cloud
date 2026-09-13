import { AppDataSource } from '../data-source.js';
import { Branch, Customer, MachineSale, Installment, Payment, FollowUp } from '../entities/index.js';
import prisma from '../lib/prisma.js';

export async function migrateLegacySqliteToCloud(targetBranchCode: string = 'BR-CAI'): Promise<{
  customers: number;
  sales: number;
  installments: number;
  payments: number;
  followUps: number;
}> {
  console.log('[Migration] Starting legacy SQLite to Cloud migration...');
  const branchRepo = AppDataSource.getRepository(Branch);
  const customerRepo = AppDataSource.getRepository(Customer);
  const saleRepo = AppDataSource.getRepository(MachineSale);
  const installmentRepo = AppDataSource.getRepository(Installment);
  const paymentRepo = AppDataSource.getRepository(Payment);
  const followUpRepo = AppDataSource.getRepository(FollowUp);

  let branch = await branchRepo.findOne({ where: { code: targetBranchCode } });
  if (!branch) {
    branch = (await branchRepo.find({ take: 1 }))[0];
  }
  if (!branch) {
    throw new Error('لا يوجد فرع في النظام لاستيعاب البيانات المهاجرة');
  }

  const branchId = branch.id;
  console.log(`[Migration] Migrating into branch: ${branch.name} (${branch.code} - ${branchId})`);

  // 1. Migrate Customers
  const legacyCustomers = await prisma.customer.findMany();
  const customerIdMap = new Map<string, string>();

  for (const c of legacyCustomers) {
    const newCustomer = customerRepo.create({
      id: c.id,
      branchId,
      bkCode: c.bkCode,
      customerType: c.customerType || 'عام',
      name: c.name,
      phone: c.phone || null,
      address: c.address || null,
      notes: c.notes || null,
      department: c.department || null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    });
    await customerRepo.save(newCustomer);
    customerIdMap.set(c.id, newCustomer.id);
  }
  console.log(`[Migration] ✅ Migrated ${legacyCustomers.length} customers`);

  // 2. Migrate Machine Sales
  const legacySales = await prisma.machineSale.findMany();
  for (const s of legacySales) {
    const newSale = saleRepo.create({
      id: s.id,
      branchId,
      receiptNumber: s.receiptNumber,
      customerId: s.customerId,
      machineSerial: s.machineSerial,
      saleType: s.saleType,
      totalPrice: Number(s.totalPrice),
      downPayment: Number(s.downPayment || 0),
      downPaymentReceipt: s.downPaymentReceipt || null,
      paidAmount: Number(s.paidAmount || 0),
      remainingAmount: Number(s.remainingAmount),
      paymentPlace: s.paymentPlace || null,
      notes: s.notes || null,
      saleDate: s.saleDate,
      firstDueDate: s.firstDueDate || null,
      months: s.months || null,
      status: s.status || 'ACTIVE',
      voidReason: s.voidReason || null,
      voidedAt: s.voidedAt || null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    });
    await saleRepo.save(newSale);
  }
  console.log(`[Migration] ✅ Migrated ${legacySales.length} machine sales`);

  // 3. Migrate Payments
  const legacyPayments = await prisma.payment.findMany();
  for (const p of legacyPayments) {
    const newPayment = paymentRepo.create({
      id: p.id,
      branchId,
      receiptNumber: p.receiptNumber,
      saleId: p.saleId,
      paymentType: p.paymentType,
      amount: Number(p.amount),
      paymentPlace: p.paymentPlace || null,
      notes: p.notes || null,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    });
    await paymentRepo.save(newPayment);
  }
  console.log(`[Migration] ✅ Migrated ${legacyPayments.length} payments`);

  // 4. Migrate Installments
  const legacyInstallments = await prisma.installment.findMany();
  for (const i of legacyInstallments) {
    const newInst = installmentRepo.create({
      id: i.id,
      branchId,
      saleId: i.saleId,
      paymentId: i.paymentId || null,
      installmentNo: i.installmentNo,
      dueDate: i.dueDate,
      amount: Number(i.amount),
      paidAmount: Number(i.paidAmount || 0),
      isPaid: i.isPaid,
      isWaived: i.isWaived,
      waiveReason: i.waiveReason || null,
      paidDate: i.paidDate || null,
      receiptNumber: i.receiptNumber || null,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    });
    await installmentRepo.save(newInst);
  }
  console.log(`[Migration] ✅ Migrated ${legacyInstallments.length} installments`);

  // 5. Migrate FollowUps
  const legacyFollowUps = await prisma.followUp.findMany();
  for (const f of legacyFollowUps) {
    const newFollowUp = followUpRepo.create({
      id: f.id,
      branchId,
      customerId: f.customerId,
      note: f.note,
      logs: f.logs || '[]',
      nextFollowUp: f.nextFollowUp || null,
      isCompleted: f.isCompleted,
      completedAt: f.completedAt || null,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    });
    await followUpRepo.save(newFollowUp);
  }
  console.log(`[Migration] ✅ Migrated ${legacyFollowUps.length} follow-ups`);

  return {
    customers: legacyCustomers.length,
    sales: legacySales.length,
    installments: legacyInstallments.length,
    payments: legacyPayments.length,
    followUps: legacyFollowUps.length,
  };
}
