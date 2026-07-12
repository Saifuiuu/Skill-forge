import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Enrolment } from '../../enrolments/entities/enrolment.entity';
import { Quiz } from './quiz.entity';

@Entity('quiz_attempts')
export class QuizAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Enrolment, { nullable: false })
  enrolment: Enrolment;

  @ManyToOne(() => Quiz, { nullable: false })
  quiz: Quiz;

  @Column()
  attemptNumber: number;

  @Column({ type: 'jsonb', nullable: true })
  answers: { questionId: string; answer: string }[] | null;

  @Column({ type: 'int', nullable: true })
  score: number | null;

  @Column({ type: 'boolean', nullable: true })
  passed: boolean | null;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}