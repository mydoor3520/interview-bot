'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';

type VerificationState = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<VerificationState>('loading');
  const [message, setMessage] = useState('');

  const verifyEmail = async () => {
    if (!token) {
      setState('error');
      setMessage('유효하지 않은 링크입니다.');
      return;
    }

    setState('loading');
    setMessage('');

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setState('success');
        setMessage(data.message || '이메일이 인증되었습니다!');
      } else {
        setState('error');
        setMessage(data.error || '인증에 실패했습니다.');
      }
    } catch (error) {
      setState('error');
      setMessage('네트워크 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
          <div className="text-center">
            {state === 'loading' && (
              <>
                <div className="mb-4">
                  <div className="inline-block w-12 h-12 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin"></div>
                </div>
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  이메일 인증 중...
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  잠시만 기다려주세요.
                </p>
              </>
            )}

            {state === 'success' && (
              <>
                <div className="mb-4">
                  <svg
                    className="inline-block w-16 h-16 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  이메일이 인증되었습니다!
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                  {message}
                </p>
                <Link
                  href="/login"
                  className="inline-block w-full px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors font-medium"
                >
                  로그인
                </Link>
              </>
            )}

            {state === 'error' && (
              <>
                <div className="mb-4">
                  <svg
                    className="inline-block w-16 h-16 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  인증 실패
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                  {message}
                </p>
                <div className="space-y-3">
                  {token && (
                    <button
                      onClick={verifyEmail}
                      className="w-full px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors font-medium"
                    >
                      다시 시도
                    </button>
                  )}
                  <Link
                    href="/login"
                    className="inline-block w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-medium"
                  >
                    로그인으로 돌아가기
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
              <div className="text-center">
                <div className="mb-4">
                  <div className="inline-block w-12 h-12 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin"></div>
                </div>
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  이메일 인증 중...
                </h1>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
