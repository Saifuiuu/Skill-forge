import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Team } from '../../teams/entities/team.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // Department ka link Company ke sath
  @ManyToOne(() => Company, (company) => company.departments, { onDelete: 'CASCADE' })
  company: Company;

  // Ek department me multiple teams hoti hain
  @OneToMany(() => Team, (team) => team.department)
  teams: Team[];

  @CreateDateColumn()
  createdAt: Date;
}