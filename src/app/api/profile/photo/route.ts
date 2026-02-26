import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db/prisma';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import sharp from 'sharp';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'photos');

function validateMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return true;

  return false;
}

const SAFE_UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');

async function deletePhotoFile(photoUrl: string | null): Promise<void> {
  if (!photoUrl || !photoUrl.startsWith('/uploads/')) return;
  try {
    const filePath = path.resolve(process.cwd(), 'public', photoUrl);
    // Path traversal 방지: uploads 디렉토리 내부인지 확인
    if (!filePath.startsWith(SAFE_UPLOADS_DIR + path.sep)) return;
    await fs.unlink(filePath);
  } catch {
    // Ignore if file doesn't exist
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateMagicBytes(buffer)) {
      return NextResponse.json({ error: '지원하지 않는 이미지 형식입니다.' }, { status: 400 });
    }

    // Get existing profile to delete old photo
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true, photoUrl: true },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필이 존재하지 않습니다.' }, { status: 404 });
    }

    // Delete existing photo if stored locally
    await deletePhotoFile(profile.photoUrl);

    // Process with sharp: resize and convert to WebP
    const processedBuffer = await sharp(buffer)
      .resize(400, 500, { fit: 'inside' })
      .webp({ quality: 85 })
      .toBuffer();

    // Ensure uploads directory exists
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    const filename = `${auth.user.userId}-${Date.now()}.webp`;
    const filePath = path.join(UPLOADS_DIR, filename);
    await fs.writeFile(filePath, processedBuffer);

    const photoUrl = `/uploads/photos/${filename}`;

    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { photoUrl },
    });

    return NextResponse.json({ photoUrl });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  try {
    const profile = await prisma.userProfile.findFirst({
      where: { userId: auth.user.userId },
      select: { id: true, photoUrl: true },
    });

    if (!profile) {
      return NextResponse.json({ error: '프로필이 존재하지 않습니다.' }, { status: 404 });
    }

    await deletePhotoFile(profile.photoUrl);

    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { photoUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Photo delete error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
