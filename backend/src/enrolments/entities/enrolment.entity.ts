import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EnrolmentStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_QUIZ = 'PENDING_QUIZ',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
}

@Entity('enrolments')
export class Enrolment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  employee: User;

  @ManyToOne(() => Course, (course) => course.enrolments, { nullable: false })
  course: Course;

  @Column({ type: 'enum', enum: EnrolmentStatus, default: EnrolmentStatus.NOT_STARTED })
  status: EnrolmentStatus;

  @Column({ default: 0 })
  progressPercentage: number;

  // Who caused this enrolment: the employee themself (self-enrol) or a manager (bulk-enrol)
  @ManyToOne(() => User, { nullable: true })
  enrolledBy: User | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}