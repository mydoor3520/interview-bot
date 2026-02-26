import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Sanitize: only allow alphanumeric, hyphens, dots, underscores
  if (!/^[\w\-.]+\.webp$/.test(filename)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', 'photos', filename);

  try {
    const file = await fs.readFile(filePath);
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }
}
