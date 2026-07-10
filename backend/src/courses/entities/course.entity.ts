import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Enrolment } from '../../enrolments/entities/enrolment.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  estimatedDuration: string; // e.g., "2 hours"

  @Column({ default: false })
  isMandatory: boolean;

  @Column({ type: 'date', nullable: true })
  regulatoryDeadline: Date;

  // Ek course me multiple enrolments hoti hain
  @OneToMany(() => Enrolment, (enrolment) => enrolment.course)
  enrolments: Enrolment[];

  @CreateDateColumn()
  createdAt: Date;
}