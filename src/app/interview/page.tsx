'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/components/Toast';
import { hasKnowledgeBase } from '@/lib/interview-knowledge';
import { getRecommendedTopics } from '@/lib/interview-knowledge/company-styles';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { positionToTopics } from '@/lib/utils/position-to-topics';
import { Modal } from '@/components/Modal';
import { getJobFunction, listJobFunctions } from '@/lib/job-functions';
import type { JobFunctionConfig } from '@/lib/job-functions';

const JobParsingModal = dynamic(() => import('@/components/JobParsingModal').then(mod => ({ default: mod.JobParsingModal })), { ssr: false });

interface Position {
  id: string;
  company: string;
  position: string;
  isActive: boolean;
  techStack?: string[];
  requirements?: string[];
  jobDescription?: string;
}

interface Skill {
  name: string;
  category: string;
  proficiency: number;
}

interface Profile {
  totalYearsExp: number;
  skills: Skill[];
}

function getRecommendedTopicsFromPosition(position: Position): string[] {
  const techStack = position.techStack || [];
  const requirements = position.requirements || [];
  const allText = [...techStack, ...requirements].join(' ').toLowerCase();

  const TECH_TO_TOPIC: Record<string, string[]> = {
    'java': ['Java'],
    'spring': ['Spring', 'Java'],
    'node': ['Node.js'],
    'node.js': ['Node.js'],
    'python': ['Python'],
    'go': ['Go'],
    'django': ['Python'],
    'fastapi': ['Python'],
    'nestjs': ['Node.js'],
    'express': ['Node.js'],
    'react': ['React', 'JavaScript/TypeScript'],
    'next.js': ['Next.js', 'React', 'JavaScript/TypeScript'],
    'next': ['Next.js', 'React', 'JavaScript/TypeScript'],
    'vue': ['Vue', 'JavaScript/TypeScript'],
    'vue.js': ['Vue', 'JavaScript/TypeScript'],
    'angular': ['JavaScript/TypeScript'],
    'javascript': ['JavaScript/TypeScript'],
    'typescript': ['JavaScript/TypeScript'],
    'html': ['HTML/CSS'],
    'css': ['HTML/CSS'],
    'tailwind': ['HTML/CSS'],
    'postgresql': ['SQL/RDBMS'],
    'mysql': ['SQL/RDBMS'],
    'sql': ['SQL/RDBMS'],
    'mongodb': ['NoSQL'],
    'redis': ['NoSQL'],
    'elasticsearch': ['NoSQL'],
    'prisma': ['ORM'],
    'typeorm': ['ORM'],
    'hibernate': ['ORM'],
    'docker': ['Docker/K8s'],
    'kubernetes': ['Docker/K8s'],
    'k8s': ['Docker/K8s'],
    'aws': ['AWS/Cloud'],
    'gcp': ['AWS/Cloud'],
    'azure': ['AWS/Cloud'],
    'ci/cd': ['CI/CD'],
    'github actions': ['CI/CD'],
    'jenkins': ['CI/CD'],
    'terraform': ['AWS/Cloud'],
    'msa': ['MSA'],
    'microservice': ['MSA'],
    'ddd': ['DDD'],
    'clean architecture': ['클린 아키텍처'],
    'system design': ['시스템 설계'],
    'design pattern': ['디자인 패턴'],
    'llm': ['LLM/프롬프트 엔지니어링'],
    'langchain': ['LLM/프롬프트 엔지니어링'],
    'openai': ['LLM/프롬프트 엔지니어링'],
    'rag': ['RAG/벡터DB'],
    'vector': ['RAG/벡터DB'],
    'pytorch': ['딥러닝'],
    'tensorflow': ['딥러닝'],
    'ml': ['머신러닝 기초'],
    'machine learning': ['머신러닝 기초'],
  };

  const topicSet = new Set<string>();

  for (const tech of techStack) {
    const lower = tech.toLowerCase();
    if (TECH_TO_TOPIC[lower]) {
      TECH_TO_TOPIC[lower].forEach(t => topicSet.add(t));
    }
  }

  for (const [keyword, topics] of Object.entries(TECH_TO_TOPIC)) {
    if (allText.includes(keyword)) {
      topics.forEach(t => topicSet.add(t));
    }
  }

  const behavioralKeywords = ['경험', 'experience', '경력', '협업', 'team', '리더'];
  if (behavioralKeywords.some(k => allText.includes(k))) {
    topicSet.add('프로젝트 경험');
  }

  return Array.from(topicSet);
}

const DIFFICULTY_OPTIONS = [
  { value: 'junior', label: '주니어', description: '1-3년차, 기본 개념 중심' },
  { value: 'mid', label: '미들', description: '4-7년차, 심화 개념 및 설계' },
  { value: 'senior', label: '시니어', description: '8년차 이상, 아키텍처 및 리더십' },
];

interface StyleOption {
  value: string;
  label: string;
  description: string;
  pro?: boolean;
}

const COMPANY_STYLE_OPTIONS: StyleOption[] = [
  { value: 'naver', label: '네이버', description: '대규모 트래픽, 시스템 설계 중심' },
  { value: 'kakao', label: '카카오', description: '알고리즘 + 서비스 감각, 컬처핏' },
  { value: 'coupang', label: '쿠팡', description: 'LP 기반 행동면접 + 이커머스 설계' },
  { value: 'toss', label: '토스', description: '핀테크 도메인, 프로덕트 사고' },
  { value: 'line', label: 'LINE', description: '분산 시스템, 글로벌 서비스' },
  { value: 'samsung-sds', label: '삼성SDS', description: 'CS 기초, 알고리즘, 프로세스' },
  { value: 'startup', label: '스타트업', description: '실무 경험, 빠른 학습 중심' },
];

const BEHAVIORAL_COMPANY_STYLE_OPTIONS: StyleOption[] = [
  { value: 'general-behavioral', label: '일반 인성면접', description: 'STAR 기법 기반 표준 구조화 면접' },
  { value: 'samsung-behavioral', label: '삼성 인성/임원면접', description: '창의성/PT 면접, 임원면접 패턴', pro: true },
  { value: 'coupang-behavioral', label: '쿠팡 LP 행동면접', description: 'Leadership Principles, SBI 기법', pro: true },
  { value: 'kakao-behavioral', label: '카카오 컬처핏', description: '동료 면접, 업무 스타일 호환성', pro: true },
  { value: 'naver-behavioral', label: '네이버 조직적합성', description: '성장 가능성, 자기주도 문제해결', pro: true },
  { value: 'toss-behavioral', label: '토스 컬처핏', description: 'Extreme Ownership, High Bar', pro: true },
];

function InterviewSetupPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { data: featureData } = useFeatureGate();
  const [positions, setPositions] = useState<Position[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(true);
  const [resendingEmail, setResendingEmail] = useState(false);
  // Form state
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string>('mid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showDetailedSettings, setShowDetailedSettings] = useState(false);
  const [autoRecommended, setAutoRecommended] = useState<string[]>([]);
  const [showParsingModal, setShowParsingModal] = useState(false);
  const [newlyImportedPositionId, setNewlyImportedPositionId] = useState<string | null>(null);
  const [interviewType, setInterviewType] = useState<'technical' | 'behavioral' | 'mixed'>('technical');
  const [jobFunction, setJobFunction] = useState<string>('developer');
  const [companyStyle, setCompanyStyle] = useState<string | null>(null);
  const [showExistingSessionModal, setShowExistingSessionModal] = useState(false);
  const [existingSessionInfo, setExistingSessionInfo] = useState<any>(null);
  const [pendingSessionParams, setPendingSessionParams] = useState<{ topics: string[]; diff: string; positionId?: string } | null>(null);
  const [stats, setStats] = useState<{ totalSessions: number } | null>(null);
  const [resumeEditPrompt, setResumeEditPrompt] = useState<{
    edit: any;
    positionName: string;
    onApply: () => void;
    onSkip: () => void;
    onCancel: () => void;
  } | null>(null);
  const [showFullOptions, setShowFullOptions] = useState(false);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);

  const isPro = featureData?.tier === 'PRO';
  const isFirstTimeUser = stats ? stats.totalSessions === 0 : false;

  // Compute recommended topics from company style
  const companyRecommendedTopics = useMemo(() =>
    companyStyle ? getRecommendedTopics(companyStyle) : [],
    [companyStyle]
  );

  useEffect(() => {
    loadData();
    checkActiveSession();
    checkEmailVerification();
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats({ totalSessions: data.totalSessions });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  // Handle positionId from URL query params
  useEffect(() => {
    const positionId = searchParams.get('positionId');
    if (positionId && positions.length > 0) {
      const positionExists = positions.some(p => p.id === positionId);
      if (positionExists) {
        setSelectedPositionId(positionId);
        setShowDetailedSettings(true);
      }
    }
  }, [searchParams, positions]);

  // Auto-recommend topics when position is selected
  useEffect(() => {
    if (!selectedPositionId) {
      setAutoRecommended([]);
      return;
    }
    const pos = positions.find(p => p.id === selectedPositionId);
    if (pos) {
      const recommended = getRecommendedTopicsFromPosition(pos);
      setAutoRecommended(recommended);
      if (selectedTopics.length === 0) {
        setSelectedTopics(recommended);
      }
    }
  }, [selectedPositionId, positions]);

  async function checkEmailVerification() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setEmailVerified(data.user?.emailVerified ?? true);
      }
    } catch {}
  }

  async function handleResendVerification() {
    setResendingEmail(true);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast('인증 메일이 재발송되었습니다. 이메일을 확인해주세요.', 'success');
      } else {
        toast(data.error || '재발송에 실패했습니다.', 'error');
      }
    } catch {
      toast('네트워크 오류가 발생했습니다.', 'error');
    } finally {
      setResendingEmail(false);
    }
  }

  async function checkActiveSession() {
    try {
      const res = await fetch('/api/interview?status=in_progress');
      if (res.ok) {
        const data = await res.json();
        if (data.sessions && data.sessions.length > 0) {
          setActiveSessionId(data.sessions[0].id);
          setExistingSessionInfo(data.sessions[0]);
        }
      }
    } catch {}
  }

  async function loadData() {
    try {
      const [positionsRes, profileRes] = await Promise.all([
        fetch('/api/positions'),
        fetch('/api/profile'),
      ]);

      if (positionsRes.ok) {
        const data = await positionsRes.json();
        setPositions(data.positions.filter((p: Position) => p.isActive));
      }

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile);

        if (data.profile.totalYearsExp <= 3) setDifficulty('junior');
        else if (data.profile.totalYearsExp <= 7) setDifficulty('mid');
        else setDifficulty('senior');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleTopic(topic: string) {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  function selectAllCompanyRecommended() {
    if (companyRecommendedTopics.length === 0) return;
    setSelectedTopics((prev) => {
      const newTopics = [...prev];
      companyRecommendedTopics.forEach((topic) => {
        if (!newTopics.includes(topic)) {
          newTopics.push(topic);
        }
      });
      return newTopics;
    });
  }

  function getProfileRecommendedTopics(): string[] {
    if (!profile) return [];
    const skillNames = profile.skills.map((s) => s.name.toLowerCase());
    const recommended: string[] = [];
    const config = getJobFunction(jobFunction);

    config.presetTopics.forEach((group) => {
      group.topics.forEach((topic) => {
        if (skillNames.some((skill) => topic.toLowerCase().includes(skill))) {
          recommended.push(topic);
        }
      });
    });

    return recommended;
  }

  function getRecommendedDifficulty(): string {
    if (!profile) return 'mid';
    if (profile.totalYearsExp <= 3) return 'junior';
    if (profile.totalYearsExp <= 7) return 'mid';
    return 'senior';
  }

  const recommendedTopics = getProfileRecommendedTopics();

  const currentConfig = getJobFunction(jobFunction);

  const displayedTopics = interviewType === 'behavioral'
    ? currentConfig.behavioralTopics
    : interviewType === 'mixed'
    ? [...currentConfig.presetTopics, ...currentConfig.behavioralTopics]
    : currentConfig.presetTopics;

  const displayedStyles = interviewType === 'behavioral'
    ? BEHAVIORAL_COMPANY_STYLE_OPTIONS
    : interviewType === 'mixed'
    ? [...COMPANY_STYLE_OPTIONS, ...BEHAVIORAL_COMPANY_STYLE_OPTIONS]
    : COMPANY_STYLE_OPTIONS;

  const filteredTopics = displayedTopics.map((group) => ({
    ...group,
    topics: group.topics.filter((topic) =>
      topic.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((group) => group.topics.length > 0);

  async function selectResumeForInterview(positionId: string): Promise<string | null | 'cancel'> {
    try {
      const res = await fetch(`/api/resume-edit?targetPositionId=${positionId}&latest=true`);
      if (!res.ok) return null;
      const { edit } = await res.json();
      if (!edit) return null;

      const position = positions.find(p => p.id === positionId);
      const positionName = position ? `${position.company} - ${position.position}` : '';

      return new Promise((resolve) => {
        setResumeEditPrompt({
          edit,
          positionName,
          onApply: () => {
            setResumeEditPrompt(null);
            resolve(edit.id);
          },
          onSkip: () => {
            setResumeEditPrompt(null);
            resolve(null);
          },
          onCancel: () => {
            setResumeEditPrompt(null);
            resolve('cancel');
          },
        });
      });
    } catch {
      return null;
    }
  }

  async function createSession(topics: string[], diff: string, positionId?: string, abandonExisting = false) {
    let resumeEditId: string | undefined;

    if (positionId) {
      const result = await selectResumeForInterview(positionId);
      if (result === 'cancel') return;
      resumeEditId = result ?? undefined;
    }

    // Check for existing in_progress session
    if (!abandonExisting && activeSessionId) {
      // Fetch full session info
      try {
        const res = await fetch(`/api/interview?id=${activeSessionId}`);
        if (res.ok) {
          const sessionData = await res.json();
          setExistingSessionInfo(sessionData);
          setPendingSessionParams({ topics, diff, positionId });
          setShowExistingSessionModal(true);
          return;
        }
      } catch {}
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPositionId: positionId || undefined,
          topics,
          difficulty: diff,
          evaluationMode: 'immediate',
          companyStyle: companyStyle || undefined,
          interviewType,
          jobFunction,
          abandonExisting,
          resumeEditId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '세션 생성 실패');
      }

      const { session } = await response.json();
      router.push(`/interview/${session.id}`);
    } catch (error: unknown) {
      console.error('Failed to create session:', error);
      toast(error instanceof Error ? error.message : '면접 세션 생성에 실패했습니다.', 'error');
      setIsCreating(false);
    }
  }

  function handleResumeExisting() {
    setShowExistingSessionModal(false);
    if (activeSessionId) {
      router.push(`/interview/${activeSessionId}`);
    }
  }

  async function handleAbandonAndStart() {
    setShowExistingSessionModal(false);
    if (pendingSessionParams) {
      await createSession(
        pendingSessionParams.topics,
        pendingSessionParams.diff,
        pendingSessionParams.positionId,
        true
      );
    }
  }

  async function handleEndWithEvaluation() {
    if (!activeSessionId) return;
    setIsEndingSession(true);
    try {
      const putRes = await fetch('/api/interview', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeSessionId, status: 'completed' }),
      });
      if (!putRes.ok) throw new Error('세션 종료 실패');

      await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId }),
      });

      router.push(`/history/${activeSessionId}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : '면접 종료에 실패했습니다.', 'error');
      setIsEndingSession(false);
    } finally {
      setShowEndSessionModal(false);
      setActiveSessionId(null);
      setExistingSessionInfo(null);
    }
  }

  async function handleEndWithoutEvaluation() {
    if (!activeSessionId) return;
    setIsEndingSession(true);
    try {
      const res = await fetch('/api/interview', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeSessionId, status: 'abandoned' }),
      });
      if (!res.ok) throw new Error('면접 종료 실패');

      toast('면접이 종료되었습니다.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : '면접 종료에 실패했습니다.', 'error');
    } finally {
      setShowEndSessionModal(false);
      setIsEndingSession(false);
      setActiveSessionId(null);
      setExistingSessionInfo(null);
    }
  }

  async function handleQuickStart() {
    const config = getJobFunction(jobFunction);
    const fallbackTopics = config.presetTopics[0]?.topics.slice(0, 3) || ['자기소개', '프로젝트 경험', '협업/갈등'];
    const topics = recommendedTopics.length > 0
      ? recommendedTopics.slice(0, 3)
      : fallbackTopics;
    const diff = getRecommendedDifficulty();
    await createSession(topics, diff);
  }

  async function handleCompanyStart(position: Position) {
    const config = getJobFunction(jobFunction);
    const configFallback = config.presetTopics[0]?.topics.slice(0, 3) || ['자기소개', '프로젝트 경험', '협업/갈등'];
    const topics = positionToTopics({
      requirements: position.requirements || [],
      jobDescription: position.jobDescription,
      position: position.position,
    });
    // Use getRecommendedTopicsFromPosition as fallback if positionToTopics returns few results
    const fallbackTopics = getRecommendedTopicsFromPosition(position);
    const finalTopics = topics.length >= 3 ? topics : [...new Set([...topics, ...fallbackTopics])].slice(0, 5);
    const diff = getRecommendedDifficulty();
    await createSession(
      finalTopics.length > 0 ? finalTopics : configFallback,
      diff,
      position.id
    );
  }

  async function handleStart() {
    if (selectedTopics.length === 0) {
      toast('최소 1개 이상의 주제를 선택해주세요.', 'warning');
      return;
    }
    await createSession(selectedTopics, difficulty, selectedPositionId || undefined);
  }

  const handleParsingSave = async (data: {
    company: string;
    position: string;
    jobDescription: string;
    requirements: string[];
    preferredQualifications: string[];
    requiredExperience: string;
  }) => {
    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: data.company,
          position: data.position,
          jobDescription: data.jobDescription || undefined,
          requirements: data.requirements.length > 0 ? data.requirements : undefined,
          preferredQualifications: data.preferredQualifications.length > 0 ? data.preferredQualifications : undefined,
          requiredExperience: data.requiredExperience || undefined,
        }),
      });

      if (res.ok) {
        const responseData = await res.json();
        const newPositionId = responseData.position?.id;

        setShowParsingModal(false);
        await loadData();

        if (newPositionId) {
          setNewlyImportedPositionId(newPositionId);
          setSelectedPositionId(newPositionId);
          setShowDetailedSettings(true);

          setTimeout(() => {
            setNewlyImportedPositionId(null);
          }, 5000);
        }
      }
    } catch (error) {
      console.error('Failed to save position:', error);
      toast('포지션 저장에 실패했습니다.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">모의 면접</h1>
          <p className="text-zinc-400">AI 면접관과 함께 면접을 연습하세요.</p>
        </div>

        {!emailVerified && (
          <div className="mb-8 bg-amber-950/50 border border-amber-800 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-200 font-medium">이메일 인증이 필요합니다</p>
                <p className="text-sm text-amber-300/70 mt-1">
                  면접을 시작하려면 가입 시 발송된 인증 메일을 확인해주세요.
                </p>
              </div>
              <button
                onClick={handleResendVerification}
                disabled={resendingEmail}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-500 transition-colors disabled:opacity-50"
              >
                {resendingEmail ? '발송 중...' : '인증 메일 재발송'}
              </button>
            </div>
          </div>
        )}

        {activeSessionId && existingSessionInfo && (
          <div className="mb-4 p-3 bg-blue-950/50 border border-blue-800/50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-sm text-blue-300 font-medium">진행 중인 면접</span>
              <span className="text-sm text-zinc-400">{existingSessionInfo.topics?.join(', ') || ''}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResumeExisting}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                이어하기
              </button>
              <button
                onClick={() => setShowEndSessionModal(true)}
                className="px-3 py-1.5 text-xs font-medium bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors"
              >
                종료하기
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Quick Start Hero - First-time users */}
        {isFirstTimeUser && !showFullOptions && (
          <div className="mb-10">
            <div className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/50 rounded-xl p-10 text-center">
              <h2 className="text-3xl font-bold mb-3">첫 면접을 시작해볼까요?</h2>
              <p className="text-zinc-300 text-base mb-8">
                직군만 선택하면 추천 설정으로 바로 시작할 수 있어요.
              </p>

              {/* Job Function Selection for first-time users */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">직군 선택</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-4xl mx-auto">
                  {listJobFunctions().map((config) => (
                    <button
                      key={config.id}
                      onClick={() => {
                        setJobFunction(config.id);
                        setSelectedTopics([]);
                        setCompanyStyle(null);
                      }}
                      className={cn(
                        'p-4 rounded-xl border-2 text-left transition-all',
                        jobFunction === config.id
                          ? 'border-white bg-white/10'
                          : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
                      )}
                    >
                      <div className="text-white font-semibold text-sm">{config.label}</div>
                      <div className="text-zinc-400 text-xs mt-1">{config.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleQuickStart}
                disabled={isCreating || !emailVerified}
                className={cn(
                  'w-full max-w-md mx-auto block px-8 py-4 rounded-lg font-bold text-xl transition-all mb-4',
                  isCreating || !emailVerified
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                )}
              >
                {isCreating ? '세션 생성 중...' : '바로 시작하기'}
              </button>

              <button
                onClick={() => setShowFullOptions(true)}
                className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors underline"
              >
                세부 설정 보기
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Quick Start Hero - Returning users */}
        {!isFirstTimeUser && (
          <div className="mb-10">
            <div className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/50 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-2">바로 시작하기</h2>
              <p className="text-zinc-400 text-sm mb-1">
                기본 설정으로 즉시 면접을 시작합니다
              </p>
              {(() => {
                const quickStartFallback = currentConfig.presetTopics[0]?.topics.slice(0, 3) || ['자기소개', '프로젝트 경험', '협업/갈등'];
                return (
                  <>
                    {profile && (
                      <p className="text-zinc-500 text-xs mb-5">
                        추천 주제: {(recommendedTopics.length > 0 ? recommendedTopics.slice(0, 3) : quickStartFallback).join(', ')}
                        {' / '}
                        난이도: {DIFFICULTY_OPTIONS.find(d => d.value === getRecommendedDifficulty())?.label || '미들'}
                      </p>
                    )}
                    {!profile && (
                      <p className="text-zinc-500 text-xs mb-5">
                        추천 주제: {quickStartFallback.join(', ')} / 난이도: 미들
                      </p>
                    )}
                  </>
                );
              })()}
              <button
                onClick={handleQuickStart}
                disabled={isCreating || !emailVerified}
                className={cn(
                  'px-8 py-3.5 rounded-lg font-semibold text-lg transition-all',
                  isCreating || !emailVerified
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                )}
              >
                {isCreating ? '세션 생성 중...' : '바로 면접 시작'}
              </button>
            </div>
          </div>
        )}

        {/* Job Function Selection - Always visible for returning users or when full options shown */}
        {(!isFirstTimeUser || showFullOptions) && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">직군 선택</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {listJobFunctions().map((config) => (
                <button
                  key={config.id}
                  onClick={() => {
                    setJobFunction(config.id);
                    setSelectedTopics([]);
                    setCompanyStyle(null);
                  }}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    jobFunction === config.id
                      ? 'border-white bg-white/10'
                      : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
                  )}
                >
                  <div className="text-white font-semibold text-sm">{config.label}</div>
                  <div className="text-zinc-400 text-xs mt-1">{config.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Interview Type Selection */}
        {(!isFirstTimeUser || showFullOptions) && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">면접 유형</h2>
          <div className="grid grid-cols-3 gap-4">
            {([
              { value: 'technical' as const, label: '기술 면접', sub: 'Technical', desc: '기술 역량 평가 중심', icon: 'T' },
              { value: 'behavioral' as const, label: '인성 면접', sub: 'Behavioral', desc: '인성/컬처핏 평가 중심', icon: 'B' },
              { value: 'mixed' as const, label: '통합 면접', sub: 'Mixed', desc: '기술+인성 종합 평가', icon: 'M' },
            ]).map((mode) => (
              <button
                key={mode.value}
                onClick={() => {
                  setInterviewType(mode.value);
                  setSelectedTopics([]);
                  setCompanyStyle(null);
                }}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  interviewType === mode.value
                    ? 'border-white bg-white/10'
                    : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
                )}
              >
                <div className="text-2xl mb-2 font-mono font-bold text-zinc-400">{mode.icon}</div>
                <div className="text-white font-semibold">{mode.label}</div>
                <div className="text-zinc-500 text-xs mb-1">{mode.sub}</div>
                <div className="text-zinc-400 text-sm">{mode.desc}</div>
              </button>
            ))}
          </div>
          </div>
        )}

        {/* Section 2: Company-Targeted Interviews */}
        {(!isFirstTimeUser || showFullOptions) && (
          <div className="mb-10">
            <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold">지원회사 맞춤 면접</h2>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full border border-amber-500/30">
                PRO
              </span>
            </div>

            {isPro && positions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {positions.slice(0, 6).map((position) => (
                  <button
                    key={position.id}
                    onClick={() => handleCompanyStart(position)}
                    disabled={isCreating || !emailVerified}
                    className={cn(
                      'p-5 rounded-xl border border-zinc-700 bg-zinc-900 hover:border-blue-500/50 hover:bg-zinc-800/80 transition-all text-left group',
                      (isCreating || !emailVerified) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="font-semibold text-white group-hover:text-blue-300 transition-colors">{position.company}</div>
                    <div className="text-sm text-zinc-400 mt-1">{position.position}</div>
                    {position.jobDescription && (
                      <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                        {position.jobDescription.slice(0, 50)}{position.jobDescription.length > 50 ? '...' : ''}
                      </p>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => router.push('/positions')}
                  className="p-5 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-800/50 transition-all text-left flex flex-col items-center justify-center min-h-[100px]"
                >
                  <svg className="w-8 h-8 text-zinc-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm text-zinc-400">회사 추가</span>
                </button>
              </div>
            )}

            {isPro && positions.length === 0 && (
              <div className="p-8 rounded-xl border border-zinc-700 bg-zinc-900/50 text-center">
                <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-zinc-400 mb-4">
                  지원 회사를 등록하면 맞춤 면접을 할 수 있어요
                </p>
                <button
                  onClick={() => router.push('/positions')}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
                >
                  지원 회사 등록하기
                </button>
              </div>
            )}

            {!isPro && (
              <div className="relative">
                <div className="p-8 rounded-xl border border-zinc-700 bg-zinc-900/30 text-center opacity-60">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/50">
                        <div className="h-4 w-24 bg-zinc-800 rounded mb-2" />
                        <div className="h-3 w-32 bg-zinc-800/60 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/60 rounded-xl">
                  <svg className="w-10 h-10 text-zinc-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <p className="text-zinc-300 font-medium mb-2">무료 베타 기간 중 이용 가능</p>
                  <p className="text-zinc-500 text-sm mb-4">지원 회사의 JD를 분석해 맞춤 면접을 제공합니다</p>
                  <button
                    onClick={() => router.push('/pricing')}
                    className="px-5 py-2 bg-amber-500 text-black rounded-lg text-sm font-semibold hover:bg-amber-400 transition-colors"
                  >
                    더 알아보기
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Section 3: Detailed Settings (Collapsible) */}
        {(!isFirstTimeUser || showFullOptions) && (
          <div className="mb-6">
            <button
              onClick={() => setShowDetailedSettings(!showDetailedSettings)}
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors text-sm font-medium"
            >
              <svg
                className={cn('w-4 h-4 transition-transform', showDetailedSettings && 'rotate-180')}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              직접 설정하기
            </button>
          </div>
        )}

        {(!isFirstTimeUser || showFullOptions) && showDetailedSettings && (
          <div className="space-y-8">
            {/* Target Position Selection */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">1. 지원 포지션 선택</h2>
                <button
                  onClick={() => setShowParsingModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  채용공고에서 가져오기
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedPositionId(null)}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-left',
                    selectedPositionId === null
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                  )}
                >
                  <div className="font-medium">포지션 없이 진행</div>
                  <div className="text-sm text-zinc-400">일반 기술 면접으로 진행합니다</div>
                </button>
                {positions.map((position) => (
                  <button
                    key={position.id}
                    onClick={() => setSelectedPositionId(position.id)}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all text-left relative',
                      selectedPositionId === position.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                    )}
                  >
                    <div className="font-medium">{position.company}</div>
                    <div className="text-sm text-zinc-400">{position.position}</div>
                    {newlyImportedPositionId === position.id && (
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600/20 text-emerald-400 text-xs font-medium rounded-full border border-emerald-600/30">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          새로 가져온 포지션
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Topic Selection */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">2. 면접 주제 선택</h2>
                {companyStyle && companyRecommendedTopics.length > 0 && (
                  <button
                    onClick={selectAllCompanyRecommended}
                    className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-600/30 transition-colors border border-emerald-600/30"
                  >
                    추천 토픽 자동 선택
                  </button>
                )}
              </div>
              {companyStyle && companyRecommendedTopics.length > 0 && (
                <div className="mb-4 p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-lg">
                  <p className="text-sm text-emerald-300">
                    <span className="font-semibold">
                      {displayedStyles.find(s => s.value === companyStyle)?.label}
                    </span>{' '}
                    면접에서 자주 출제되는 기술 스택입니다.
                  </p>
                </div>
              )}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="주제 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-6">
                {filteredTopics.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                      {group.category}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {group.topics.map((topic) => {
                        const isRecommended = recommendedTopics.includes(topic);
                        const isJdRecommended = autoRecommended.includes(topic);
                        const isCompanyRecommended = companyRecommendedTopics.some(
                          companyTech => topic.toLowerCase().includes(companyTech.toLowerCase()) ||
                                        companyTech.toLowerCase().includes(topic.toLowerCase())
                        );
                        const isSelected = selectedTopics.includes(topic);
                        const hasKnowledge = hasKnowledgeBase(topic);
                        return (
                          <button
                            key={topic}
                            onClick={() => toggleTopic(topic)}
                            className={cn(
                              'px-4 py-2 rounded-lg border transition-all text-sm relative',
                              isSelected
                                ? 'border-blue-500 bg-blue-500/20 text-blue-100'
                                : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                            )}
                          >
                            {isCompanyRecommended && (
                              <span className="absolute -top-1 -left-1 px-1.5 py-0.5 bg-emerald-600/90 text-white text-[9px] font-bold rounded-full shadow-sm">
                                ★
                              </span>
                            )}
                            {topic}
                            {isJdRecommended && (
                              <span className="ml-1 text-[10px] text-amber-400">JD</span>
                            )}
                            {hasKnowledge && (
                              <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[10px] font-semibold text-white bg-indigo-600 rounded-full">
                                AI
                              </span>
                            )}
                            {isRecommended && !isJdRecommended && !isCompanyRecommended && (
                              <span className="absolute top-1 left-1 w-2 h-2 bg-yellow-500 rounded-full"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <div className="text-sm text-zinc-400 flex items-center gap-2">
                  <span className="px-1 py-0.5 text-[10px] font-semibold text-white bg-indigo-600 rounded-full">AI</span>
                  표시가 있는 기술은 구조화된 지식 베이스를 활용하여 더 깊이 있는 면접을 제공합니다.
                </div>
                {companyRecommendedTopics.length > 0 && (
                  <div className="text-sm text-zinc-400 flex items-center gap-2">
                    <span className="text-emerald-400 text-xs font-bold">★</span>
                    회사 면접 추천 기술 스택
                  </div>
                )}
                {autoRecommended.length > 0 && (
                  <div className="text-sm text-zinc-400 flex items-center gap-2">
                    <span className="text-amber-400 text-[10px] font-semibold">JD</span>
                    JD 기반 추천 주제
                  </div>
                )}
                {recommendedTopics.length > 0 && (
                  <div className="text-sm text-zinc-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    프로필 기반 추천 주제
                  </div>
                )}
                <div className="text-sm text-zinc-400">
                  선택된 주제: {selectedTopics.length}개
                </div>
              </div>
            </section>

            {/* Difficulty Selection */}
            <section>
              <h2 className="text-xl font-semibold mb-4">3. 난이도 선택</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {DIFFICULTY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDifficulty(option.value)}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all text-left',
                      difficulty === option.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                    )}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-zinc-400">{option.description}</div>
                  </button>
                ))}
              </div>
              {profile && (
                <div className="mt-3 text-sm text-zinc-400">
                  추천: {profile.totalYearsExp}년차 경력 기준{' '}
                  {profile.totalYearsExp <= 3
                    ? '주니어'
                    : profile.totalYearsExp <= 7
                      ? '미들'
                      : '시니어'}
                </div>
              )}
            </section>

            {/* Company Style Selection */}
            <section>
              <h2 className="text-xl font-semibold mb-4">4. 면접 스타일 (선택)</h2>
              <p className="text-sm text-zinc-400 mb-4">
                특정 기업의 면접 스타일로 연습할 수 있습니다.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setCompanyStyle(null)}
                  className={cn(
                    'rounded-lg border-2 p-4 text-left transition-all',
                    companyStyle === null
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                  )}
                >
                  <div className="font-medium">기본</div>
                  <div className="text-sm text-zinc-400 mt-1">일반 기술 면접</div>
                </button>
                {displayedStyles.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setCompanyStyle(style.value)}
                    className={cn(
                      'rounded-lg border-2 p-4 text-left transition-all relative',
                      companyStyle === style.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600',
                      'pro' in style && style.pro && !isPro && 'opacity-50'
                    )}
                    disabled={'pro' in style && style.pro && !isPro}
                  >
                    {'pro' in style && style.pro && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/30">PRO</span>
                    )}
                    <div className="font-medium">{style.label}</div>
                    <div className="text-sm text-zinc-400 mt-1">{style.description}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Start Button */}
            <div className="pt-6">
              <button
                onClick={handleStart}
                disabled={selectedTopics.length === 0 || isCreating || !emailVerified}
                className={cn(
                  'w-full py-4 rounded-lg font-semibold text-lg transition-all',
                  selectedTopics.length === 0 || isCreating || !emailVerified
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                {!emailVerified ? '이메일 인증 후 이용 가능' : isCreating ? '면접 세션 생성 중...' : '면접 시작하기'}
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showExistingSessionModal}
        onClose={() => setShowExistingSessionModal(false)}
        title="진행 중인 면접이 있습니다"
      >
        <div className="space-y-4">
          {existingSessionInfo && (
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                <span className="font-medium">주제:</span> {existingSessionInfo.topics?.join(', ') || '정보 없음'}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-medium">질문 수:</span> {existingSessionInfo._count?.questions || 0}개
              </div>
            </div>
          )}
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            기존 면접을 이어서 진행하시겠습니까? 아니면 새로운 면접을 시작하시겠습니까?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleResumeExisting}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              이어하기
            </button>
            <button
              onClick={handleAbandonAndStart}
              className="flex-1 px-4 py-2.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            >
              새로 시작
            </button>
            <button
              onClick={() => {
                setShowExistingSessionModal(false);
                setTimeout(() => setShowEndSessionModal(true), 150);
              }}
              className="flex-1 px-4 py-2.5 bg-red-900/50 text-red-300 rounded-lg font-medium hover:bg-red-900/70 transition-colors"
            >
              면접 종료
            </button>
          </div>
        </div>
      </Modal>

      {resumeEditPrompt && (
        <Modal
          isOpen={true}
          onClose={resumeEditPrompt.onCancel}
          title="면접용 이력서를 선택해주세요"
        >
          <div className="space-y-4">
            <div className="p-4 bg-emerald-900/20 border border-emerald-800/30 rounded-lg">
              <p className="text-sm text-zinc-300">
                <span className="font-medium text-emerald-400">{resumeEditPrompt.positionName}</span>에 맞춰
                작성된 이력서(v{resumeEditPrompt.edit.version}, 점수: {resumeEditPrompt.edit.overallScore}/10)가 있습니다.
              </p>
            </div>
            <p className="text-sm text-zinc-400">
              맞춤 이력서를 사용하면 해당 포지션에 최적화된 면접이 진행됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={resumeEditPrompt.onApply}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                맞춤 이력서로 면접
              </button>
              <button
                onClick={resumeEditPrompt.onSkip}
                className="flex-1 px-4 py-2.5 bg-zinc-700 text-zinc-100 rounded-lg font-medium hover:bg-zinc-600 transition-colors"
              >
                기본 프로필로 면접
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Modal
        isOpen={showEndSessionModal}
        onClose={() => !isEndingSession && setShowEndSessionModal(false)}
        title="면접을 종료하시겠습니까?"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            진행 중인 면접을 종료합니다. 종료 방식을 선택해주세요.
          </p>
          {isEndingSession ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin mr-2" />
              <span className="text-sm text-zinc-400">처리 중...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleEndWithEvaluation}
                className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                평가 받고 종료
              </button>
              <button
                onClick={handleEndWithoutEvaluation}
                className="w-full px-4 py-2.5 bg-zinc-700 text-zinc-100 rounded-lg font-medium hover:bg-zinc-600 transition-colors"
              >
                그냥 종료
              </button>
            </div>
          )}
        </div>
      </Modal>

      <JobParsingModal
        isOpen={showParsingModal}
        onClose={() => setShowParsingModal(false)}
        onSave={handleParsingSave}
      />
    </div>
  );
}

export default function InterviewSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">{'로딩 중...'}</div>
      </div>
    }>
      <InterviewSetupPageContent />
    </Suspense>
  );
}
