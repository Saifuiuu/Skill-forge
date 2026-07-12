import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  employee: User;

  @ManyToOne(() => Course, { nullable: false })
  course: Course;

  @Column({ type: 'uuid', nullable: true })
  enrolmentId: string | null;

  @Column({ type: 'timestamp' })
  issueDate: Date;

  @Column({ type: 'varchar', unique: true })
  verificationCode: string;

  @Column({ type: 'varchar' })
  pdfPath: string;

  @CreateDateColumn()
  createdAt: Date;
}