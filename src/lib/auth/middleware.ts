import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyToken } from './jwt';

export async function requireAuth(): Promise<{ authenticated: boolean; response?: NextResponse }> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }),
    };
  }

  const payload = verifyToken(token);
  if (!payload || !payload.authenticated) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: '토큰이 만료되었거나 유효하지 않습니다.' }, { status: 401 }),
    };
  }

  return { authenticated: true };
}
