import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrolment } from './entities/enrolment.entity';
import { EnrolmentsService } from './enrolments.service';
import { EnrolmentsController } from './enrolments.controller';
import { EnrolmentsGateway } from './enrolments.gateway';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [TypeOrmModule.forFeature([Enrolment]), CoursesModule],
  controllers: [EnrolmentsController],
  providers: [EnrolmentsService, EnrolmentsGateway],
  exports: [EnrolmentsService],
})
export class EnrolmentsModule {}