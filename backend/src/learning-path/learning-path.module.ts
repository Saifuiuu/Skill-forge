import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { Course } from '../courses/entities/course.entity';
import { Enrolment } from '../enrolments/entities/enrolment.entity';
import { UsersModule } from '../users/users.module';
import { LearningPathController } from './learning-path.controller';
import { LearningPathService } from './learning-path.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, Enrolment]),
    AiModule,
    UsersModule,
  ],
  controllers: [LearningPathController],
  providers: [LearningPathService],
})
export class LearningPathModule {}
