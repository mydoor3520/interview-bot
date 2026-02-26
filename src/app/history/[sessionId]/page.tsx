'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/components/Toast';
import { stripMarkdown } from '@/lib/utils/strip-markdown';

interface Evaluation {
  score: number;
  feedback: string;
  modelAnswer: string;
  strengths: string[];
  weaknesses: string[];
}

interface FollowUp {
  content: string;
  userAnswer: string | null;
  aiFeedback: string | null;
}

interface Question {
  id: string;
  content: string;
  category: string;
  difficulty: string;
  status: string;
  userAnswer: string | null;
  evaluation: Evaluation | null;
  followUps: FollowUp[];
}

interface Session {
  id: string;
  topics: string[];
  difficulty: string;
  interviewType: string | null;
  status: string;
  totalScore: number | null;
  summary: string | null;
  startedAt: string;
  completedAt: string | null;
  questions: Question[];
  targetPosition?: { company: string; position: string } | null;
  companyStyle?: string | null;
  techKnowledgeEnabled?: boolean;
}

const DIFFICULTIES = {
  junior: '주니어',
  mid: '미드',
  senior: '시니어',
};

const INTERVIEW_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  technical: { label: '기술', className: 'bg-blue-500/20 text-blue-400' },
  behavioral: { label: '인성', className: 'bg-purple-500/20 text-purple-400' },
  mixed: { label: '통합', className: 'bg-green-500/20 text-green-400' },
};

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/history?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
        } else {
          toast('세션을 찾을 수 없습니다.', 'error');
          router.push('/history');
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, router, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">로딩 중...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/history')}
            className="mb-4 text-zinc-400 hover:text-white transition-colors"
          >
            ← 목록으로 돌아가기
          </button>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white mb-2">
                  {new Date(session.startedAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </h1>

                {session.targetPosition && (
                  <p className="text-zinc-400 mb-3">
                    {session.targetPosition.company} - {session.targetPosition.position}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {session.interviewType && INTERVIEW_TYPE_BADGE[session.interviewType] && (
                    <span className={cn('px-3 py-1 rounded text-sm font-medium', INTERVIEW_TYPE_BADGE[session.interviewType].className)}>
                      {INTERVIEW_TYPE_BADGE[session.interviewType].label}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-zinc-800 rounded text-sm font-medium text-zinc-300">
                    {DIFFICULTIES[session.difficulty as keyof typeof DIFFICULTIES]}
                  </span>
                  {session.topics.map((topic, i) => (
                    <span key={i} className="px-3 py-1 bg-zinc-800 rounded text-sm text-zinc-300">
                      {topic}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <span className="text-zinc-400">
                    총 질문: <span className="text-white font-medium">{session.questions.length}개</span>
                  </span>
                  {session.totalScore !== null && (
                    <span className="text-zinc-400">
                      평균 점수:{' '}
                      <span className={cn('font-bold text-lg', getScoreColor(session.totalScore))}>
                        {session.totalScore.toFixed(1)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {session.summary && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-400 mb-2">세션 요약</h3>
                <p className="text-white">{session.summary}</p>
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {session.questions.map((question, index) => (
            <div key={question.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              {/* Question Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-zinc-500 font-mono text-sm">Q{index + 1}</span>
                    <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">
                      {question.category}
                    </span>
                    <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">
                      {question.difficulty}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-4">{stripMarkdown(question.content)}</h3>
                </div>

                {question.evaluation && (
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-zinc-500 mb-1">점수</span>
                    <span className={cn('text-3xl font-bold', getScoreColor(question.evaluation.score))}>
                      {question.evaluation.score}
                    </span>
                  </div>
                )}
              </div>

              {/* User Answer */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-2">내 답변</h4>
                <div className="bg-zinc-800 rounded-lg p-4">
                  {question.status === 'skipped' ? (
                    <p className="text-zinc-500 italic">스킵됨</p>
                  ) : question.userAnswer ? (
                    <p className="text-white whitespace-pre-wrap">{question.userAnswer}</p>
                  ) : (
                    <p className="text-zinc-500 italic">답변 없음</p>
                  )}
                </div>
              </div>

              {/* Evaluation */}
              {question.evaluation && (
                <div className="space-y-4">
                  {/* Feedback */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">피드백</h4>
                    <div className="bg-zinc-800 rounded-lg p-4">
                      <p className="text-white whitespace-pre-wrap">{stripMarkdown(question.evaluation.feedback)}</p>
                    </div>
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {question.evaluation.strengths.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-400 mb-2">강점</h4>
                        <ul className="space-y-2">
                          {question.evaluation.strengths.map((strength, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                              <span className="text-green-400 mt-0.5">✓</span>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {question.evaluation.weaknesses.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-red-400 mb-2">약점</h4>
                        <ul className="space-y-2">
                          {question.evaluation.weaknesses.map((weakness, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                              <span className="text-red-400 mt-0.5">✗</span>
                              <span>{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Model Answer */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">모범 답안</h4>
                    <div className="bg-zinc-800 rounded-lg p-4">
                      <p className="text-zinc-300 whitespace-pre-wrap">{stripMarkdown(question.evaluation.modelAnswer)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Follow-up Questions */}
              {question.followUps.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <h4 className="text-sm font-medium text-zinc-400 mb-3">꼬리 질문</h4>
                  <div className="space-y-3">
                    {question.followUps.map((followUp, i) => (
                      <div key={i} className="bg-zinc-800 rounded-lg p-4">
                        <p className="text-white mb-2">{stripMarkdown(followUp.content)}</p>
                        {followUp.userAnswer && (
                          <div className="mt-2 pl-4 border-l-2 border-zinc-700">
                            <p className="text-sm text-zinc-400 mb-1">답변:</p>
                            <p className="text-sm text-zinc-300">{followUp.userAnswer}</p>
                          </div>
                        )}
                        {followUp.aiFeedback && (
                          <div className="mt-2 pl-4 border-l-2 border-zinc-700">
                            <p className="text-sm text-zinc-400 mb-1">피드백:</p>
                            <p className="text-sm text-zinc-300">{stripMarkdown(followUp.aiFeedback)}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
