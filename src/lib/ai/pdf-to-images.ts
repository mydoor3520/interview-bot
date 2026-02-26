import { Poppler } from 'node-poppler';
import { mkdir, writeFile, readdir, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface PdfPageImage {
  pageNumber: number;
  dataUrl: string;
  sizeBytes: number;
}

export interface PdfConversionResult {
  pages: PdfPageImage[];
  totalPages: number;
}

export async function convertPdfToImages(
  pdfBuffer: Buffer,
  options?: { maxPages?: number; dpi?: number }
): Promise<PdfConversionResult> {
  const tempDir = `/tmp/pdf-parse-${randomUUID()}`;

  try {
    // Create temp directory
    await mkdir(tempDir, { recursive: true });

    // Write PDF buffer to temp file
    const inputPath = join(tempDir, 'input.pdf');
    await writeFile(inputPath, pdfBuffer);

    // Initialize Poppler
    const poppler = new Poppler();

    // Get total pages from PDF info
    const infoOutput = await poppler.pdfInfo(inputPath);
    const infoString = typeof infoOutput === 'string' ? infoOutput : JSON.stringify(infoOutput);
    const pagesMatch = infoString.match(/Pages:\s+(\d+)/);
    if (!pagesMatch) {
      throw new Error('Could not determine PDF page count');
    }
    const totalPages = parseInt(pagesMatch[1], 10);

    // Calculate actual pages to convert
    const actualPages = Math.min(totalPages, options?.maxPages ?? 5);
    const dpi = options?.dpi ?? 150;

    // Convert each page to PNG
    const pages: PdfPageImage[] = [];

    for (let page = 1; page <= actualPages; page++) {
      const outputBase = join(tempDir, `page-${page}`);

      // Convert single page to PNG
      await poppler.pdfToCairo(inputPath, outputBase, {
        pngFile: true,
        firstPageToConvert: page,
        lastPageToConvert: page,
        resolutionXYAxis: dpi,
      });

      // Find the generated PNG file
      // Poppler may generate files like:
      // - page-1-1.png (with page number suffix)
      // - page-1.png (without suffix for single page)
      const files = await readdir(tempDir);
      const pngFile = files.find(f =>
        f.startsWith(`page-${page}`) && f.endsWith('.png')
      );

      if (!pngFile) {
        throw new Error(`PNG file not found for page ${page}`);
      }

      const pngPath = join(tempDir, pngFile);

      // Read PNG and convert to base64 data URL
      const pngBuffer = await readFile(pngPath);
      const base64 = pngBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;

      pages.push({
        pageNumber: page,
        dataUrl,
        sizeBytes: pngBuffer.length,
      });
    }

    return {
      pages,
      totalPages,
    };
  } finally {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true }).catch(() => {
      // Ignore cleanup errors
    });
  }
}
