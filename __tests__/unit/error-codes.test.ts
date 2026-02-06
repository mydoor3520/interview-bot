import { describe, it, expect } from 'vitest';
import { ERROR_CODES, isRetryableError } from '@/lib/ai/error-codes';

describe('ERROR_CODES', () => {
  it('has all expected error codes', () => {
    expect(ERROR_CODES.AUTH_FAILED).toBe('AUTH_FAILED');
    expect(ERROR_CODES.PROXY_UNAVAILABLE).toBe('PROXY_UNAVAILABLE');
    expect(ERROR_CODES.STREAM_ERROR).toBe('STREAM_ERROR');
    expect(ERROR_CODES.TIMEOUT).toBe('TIMEOUT');
    expect(ERROR_CODES.RATE_LIMITED).toBe('RATE_LIMITED');
    expect(ERROR_CODES.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
  });
});

describe('isRetryableError', () => {
  it('returns true for PROXY_UNAVAILABLE', () => {
    expect(isRetryableError('PROXY_UNAVAILABLE')).toBe(true);
  });

  it('returns true for TIMEOUT', () => {
    expect(isRetryableError('TIMEOUT')).toBe(true);
  });

  it('returns true for STREAM_ERROR', () => {
    expect(isRetryableError('STREAM_ERROR')).toBe(true);
  });

  it('returns true for RATE_LIMITED', () => {
    expect(isRetryableError('RATE_LIMITED')).toBe(true);
  });

  it('returns true for NETWORK_ERROR', () => {
    expect(isRetryableError('NETWORK_ERROR')).toBe(true);
  });

  it('returns false for AUTH_FAILED', () => {
    expect(isRetryableError('AUTH_FAILED')).toBe(false);
  });

  it('returns false for SESSION_NOT_FOUND', () => {
    expect(isRetryableError('SESSION_NOT_FOUND')).toBe(false);
  });

  it('returns false for INTERNAL_ERROR', () => {
    expect(isRetryableError('INTERNAL_ERROR')).toBe(false);
  });

  it('returns false for unknown error codes', () => {
    expect(isRetryableError('UNKNOWN_CODE')).toBe(false);
  });
});
