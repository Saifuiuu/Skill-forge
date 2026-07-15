import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventEmitterModule } from '@nestjs/event-emitter';
import { CertificatesModule } from './certificates/certificates.module';
import { buildDatabaseOptions } from './database/database.config';

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
import { LearningPathModule } from './learning-path/learning-path.module';
import { QuizGeneratorModule } from './quiz-generator/quiz-generator.module';
import { SkillGapModule } from './skill-gap/skill-gap.module';
import { ComplianceAlerterModule } from './compliance-alerter/compliance-alerter.module';



@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is not set in .env');
        }
        return buildDatabaseOptions(databaseUrl);
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
    LearningPathModule,
    QuizGeneratorModule,
    SkillGapModule,
    ComplianceAlerterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
