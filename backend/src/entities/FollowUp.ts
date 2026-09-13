import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Branch } from './Branch.js';
import { Customer } from './Customer.js';
import { User } from './User.js';

@Entity('follow_ups')
@Index(['branchId', 'nextFollowUp', 'isCompleted'])
export class FollowUp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;

  @Column({ type: 'varchar', length: 1000 })
  note!: string;

  @Column({ type: 'text', default: '[]' })
  logs!: string;

  @Column({ type: 'timestamp', nullable: true })
  nextFollowUp?: Date | null;

  @Column({ type: 'boolean', default: false })
  isCompleted!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date | null;

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
