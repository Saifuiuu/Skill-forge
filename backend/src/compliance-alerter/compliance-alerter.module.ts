import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { Course } from '../courses/entities/course.entity';
import { Enrolment } from '../enrolments/entities/enrolment.entity';
import { User } from '../users/entities/user.entity';
import { ComplianceAlerterController } from './compliance-alerter.controller';
import { ComplianceAlerterService } from './compliance-alerter.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([User, Course, Enrolment]),
    AiModule,
  ],
  controllers: [ComplianceAlerterController],
  providers: [ComplianceAlerterService],
})
export class ComplianceAlerterModule {}
