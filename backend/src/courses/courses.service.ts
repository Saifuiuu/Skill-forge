import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly coursesRepo: Repository<Course>,
  ) {}

  async create(dto: CreateCourseDto, creatorId: string): Promise<Course> {
    const prerequisites = dto.prerequisiteCourseIds?.length
      ? await this.coursesRepo.findBy({ id: In(dto.prerequisiteCourseIds) })
      : [];

    const course = this.coursesRepo.create({
      title: dto.title,
      description: dto.description,
      estimatedDuration: dto.estimatedDuration,
      isMandatory: dto.isMandatory ?? false,
      regulatoryDeadline: dto.regulatoryDeadline
        ? new Date(dto.regulatoryDeadline)
        : undefined,
      departmentIds: dto.departmentIds ?? [],
      contentType: dto.contentType ?? null,
      contentUrl: dto.contentUrl ?? null,
      prerequisites,
      createdBy: { id: creatorId } as any,
    });

    return this.coursesRepo.save(course);
  }

  async findAll(filters: { departmentId?: string; mandatory?: boolean }) {
    const qb = this.coursesRepo
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.prerequisites', 'prerequisites')
      .where('course.isLatestVersion = true');

    if (filters.departmentId) {
      qb.andWhere(':departmentId = ANY(course.departmentIds)', {
        departmentId: filters.departmentId,
      });
    }
    if (filters.mandatory !== undefined) {
      qb.andWhere('course.isMandatory = :mandatory', {
        mandatory: filters.mandatory,
      });
    }

    return qb.orderBy('course.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.coursesRepo.findOne({
      where: { id },
      relations: {prerequisites:true
        , createdBy:true},
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async update(id: string, dto: UpdateCourseDto): Promise<Course> {
    const course = await this.findOne(id);

    if (dto.prerequisiteCourseIds) {
      course.prerequisites = await this.coursesRepo.findBy({
        id: In(dto.prerequisiteCourseIds),
      });
    }

    Object.assign(course, {
      title: dto.title ?? course.title,
      description: dto.description ?? course.description,
      estimatedDuration: dto.estimatedDuration ?? course.estimatedDuration,
      isMandatory: dto.isMandatory ?? course.isMandatory,
      regulatoryDeadline: dto.regulatoryDeadline
        ? new Date(dto.regulatoryDeadline)
        : course.regulatoryDeadline,
      departmentIds: dto.departmentIds ?? course.departmentIds,
      contentType: dto.contentType ?? course.contentType,
      contentUrl: dto.contentUrl ?? course.contentUrl,
    });

    return this.coursesRepo.save(course);
  }

  async remove(id: string): Promise<void> {
    const course = await this.findOne(id);
    await this.coursesRepo.remove(course);
  }

  // Creates a new version of a course. Old version stays viewable (isLatestVersion=false)
  // so previously-enrolled employees keep their history; new enrolments go to the new version.
  async createNewVersion(id: string, dto: UpdateCourseDto, creatorId: string): Promise<Course> {
    const old = await this.findOne(id);
    old.isLatestVersion = false;
    await this.coursesRepo.save(old);

    const newVersion = this.coursesRepo.create({
      title: dto.title ?? old.title,
      description: dto.description ?? old.description,
      estimatedDuration: dto.estimatedDuration ?? old.estimatedDuration,
      isMandatory: dto.isMandatory ?? old.isMandatory,
      regulatoryDeadline: dto.regulatoryDeadline
        ? new Date(dto.regulatoryDeadline)
        : old.regulatoryDeadline,
      departmentIds: dto.departmentIds ?? old.departmentIds,
      contentType: dto.contentType ?? old.contentType,
      contentUrl: dto.contentUrl ?? old.contentUrl,
      prerequisites: old.prerequisites,
      version: old.version + 1,
      isLatestVersion: true,
      previousVersionId: old.id,
      createdBy: { id: creatorId } as any,
    });

    return this.coursesRepo.save(newVersion);
  }

  // Used by the enrolments module (Phase 3) to block enrolment until prerequisites are met.
  async arePrerequisitesMet(courseId: string, completedCourseIds: string[]): Promise<boolean> {
    const course = await this.findOne(courseId);
    if (!course.prerequisites?.length) return true;
    return course.prerequisites.every((p) => completedCourseIds.includes(p.id));
  }
}