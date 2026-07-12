import { Enrolment } from '../../enrolments/entities/enrolment.entity';
import { User } from '../../users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ContentType {
  PDF = 'PDF',
  VIDEO = 'VIDEO',
}

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

  // Department targeting kept as a plain UUID array (no separate join table needed)
  @Column('uuid', { array: true, default: () => "'{}'" })
  departmentIds: string[];

  @Column({ type: 'enum', enum: ContentType, nullable: true })
  contentType: ContentType | null;

 @Column({ type: 'varchar', nullable: true })
 contentUrl: string | null;

  // Versioning
  @Column({ default: 1 })
  version: number;

  @Column({ default: true })
  isLatestVersion: boolean;

  // Plain column pointing at the course row this version replaced (no FK relation to keep it simple)
  @Column('uuid', { nullable: true })
previousVersionId: string | null;

  // Prerequisite chain: this course requires the courses listed here to be completed first
  @ManyToMany(() => Course)
  @JoinTable({ name: 'course_prerequisites' })
  prerequisites: Course[];

  @ManyToOne(() => User, { nullable: false })
  createdBy: User;

  @OneToMany(() => Enrolment, (enrolment) => enrolment.course)
  enrolments: Enrolment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}