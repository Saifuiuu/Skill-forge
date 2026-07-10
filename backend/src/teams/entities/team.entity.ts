import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { User } from 'src/users/entities/user.entity/user.entity';


@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // Team ka link Department ke sath
  @ManyToOne(() => Department, (department) => department.teams, { onDelete: 'CASCADE' })
  department: Department;

  // Ek team me multiple users (employees) hote hain
  @OneToMany(() => User, (user) => user.team)
  members: User[];

  @CreateDateColumn()
  createdAt: Date;
}