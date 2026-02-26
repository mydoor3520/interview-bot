'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { listJobFunctions } from '@/lib/job-functions';
import { cn } from '@/lib/utils/cn';

const EXPERIENCE_LEVELS = [
  { label: '신입', sublabel: '0-1년', years: 0 },
  { label: '주니어', sublabel: '1-3년', years: 2 },
  { label: '미들', sublabel: '4-7년', years: 5 },
  { label: '시니어', sublabel: '8년+', years: 10 },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [selectedJobFunction, setSelectedJobFunction] = useState('');
  const [selectedExpLevel, setSelectedExpLevel] = useState<number | null>(null);

  const jobFunctions = listJobFunctions();

  const canSubmit = name.trim().length >= 2 && selectedJobFunction && selectedExpLevel !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError('');

    try {
      const experienceYears = EXPERIENCE_LEVELS[selectedExpLevel].years;

      // 1. Create profile
      const profileRes = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          totalYearsExp: experienceYears,
          currentRole: '',
        }),
      });

      if (!profileRes.ok) {
        const data = await profileRes.json();
        throw new Error(data.error || '프로필 생성에 실패했습니다.');
      }

      // 2. Update user's jobFunction
      const userRes = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobFunction: selectedJobFunction,
        }),
      });

      if (!userRes.ok) {
        // Non-critical: jobFunction update failed but profile created
        console.warn('jobFunction update failed, but continuing');
      }

      // Navigate to interview page
      router.push('/interview');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3 whitespace-pre-line">
            간단한 정보만 입력하면{'\n'}바로 면접을 시작할 수 있어요
          </h1>
          <p className="text-slate-600">
            나머지 프로필은 나중에 완성할 수 있습니다
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
              minLength={2}
            />
            {name.length > 0 && name.length < 2 && (
              <p className="mt-1.5 text-sm text-red-600">2자 이상 입력해주세요</p>
            )}
          </div>

          {/* 직군 선택 */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              직군 선택 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {jobFunctions.map(jf => (
                <button
                  key={jf.id}
                  type="button"
                  onClick={() => setSelectedJobFunction(jf.id)}
                  className={cn(
                    'relative rounded-lg border-2 px-4 py-4 text-left transition-all',
                    selectedJobFunction === jf.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-2xl">
                      {jf.icon === 'code' && '💻'}
                      {jf.icon === 'megaphone' && '📣'}
                      {jf.icon === 'palette' && '🎨'}
                      {jf.icon === 'clipboard' && '📋'}
                      {jf.icon === 'briefcase' && '💼'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 mb-0.5">
                        {jf.label}
                      </div>
                      <div className="text-xs text-slate-600 line-clamp-2">
                        {jf.description}
                      </div>
                    </div>
                  </div>
                  {selectedJobFunction === jf.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 경력 수준 */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              경력 수준 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {EXPERIENCE_LEVELS.map((level, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedExpLevel(idx)}
                  className={cn(
                    'rounded-lg border-2 px-4 py-3 text-center transition-all',
                    selectedExpLevel === idx
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <div className="font-semibold text-slate-900">{level.label}</div>
                  <div className="text-sm text-slate-600 mt-0.5">{level.sublabel}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-6 py-4 text-base font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '처리 중...' : '면접 시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
