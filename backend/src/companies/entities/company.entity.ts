import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Department } from '../../departments/entities/department.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // Ek company me multiple departments hote hain
  @OneToMany(() => Department, (department) => department.company)
  departments: Department[];

  @CreateDateColumn()
  createdAt: Date;
}