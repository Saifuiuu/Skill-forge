import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { Course } from '../courses/entities/course.entity';
import { Enrolment } from '../enrolments/entities/enrolment.entity';
import { Team } from '../teams/entities/team.entity';
import { User } from '../users/entities/user.entity';
import { SkillGapController } from './skill-gap.controller';
import { SkillGapService } from './skill-gap.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, Course, Enrolment, User]),
    AiModule,
  ],
  controllers: [SkillGapController],
  providers: [SkillGapService],
})
export class SkillGapModule {}
