import 'reflect-metadata';
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

// Active connection
const activeType = process.env.DB_TYPE || 'postgres';

export const AppDataSource = new DataSource(
  activeType === 'oracle' ? createOracleDataSourceOptions() : createPostgresDataSourceOptions()
);

export async function initializeDatabase(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    console.log(`[Database] Connecting using ${AppDataSource.options.type}...`);
    await AppDataSource.initialize();
    console.log(`[Database] ✅ Connected successfully to ${AppDataSource.options.type}`);
  }
  return AppDataSource;
}
