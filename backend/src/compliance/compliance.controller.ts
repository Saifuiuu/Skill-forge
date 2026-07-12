import { Controller, Get, UseGuards, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('team')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: "Manager's team compliance breakdown per mandatory course" })
  getTeamCompliance(@Request() req: { user: { userId: string } }) {
    return this.complianceService.getTeamCompliance(req.user.userId);
  }

  @Get('company')
  @Roles(UserRole.HR_ADMIN)
  @ApiOperation({ summary: 'Company-wide compliance heatmap by department and course' })
  getCompanyCompliance() {
    return this.complianceService.getCompanyCompliance();
  }

  @Get('company/export')
  @Roles(UserRole.HR_ADMIN)
  @ApiOperation({ summary: 'Export full compliance report as CSV' })
  async exportCsv(@Res() res: Response) {
    const csv = await this.complianceService.getComplianceCsv();
    res.header('Content-Type', 'text/csv');
    res.attachment('compliance-report.csv');
    res.send(csv);
  }
}