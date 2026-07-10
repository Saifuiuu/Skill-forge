import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  CONTENT_ADMIN = 'CONTENT_ADMIN',
  HR_ADMIN = 'HR_ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;

  // Yahan Foreign Keys ayengi (TeamId, DepartmentId) jo hum next relation step me add karenge

  @CreateDateColumn()
  createdAt: Date;
}