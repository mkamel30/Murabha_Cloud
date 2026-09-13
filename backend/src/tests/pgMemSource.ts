import { newDb } from 'pg-mem';
import { DataSource } from 'typeorm';
import { Branch, User, Customer, MachineSale, Installment, Payment, FollowUp, AuditLog } from '../entities/index.js';
import crypto from 'crypto';

export function createPgMemDataSource(): DataSource {
  const db = newDb({
    autoCreateForeignKeyIndices: true,
  });

  db.registerExtension('uuid-ossp', (schema) => {
    schema.registerFunction({
      name: 'uuid_generate_v4',
      returns: db.public.getType('uuid'),
      impure: true,
      implementation: () => crypto.randomUUID(),
    });
  });

  const textType = db.public.getType('text');

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
    implementation: () => 'PostgreSQL 16.0 (pg-mem in-memory test engine)',
  });

  db.public.registerFunction({
    name: 'current_database',
    returns: textType,
    implementation: () => 'murabha_cloud_test',
  });

  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: db.public.getType('uuid'),
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
