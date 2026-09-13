import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Branch } from './Branch.js';
import { MachineSale } from './MachineSale.js';
import { User } from './User.js';

const decimalTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null | undefined) => (value !== null && value !== undefined ? Number(value) : 0),
};

@Entity('payments')
@Index(['branchId', 'paidAt'])
@Index(['saleId', 'paidAt'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'varchar', length: 50 })
  receiptNumber!: string;

  @Column({ type: 'uuid' })
  saleId!: string;

  @ManyToOne(() => MachineSale, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'saleId' })
  sale!: MachineSale;

  @Column({ type: 'varchar', length: 30 })
  paymentType!: string; // 'CASH_SALE' | 'INSTALLMENT' | 'DOWN_PAYMENT' | 'REWARD'

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalTransformer })
  amount!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentPlace?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes?: string | null;

  @Column({ type: 'timestamp' })
  paidAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser?: User | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
