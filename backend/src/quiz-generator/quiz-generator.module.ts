import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { Course } from '../courses/entities/course.entity';
import { Question } from '../questions/entities/question.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { PdfExtractionService } from './pdf-extraction.service';
import { QuizGeneratorController } from './quiz-generator.controller';
import { QuizGeneratorService } from './quiz-generator.service';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Quiz, Question]), AiModule],
  controllers: [QuizGeneratorController],
  providers: [QuizGeneratorService, PdfExtractionService],
})
export class QuizGeneratorModule {}
