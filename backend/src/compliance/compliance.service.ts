import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrolment, EnrolmentStatus } from '../enrolments/entities/enrolment.entity';
import { Department } from '../departments/entities/department.entity';

type RiskLevel = 'green' | 'amber' | 'red';

function calculateRisk(deadline: Date | null, isCompleted: boolean): RiskLevel {
  if (isCompleted) return 'green';
  if (!deadline) return 'green';
  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
  const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return 'red';
  if (daysLeft <= 14) return 'amber';
  return 'green';
}

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Course) private readonly coursesRepo: Repository<Course>,
    @InjectRepository(Enrolment) private readonly enrolmentsRepo: Repository<Enrolment>,
    @InjectRepository(Department) private readonly departmentsRepo: Repository<Department>,
  ) {}

  private async getMandatoryCoursesForDepartment(departmentId: string): Promise<Course[]> {
    return this.coursesRepo
      .createQueryBuilder('course')
      .where('course.isLatestVersion = true')
      .andWhere('course.isMandatory = true')
      .andWhere(':departmentId = ANY(course.departmentIds)', { departmentId })
      .getMany();
  }

  private async getEnrolment(employeeId: string, courseId: string): Promise<Enrolment | null> {
    return this.enrolmentsRepo.findOne({
      where: { employee: { id: employeeId }, course: { id: courseId } },
    });
  }

  // Manager view: their own team's completion rate per mandatory course, with individual status.
  async getTeamCompliance(managerId: string) {
    const manager = await this.usersRepo.findOne({
      where: { id: managerId },
      relations: { team: { department: true, members: true } },
    });
    if (!manager?.team) throw new NotFoundException('No team found for this manager');

    const employees = manager.team.members.filter((m) => m.role !== UserRole.MANAGER);
    const mandatoryCourses = await this.getMandatoryCoursesForDepartment(manager.team.department.id);

    const courseBreakdown = await Promise.all(
      mandatoryCourses.map(async (course) => {
        const employeeStatuses = await Promise.all(
          employees.map(async (employee) => {
            const enrolment = await this.getEnrolment(employee.id, course.id);
            return {
              employeeId: employee.id,
              employeeName: employee.fullName,
              status: enrolment?.status ?? 'NOT_ENROLLED',
              risk: calculateRisk(
                course.regulatoryDeadline,
                enrolment?.status === EnrolmentStatus.PASSED,
              ),
            };
          }),
        );
        const passedCount = employeeStatuses.filter((e) => e.status === EnrolmentStatus.PASSED).length;
        return {
          courseId: course.id,
          courseTitle: course.title,
          regulatoryDeadline: course.regulatoryDeadline,
          completionRate: employees.length
            ? Math.round((passedCount / employees.length) * 100)
            : 0,
          employeeStatuses,
        };
      }),
    );

    return {
      teamName: manager.team.name,
      teamSize: employees.length,
      courseBreakdown,
    };
  }

  // HR view: company-wide heatmap — every department x every mandatory course targeting it.
  async getCompanyCompliance() {
    const departments = await this.departmentsRepo.find({
      relations: { teams: { members: true } },
    });

    const heatmap = await Promise.all(
      departments.map(async (department) => {
        const employees = department.teams.flatMap((t) =>
          t.members.filter((m) => m.role !== UserRole.MANAGER),
        );
        const mandatoryCourses = await this.getMandatoryCoursesForDepartment(department.id);

        const courses = await Promise.all(
          mandatoryCourses.map(async (course) => {
            let passedCount = 0;
            for (const employee of employees) {
              const enrolment = await this.getEnrolment(employee.id, course.id);
              if (enrolment?.status === EnrolmentStatus.PASSED) passedCount++;
            }
            const completionRate = employees.length
              ? Math.round((passedCount / employees.length) * 100)
              : 0;
            return {
              courseId: course.id,
              courseTitle: course.title,
              regulatoryDeadline: course.regulatoryDeadline,
              completionRate,
              risk: calculateRisk(course.regulatoryDeadline, completionRate === 100),
            };
          }),
        );

        return {
          departmentId: department.id,
          departmentName: department.name,
          employeeCount: employees.length,
          courses,
        };
      }),
    );

    return { heatmap };
  }

  // Full CSV export for regulatory submission: one row per employee x mandatory course.
  async getComplianceCsv(): Promise<string> {
    const departments = await this.departmentsRepo.find({
      relations: { teams: { members: true } },
    });

    const rows: string[] = [
      'Department,Employee,Course,Status,RegulatoryDeadline,Risk',
    ];

    for (const department of departments) {
      const employees = department.teams.flatMap((t) =>
        t.members.filter((m) => m.role !== UserRole.MANAGER),
      );
      const mandatoryCourses = await this.getMandatoryCoursesForDepartment(department.id);

      for (const employee of employees) {
        for (const course of mandatoryCourses) {
          const enrolment = await this.getEnrolment(employee.id, course.id);
          const status = enrolment?.status ?? 'NOT_ENROLLED';
          const risk = calculateRisk(course.regulatoryDeadline, status === EnrolmentStatus.PASSED);
          const deadline = course.regulatoryDeadline
            ? course.regulatoryDeadline.toISOString().split('T')[0]
            : '';
          rows.push(
            [department.name, employee.fullName, course.title, status, deadline, risk]
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(','),
          );
        }
      }
    }

    return rows.join('\n');
  }
}