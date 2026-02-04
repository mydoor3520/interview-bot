import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET() {
  const { authenticated, response } = await requireAuth();
  
  if (!authenticated) {
    return response;
  }

  return NextResponse.json({ authenticated: true });
}
