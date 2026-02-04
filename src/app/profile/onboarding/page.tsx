'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const STEPS = ['기본 정보', '기술 스택', '경력 사항', '자기소개'];

interface SkillData {
  name: string;
  category: string;
  proficiency: number;
  yearsUsed?: number;
}

interface ExperienceData {
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  description?: string;
  techStack: string[];
  achievements: string[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [totalYearsExp, setTotalYearsExp] = useState(0);
  const [currentRole, setCurrentRole] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');

  // Step 2: Skills
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [newSkill, setNewSkill] = useState<SkillData>({ name: '', category: 'language', proficiency: 3 });

  // Step 3: Experiences
  const [experiences, setExperiences] = useState<ExperienceData[]>([]);
  const [newExp, setNewExp] = useState<ExperienceData>({ company: '', role: '', startDate: '', techStack: [], achievements: [] });

  // Step 4: Self-intro
  const [selfIntroduction, setSelfIntroduction] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [newStrength, setNewStrength] = useState('');
  const [newWeakness, setNewWeakness] = useState('');

  const canProceedStep1 = name.length >= 2 && currentRole.length >= 2 && totalYearsExp >= 0;

  const CATEGORIES = [
    { value: 'language', label: '프로그래밍 언어' },
    { value: 'framework', label: '프레임워크' },
    { value: 'database', label: '데이터베이스' },
    { value: 'infra', label: '인프라/DevOps' },
    { value: 'tool', label: '도구' },
    { value: 'other', label: '기타' },
  ];

  function addSkill() {
    if (!newSkill.name.trim()) return;
    if (skills.some(s => s.name === newSkill.name)) return;
    setSkills([...skills, { ...newSkill }]);
    setNewSkill({ name: '', category: 'language', proficiency: 3 });
  }

  function removeSkill(index: number) {
    setSkills(skills.filter((_, i) => i !== index));
  }

  function addExperience() {
    if (!newExp.company.trim() || !newExp.role.trim() || !newExp.startDate) return;
    setExperiences([...experiences, { ...newExp }]);
    setNewExp({ company: '', role: '', startDate: '', techStack: [], achievements: [] });
  }

  function removeExperience(index: number) {
    setExperiences(experiences.filter((_, i) => i !== index));
  }

  function addStrength() {
    if (!newStrength.trim()) return;
    setStrengths([...strengths, newStrength.trim()]);
    setNewStrength('');
  }

  function addWeakness() {
    if (!newWeakness.trim()) return;
    setWeaknesses([...weaknesses, newWeakness.trim()]);
    setNewWeakness('');
  }

  async function handleComplete() {
    setIsSubmitting(true);
    setError('');

    try {
      // 1. Create profile
      const profileRes = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: email || undefined,
          totalYearsExp,
          currentRole,
          currentCompany: currentCompany || undefined,
        }),
      });
      if (!profileRes.ok) {
        const data = await profileRes.json();
        throw new Error(data.error || '프로필 생성에 실패했습니다.');
      }

      // 2. Add skills
      for (const skill of skills) {
        await fetch('/api/profile/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(skill),
        });
      }

      // 3. Add experiences
      for (let i = 0; i < experiences.length; i++) {
        await fetch('/api/profile/experiences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...experiences[i], orderIndex: i }),
        });
      }

      // 4. Update self-intro
      if (selfIntroduction || resumeText || strengths.length > 0 || weaknesses.length > 0) {
        await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selfIntroduction, resumeText, strengths, weaknesses }),
        });
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 text-center mb-2">
          프로필 설정
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-8">
          AI 면접관이 당신에 대해 알 수 있도록 프로필을 설정해주세요
        </p>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className="flex items-center">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                i === step
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : i < step
                  ? 'bg-zinc-300 text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200'
                  : 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600'
              )}>
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  'w-8 h-0.5 mx-1',
                  i < step ? 'bg-zinc-400 dark:bg-zinc-500' : 'bg-zinc-200 dark:bg-zinc-800'
                )} />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-6">
          {STEPS[step]} ({step + 1}/{STEPS.length})
        </p>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          {/* Step 1: Basic Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                {name.length > 0 && name.length < 2 && (
                  <p className="mt-1 text-xs text-red-500">2자 이상 입력해주세요</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="이메일 (선택)"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  총 경력 연차 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={totalYearsExp}
                  onChange={e => setTotalYearsExp(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  현재 직무 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={currentRole}
                  onChange={e => setCurrentRole(e.target.value)}
                  placeholder="예: 백엔드 개발자"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  현재 회사
                </label>
                <input
                  type="text"
                  value={currentCompany}
                  onChange={e => setCurrentCompany(e.target.value)}
                  placeholder="회사명 (선택)"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>
          )}

          {/* Step 2: Skills */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">기술명</label>
                  <input
                    type="text"
                    value={newSkill.name}
                    onChange={e => setNewSkill({ ...newSkill, name: e.target.value })}
                    placeholder="예: Java"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">카테고리</label>
                  <select
                    value={newSkill.category}
                    onChange={e => setNewSkill({ ...newSkill, category: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    숙련도: {newSkill.proficiency}/5
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={newSkill.proficiency}
                    onChange={e => setNewSkill({ ...newSkill, proficiency: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>입문</span><span>초급</span><span>중급</span><span>숙련</span><span>전문가</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">사용 연차</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={newSkill.yearsUsed || ''}
                    onChange={e => setNewSkill({ ...newSkill, yearsUsed: parseInt(e.target.value) || undefined })}
                    placeholder="선택"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addSkill}
                disabled={!newSkill.name.trim()}
                className="w-full rounded-lg border-2 border-dashed border-zinc-300 px-4 py-2 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400"
              >
                + 기술 추가
              </button>

              {skills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">추가된 기술 ({skills.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, i) => (
                      <div key={i} className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-sm">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{skill.name}</span>
                        <span className="text-zinc-400">Lv.{skill.proficiency}</span>
                        <button
                          type="button"
                          onClick={() => removeSkill(i)}
                          className="ml-1 text-zinc-400 hover:text-red-500"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Work Experience */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">회사명</label>
                  <input
                    type="text"
                    value={newExp.company}
                    onChange={e => setNewExp({ ...newExp, company: e.target.value })}
                    placeholder="회사명"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">직무/직책</label>
                  <input
                    type="text"
                    value={newExp.role}
                    onChange={e => setNewExp({ ...newExp, role: e.target.value })}
                    placeholder="직무/직책"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">시작일</label>
                  <input
                    type="month"
                    value={newExp.startDate}
                    onChange={e => setNewExp({ ...newExp, startDate: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">종료일</label>
                  <input
                    type="month"
                    value={newExp.endDate || ''}
                    onChange={e => setNewExp({ ...newExp, endDate: e.target.value || undefined })}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <p className="mt-1 text-xs text-zinc-400">비워두면 재직중</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">업무 설명</label>
                <textarea
                  value={newExp.description || ''}
                  onChange={e => setNewExp({ ...newExp, description: e.target.value })}
                  placeholder="주요 업무 내용 (선택)"
                  rows={2}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none resize-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <button
                type="button"
                onClick={addExperience}
                disabled={!newExp.company.trim() || !newExp.role.trim() || !newExp.startDate}
                className="w-full rounded-lg border-2 border-dashed border-zinc-300 px-4 py-2 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400"
              >
                + 경력 추가
              </button>

              {experiences.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">추가된 경력 ({experiences.length})</p>
                  {experiences.map((exp, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{exp.company} - {exp.role}</p>
                        <p className="text-xs text-zinc-500">{exp.startDate} ~ {exp.endDate || '재직중'}</p>
                      </div>
                      <button type="button" onClick={() => removeExperience(i)} className="text-sm text-zinc-400 hover:text-red-500">삭제</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Self-Introduction */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">자기소개서</label>
                <textarea
                  value={selfIntroduction}
                  onChange={e => setSelfIntroduction(e.target.value)}
                  placeholder="자기소개서를 작성해주세요 (선택)"
                  rows={4}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none resize-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">이력서 텍스트</label>
                <textarea
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                  placeholder="이력서 내용을 자유 형식으로 입력 (선택)"
                  rows={4}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none resize-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">강점</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newStrength}
                    onChange={e => setNewStrength(e.target.value)}
                    placeholder="강점을 입력하세요"
                    className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStrength())}
                  />
                  <button type="button" onClick={addStrength} className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200">추가</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {strengths.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-950/30 px-2.5 py-1 text-xs text-green-700 dark:text-green-400">
                      {s}
                      <button type="button" onClick={() => setStrengths(strengths.filter((_, j) => j !== i))} className="hover:text-red-500">x</button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">약점</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newWeakness}
                    onChange={e => setNewWeakness(e.target.value)}
                    placeholder="약점을 입력하세요"
                    className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addWeakness())}
                  />
                  <button type="button" onClick={addWeakness} className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200">추가</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {weaknesses.map((w, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-400">
                      {w}
                      <button type="button" onClick={() => setWeaknesses(weaknesses.filter((_, j) => j !== i))} className="hover:text-red-500">x</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30"
          >
            이전
          </button>
          <div className="flex gap-2">
            {step < 3 && step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                건너뛰기
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && !canProceedStep1}
                className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-6 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                다음
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={isSubmitting}
                className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-6 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? '저장 중...' : '완료'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
