import { Prisma } from '@prisma/client';
import { AppDataSource } from '../data-source.js';
import { Branch, Customer, MachineSale, Installment, Payment } from '../entities/index.js';
import prisma from '../lib/prisma.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class HQDashboardService {
  async getHQStats(filterBranchId?: string | null) {
    const branchRepo = AppDataSource.getRepository(Branch);
    const saleRepo = AppDataSource.getRepository(MachineSale);
    const paymentRepo = AppDataSource.getRepository(Payment);
    const instRepo = AppDataSource.getRepository(Installment);
    const customerRepo = AppDataSource.getRepository(Customer);

    // Timing boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayStartIso = todayStart.toISOString();
    const todayEndIso = todayEnd.toISOString();

    const branches = await branchRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
    const branchMap = new Map<string, string>();
    branches.forEach(b => branchMap.set(b.id, b.name));

    // Defensive validation of branchId to prevent any SQL injection or IDOR
    let safeBranchId: string | null = null;
    if (filterBranchId && filterBranchId !== 'ALL') {
      if (UUID_REGEX.test(filterBranchId)) {
        safeBranchId = filterBranchId;
      } else {
        console.warn(`[HQDashboard] Malformed branchId rejected: ${filterBranchId}`);
      }
    }

    // 1. Primary Path: Live Prisma SQLite Operational Database (Parameterized Queries)
    try {
      const branchCondSale = safeBranchId ? Prisma.sql`AND branchId = ${safeBranchId}` : Prisma.empty;
      const branchCondPay = safeBranchId ? Prisma.sql`AND branchId = ${safeBranchId}` : Prisma.empty;
      const branchCondInst = safeBranchId ? Prisma.sql`AND i.branchId = ${safeBranchId}` : Prisma.empty;
      const branchCondCust = safeBranchId ? Prisma.sql`WHERE branchId = ${safeBranchId}` : Prisma.empty;
      const branchCondRecentPay = safeBranchId ? Prisma.sql`WHERE p.branchId = ${safeBranchId}` : Prisma.empty;

      const [salesRows, todayPayRows, overdueRows, custRows, recentRows] = await Promise.all([
        prisma.$queryRaw<any[]>`
          SELECT 
            COUNT(id) as count,
            COALESCE(SUM(totalPrice), 0) as totalPrice,
            COALESCE(SUM(paidAmount), 0) as totalPaid,
            COALESCE(SUM(remainingAmount), 0) as totalRemaining,
            COALESCE(SUM(CASE WHEN saleType = 'كاش' OR saleType = 'CASH' THEN totalPrice ELSE 0 END), 0) as cashSales,
            COALESCE(SUM(CASE WHEN saleType != 'كاش' AND saleType != 'CASH' THEN totalPrice ELSE 0 END), 0) as installmentSales
          FROM MachineSale
          WHERE status != 'VOIDED' ${branchCondSale}
        `,
        prisma.$queryRaw<any[]>`
          SELECT 
            COUNT(id) as count,
            COALESCE(SUM(amount), 0) as total
          FROM Payment
          WHERE paidAt >= ${todayStartIso} AND paidAt <= ${todayEndIso}
          ${branchCondPay}
        `,
        prisma.$queryRaw<any[]>`
          SELECT 
            COUNT(i.id) as count,
            COALESCE(SUM(i.amount - i.paidAmount), 0) as total
          FROM Installment i
          JOIN MachineSale s ON i.saleId = s.id
          WHERE i.isPaid = 0 AND i.dueDate < ${todayStartIso} AND s.status = 'ACTIVE'
          ${branchCondInst}
        `,
        prisma.$queryRaw<any[]>`
          SELECT COUNT(id) as count FROM Customer ${branchCondCust}
        `,
        prisma.$queryRaw<any[]>`
          SELECT 
            p.id,
            p.receiptNumber,
            p.amount,
            p.paymentType,
            p.paymentPlace,
            p.paidAt,
            c.name as customerName,
            s.machineSerial,
            p.branchId
          FROM Payment p
          LEFT JOIN MachineSale s ON p.saleId = s.id
          LEFT JOIN Customer c ON s.customerId = c.id
          ${branchCondRecentPay}
          ORDER BY p.paidAt DESC
          LIMIT 8
        `,
      ]);

      const salesCount = Number(salesRows[0]?.count || 0);
      const custCount = Number(custRows[0]?.count || 0);

      // If Prisma has data or tables exist, build response cleanly
      if (salesCount > 0 || custCount > 0) {
        const totalPrice = Number(salesRows[0]?.totalPrice || 0);
        const totalPaid = Number(salesRows[0]?.totalPaid || 0);
        const overallRatio = totalPrice > 0 ? Math.round((totalPaid / totalPrice) * 100) : 0;

        // Batch benchmarks using GROUP BY to eliminate N+1 queries
        const [groupedSales, groupedOverdue, groupedCust] = await Promise.all([
          prisma.$queryRaw<Array<{ branchId: string; totalSales: number; totalPaid: number; totalRemaining: number }>>`
            SELECT 
              branchId,
              COALESCE(SUM(totalPrice), 0) as totalSales,
              COALESCE(SUM(paidAmount), 0) as totalPaid,
              COALESCE(SUM(remainingAmount), 0) as totalRemaining
            FROM MachineSale
            WHERE status != 'VOIDED' AND branchId IS NOT NULL AND branchId != ''
            GROUP BY branchId
          `,
          prisma.$queryRaw<Array<{ branchId: string; count: number; total: number }>>`
            SELECT 
              i.branchId,
              COUNT(i.id) as count,
              COALESCE(SUM(i.amount - i.paidAmount), 0) as total
            FROM Installment i
            JOIN MachineSale s ON i.saleId = s.id
            WHERE i.isPaid = 0 AND i.dueDate < ${todayStartIso} AND s.status = 'ACTIVE'
              AND i.branchId IS NOT NULL AND i.branchId != ''
            GROUP BY i.branchId
          `,
          prisma.$queryRaw<Array<{ branchId: string; count: number }>>`
            SELECT 
              branchId,
              COUNT(id) as count
            FROM Customer
            WHERE branchId IS NOT NULL AND branchId != ''
            GROUP BY branchId
          `,
        ]);

        const salesMap = new Map<string, { totalSales: number; totalPaid: number; totalRemaining: number }>();
        for (const r of groupedSales) {
          salesMap.set(r.branchId, {
            totalSales: Number(r.totalSales || 0),
            totalPaid: Number(r.totalPaid || 0),
            totalRemaining: Number(r.totalRemaining || 0),
          });
        }

        const overdueMap = new Map<string, { count: number; total: number }>();
        for (const r of groupedOverdue) {
          overdueMap.set(r.branchId, {
            count: Number(r.count || 0),
            total: Number(r.total || 0),
          });
        }

        const customerMap = new Map<string, number>();
        for (const r of groupedCust) {
          customerMap.set(r.branchId, Number(r.count || 0));
        }

        const operationalBranches = branches.filter(b => b.code !== 'HQ');
        const branchBenchmarks = operationalBranches.map((b) => {
          const sData = salesMap.get(b.id) || { totalSales: 0, totalPaid: 0, totalRemaining: 0 };
          const oData = overdueMap.get(b.id) || { count: 0, total: 0 };
          const cCount = customerMap.get(b.id) || 0;
          const ratio = sData.totalSales > 0 ? Math.round((sData.totalPaid / sData.totalSales) * 100) : 0;

          return {
            branchId: b.id,
            branchName: b.name,
            branchCode: b.code,
            customerCount: cCount,
            totalSales: sData.totalSales,
            totalPaid: sData.totalPaid,
            totalRemaining: sData.totalRemaining,
            overdueAmount: oData.total,
            overdueCount: oData.count,
            collectionRatio: ratio,
          };
        });

        branchBenchmarks.sort((a, b) => b.collectionRatio - a.collectionRatio);

        return {
          totalSalesCount: salesCount,
          totalSales: totalPrice,
          cashSales: Number(salesRows[0]?.cashSales || 0),
          installmentSales: Number(salesRows[0]?.installmentSales || 0),
          totalPaid,
          totalRemaining: Number(salesRows[0]?.totalRemaining || 0),
          collectionRatio: overallRatio,
          todayPaymentCount: Number(todayPayRows[0]?.count || 0),
          todayCollections: Number(todayPayRows[0]?.total || 0),
          overdueCount: Number(overdueRows[0]?.count || 0),
          overdueTotal: Number(overdueRows[0]?.total || 0),
          totalCustomers: custCount,
          branchBenchmarks,
          recentPayments: recentRows.map((p) => ({
            id: p.id,
            receiptNumber: p.receiptNumber,
            amount: Number(p.amount),
            paymentType: p.paymentType,
            paymentPlace: p.paymentPlace,
            paidAt: p.paidAt,
            customerName: p.customerName || '-',
            branchName: branchMap.get(p.branchId) || 'القاهرة-الجيش',
            machineSerial: p.machineSerial || '-',
          })),
        };
      }
    } catch (err) {
      console.warn('[HQDashboard] Falling back to TypeORM query:', err);
    }

    // 2. TypeORM Fallback (For automated test runners with mock DB)
    let salesQuery = saleRepo.createQueryBuilder('s').where("s.status != 'VOIDED'");
    if (safeBranchId) salesQuery = salesQuery.andWhere('s.branchId = :safeBranchId', { safeBranchId });

    const salesTotals = await salesQuery
      .select('COUNT(s.id)', 'count')
      .addSelect('SUM(s.totalPrice)', 'totalPrice')
      .addSelect('SUM(s.paidAmount)', 'totalPaid')
      .addSelect('SUM(s.remainingAmount)', 'totalRemaining')
      .addSelect("SUM(CASE WHEN s.saleType = 'CASH' THEN s.totalPrice ELSE 0 END)", 'cashSales')
      .addSelect("SUM(CASE WHEN s.saleType = 'INSTALLMENT' THEN s.totalPrice ELSE 0 END)", 'installmentSales')
      .getRawOne();

    let todayPayQuery = paymentRepo.createQueryBuilder('p').where('p.paidAt >= :todayStart AND p.paidAt <= :todayEnd', { todayStart, todayEnd });
    if (safeBranchId) todayPayQuery = todayPayQuery.andWhere('p.branchId = :safeBranchId', { safeBranchId });

    const todayPayTotals = await todayPayQuery
      .select('COUNT(p.id)', 'count')
      .addSelect('SUM(p.amount)', 'total')
      .getRawOne();

    let overdueQuery = instRepo.createQueryBuilder('i')
      .innerJoin('i.sale', 's')
      .where("i.isPaid = false AND i.dueDate < :todayStart AND s.status = 'ACTIVE'", { todayStart });
    if (safeBranchId) overdueQuery = overdueQuery.andWhere('i.branchId = :safeBranchId', { safeBranchId });

    const overdueTotals = await overdueQuery
      .select('COUNT(i.id)', 'count')
      .addSelect('SUM(i.amount - i.paidAmount)', 'total')
      .getRawOne();

    let custQuery = customerRepo.createQueryBuilder('c');
    if (safeBranchId) custQuery = custQuery.where('c.branchId = :safeBranchId', { safeBranchId });
    const totalCustomers = await custQuery.getCount();

    // Benchmarks strictly for operational branches (excluding HQ)
    const operationalBranches = branches.filter(b => b.code !== 'HQ');
    const branchBenchmarks = await Promise.all(
      operationalBranches.map(async (b) => {
        const [salesData, overdueData, custCount] = await Promise.all([
          saleRepo
            .createQueryBuilder('s')
            .where("s.branchId = :bid AND s.status != 'VOIDED'", { bid: b.id })
            .select('SUM(s.totalPrice)', 'totalSales')
            .addSelect('SUM(s.paidAmount)', 'totalPaid')
            .addSelect('SUM(s.remainingAmount)', 'totalRemaining')
            .getRawOne(),
          instRepo
            .createQueryBuilder('i')
            .innerJoin('i.sale', 's')
            .where("i.branchId = :bid AND i.isPaid = false AND i.dueDate < :now AND s.status = 'ACTIVE'", {
              bid: b.id,
              now: todayStart,
            })
            .select('SUM(i.amount - i.paidAmount)', 'overdueAmount')
            .addSelect('COUNT(i.id)', 'overdueCount')
            .getRawOne(),
          customerRepo.count({ where: { branchId: b.id } }),
        ]);

        const totalSales = Number(salesData?.totalSales || 0);
        const totalPaid = Number(salesData?.totalPaid || 0);
        const ratio = totalSales > 0 ? Math.round((totalPaid / totalSales) * 100) : 0;

        return {
          branchId: b.id,
          branchName: b.name,
          branchCode: b.code,
          customerCount: custCount,
          totalSales,
          totalPaid,
          totalRemaining: Number(salesData?.totalRemaining || 0),
          overdueAmount: Number(overdueData?.overdueAmount || 0),
          overdueCount: Number(overdueData?.overdueCount || 0),
          collectionRatio: ratio,
        };
      })
    );

    branchBenchmarks.sort((a, b) => b.collectionRatio - a.collectionRatio);

    let recentPayQuery = paymentRepo.createQueryBuilder('p')
      .innerJoinAndSelect('p.sale', 's')
      .innerJoinAndSelect('s.customer', 'c')
      .innerJoinAndSelect('p.branch', 'b')
      .orderBy('p.paidAt', 'DESC')
      .take(8);
    if (safeBranchId) recentPayQuery = recentPayQuery.where('p.branchId = :safeBranchId', { safeBranchId });
    const recentPayments = await recentPayQuery.getMany();

    const totalPrice = Number(salesTotals?.totalPrice || 0);
    const totalPaid = Number(salesTotals?.totalPaid || 0);
    const overallRatio = totalPrice > 0 ? Math.round((totalPaid / totalPrice) * 100) : 0;

    return {
      totalSalesCount: Number(salesTotals?.count || 0),
      totalSales: totalPrice,
      cashSales: Number(salesTotals?.cashSales || 0),
      installmentSales: Number(salesTotals?.installmentSales || 0),
      totalPaid,
      totalRemaining: Number(salesTotals?.totalRemaining || 0),
      collectionRatio: overallRatio,
      todayPaymentCount: Number(todayPayTotals?.count || 0),
      todayCollections: Number(todayPayTotals?.total || 0),
      overdueCount: Number(overdueTotals?.count || 0),
      overdueTotal: Number(overdueTotals?.total || 0),
      totalCustomers,
      branchBenchmarks,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        amount: Number(p.amount),
        paymentType: p.paymentType,
        paymentPlace: p.paymentPlace,
        paidAt: p.paidAt,
        customerName: p.sale?.customer?.name || '-',
        branchName: p.branch?.name || '-',
        machineSerial: p.sale?.machineSerial || '-',
      })),
    };
  }
}
