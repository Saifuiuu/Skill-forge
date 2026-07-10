import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company } from './companies/entities/company.entity';
import { Department } from './departments/entities/department.entity';
import { Team } from './teams/entities/team.entity';

// CLI ne yeh modules automatically yahan import kar diye honge
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { DepartmentsModule } from './departments/departments.module';
import { TeamsModule } from './teams/teams.module';
import { User } from './users/entities/user.entity/user.entity';
import { CoursesModule } from './courses/courses.module';
import { EnrolmentsModule } from './enrolments/enrolments.module';
import { Enrolment } from './enrolments/entities/enrolment.entity';
import { Course } from './courses/entities/course.entity';
import { QuizzesModule } from './quizzes/quizzes.module';
import { QuestionsModule } from './questions/questions.module';
import { Quiz } from './quizzes/entities/quiz.entity';
import { Question } from './questions/entities/question.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      // Yahan saari entities add karni hain warna Neon DB me tables nahi banengi
      entities: [User, Company, Department, Team,Enrolment,Course,Quiz,Question], 
      synchronize: true,
      ssl: true,
      extra: {
        ssl: {
          rejectUnauthorized: false,
        },
      },
    }),
    UsersModule,
    CompaniesModule,
    DepartmentsModule,
    TeamsModule,
    CoursesModule,
    EnrolmentsModule,
    QuizzesModule,
    QuestionsModule,
  ],
})
export class AppModule {}