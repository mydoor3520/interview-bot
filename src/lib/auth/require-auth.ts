import { NextRequest, NextResponse } from 'next/server';

export interface AuthUser {
  userId: string;
  email: string;
  tier: string;
}

export type AuthResult =
  | { authenticated: true; user: AuthUser }
  | { authenticated: false; response: NextResponse };

export function requireAuthV2(request: NextRequest): AuthResult {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const tier = request.headers.get('x-user-tier');

  if (!userId) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      ),
    };
  }

  return {
    authenticated: true,
    user: {
      userId,
      email: email || '',
      tier: tier || 'FREE',
    },
  };
}
