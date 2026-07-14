import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { User } from '../../users/entities/user.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => Department, (department) => department.teams, { onDelete: 'CASCADE' })
  department: Department;

  @OneToMany(() => User, (user) => user.team)
  members: User[];

  @CreateDateColumn()
  createdAt: Date;
}
