import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { Question } from '../../questions/entities/question.entity';

@Entity('quizzes')
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 75 })
  passThreshold: number;

  @Column({ default: 3 })
  maxAttempts: number;

  @Column({ default: 30 })
 timeLimitMinutes: number;
  // Ek course ka exactly ek quiz hoga
  @OneToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn()
  course: Course;

  // Ek quiz me multiple questions honge
  @OneToMany(() => Question, (question) => question.quiz)
  questions: Question[];
}