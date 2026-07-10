import { Quiz } from 'src/quizzes/entities/quiz.entity';
import { Team } from 'src/teams/entities/team.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToOne } from 'typeorm';


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

  // Har user (employee) ek team ka hissa hota hai
  @ManyToOne(() => Team, (team) => team.members, { nullable: true, onDelete: 'SET NULL' })
  team: Team;

  @OneToOne(() =>Quiz, (quiz) => quiz.course)
quiz: Quiz;
  @CreateDateColumn()
  createdAt: Date;
}