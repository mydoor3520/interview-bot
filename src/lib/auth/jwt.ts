import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds

export interface TokenPayload {
  authenticated: boolean;
  iat: number;
  exp: number;
}

export function signToken(): string {
  return jwt.sign(
    { authenticated: true },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY_SECONDS }
  );
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
