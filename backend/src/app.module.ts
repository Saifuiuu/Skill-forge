import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventEmitterModule } from '@nestjs/event-emitter';
import { Certificate } from './certificates/entities/certificate.entity';
import { CertificatesModule } from './certificates/certificates.module';



import { Company } from './companies/entities/company.entity';
import { Department } from './departments/entities/department.entity';
import { Team } from './teams/entities/team.entity';
import { User } from './users/entities/user.entity';
import { Course } from './courses/entities/course.entity';
import { Enrolment } from './enrolments/entities/enrolment.entity';
import { Quiz } from './quizzes/entities/quiz.entity';
import { Question } from './questions/entities/question.entity';

import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { DepartmentsModule } from './departments/departments.module';
import { TeamsModule } from './teams/teams.module';
import { CoursesModule } from './courses/courses.module';
import { EnrolmentsModule } from './enrolments/enrolments.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { QuestionsModule } from './questions/questions.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ComplianceModule } from './compliance/compliance.module';



@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [
        User,
        Company,
        Department,
        Team,
        Enrolment,
        Course,
        Quiz,
        Question,
        Certificate,
      ],
      synchronize: true,
      migrationsRun: true,
      migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      ssl: true,
      extra: {
        ssl: { rejectUnauthorized: false },
      },
    }),
    AuthModule,
    UsersModule,
    CompaniesModule,
    DepartmentsModule,
    TeamsModule,
    CoursesModule,
    EnrolmentsModule,
    QuizzesModule,
    QuestionsModule,
    CertificatesModule,
    ComplianceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
