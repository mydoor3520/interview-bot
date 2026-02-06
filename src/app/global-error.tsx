'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="ko">
      <body style={{ backgroundColor: '#09090b', color: '#f4f4f5', fontFamily: 'system-ui' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ maxWidth: '32rem', width: '100%', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f87171', marginBottom: '16px' }}>
              오류가 발생했습니다
            </h2>
            <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '4px', padding: '16px', marginBottom: '16px', overflow: 'auto', maxHeight: '240px' }}>
              <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: '#d4d4d8' }}>
                {error.message}
              </p>
              {error.digest && (
                <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '8px' }}>
                  Digest: {error.digest}
                </p>
              )}
            </div>
            <button
              onClick={reset}
              style={{ padding: '8px 16px', background: '#27272a', color: '#f4f4f5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
