import { AppDataSource } from '../data-source.js';
import { Branch, Customer, MachineSale, Installment, Payment } from '../entities/index.js';

export class HQDashboardService {
  async getHQStats(filterBranchId?: string | null) {
    const branchRepo = AppDataSource.getRepository(Branch);
    const saleRepo = AppDataSource.getRepository(MachineSale);
    const paymentRepo = AppDataSource.getRepository(Payment);
    const instRepo = AppDataSource.getRepository(Installment);
    const customerRepo = AppDataSource.getRepository(Customer);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Overall Sales Aggregates
    let salesQuery = saleRepo.createQueryBuilder('s').where("s.status != 'VOIDED'");
    if (filterBranchId) salesQuery = salesQuery.andWhere('s.branchId = :filterBranchId', { filterBranchId });

    const salesTotals = await salesQuery
      .select('COUNT(s.id)', 'count')
      .addSelect('SUM(s.totalPrice)', 'totalPrice')
      .addSelect('SUM(s.paidAmount)', 'totalPaid')
      .addSelect('SUM(s.remainingAmount)', 'totalRemaining')
      .addSelect("SUM(CASE WHEN s.saleType = 'CASH' THEN s.totalPrice ELSE 0 END)", 'cashSales')
      .addSelect("SUM(CASE WHEN s.saleType = 'INSTALLMENT' THEN s.totalPrice ELSE 0 END)", 'installmentSales')
      .getRawOne();

    // 2. Today's Collections
    let todayPayQuery = paymentRepo.createQueryBuilder('p').where('p.paidAt >= :todayStart AND p.paidAt <= :todayEnd', { todayStart, todayEnd });
    if (filterBranchId) todayPayQuery = todayPayQuery.andWhere('p.branchId = :filterBranchId', { filterBranchId });

    const todayPayTotals = await todayPayQuery
      .select('COUNT(p.id)', 'count')
      .addSelect('SUM(p.amount)', 'total')
      .getRawOne();

    // 3. Overdue Installments
    let overdueQuery = instRepo.createQueryBuilder('i')
      .innerJoin('i.sale', 's')
      .where("i.isPaid = false AND i.dueDate < :now AND s.status = 'ACTIVE'", { now: todayStart });
    if (filterBranchId) overdueQuery = overdueQuery.andWhere('i.branchId = :filterBranchId', { filterBranchId });

    const overdueTotals = await overdueQuery
      .select('COUNT(i.id)', 'count')
      .addSelect('SUM(i.amount - i.paidAmount)', 'total')
      .getRawOne();

    // 4. Total Customers
    let custQuery = customerRepo.createQueryBuilder('c');
    if (filterBranchId) custQuery = custQuery.where('c.branchId = :filterBranchId', { filterBranchId });
    const totalCustomers = await custQuery.getCount();

    // 5. Branch Benchmarks (Comparison across all branches)
    const branches = await branchRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
    const branchBenchmarks = await Promise.all(
      branches.map(async (b) => {
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

    // Sort benchmarks by collection ratio descending
    branchBenchmarks.sort((a, b) => b.collectionRatio - a.collectionRatio);

    // 6. Recent Payments across branches
    let recentPayQuery = paymentRepo.createQueryBuilder('p')
      .innerJoinAndSelect('p.sale', 's')
      .innerJoinAndSelect('s.customer', 'c')
      .innerJoinAndSelect('p.branch', 'b')
      .orderBy('p.paidAt', 'DESC')
      .take(8);
    if (filterBranchId) recentPayQuery = recentPayQuery.where('p.branchId = :filterBranchId', { filterBranchId });
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
