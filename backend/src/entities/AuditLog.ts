import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
@Index(['branchId', 'createdAt'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  username?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  userRole?: string | null;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar', length: 50 })
  action!: string; // 'LOGIN', 'CREATE_SALE', 'VOID_SALE', 'RECORD_PAYMENT', 'VOID_PAYMENT', 'WAIVE_INSTALLMENTS', 'USER_CREATE', etc.

  @Column({ type: 'varchar', length: 50, nullable: true })
  targetEntity?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetId?: string | null;

  @Column({ type: 'text', nullable: true })
  details?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent?: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
