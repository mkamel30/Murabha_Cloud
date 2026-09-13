import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Branch } from './Branch.js';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HQ_MANAGER = 'HQ_MANAGER',
  HQ_ACCOUNTANT = 'HQ_ACCOUNTANT',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  BRANCH_COLLECTOR = 'BRANCH_COLLECTOR',
  BRANCH_DATA_ENTRY = 'BRANCH_DATA_ENTRY',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: UserRole.BRANCH_COLLECTOR,
  })
  role!: UserRole;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
