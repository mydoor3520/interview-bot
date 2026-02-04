'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Interview Bot
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            AI 모의 면접을 시작하려면 비밀번호를 입력하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              autoFocus
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-500"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
