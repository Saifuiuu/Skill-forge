import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { Course, ContentType } from '../courses/entities/course.entity';
import { Question, QuestionType } from '../questions/entities/question.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { PdfExtractionService } from './pdf-extraction.service';
import {
  DraftQuestionDto,
  GenerateQuizQuestionsResponseDto,
  PublishQuizQuestionsDto,
} from './dto/quiz-generator.dto';

interface AiGeneratedQuestionsPayload {
  questions: Array<{
    type: 'MCQ' | 'SHORT_ANSWER';
    text: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
  }>;
}

const QUIZ_GENERATOR_SYSTEM_PROMPT = `You are SkillForge's corporate training quiz author.
Generate assessment questions strictly from the provided course material text.
Rules:
- Produce 8 to 12 questions mixing MCQ and SHORT_ANSWER types.
- Every MCQ must have exactly 4 distinct options in the options array.
- correctAnswer for MCQ must exactly match one option string.
- SHORT_ANSWER questions must omit options or use an empty array.
- Include a concise explanation for each question.
- Do not invent facts not supported by the material.
Output JSON shape:
{
  "questions": [
    {
      "type": "MCQ",
      "text": "string",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "B",
      "explanation": "string"
    }
  ]
}`;

@Injectable()
export class QuizGeneratorService {
  constructor(
    private readonly aiService: AiService,
    private readonly pdfExtractionService: PdfExtractionService,
    @InjectRepository(Course)
    private readonly coursesRepo: Repository<Course>,
    @InjectRepository(Quiz)
    private readonly quizzesRepo: Repository<Quiz>,
    @InjectRepository(Question)
    private readonly questionsRepo: Repository<Question>,
  ) {}

  async generateFromPdf(
    courseId: string,
    fileBuffer: Buffer,
  ): Promise<GenerateQuizQuestionsResponseDto> {
    const course = await this.getCourse(courseId);
    const extractedText = await this.pdfExtractionService.extractText(fileBuffer);
    return this.buildGenerationResponse(course, extractedText);
  }

  async generateTemplate(courseId: string): Promise<GenerateQuizQuestionsResponseDto> {
    const course = await this.getCourse(courseId);
    return {
      source: 'fallback',
      courseId: course.id,
      courseTitle: course.title,
      extractedTextPreview: '',
      questions: this.blankTemplate(),
      fallbackReason: this.aiService.isDisabled()
        ? 'AI_DISABLED flag is set'
        : 'Manual-entry template for quiz authoring',
    };
  }

  async publish(
    courseId: string,
    dto: PublishQuizQuestionsDto,
  ): Promise<Quiz> {
    if (!dto.questions.length) {
      throw new BadRequestException('At least one question is required to publish');
    }

    await this.getCourse(courseId);
    this.validatePublishQuestions(dto.questions);

    let quiz = await this.quizzesRepo.findOne({
      where: { course: { id: courseId } },
      relations: { questions: true, course: true },
    });

    if (!quiz) {
      quiz = this.quizzesRepo.create({
        course: { id: courseId } as Course,
        passThreshold: dto.quizSettings?.passThreshold ?? 75,
        maxAttempts: dto.quizSettings?.maxAttempts ?? 3,
        timeLimitMinutes: dto.quizSettings?.timeLimitMinutes ?? 30,
      });
      quiz = await this.quizzesRepo.save(quiz);
    } else if (dto.quizSettings) {
      quiz.passThreshold = dto.quizSettings.passThreshold ?? quiz.passThreshold;
      quiz.maxAttempts = dto.quizSettings.maxAttempts ?? quiz.maxAttempts;
      quiz.timeLimitMinutes = dto.quizSettings.timeLimitMinutes ?? quiz.timeLimitMinutes;
      quiz = await this.quizzesRepo.save(quiz);
    }

    await this.questionsRepo.delete({ quiz: { id: quiz.id } });

    const questions = dto.questions.map((item) =>
      this.questionsRepo.create({
        type: item.type,
        text: item.text.trim(),
        options: item.type === QuestionType.MCQ ? item.options ?? [] : [],
        correctAnswer: item.correctAnswer.trim(),
        explanation: item.explanation?.trim() ?? '',
        quiz: { id: quiz!.id } as Quiz,
      }),
    );

    await this.questionsRepo.save(questions);

    const published = await this.quizzesRepo.findOne({
      where: { id: quiz.id },
      relations: { course: true, questions: true },
    });
    if (!published) {
      throw new NotFoundException('Quiz not found after publish');
    }
    return published;
  }

  private async buildGenerationResponse(
    course: Course,
    extractedText: string,
  ): Promise<GenerateQuizQuestionsResponseDto> {
    const preview = extractedText.slice(0, 500);
    const aiResult = await this.tryAiGeneration(course, extractedText);

    if (aiResult) {
      return {
        source: 'ai',
        courseId: course.id,
        courseTitle: course.title,
        extractedTextPreview: preview,
        questions: aiResult,
      };
    }

    return {
      source: 'fallback',
      courseId: course.id,
      courseTitle: course.title,
      extractedTextPreview: preview,
      questions: this.blankTemplate(),
      fallbackReason: this.aiService.isDisabled()
        ? 'AI_DISABLED flag is set'
        : 'AI question generation unavailable; using blank manual-entry template',
    };
  }

  private async tryAiGeneration(
    course: Course,
    extractedText: string,
  ): Promise<DraftQuestionDto[] | null> {
    const truncatedText = extractedText.slice(0, 15000);
    const userPrompt = `Course title: ${course.title}
Course description: ${course.description}
Content type: ${course.contentType ?? ContentType.PDF}

Course material text:
${truncatedText}`;

    const { data } = await this.aiService.completeJson<AiGeneratedQuestionsPayload>(
      QUIZ_GENERATOR_SYSTEM_PROMPT,
      userPrompt,
      { maxTokens: 4000 },
    );

    if (!data?.questions?.length) {
      return null;
    }

    const questions = data.questions
      .filter((q) => q.text?.trim() && q.correctAnswer?.trim())
      .map((q) => this.toDraftQuestion(q))
      .filter((q) => this.isValidDraft(q));

    return questions.length ? questions : null;
  }

  private toDraftQuestion(
    item: AiGeneratedQuestionsPayload['questions'][number],
  ): DraftQuestionDto {
    const type =
      item.type === 'SHORT_ANSWER' ? QuestionType.SHORT_ANSWER : QuestionType.MCQ;

    return {
      draftId: randomUUID(),
      type,
      text: item.text.trim(),
      options: type === QuestionType.MCQ ? item.options ?? [] : undefined,
      correctAnswer: item.correctAnswer.trim(),
      explanation: item.explanation?.trim(),
    };
  }

  private isValidDraft(question: DraftQuestionDto): boolean {
    if (!question.text || !question.correctAnswer) {
      return false;
    }
    if (question.type === QuestionType.MCQ) {
      return (
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        question.options.every((option) => option.trim().length > 0) &&
        question.options.includes(question.correctAnswer)
      );
    }
    return true;
  }

  private blankTemplate(): DraftQuestionDto[] {
    const mcq = (): DraftQuestionDto => ({
      draftId: randomUUID(),
      type: QuestionType.MCQ,
      text: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
    });

    const shortAnswer = (): DraftQuestionDto => ({
      draftId: randomUUID(),
      type: QuestionType.SHORT_ANSWER,
      text: '',
      correctAnswer: '',
      explanation: '',
    });

    return [mcq(), mcq(), mcq(), shortAnswer(), shortAnswer()];
  }

  private validatePublishQuestions(
    questions: PublishQuizQuestionsDto['questions'],
  ): void {
    for (const [index, question] of questions.entries()) {
      if (!question.text.trim()) {
        throw new BadRequestException(`Question ${index + 1} text is required`);
      }
      if (!question.correctAnswer.trim()) {
        throw new BadRequestException(`Question ${index + 1} correct answer is required`);
      }
      if (question.type === QuestionType.MCQ) {
        if (!question.options || question.options.length !== 4) {
          throw new BadRequestException(
            `Question ${index + 1} must have exactly 4 MCQ options`,
          );
        }
        if (!question.options.includes(question.correctAnswer)) {
          throw new BadRequestException(
            `Question ${index + 1} correct answer must match one of the MCQ options`,
          );
        }
      }
    }
  }

  private async getCourse(courseId: string): Promise<Course> {
    const course = await this.coursesRepo.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }
}
