'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', email: '', totalYearsExp: 0, currentRole: '', currentCompany: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setEditData({
          name: data.profile.name,
          email: data.profile.email || '',
          totalYearsExp: data.profile.totalYearsExp,
          currentRole: data.profile.currentRole,
          currentCompany: data.profile.currentCompany || '',
        });
      } else {
        router.push('/profile/onboarding');
      }
    } catch {
      // Error fetching profile
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.name,
          email: editData.email || undefined,
          totalYearsExp: editData.totalYearsExp,
          currentRole: editData.currentRole,
          currentCompany: editData.currentCompany || undefined,
        }),
      });
      await fetchProfile();
      setIsEditing(false);
    } catch {
      // Error saving
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSkill(id: string) {
    await fetch(`/api/profile/skills?id=${id}`, { method: 'DELETE' });
    await fetchProfile();
  }

  async function handleDeleteExperience(id: string) {
    await fetch(`/api/profile/experiences?id=${id}`, { method: 'DELETE' });
    await fetchProfile();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">로딩 중...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">프로필 관리</h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {isEditing ? '취소' : '편집'}
          </button>
        </div>

        {/* Basic Info */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">기본 정보</h2>
          {isEditing ? (
            <div className="space-y-3">
              <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} placeholder="이름" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
              <input value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} placeholder="이메일" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
              <input type="number" value={editData.totalYearsExp} onChange={e => setEditData({ ...editData, totalYearsExp: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
              <input value={editData.currentRole} onChange={e => setEditData({ ...editData, currentRole: e.target.value })} placeholder="직무" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
              <input value={editData.currentCompany} onChange={e => setEditData({ ...editData, currentCompany: e.target.value })} placeholder="회사" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
              <button onClick={handleSave} disabled={isSaving} className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900">{isSaving ? '저장 중...' : '저장'}</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-zinc-500 dark:text-zinc-400">이름:</span> <span className="font-medium text-zinc-800 dark:text-zinc-200">{profile.name}</span></div>
              <div><span className="text-zinc-500 dark:text-zinc-400">이메일:</span> <span className="font-medium text-zinc-800 dark:text-zinc-200">{profile.email || '-'}</span></div>
              <div><span className="text-zinc-500 dark:text-zinc-400">경력:</span> <span className="font-medium text-zinc-800 dark:text-zinc-200">{profile.totalYearsExp}년</span></div>
              <div><span className="text-zinc-500 dark:text-zinc-400">직무:</span> <span className="font-medium text-zinc-800 dark:text-zinc-200">{profile.currentRole}</span></div>
              <div><span className="text-zinc-500 dark:text-zinc-400">회사:</span> <span className="font-medium text-zinc-800 dark:text-zinc-200">{profile.currentCompany || '-'}</span></div>
            </div>
          )}
        </section>

        {/* Skills */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">기술 스택</h2>
          {profile.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map(skill => (
                <div key={skill.id} className="flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-sm">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{skill.name}</span>
                  <span className="text-zinc-400">Lv.{skill.proficiency}</span>
                  {skill.yearsUsed && <span className="text-zinc-400">{skill.yearsUsed}y</span>}
                  {isEditing && (
                    <button onClick={() => handleDeleteSkill(skill.id)} className="text-zinc-400 hover:text-red-500">x</button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">등록된 기술이 없습니다.</p>
          )}
        </section>

        {/* Experiences */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">경력 사항</h2>
          {profile.experiences.length > 0 ? (
            <div className="space-y-3">
              {profile.experiences.map(exp => (
                <div key={exp.id} className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{exp.company} - {exp.role}</p>
                    <p className="text-xs text-zinc-500">{new Date(exp.startDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })} ~ {exp.endDate ? new Date(exp.endDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }) : '재직중'}</p>
                  </div>
                  {isEditing && (
                    <button onClick={() => handleDeleteExperience(exp.id)} className="text-sm text-zinc-400 hover:text-red-500">삭제</button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">등록된 경력이 없습니다.</p>
          )}
        </section>

        {/* Strengths & Weaknesses */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">강점 & 약점</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">강점</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.strengths.map((s, i) => (
                  <span key={i} className="rounded-full bg-green-50 dark:bg-green-950/30 px-2.5 py-1 text-xs text-green-700 dark:text-green-400">{s}</span>
                ))}
                {profile.strengths.length === 0 && <span className="text-xs text-zinc-400">-</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">약점</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.weaknesses.map((w, i) => (
                  <span key={i} className="rounded-full bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-400">{w}</span>
                ))}
                {profile.weaknesses.length === 0 && <span className="text-xs text-zinc-400">-</span>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
