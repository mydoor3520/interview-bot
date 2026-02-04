import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds

export interface TokenPayload {
  authenticated: boolean;
  iat: number;
  exp: number;
}

export function signToken(): string {
  return jwt.sign(
    { authenticated: true },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRY_SECONDS }
  );
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}
