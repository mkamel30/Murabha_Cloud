import { PrismaClient } from '@prisma/client';

interface Migration {
  version: string;
  description: string;
  sql: string[];
}

const MIGRATIONS: Migration[] = [
  {
    version: '1.0.0',
    description: 'إضافة نوع العميل (مخبز/حلواني)',
    sql: [
      `ALTER TABLE Customer ADD COLUMN customerType TEXT DEFAULT 'عام';`,
    ]
  },
  {
    version: '1.0.1',
    description: 'تحسين فهرسة العملاء',
    sql: [
      `CREATE INDEX IF NOT EXISTS idx_customer_bkcode ON Customer(bkCode);`,
      `CREATE INDEX IF NOT EXISTS idx_customer_type ON Customer(customerType);`,
    ]
  },
  {
    version: '1.0.2',
    description: 'إضافة حقل الإدارة (Department)',
    sql: [
      `ALTER TABLE Customer ADD COLUMN department TEXT;`
    ]
  },
  {
    version: '1.0.3',
    description: 'ربط مباشر بين القسط والدفعة والسماح بتكرار رقم إيصال الدفعة',
    sql: [
      `ALTER TABLE Installment ADD COLUMN paymentId TEXT REFERENCES Payment(id) ON DELETE SET NULL;`,
      `CREATE INDEX IF NOT EXISTS "Installment_paymentId_idx" ON "Installment"("paymentId");`,
      `DROP INDEX IF EXISTS "Payment_receiptNumber_key";`
    ]
  },
  {
    version: '1.0.4',
    description: 'إضافة سجل الاتصالات واللوج للمتابعات (logs)',
    sql: [
      `ALTER TABLE FollowUp ADD COLUMN logs TEXT DEFAULT '[]';`
    ]
  },
  {
    version: '1.0.5',
    description: 'إضافة دعم عزل وفلترة الفروع للعملاء والمبيعات',
    sql: [
      `ALTER TABLE Customer ADD COLUMN branchId TEXT;`,
      `ALTER TABLE MachineSale ADD COLUMN branchId TEXT;`,
      `CREATE INDEX IF NOT EXISTS idx_customer_branchId ON Customer(branchId);`,
      `CREATE INDEX IF NOT EXISTS idx_machinesale_branchId ON MachineSale(branchId);`
    ]
  },
  {
    version: '1.0.6',
    description: 'إضافة دعم مباشر لحقل الفرع للأقساط والدفعات وربطها بالكامل بفرع القاهرة-الجيش',
    sql: [
      `ALTER TABLE Installment ADD COLUMN branchId TEXT;`,
      `ALTER TABLE Payment ADD COLUMN branchId TEXT;`,
      `CREATE INDEX IF NOT EXISTS idx_installment_branchId ON Installment(branchId);`,
      `CREATE INDEX IF NOT EXISTS idx_payment_branchId ON Payment(branchId);`
    ]
  }
];

export async function runMigrations(prisma: PrismaClient): Promise<void> {
  console.log('🔄 Checking for database migrations...');
  
  try {
    // Create migration tracking table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS _app_migrations (
        version TEXT PRIMARY KEY,
        applied_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Get applied migrations
    const applied = await prisma.$queryRawUnsafe<{version: string}[]>(
      `SELECT version FROM _app_migrations`
    );
    const appliedSet = new Set(applied.map(m => m.version));

    // Apply new migrations
    for (const migration of MIGRATIONS) {
      if (appliedSet.has(migration.version)) continue;
      
      console.log(`🔄 Applying migration ${migration.version}: ${migration.description}`);
      
      for (const sql of migration.sql) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch (err: any) {
          // Ignore "duplicate column" errors if they happen (e.g. if partial migration happened manually)
          if (err.message?.includes('duplicate column') || err.message?.includes('already exists')) {
            console.log(`ℹ️ Skipping part of migration ${migration.version}: column/index already exists.`);
            continue;
          }
          throw err;
        }
      }

      await prisma.$executeRawUnsafe(
        `INSERT INTO _app_migrations (version) VALUES ('${migration.version}')`
      );
      console.log(`✅ Migration ${migration.version} applied successfully`);
    }

    // Run data backfill to link existing records
    await backfillPaymentIds(prisma);
    await backfillBranchIds(prisma);

    console.log('✅ All migrations check completed.');
  } catch (error) {
    console.error('❌ Migration system failed:', error);
  }
}

async function backfillBranchIds(prisma: PrismaClient): Promise<void> {
  try {
    const defaultBranchId = 'ec3638e9-2d00-4956-93fd-f9c31630fb94'; // "القاهرة-الجيش"
    await prisma.$executeRawUnsafe(
      `UPDATE Customer SET branchId = '${defaultBranchId}' WHERE branchId IS NULL OR branchId = '';`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE MachineSale SET branchId = '${defaultBranchId}' WHERE branchId IS NULL OR branchId = '';`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE Installment SET branchId = '${defaultBranchId}' WHERE branchId IS NULL OR branchId = '';`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE Payment SET branchId = '${defaultBranchId}' WHERE branchId IS NULL OR branchId = '';`
    );
    console.log('✅ Backfilled all customers, sales, installments & payments to القاهرة-الجيش.');
  } catch (err: any) {
    // Ignore error if columns don't exist yet
  }
}

async function backfillPaymentIds(prisma: PrismaClient): Promise<void> {
  console.log('🔄 Running data backfill for Installment ↔ Payment links...');
  try {
    const installments = await prisma.installment.findMany({
      where: {
        paymentId: null,
        OR: [
          { isPaid: true },
          { paidAmount: { gt: 0 } },
          { receiptNumber: { not: null } }
        ]
      } as any
    });

    console.log(`ℹ️ Found ${installments.length} installments needing link backfill.`);
    
    let linkedCount = 0;
    for (const inst of installments) {
      let payment = null;

      if (inst.receiptNumber) {
        payment = await prisma.payment.findFirst({
          where: {
            saleId: inst.saleId,
            paymentType: 'INSTALLMENT',
            receiptNumber: inst.receiptNumber
          }
        });
      }

      if (!payment && inst.paidDate) {
        const dayStart = new Date(inst.paidDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(inst.paidDate);
        dayEnd.setHours(23, 59, 59, 999);

        payment = await prisma.payment.findFirst({
          where: {
            saleId: inst.saleId,
            paymentType: 'INSTALLMENT',
            paidAt: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        });
      }

      if (payment) {
        await prisma.installment.update({
          where: { id: inst.id },
          data: { paymentId: payment.id } as any
        });
        linkedCount++;
      } else if (inst.isPaid || Number(inst.paidAmount) > 0) {
        // Auto-create missing Payment record for paid legacy installment
        const paymentDate = inst.paidDate ? new Date(inst.paidDate) : new Date();
        const paymentAmount = Number(inst.paidAmount) > 0 ? Number(inst.paidAmount) : Number(inst.amount);
        const finalReceiptNumber = inst.receiptNumber || 'بدون إيصال';

        try {
          const newPayment = await prisma.payment.create({
            data: {
              saleId: inst.saleId,
              amount: paymentAmount,
              paymentType: 'INSTALLMENT',
              paymentPlace: 'BRANCH',
              receiptNumber: finalReceiptNumber,
              paidAt: paymentDate,
              notes: 'تم إنشاؤه تلقائياً بواسطة نظام تصحيح البيانات'
            }
          });

          await prisma.installment.update({
            where: { id: inst.id },
            data: { paymentId: newPayment.id } as any
          });
          linkedCount++;
        } catch (createErr) {
          console.error(`❌ Failed to auto-create payment for legacy installment ${inst.id}:`, createErr);
        }
      }
    }

    console.log(`✅ Linked ${linkedCount} existing installments to their payments.`);
  } catch (err) {
    console.error('❌ Backfill failed:', err);
  }
}

