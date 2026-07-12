import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Certificate } from './entities/certificate.entity';
import { CertificateIssuedEvent } from './events/certificate-issued.event';


const CERT_DIR = path.join(process.cwd(), 'uploads', 'certificates');

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificate)
    private readonly certificatesRepo: Repository<Certificate>,
  ) {
    if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });
  }

  // Fired by EnrolmentsService.markPassed(). Idempotent: skips if a certificate
  // for this enrolment already exists.
  @OnEvent('certificate.issued')
  async handleCertificateIssued(event: CertificateIssuedEvent) {
    const existing = await this.certificatesRepo.findOne({
      where: { enrolmentId: event.enrolmentId },
    });
    if (existing) return;

    const verificationCode = crypto.randomBytes(6).toString('hex').toUpperCase();
    const issueDate = new Date();
    const fileName = `${verificationCode}.pdf`;
    const filePath = path.join(CERT_DIR, fileName);

    await this.generatePdf(filePath, {
      employeeName: event.employeeName,
      courseTitle: event.courseTitle,
      issueDate,
      verificationCode,
    });

    const certificate = this.certificatesRepo.create({
      employee: { id: event.employeeId } as any,
      course: { id: event.courseId } as any,
      enrolmentId: event.enrolmentId,
      issueDate,
      verificationCode,
      pdfPath: fileName,
    });
    await this.certificatesRepo.save(certificate);
  }

  private generatePdf(
    filePath: string,
    data: { employeeName: string; courseTitle: string; issueDate: Date; verificationCode: string },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(28).text('Certificate of Completion', { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(16).text('This certifies that', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(24).text(data.employeeName, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).text('has successfully completed', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(20).text(data.courseTitle, { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(12).text(`Issued on: ${data.issueDate.toDateString()}`, { align: 'center' });
      doc.text(`Verification code: ${data.verificationCode}`, { align: 'center' });

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
  }

  async findMine(employeeId: string): Promise<Certificate[]> {
    return this.certificatesRepo.find({
      where: { employee: { id: employeeId } },
      relations: { course: true },
      order: { issueDate: 'DESC' },
    });
  }

  async getFilePathById(id: string, employeeId: string): Promise<string> {
    const cert = await this.certificatesRepo.findOne({
      where: { id },
      relations: { employee: true },
    });
    if (!cert || cert.employee.id !== employeeId) {
      throw new NotFoundException('Certificate not found');
    }
    return path.join(CERT_DIR, cert.pdfPath);
  }

  async verifyByCode(code: string) {
    const cert = await this.certificatesRepo.findOne({
      where: { verificationCode: code },
      relations: { employee: true, course: true },
    });
    if (!cert) throw new NotFoundException('No certificate found for this verification code');
    return {
      valid: true,
      employeeName: cert.employee.fullName,
      courseTitle: cert.course.title,
      issueDate: cert.issueDate,
      verificationCode: cert.verificationCode,
    };
  }
}