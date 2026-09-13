import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Branch } from './Branch.js';
import { MachineSale } from './MachineSale.js';
import { Payment } from './Payment.js';

const decimalTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null | undefined) => (value !== null && value !== undefined ? Number(value) : 0),
};

@Entity('installments')
@Index(['branchId', 'dueDate', 'isPaid'])
@Index(['saleId', 'installmentNo'])
export class Installment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'uuid' })
  saleId!: string;

  @ManyToOne(() => MachineSale, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saleId' })
  sale!: MachineSale;

  @Column({ type: 'uuid', nullable: true })
  paymentId?: string | null;

  @ManyToOne(() => Payment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paymentId' })
  payment?: Payment | null;

  @Column({ type: 'int' })
  installmentNo!: number;

  @Column({ type: 'timestamp' })
  dueDate!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalTransformer })
  amount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  paidAmount!: number;

  @Column({ type: 'boolean', default: false })
  isPaid!: boolean;

  @Column({ type: 'boolean', default: false })
  isWaived!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  waiveReason?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidDate?: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  receiptNumber?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
