import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quiz } from './entities/quiz.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { Enrolment } from '../enrolments/entities/enrolment.entity';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { EnrolmentsModule } from '../enrolments/enrolments.module';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, QuizAttempt, Enrolment]), EnrolmentsModule],
  controllers: [QuizzesController],
  providers: [QuizzesService],
})
export class QuizzesModule {}