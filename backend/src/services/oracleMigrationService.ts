import { DataSource } from 'typeorm';
import { AppDataSource, createOracleDataSourceOptions, OracleConfig } from '../data-source.js';
import { Branch, User, Customer, MachineSale, Installment, Payment, FollowUp, AuditLog } from '../entities/index.js';

export interface MigrationAuditResult {
  table: string;
  sourceCount: number;
  targetCount: number;
  matched: boolean;
}

export interface FullMigrationResult {
  success: boolean;
  totalTransferred: number;
  auditResults: MigrationAuditResult[];
  financialAudit: {
    sourceTotalSales: number;
    targetTotalSales: number;
    salesMatched: boolean;
    sourceTotalPayments: number;
    targetTotalPayments: number;
    paymentsMatched: boolean;
  };
  durationMs: number;
}

export class OracleMigrationService {
  /**
   * Test Oracle DB connection
   */
  async testConnection(cfg: OracleConfig): Promise<{ success: boolean; version?: string; message: string }> {
    const ds = new DataSource(createOracleDataSourceOptions(cfg));
    try {
      await ds.initialize();
      const res = await ds.query('SELECT BANNER FROM V$VERSION WHERE ROWNUM = 1');
      const version = res[0]?.BANNER || 'Oracle Database connected';
      await ds.destroy();
      return { success: true, version, message: 'تم الاتصال بنجاح بقاعدة بيانات أوراكل' };
    } catch (err: any) {
      if (ds.isInitialized) await ds.destroy();
      return { success: false, message: `فشل الاتصال: ${err.message || err}` };
    }
  }

  /**
   * Provision Schema on Oracle (creates all tables, indices, and constraints)
   */
  async provisionSchema(cfg: OracleConfig): Promise<{ success: boolean; message: string }> {
    const ds = new DataSource({
      ...createOracleDataSourceOptions(cfg),
      synchronize: true,
    });

    try {
      await ds.initialize();
      await ds.synchronize();
      await ds.destroy();
      return { success: true, message: 'تم إنشاء الجداول وهيكل البيانات في أوراكل بنجاح' };
    } catch (err: any) {
      if (ds.isInitialized) await ds.destroy();
      return { success: false, message: `فشل إنشاء الجداول: ${err.message || err}` };
    }
  }

  /**
   * Migrate all data from current database (Postgres) to Oracle with data validation
   */
  async migrateData(cfg: OracleConfig): Promise<FullMigrationResult> {
    const startTime = Date.now();
    const oracleDs = new DataSource({
      ...createOracleDataSourceOptions(cfg),
      synchronize: false, // Schema must already exist
    });

    await oracleDs.initialize();

    const auditResults: MigrationAuditResult[] = [];
    let totalTransferred = 0;

    try {
      // Order matters due to foreign keys!
      const entitiesToMigrate = [
        { name: 'Branch', entity: Branch },
        { name: 'User', entity: User },
        { name: 'Customer', entity: Customer },
        { name: 'MachineSale', entity: MachineSale },
        { name: 'Payment', entity: Payment },
        { name: 'Installment', entity: Installment },
        { name: 'FollowUp', entity: FollowUp },
        { name: 'AuditLog', entity: AuditLog },
      ];

      for (const { name, entity } of entitiesToMigrate) {
        const sourceRepo = AppDataSource.getRepository(entity);
        const targetRepo = oracleDs.getRepository(entity);

        // 1. Fetch all rows from source
        const rows = await sourceRepo.find();
        const sourceCount = rows.length;

        // 2. Clear target or insert
        if (rows.length > 0) {
          // Chunk inserts to prevent Oracle parameter limits
          const chunkSize = 100;
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            await targetRepo.save(chunk);
          }
        }

        const targetCount = await targetRepo.count();
        totalTransferred += targetCount;

        auditResults.push({
          table: name,
          sourceCount,
          targetCount,
          matched: sourceCount === targetCount,
        });
      }

      // Financial Audit verification
      const sourceSales = await AppDataSource.getRepository(MachineSale)
        .createQueryBuilder('s')
        .select('SUM(s.totalPrice)', 'sum')
        .where("s.status != 'VOIDED'")
        .getRawOne();

      const targetSales = await oracleDs.getRepository(MachineSale)
        .createQueryBuilder('s')
        .select('SUM(s.totalPrice)', 'sum')
        .where("s.status != 'VOIDED'")
        .getRawOne();

      const sourcePayments = await AppDataSource.getRepository(Payment)
        .createQueryBuilder('p')
        .select('SUM(p.amount)', 'sum')
        .getRawOne();

      const targetPayments = await oracleDs.getRepository(Payment)
        .createQueryBuilder('p')
        .select('SUM(p.amount)', 'sum')
        .getRawOne();

      const sSales = Number(sourceSales?.sum || 0);
      const tSales = Number(targetSales?.sum || 0);
      const sPayments = Number(sourcePayments?.sum || 0);
      const tPayments = Number(targetPayments?.sum || 0);

      await oracleDs.destroy();

      return {
        success: auditResults.every((r) => r.matched) && sSales === tSales && sPayments === tPayments,
        totalTransferred,
        auditResults,
        financialAudit: {
          sourceTotalSales: sSales,
          targetTotalSales: tSales,
          salesMatched: Math.abs(sSales - tSales) < 0.01,
          sourceTotalPayments: sPayments,
          targetTotalPayments: tPayments,
          paymentsMatched: Math.abs(sPayments - tPayments) < 0.01,
        },
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      if (oracleDs.isInitialized) await oracleDs.destroy();
      throw err;
    }
  }
}
