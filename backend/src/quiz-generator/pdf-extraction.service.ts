import { Injectable, BadRequestException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text?: string }>;

@Injectable()
export class PdfExtractionService {
  async extractText(buffer: Buffer): Promise<string> {
    if (!buffer?.length) {
      throw new BadRequestException('PDF file is empty');
    }

    try {
      const result = await pdfParse(buffer);
      const text = result.text?.replace(/\s+/g, ' ').trim();
      if (!text) {
        throw new BadRequestException('No readable text found in the PDF');
      }
      return text;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to parse PDF file');
    }
  }
}
