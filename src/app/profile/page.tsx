'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { ProfileSection } from '@/components/profile/ProfileSection';
import { SkillSelector } from '@/components/profile/SkillSelector';
import { ExperienceEditor } from '@/components/profile/ExperienceEditor';

interface Profile {
  id: string;
  name: string;
  email: string | null;
  totalYearsExp: number;
  currentRole: string;
  currentCompany: string | null;
  selfIntroduction: string | null;
  resumeText: string | null;
  strengths: string[];
  weaknesses: string[];
  skills: Array<{
    id: string;
    name: string;
    category: string;
    proficiency: number;
    yearsUsed: number | null;
  }>;
  experiences: Array<{
    id: string;
    company: string;
    role: string;
    startDate: string;
    endDate: string | null;
    description: string | null;
    techStack: string[];
    achievements: string[];
  }>;
  targetPositions: Array<{
    id: string;
    company: string;
    position: string;
    isActive: boolean;
  }>;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Section-level edit states
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [isEditingResume, setIsEditingResume] = useState(false);

  // Basic info form
  const [basicForm, setBasicForm] = useState({
    name: '',
    email: '',
    totalYearsExp: 0,
    currentRole: '',
    currentCompany: '',
  });

  // Text fields
  const [introText, setIntroText] = useState('');
  const [resumeText, setResumeText] = useState('');

  // Strengths/weaknesses inline add
  const [strengthInput, setStrengthInput] = useState('');
  const [weaknessInput, setWeaknessInput] = useState('');

  // Saving states
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setBasicForm({
          name: data.profile.name,
          email: data.profile.email || '',
          totalYearsExp: data.profile.totalYearsExp,
          currentRole: data.profile.currentRole,
          currentCompany: data.profile.currentCompany || '',
        });
        setIntroText(data.profile.selfIntroduction || '');
        setResumeText(data.profile.resumeText || '');
      } else {
        router.push('/profile/onboarding');
      }
    } catch {
      showError('프로필 로딩에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // PUT /api/profile helper
  const updateProfile = async (data: Record<string, unknown>) => {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('저장에 실패했습니다.');
  };

  // Basic info save
  const handleBasicSave = async () => {
    if (!basicForm.name.trim() || !basicForm.currentRole.trim()) {
      showError('이름과 직무는 필수 입력 항목입니다.');
      return;
    }
    setSavingSection('basic');
    try {
      await updateProfile({
        name: basicForm.name.trim(),
        email: basicForm.email.trim() || undefined,
        totalYearsExp: basicForm.totalYearsExp,
        currentRole: basicForm.currentRole.trim(),
        currentCompany: basicForm.currentCompany.trim() || undefined,
      });
      await fetchProfile();
      setIsEditingBasic(false);
    } catch (err) {
      showError(err instanceof Error ? err.message : '기본 정보 저장에 실패했습니다.');
    } finally {
      setSavingSection(null);
    }
  };

  // Strengths
  const addStrength = async () => {
    const trimmed = strengthInput.trim();
    if (!trimmed || !profile) return;
    if (profile.strengths.includes(trimmed)) {
      showError('이미 추가된 강점입니다.');
      return;
    }
    setSavingSection('strengths');
    try {
      await updateProfile({ strengths: [...profile.strengths, trimmed] });
      setStrengthInput('');
      await fetchProfile();
    } catch {
      showError('강점 추가에 실패했습니다.');
    } finally {
      setSavingSection(null);
    }
  };

  const removeStrength = async (index: number) => {
    if (!profile) return;
    setSavingSection('strengths');
    try {
      await updateProfile({
        strengths: profile.strengths.filter((_, i) => i !== index),
      });
      await fetchProfile();
    } catch {
      showError('강점 삭제에 실패했습니다.');
    } finally {
      setSavingSection(null);
    }
  };

  // Weaknesses
  const addWeakness = async () => {
    const trimmed = weaknessInput.trim();
    if (!trimmed || !profile) return;
    if (profile.weaknesses.includes(trimmed)) {
      showError('이미 추가된 약점입니다.');
      return;
    }
    setSavingSection('weaknesses');
    try {
      await updateProfile({ weaknesses: [...profile.weaknesses, trimmed] });
      setWeaknessInput('');
      await fetchProfile();
    } catch {
      showError('약점 추가에 실패했습니다.');
    } finally {
      setSavingSection(null);
    }
  };

  const removeWeakness = async (index: number) => {
    if (!profile) return;
    setSavingSection('weaknesses');
    try {
      await updateProfile({
        weaknesses: profile.weaknesses.filter((_, i) => i !== index),
      });
      await fetchProfile();
    } catch {
      showError('약점 삭제에 실패했습니다.');
    } finally {
      setSavingSection(null);
    }
  };

  // Self Introduction save
  const handleIntroSave = async () => {
    setSavingSection('intro');
    try {
      await updateProfile({ selfIntroduction: introText.trim() || null });
      await fetchProfile();
      setIsEditingIntro(false);
    } catch {
      showError('자기소개 저장에 실패했습니다.');
    } finally {
      setSavingSection(null);
    }
  };

  // Resume save
  const handleResumeSave = async () => {
    setSavingSection('resume');
    try {
      await updateProfile({ resumeText: resumeText.trim() || null });
      await fetchProfile();
      setIsEditingResume(false);
    } catch {
      showError('이력서 저장에 실패했습니다.');
    } finally {
      setSavingSection(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">로딩 중...</p>
      </div>
    );
  }

  if (!profile) return null;

  const inputClass =
    'w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">프로필 관리</h1>

        {/* Global Error */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <ProfileSection
          title="기본 정보"
          action={
            !isEditingBasic ? (
              <button
                onClick={() => setIsEditingBasic(true)}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                편집
              </button>
            ) : undefined
          }
        >
          {isEditingBasic ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={basicForm.name}
                    onChange={(e) => setBasicForm({ ...basicForm, name: e.target.value })}
                    placeholder="이름"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={basicForm.email}
                    onChange={(e) => setBasicForm({ ...basicForm, email: e.target.value })}
                    placeholder="이메일"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    총 경력 (년)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={basicForm.totalYearsExp}
                    onChange={(e) =>
                      setBasicForm({ ...basicForm, totalYearsExp: parseInt(e.target.value) || 0 })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    직무 <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={basicForm.currentRole}
                    onChange={(e) => setBasicForm({ ...basicForm, currentRole: e.target.value })}
                    placeholder="직무"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    회사
                  </label>
                  <input
                    value={basicForm.currentCompany}
                    onChange={(e) =>
                      setBasicForm({ ...basicForm, currentCompany: e.target.value })
                    }
                    placeholder="회사"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleBasicSave}
                  disabled={savingSection === 'basic'}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium',
                    'bg-blue-600 text-white hover:bg-blue-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {savingSection === 'basic' ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingBasic(false);
                    if (profile) {
                      setBasicForm({
                        name: profile.name,
                        email: profile.email || '',
                        totalYearsExp: profile.totalYearsExp,
                        currentRole: profile.currentRole,
                        currentCompany: profile.currentCompany || '',
                      });
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">이름:</span>{' '}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {profile.name}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">이메일:</span>{' '}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {profile.email || '-'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">경력:</span>{' '}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {profile.totalYearsExp}년
                </span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">직무:</span>{' '}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {profile.currentRole}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">회사:</span>{' '}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {profile.currentCompany || '-'}
                </span>
              </div>
            </div>
          )}
        </ProfileSection>

        {/* Skills */}
        <ProfileSection title="기술 스택">
          <SkillSelector skills={profile.skills} onRefetch={fetchProfile} />
        </ProfileSection>

        {/* Experiences */}
        <ProfileSection title="경력 사항">
          <ExperienceEditor experiences={profile.experiences} onRefetch={fetchProfile} />
        </ProfileSection>

        {/* Strengths & Weaknesses */}
        <ProfileSection title="강점 & 약점">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Strengths */}
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">강점</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {profile.strengths.map((s, i) => (
                  <span
                    key={i}
                    className="group flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-950/30 px-2.5 py-1 text-xs text-green-700 dark:text-green-400"
                  >
                    {s}
                    <button
                      onClick={() => removeStrength(i)}
                      disabled={savingSection === 'strengths'}
                      className="opacity-0 group-hover:opacity-100 text-green-500 hover:text-red-500 transition-opacity disabled:opacity-50"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {profile.strengths.length === 0 && (
                  <span className="text-xs text-zinc-400">아직 강점이 없습니다.</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={strengthInput}
                  onChange={(e) => setStrengthInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addStrength()}
                  placeholder="강점 입력..."
                  disabled={savingSection === 'strengths'}
                  className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 disabled:opacity-50"
                />
                <button
                  onClick={addStrength}
                  disabled={!strengthInput.trim() || savingSection === 'strengths'}
                  className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  추가
                </button>
              </div>
            </div>

            {/* Weaknesses */}
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">약점</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {profile.weaknesses.map((w, i) => (
                  <span
                    key={i}
                    className="group flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-400"
                  >
                    {w}
                    <button
                      onClick={() => removeWeakness(i)}
                      disabled={savingSection === 'weaknesses'}
                      className="opacity-0 group-hover:opacity-100 text-amber-500 hover:text-red-500 transition-opacity disabled:opacity-50"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {profile.weaknesses.length === 0 && (
                  <span className="text-xs text-zinc-400">아직 약점이 없습니다.</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={weaknessInput}
                  onChange={(e) => setWeaknessInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addWeakness()}
                  placeholder="약점 입력..."
                  disabled={savingSection === 'weaknesses'}
                  className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 disabled:opacity-50"
                />
                <button
                  onClick={addWeakness}
                  disabled={!weaknessInput.trim() || savingSection === 'weaknesses'}
                  className="rounded-lg bg-amber-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </ProfileSection>

        {/* Self Introduction */}
        <ProfileSection
          title="자기소개"
          action={
            !isEditingIntro ? (
              <button
                onClick={() => setIsEditingIntro(true)}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                편집
              </button>
            ) : undefined
          }
        >
          {isEditingIntro ? (
            <div className="space-y-3">
              <textarea
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                rows={4}
                placeholder="자기소개를 입력하세요..."
                className={cn(inputClass, 'resize-y')}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">{introText.length}/5000</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleIntroSave}
                    disabled={savingSection === 'intro'}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingSection === 'intro' ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingIntro(false);
                      setIntroText(profile.selfIntroduction || '');
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          ) : profile.selfIntroduction ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
              {profile.selfIntroduction}
            </p>
          ) : (
            <p className="text-sm text-zinc-400">자기소개가 없습니다. 편집 버튼을 눌러 추가하세요.</p>
          )}
        </ProfileSection>

        {/* Resume */}
        <ProfileSection
          title="이력서"
          action={
            !isEditingResume ? (
              <button
                onClick={() => setIsEditingResume(true)}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                편집
              </button>
            ) : undefined
          }
        >
          {isEditingResume ? (
            <div className="space-y-3">
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={6}
                placeholder="이력서 내용을 입력하세요..."
                className={cn(inputClass, 'resize-y')}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">{resumeText.length}/10000</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleResumeSave}
                    disabled={savingSection === 'resume'}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingSection === 'resume' ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingResume(false);
                      setResumeText(profile.resumeText || '');
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          ) : profile.resumeText ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
              {profile.resumeText}
            </p>
          ) : (
            <p className="text-sm text-zinc-400">이력서가 없습니다. 편집 버튼을 눌러 추가하세요.</p>
          )}
        </ProfileSection>
      </div>
    </div>
  );
}
