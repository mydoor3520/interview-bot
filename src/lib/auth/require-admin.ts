import { NextRequest, NextResponse } from 'next/server';
import { requireAuthV2, AuthUser } from './require-auth';
import { prisma } from '@/lib/db/prisma';

export interface AdminUser extends AuthUser {
  isAdmin: true;
}

export type AdminAuthResult =
  | { authenticated: true; user: AdminUser }
  | { authenticated: false; response: NextResponse };

export function requireAdmin(request: NextRequest): AdminAuthResult {
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth;

  const isAdmin = request.headers.get('x-user-is-admin') === 'true';
  if (!isAdmin) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      ),
    };
  }

  return {
    authenticated: true,
    user: { ...auth.user, isAdmin: true as const },
  };
}

// For critical mutations - verifies isAdmin in DB
export async function requireAdminStrict(request: NextRequest): Promise<AdminAuthResult> {
  const auth = requireAdmin(request);
  if (!auth.authenticated) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.userId },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: '관리자 권한이 확인되지 않았습니다.' },
        { status: 403 }
      ),
    };
  }

  return auth;
}
