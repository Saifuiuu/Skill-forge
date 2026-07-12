import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.CONTENT_ADMIN)
  @ApiOperation({ summary: 'Create a course (Content Admin only)' })
  create(@Body() dto: CreateCourseDto, @Request() req: { user: { userId: string } }) {
    return this.coursesService.create(dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List latest-version courses, optionally filtered' })
  findAll(
    @Query('departmentId') departmentId?: string,
    @Query('mandatory') mandatory?: string,
  ) {
    return this.coursesService.findAll({
      departmentId,
      mandatory: mandatory === undefined ? undefined : mandatory === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single course' })
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.CONTENT_ADMIN)
  @ApiOperation({ summary: 'Update a course in place (Content Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(id, dto);
  }

  @Post(':id/new-version')
  @Roles(UserRole.CONTENT_ADMIN)
  @ApiOperation({ summary: 'Publish a new version of this course (Content Admin only)' })
  createNewVersion(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.coursesService.createNewVersion(id, dto, req.user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.CONTENT_ADMIN)
  @ApiOperation({ summary: 'Delete a course (Content Admin only)' })
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }
}