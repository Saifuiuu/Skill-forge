import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';

import { Course } from '../../courses/entities/course.entity';
import { User } from 'src/users/entities/user.entity/user.entity';

export enum EnrolmentStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  PENDING_QUIZ = 'Pending Quiz',
  PASSED = 'Passed',
  FAILED = 'Failed',
}

@Entity('enrolments')
export class Enrolment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: EnrolmentStatus, default: EnrolmentStatus.NOT_STARTED })
  status: EnrolmentStatus;

  // Kis user ki enrolment hai
  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  user: User;

  // Kis course me enrolment hai
  @ManyToOne(() => Course, (course) => course.enrolments, { onDelete: 'CASCADE' })
  course: Course;

  @CreateDateColumn()
  enrolledAt: Date;
}