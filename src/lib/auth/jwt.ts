import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

// V1 payload (legacy - no userId)
export interface TokenPayloadV1 {
  authenticated: boolean;
  iat: number;
  exp: number;
}

// V2 payload (new - with userId and tier)
export interface TokenPayloadV2 {
  version: 2;
  userId: string;
  email: string;
  tier: string;
  authenticated: boolean;
  iat: number;
  exp: number;
}

export type TokenPayload = TokenPayloadV1 | TokenPayloadV2;

/**
 * @deprecated Use signTokenV2 for new code
 */
export function signToken(): string {
  return jwt.sign(
    { authenticated: true },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRY_SECONDS }
  );
}

export function signTokenV2(userId: string, email: string, tier: string): string {
  return jwt.sign(
    { version: 2, userId, email, tier, authenticated: true },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRY_SECONDS }
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export function isV2Token(payload: TokenPayload): payload is TokenPayloadV2 {
  return 'version' in payload && payload.version === 2 && 'userId' in payload;
}

export function getTokenVersion(payload: TokenPayload): 1 | 2 {
  return isV2Token(payload) ? 2 : 1;
}
