import { Injectable, BadRequestException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (options: { data: Buffer | Uint8Array }) => {
    getText: () => Promise<{ text?: string }>;
    destroy: () => Promise<void>;
  };
};

@Injectable()
export class PdfExtractionService {
  async extractText(buffer: Buffer): Promise<string> {
    if (!buffer?.length) {
      throw new BadRequestException('PDF file is empty');
    }

    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      const text = result.text?.replace(/\s+/g, ' ').trim();
      if (!text) {
        throw new BadRequestException(
          'No readable text found in the PDF (scanned/image-only PDFs are not supported)',
        );
      }
      return text;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to parse PDF file');
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }
}
