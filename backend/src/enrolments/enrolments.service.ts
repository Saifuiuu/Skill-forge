import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Enrolment, EnrolmentStatus } from './entities/enrolment.entity';
import { CoursesService } from '../courses/courses.service';
import { EnrolmentsGateway } from './enrolments.gateway';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class EnrolmentsService {
  constructor(
    @InjectRepository(Enrolment)
    private readonly enrolmentsRepo: Repository<Enrolment>,
    private readonly coursesService: CoursesService,
    private readonly gateway: EnrolmentsGateway,
  ) {}

  private async getCompletedCourseIds(employeeId: string): Promise<string[]> {
    const passed = await this.enrolmentsRepo.find({
      where: { employee: { id: employeeId }, status: EnrolmentStatus.PASSED },
      relations: {course:true},
    });
    return passed.map((e) => e.course.id);
  }

  async selfEnrol(employeeId: string, courseId: string): Promise<Enrolment> {
    const existing = await this.enrolmentsRepo.findOne({
      where: { employee: { id: employeeId }, course: { id: courseId } },
    });
    if (existing) throw new BadRequestException('Already enrolled in this course');

    const completed = await this.getCompletedCourseIds(employeeId);
    const ok = await this.coursesService.arePrerequisitesMet(courseId, completed);
    if (!ok) throw new BadRequestException('Prerequisites not completed for this course');

    const enrolment = this.enrolmentsRepo.create({
      employee: { id: employeeId } as User,
      course: { id: courseId } as any,
      enrolledBy: { id: employeeId } as User,
      status: EnrolmentStatus.NOT_STARTED,
    });
    return this.enrolmentsRepo.save(enrolment);
  }

  // Manager bulk-enrols their team members into a mandatory course.
  // Skips employees already enrolled instead of failing the whole batch.
  async bulkEnrol(managerId: string, courseId: string, employeeIds: string[]): Promise<Enrolment[]> {
    const existing = await this.enrolmentsRepo.find({
      where: { course: { id: courseId }, employee: { id: In(employeeIds) } },
      relations: {employee:true},
    });
    const alreadyEnrolledIds = new Set(existing.map((e) => e.employee.id));
    const toEnrol = employeeIds.filter((id) => !alreadyEnrolledIds.has(id));

    const enrolments = toEnrol.map((employeeId) =>
      this.enrolmentsRepo.create({
        employee: { id: employeeId } as User,
        course: { id: courseId } as any,
        enrolledBy: { id: managerId } as User,
        status: EnrolmentStatus.NOT_STARTED,
      }),
    );
    return this.enrolmentsRepo.save(enrolments);
  }

  async findMyEnrolments(employeeId: string): Promise<Enrolment[]> {
    return this.enrolmentsRepo.find({
      where: { employee: { id: employeeId } },
      relations:{ course:true},
      order: { createdAt: 'DESC' },
    });
  }

  async updateProgress(enrolmentId: string, employeeId: string, progressPercentage: number): Promise<Enrolment> {
    const enrolment = await this.enrolmentsRepo.findOne({
      where: { id: enrolmentId },
      relations: { employee: true, course: { createdBy: true } },
    });
    if (!enrolment) throw new NotFoundException('Enrolment not found');
    if (enrolment.employee.id !== employeeId) {
      throw new ForbiddenException('Cannot update someone else\'s progress');
    }

    enrolment.progressPercentage = progressPercentage;
    enrolment.status =
      progressPercentage >= 100 ? EnrolmentStatus.PENDING_QUIZ : EnrolmentStatus.IN_PROGRESS;

    return this.enrolmentsRepo.save(enrolment);
  }

  // Called by the Quiz module (Phase 4) after a passing attempt.
  // Marks the enrolment PASSED and, if the course is mandatory, notifies the employee's manager live.
  async markPassed(enrolmentId: string): Promise<Enrolment> {
  const enrolment = await this.enrolmentsRepo.findOne({
    where: { id: enrolmentId },
    relations: { employee: { team: { members: true } }, course: true },
  });
  if (!enrolment) throw new NotFoundException('Enrolment not found');

  enrolment.status = EnrolmentStatus.PASSED;
  enrolment.completedAt = new Date();
  const saved = await this.enrolmentsRepo.save(enrolment);

  const manager = enrolment.employee.team?.members?.find(
    (m) => m.role === UserRole.MANAGER,
  );
  if (enrolment.course.isMandatory && manager) {
    this.gateway.notifyManagerOfCompletion(manager.id, {
      employeeName: enrolment.employee.fullName,
      courseTitle: enrolment.course.title,
    });
  }

  return saved;
}

  async markFailed(enrolmentId: string): Promise<Enrolment> {
    const enrolment = await this.enrolmentsRepo.findOne({ where: { id: enrolmentId } });
    if (!enrolment) throw new NotFoundException('Enrolment not found');
    enrolment.status = EnrolmentStatus.FAILED;
    return this.enrolmentsRepo.save(enrolment);
  }
}