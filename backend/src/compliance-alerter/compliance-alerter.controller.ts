import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ComplianceAlerterService } from './compliance-alerter.service';
import { SendAlertBatchDto } from './dto/send-alert-batch.dto';

@ApiTags('compliance-alerter')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('compliance-alerter')
export class ComplianceAlerterController {
  constructor(private readonly alerterService: ComplianceAlerterService) {}

  @Post('run')
  @Roles(UserRole.HR_ADMIN)
  @ApiOperation({
    summary:
      'Manually trigger compliance risk scan and draft reminder emails (within 14-day deadline window)',
  })
  runManually() {
    return this.alerterService.runManually();
  }

  @Get('batches')
  @Roles(UserRole.HR_ADMIN)
  @ApiOperation({ summary: 'List generated alert batches for HR review' })
  listBatches() {
    return this.alerterService.listBatches();
  }

  @Get('batches/:id')
  @Roles(UserRole.HR_ADMIN)
  @ApiOperation({ summary: 'Get one alert batch with draft reminder emails' })
  getBatch(@Param('id') id: string) {
    return this.alerterService.getBatch(id);
  }

  @Post('batches/:id/send')
  @Roles(UserRole.HR_ADMIN)
  @ApiOperation({
    summary:
      'Mark drafts as sent (mock/log only — no real email provider configured)',
  })
  sendBatch(@Param('id') id: string, @Body() dto: SendAlertBatchDto) {
    return this.alerterService.sendBatch(id, dto.draftIds);
  }
}
