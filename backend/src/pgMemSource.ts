import { newDb } from 'pg-mem';
import { DataSource } from 'typeorm';
import { Branch, User, Customer, MachineSale, Installment, Payment, FollowUp, AuditLog } from './entities/index.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export function createPgMemDataSource(): DataSource {
  const db = newDb({
    autoCreateForeignKeyIndices: true,
  });

  db.registerExtension('uuid-ossp', (schema: any) => {
    schema.registerFunction({
      name: 'uuid_generate_v4',
      returns: db.public.getType('uuid' as any),
      impure: true,
      implementation: () => crypto.randomUUID(),
    });
  });

  const textType = db.public.getType('text' as any);

  db.public.registerFunction({
    name: 'quote_ident',
    args: [textType],
    returns: textType,
    implementation: (str: string) => `"${str}"`,
  });

  db.public.registerFunction({
    name: 'obj_description',
    args: [textType, textType],
    returns: textType,
    implementation: () => null,
  });

  db.public.registerFunction({
    name: 'version',
    returns: textType,
    implementation: () => 'PostgreSQL 16.0 (pg-mem embedded engine)',
  });

  db.public.registerFunction({
    name: 'current_database',
    returns: textType,
    implementation: () => 'murabha_cloud_local',
  });

  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: db.public.getType('uuid' as any),
    impure: true,
    implementation: () => crypto.randomUUID(),
  });

  const ds = db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: [Branch, User, Customer, MachineSale, Installment, Payment, FollowUp, AuditLog],
    synchronize: true,
  });

  return ds;
}

const STATE_FILE = path.resolve(process.cwd(), 'murabha_cloud_local_state.json');

export async function saveLocalState(ds: DataSource): Promise<void> {
  if (!ds || !ds.isInitialized) return;
  try {
    const branchRepo = ds.getRepository(Branch);
    const userRepo = ds.getRepository(User);
    const auditRepo = ds.getRepository(AuditLog);

    const branches = await branchRepo.find();
    const users = await userRepo.find();
    const auditLogs = await auditRepo.find({ take: 100 });

    const data = {
      branches,
      users,
      auditLogs,
      savedAt: new Date().toISOString(),
    };

    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e: any) {
    // Gracefully ignore save errors during test or shutdown
  }
}

export async function loadLocalState(ds: DataSource): Promise<boolean> {
  if (!fs.existsSync(STATE_FILE)) return false;
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const data = JSON.parse(raw);

    const branchRepo = ds.getRepository(Branch);
    const userRepo = ds.getRepository(User);
    const auditRepo = ds.getRepository(AuditLog);

    if (Array.isArray(data.branches) && data.branches.length > 0) {
      await branchRepo.save(data.branches);
    }
    if (Array.isArray(data.users) && data.users.length > 0) {
      await userRepo.save(data.users);
    }
    if (Array.isArray(data.auditLogs) && data.auditLogs.length > 0) {
      await auditRepo.save(data.auditLogs);
    }

    const userCount = await userRepo.count();
    if (userCount > 0) {
      console.log(`[EmbeddedDB] ✅ Restored state from disk (${userCount} users, ${data.branches?.length || 0} branches)`);
      return true;
    }
    return false;
  } catch (e: any) {
    console.warn('[EmbeddedDB] ⚠️ Could not parse existing state file, initializing fresh:', e.message);
    return false;
  }
}
