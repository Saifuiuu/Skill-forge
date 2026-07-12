import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { Enrolment } from '../enrolments/entities/enrolment.entity';
import { EnrolmentsService } from '../enrolments/enrolments.service';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz) private readonly quizzesRepo: Repository<Quiz>,
    @InjectRepository(QuizAttempt) private readonly attemptsRepo: Repository<QuizAttempt>,
    @InjectRepository(Enrolment) private readonly enrolmentsRepo: Repository<Enrolment>,
    private readonly enrolmentsService: EnrolmentsService,
  ) {}

  create(dto: CreateQuizDto) {
    const quiz = this.quizzesRepo.create({
      course: { id: dto.courseId } as any,
      passThreshold: dto.passThreshold ?? 75,
      maxAttempts: dto.maxAttempts ?? 3,
      timeLimitMinutes: dto.timeLimitMinutes ?? 30,
    });
    return this.quizzesRepo.save(quiz);
  }

  findAll() {
    return this.quizzesRepo.find({ relations: { course: true } });
  }

  async findOne(id: string): Promise<Quiz> {
    const quiz = await this.quizzesRepo.findOne({
      where: { id },
      relations: { course: true, questions: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async update(id: string, dto: UpdateQuizDto): Promise<Quiz> {
    const quiz = await this.findOne(id);
    Object.assign(quiz, {
      passThreshold: dto.passThreshold ?? quiz.passThreshold,
      maxAttempts: dto.maxAttempts ?? quiz.maxAttempts,
      timeLimitMinutes: dto.timeLimitMinutes ?? quiz.timeLimitMinutes,
    });
    return this.quizzesRepo.save(quiz);
  }

  async remove(id: string): Promise<void> {
    const quiz = await this.findOne(id);
    await this.quizzesRepo.remove(quiz);
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Starts a new timed attempt. Enforces the 3-attempt limit (+ any manager-granted bonus attempts).
  // Never sends correctAnswer to the client, and randomises question order per attempt.
  async startAttempt(quizId: string, employeeId: string) {
    const quiz = await this.quizzesRepo.findOne({
      where: { id: quizId },
      relations: { course: true, questions: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const enrolment = await this.enrolmentsRepo.findOne({
      where: { employee: { id: employeeId }, course: { id: quiz.course.id } },
    });
    if (!enrolment) {
      throw new BadRequestException('You must be enrolled in this course before taking its quiz');
    }

    const previousAttempts = await this.attemptsRepo.count({
      where: { enrolment: { id: enrolment.id }, quiz: { id: quiz.id } },
    });

    const allowedAttempts = quiz.maxAttempts + (enrolment.bonusAttempts ?? 0);
    if (previousAttempts >= allowedAttempts) {
      throw new ForbiddenException(
        'Maximum attempts reached. Ask your manager for an override to unlock another attempt.',
      );
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + quiz.timeLimitMinutes * 60_000);

    const attempt = this.attemptsRepo.create({
      enrolment: { id: enrolment.id } as any,
      quiz: { id: quiz.id } as any,
      attemptNumber: previousAttempts + 1,
      startedAt,
      expiresAt,
    });
    const saved = await this.attemptsRepo.save(attempt);

    const questions = this.shuffle(quiz.questions).map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      options: q.options,
    }));

    return {
      attemptId: saved.id,
      expiresAt,
      timeLimitMinutes: quiz.timeLimitMinutes,
      passThreshold: quiz.passThreshold,
      questions,
    };
  }

  async submitAttempt(attemptId: string, employeeId: string, dto: SubmitAttemptDto) {
    const attempt = await this.attemptsRepo.findOne({
      where: { id: attemptId },
      relations: { enrolment: { employee: true }, quiz: { questions: true } },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.enrolment.employee.id !== employeeId) {
      throw new ForbiddenException('This is not your attempt');
    }
    if (attempt.submittedAt) throw new BadRequestException('Attempt already submitted');

    const isLate = new Date() > attempt.expiresAt;

    const questionMap = new Map(attempt.quiz.questions.map((q) => [q.id, q]));
    let correctCount = 0;
    for (const answer of dto.answers) {
      const question = questionMap.get(answer.questionId);
      if (
        question &&
        question.correctAnswer.trim().toLowerCase() === answer.answer.trim().toLowerCase()
      ) {
        correctCount++;
      }
    }
    const totalQuestions = attempt.quiz.questions.length || 1;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = !isLate && score >= attempt.quiz.passThreshold;

    attempt.answers = dto.answers;
    attempt.score = score;
    attempt.passed = passed;
    attempt.submittedAt = new Date();
    await this.attemptsRepo.save(attempt);

    if (passed) {
      await this.enrolmentsService.markPassed(attempt.enrolment.id);
    } else {
      await this.enrolmentsService.markFailed(attempt.enrolment.id);
    }

    return { score, passed, correctCount, totalQuestions, late: isLate };
  }

  // Manager grants one extra attempt to an employee who has hit the default 3-attempt limit.
  async grantOverride(quizId: string, employeeId: string): Promise<Enrolment> {
    const quiz = await this.findOne(quizId);
    const enrolment = await this.enrolmentsRepo.findOne({
      where: { employee: { id: employeeId }, course: { id: quiz.course.id } },
    });
    if (!enrolment) throw new NotFoundException('Enrolment not found for this employee/course');

    enrolment.bonusAttempts = (enrolment.bonusAttempts ?? 0) + 1;
    return this.enrolmentsRepo.save(enrolment);
  }
}