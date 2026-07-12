import { Controller, Post, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EnrolmentsService } from './enrolments.service';
import { SelfEnrolDto, BulkEnrolDto, UpdateProgressDto } from './dto/enrolment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('enrolments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enrolments')
export class EnrolmentsController {
  constructor(private readonly enrolmentsService: EnrolmentsService) {}

  @Post('self')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.CONTENT_ADMIN, UserRole.HR_ADMIN)
  @ApiOperation({ summary: 'Self-enrol into an elective course' })
  selfEnrol(@Body() dto: SelfEnrolDto, @Request() req: { user: { userId: string } }) {
    return this.enrolmentsService.selfEnrol(req.user.userId, dto.courseId);
  }

  @Post('bulk')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Manager bulk-enrols team members into a mandatory course' })
  bulkEnrol(@Body() dto: BulkEnrolDto, @Request() req: { user: { userId: string } }) {
    return this.enrolmentsService.bulkEnrol(req.user.userId, dto.courseId, dto.employeeIds);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get the current employee\'s own enrolments' })
  findMine(@Request() req: { user: { userId: string } }) {
    return this.enrolmentsService.findMyEnrolments(req.user.userId);
  }

  @Patch(':id/progress')
  @ApiOperation({ summary: 'Update chapter/section progress for an enrolment' })
  updateProgress(
    @Param('id') id: string,
    @Body() dto: UpdateProgressDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.enrolmentsService.updateProgress(id, req.user.userId, dto.progressPercentage);
  }
}