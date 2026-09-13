import 'reflect-metadata';
import path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Branch, User, Customer, MachineSale, Installment, Payment, FollowUp, AuditLog } from './entities/index.js';
import { config } from 'dotenv';

config();

const entities = [Branch, User, Customer, MachineSale, Installment, Payment, FollowUp, AuditLog];

export interface OracleConfig {
  host?: string;
  port?: number;
  serviceName?: string;
  sid?: string;
  username: string;
  password?: string;
  connectString?: string;
}

export function createPostgresDataSourceOptions(): DataSourceOptions {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      synchronize: process.env.NODE_ENV !== 'production' || process.env.AUTO_SYNC === 'true',
      logging: process.env.NODE_ENV === 'development',
      entities,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'murabha_cloud',
    synchronize: process.env.NODE_ENV !== 'production' || process.env.AUTO_SYNC === 'true',
    logging: process.env.NODE_ENV === 'development',
    entities,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

export function createOracleDataSourceOptions(cfg?: OracleConfig): DataSourceOptions {
  const host = cfg?.host || process.env.ORACLE_HOST || 'localhost';
  const port = cfg?.port || parseInt(process.env.ORACLE_PORT || '1521', 10);
  const serviceName = cfg?.serviceName || process.env.ORACLE_SERVICE_NAME || 'FREEPDB1';
  const username = cfg?.username || process.env.ORACLE_USER || 'SYSTEM';
  const password = cfg?.password || process.env.ORACLE_PASSWORD || '';
  const connectString = cfg?.connectString || `${host}:${port}/${serviceName}`;

  return {
    type: 'oracle',
    connectString,
    username,
    password,
    synchronize: true,
    logging: true,
    entities,
  };
}

export function createSqliteDataSourceOptions(databasePath?: string): DataSourceOptions {
  return {
    type: 'better-sqlite3',
    database: databasePath || process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), 'murabha_cloud_test.db'),
    synchronize: true,
    logging: false,
    entities,
  };
}
import { createPgMemDataSource, loadLocalState, saveLocalState } from './pgMemSource.js';
import { ensureInitialSeed } from './scripts/seed.js';

export function getDataSourceOptions(): DataSourceOptions {
  const activeType = process.env.DB_TYPE || 'postgres';
  if (activeType === 'oracle') return createOracleDataSourceOptions();
  if (activeType === 'sqlite') return createSqliteDataSourceOptions();
  return createPostgresDataSourceOptions();
}

export let AppDataSource = new DataSource(getDataSourceOptions());

export function setAppDataSource(ds: DataSource) {
  AppDataSource = ds;
}

export async function initializeDatabase(): Promise<DataSource> {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }

  const activeType = process.env.DB_TYPE || 'postgres';
  if (activeType === 'memory' || activeType === 'embedded') {
    console.log('[Database] Initializing Embedded PostgreSQL Engine (pg-mem)...');
    const memDs = createPgMemDataSource();
    await memDs.initialize();
    setAppDataSource(memDs);
    console.log('[Database] ✅ Connected successfully to Embedded PostgreSQL');
    const restored = await loadLocalState(memDs);
    if (!restored) {
      await ensureInitialSeed();
      await saveLocalState(memDs);
    }
    return memDs;
  }

  console.log(`[Database] Connecting using ${AppDataSource.options.type}...`);
  try {
    await AppDataSource.initialize();
    console.log(`[Database] ✅ Connected successfully to ${AppDataSource.options.type}`);
    await ensureInitialSeed();
  } catch (err: any) {
    // In development or local runs, if Postgres server is not running, seamlessly fallback to embedded PostgreSQL
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DB_FALLBACK === 'true') {
      console.warn(`[Database] ⚠️ Local ${AppDataSource.options.type} database is not reachable (${err?.code || err?.message || 'Connection refused'}).`);
      console.log(`[Database] 🚀 Switching automatically to Embedded PostgreSQL Engine (pg-mem)...`);
      const memDs = createPgMemDataSource();
      await memDs.initialize();
      setAppDataSource(memDs);
      console.log('[Database] ✅ Connected successfully to Embedded PostgreSQL');
      const restored = await loadLocalState(memDs);
      if (!restored) {
        await ensureInitialSeed();
        await saveLocalState(memDs);
      }
      return memDs;
    }

    throw err;
  }

  return AppDataSource;
}
