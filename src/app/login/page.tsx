'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '로그인에 실패했습니다.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('서버에 연결할 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Interview Bot
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          AI 모의 면접을 시작하려면 로그인하세요
        </p>
      </div>

      {reason === 'upgrade' && (
        <div className="rounded-lg bg-blue-50 px-3 py-2.5 text-sm text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
          보안 업그레이드를 위해 다시 로그인해 주세요.
        </div>
      )}

      {reason === 'expired' && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300">
          세션이 만료되어 로그아웃되었습니다. 다시 로그인해주세요.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            이메일
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            autoFocus
            autoComplete="email"
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            비밀번호
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              autoComplete="current-password"
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 pr-10 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !email || !password}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/forgot-password"
          className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          비밀번호를 잊으셨나요?
        </Link>
      </div>

      <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        계정이 없으신가요?{' '}
        <Link
          href="/signup"
          className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
        >
          회원가입
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
