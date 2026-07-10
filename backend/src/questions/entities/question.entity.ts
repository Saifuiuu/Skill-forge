import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Quiz } from '../../quizzes/entities/quiz.entity';

export enum QuestionType {
  MCQ = 'MCQ',
  SHORT_ANSWER = 'SHORT_ANSWER',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType;

  @Column('text')
  text: string;

  // PostgreSQL ka array type MCQs ke 4 options store karne ke liye
  @Column('simple-array', { nullable: true })
  options: string[]; 

  @Column()
  correctAnswer: string;

  @Column('text', { nullable: true })
  explanation: string;

  @ManyToOne(() => Quiz, (quiz) => quiz.questions, { onDelete: 'CASCADE' })
  quiz: Quiz;
}