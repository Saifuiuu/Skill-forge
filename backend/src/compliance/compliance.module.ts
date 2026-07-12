import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrolment } from '../enrolments/entities/enrolment.entity';
import { Department } from '../departments/entities/department.entity';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Course, Enrolment, Department])],
  controllers: [ComplianceController],
  providers: [ComplianceService],
})
export class ComplianceModule {}