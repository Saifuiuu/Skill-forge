import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { Certificate } from '../certificates/entities/certificate.entity';
import { Company } from '../companies/entities/company.entity';
import { Course } from '../courses/entities/course.entity';
import { Department } from '../departments/entities/department.entity';
import { Enrolment } from '../enrolments/entities/enrolment.entity';
import { Question } from '../questions/entities/question.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity';
import { Team } from '../teams/entities/team.entity';
import { User } from '../users/entities/user.entity';

export const APP_ENTITIES = [
  User,
  Company,
  Department,
  Team,
  Enrolment,
  Course,
  Quiz,
  QuizAttempt,
  Question,
  Certificate,
];

export function buildDatabaseOptions(
  databaseUrl: string,
  options: { runMigrations?: boolean } = {},
): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: APP_ENTITIES,
    synchronize: true,
    migrationsRun: options.runMigrations ?? true,
    migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
    ssl: true,
    extra: {
      ssl: { rejectUnauthorized: false },
    },
  };
}
