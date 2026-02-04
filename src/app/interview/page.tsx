'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

interface Position {
  id: string;
  company: string;
  position: string;
  isActive: boolean;
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

const PRESET_TOPICS = [
  {
    category: 'Backend',
    topics: ['Java', 'Spring', 'Node.js', 'Python', 'Go'],
  },
  {
    category: 'Frontend',
    topics: ['JavaScript/TypeScript', 'React', 'Next.js', 'Vue', 'HTML/CSS'],
  },
  {
    category: 'Architecture',
    topics: ['디자인 패턴', '시스템 설계', 'MSA', 'DDD', '클린 아키텍처'],
  },
  {
    category: 'Database',
    topics: ['SQL/RDBMS', 'NoSQL', 'ORM', '인덱싱/최적화'],
  },
  {
    category: 'Infrastructure',
    topics: ['Docker/K8s', 'CI/CD', 'AWS/Cloud', '모니터링'],
  },
  {
    category: 'CS Fundamentals',
    topics: ['운영체제', '네트워크', '자료구조/알고리즘'],
  },
  {
    category: 'Behavioral',
    topics: ['자기소개', '프로젝트 경험', '협업/갈등', '리더십', '커리어 비전'],
  },
];

const DIFFICULTY_OPTIONS = [
  { value: 'junior', label: '주니어', description: '1-3년차, 기본 개념 중심' },
  { value: 'mid', label: '미들', description: '4-7년차, 심화 개념 및 설계' },
  { value: 'senior', label: '시니어', description: '8년차 이상, 아키텍처 및 리더십' },
];

const EVALUATION_MODES = [
  { value: 'immediate', label: '즉시 평가', description: '각 답변마다 실시간 피드백' },
  {
    value: 'after_complete',
    label: '종료 후 평가',
    description: '면접 종료 후 일괄 평가',
  },
];

export default function InterviewSetupPage() {
  const router = useRouter();
  const [positions, setPositions] = useState<Position[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string>('mid');
  const [evaluationMode, setEvaluationMode] = useState<string>('immediate');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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

        // Set recommended difficulty based on experience
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

  function getRecommendedTopics(): string[] {
    if (!profile) return [];
    const skillNames = profile.skills.map((s) => s.name.toLowerCase());
    const recommended: string[] = [];

    PRESET_TOPICS.forEach((group) => {
      group.topics.forEach((topic) => {
        if (skillNames.some((skill) => topic.toLowerCase().includes(skill))) {
          recommended.push(topic);
        }
      });
    });

    return recommended;
  }

  const recommendedTopics = getRecommendedTopics();

  const filteredTopics = PRESET_TOPICS.map((group) => ({
    ...group,
    topics: group.topics.filter((topic) =>
      topic.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((group) => group.topics.length > 0);

  async function handleStart() {
    if (selectedTopics.length === 0) {
      alert('최소 1개 이상의 주제를 선택해주세요.');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPositionId: selectedPositionId || undefined,
          topics: selectedTopics,
          difficulty,
          evaluationMode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '세션 생성 실패');
      }

      const { session } = await response.json();
      router.push(`/interview/${session.id}`);
    } catch (error: any) {
      console.error('Failed to create session:', error);
      alert(error.message || '면접 세션 생성에 실패했습니다.');
      setIsCreating(false);
    }
  }

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
          <h1 className="text-3xl font-bold mb-2">모의 면접 설정</h1>
          <p className="text-zinc-400">면접 세션을 시작하기 위한 설정을 진행합니다.</p>
        </div>

        <div className="space-y-8">
          {/* Target Position Selection */}
          <section>
            <h2 className="text-xl font-semibold mb-4">1. 지원 포지션 선택 (선택사항)</h2>
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
                    'p-4 rounded-lg border-2 transition-all text-left',
                    selectedPositionId === position.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                  )}
                >
                  <div className="font-medium">{position.company}</div>
                  <div className="text-sm text-zinc-400">{position.position}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Topic Selection */}
          <section>
            <h2 className="text-xl font-semibold mb-4">2. 면접 주제 선택</h2>
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
                      const isSelected = selectedTopics.includes(topic);
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
                          {topic}
                          {isRecommended && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {recommendedTopics.length > 0 && (
              <div className="mt-4 text-sm text-zinc-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                프로필 기반 추천 주제
              </div>
            )}
            <div className="mt-4 text-sm text-zinc-400">
              선택된 주제: {selectedTopics.length}개
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

          {/* Evaluation Mode Selection */}
          <section>
            <h2 className="text-xl font-semibold mb-4">4. 평가 방식 선택</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EVALUATION_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setEvaluationMode(mode.value)}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-left',
                    evaluationMode === mode.value
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                  )}
                >
                  <div className="font-medium">{mode.label}</div>
                  <div className="text-sm text-zinc-400">{mode.description}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Start Button */}
          <div className="pt-6">
            <button
              onClick={handleStart}
              disabled={selectedTopics.length === 0 || isCreating}
              className={cn(
                'w-full py-4 rounded-lg font-semibold text-lg transition-all',
                selectedTopics.length === 0 || isCreating
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              )}
            >
              {isCreating ? '면접 세션 생성 중...' : '면접 시작하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
