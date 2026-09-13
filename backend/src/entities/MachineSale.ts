import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Branch } from './Branch.js';
import { Customer } from './Customer.js';
import { User } from './User.js';

const decimalTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null | undefined) => (value !== null && value !== undefined ? Number(value) : 0),
};

@Entity('machine_sales')
@Index(['branchId', 'status'])
@Index(['branchId', 'saleDate'])
export class MachineSale {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'varchar', length: 50, unique: true })
  receiptNumber!: string;

  @Column({ type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;

  @Column({ type: 'varchar', length: 100 })
  machineSerial!: string;

  @Column({ type: 'varchar', length: 30 })
  saleType!: string; // 'CASH' | 'INSTALLMENT'

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalTransformer })
  totalPrice!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  downPayment!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  downPaymentReceipt?: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  paidAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalTransformer })
  remainingAmount!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentPlace?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes?: string | null;

  @Column({ type: 'timestamp' })
  saleDate!: Date;

  @Column({ type: 'timestamp', nullable: true })
  firstDueDate?: Date | null;

  @Column({ type: 'int', nullable: true })
  months?: number | null;

  @Column({ type: 'varchar', length: 30, default: 'ACTIVE' })
  status!: string; // 'ACTIVE' | 'COMPLETED' | 'VOIDED'

  @Column({ type: 'varchar', length: 300, nullable: true })
  voidReason?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  voidedAt?: Date | null;

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
