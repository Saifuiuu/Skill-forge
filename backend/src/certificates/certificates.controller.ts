import { Controller, Get, Param, UseGuards, Request, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import * as fs from 'fs';

@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('mine')
  @ApiOperation({ summary: "Get the current employee's own certificates" })
  findMine(@Request() req: { user: { userId: string } }) {
    return this.certificatesService.findMine(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id/download')
  @ApiOperation({ summary: 'Download a certificate PDF (owner only)' })
  async download(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Res() res: Response,
  ) {
    const filePath = await this.certificatesService.getFilePathById(id, req.user.userId);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Certificate file not found');
    res.download(filePath);
  }

  @Public()
  @Get('verify/:code')
  @ApiOperation({ summary: 'Publicly verify a certificate by its verification code' })
  verify(@Param('code') code: string) {
    return this.certificatesService.verifyByCode(code);
  }
}