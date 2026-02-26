'use client';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { getCompanyStyle } from '@/lib/interview-knowledge/company-styles';
import { hasKnowledgeBase } from '@/lib/interview-knowledge';
import { ShareableCard } from './ShareableCard';

interface SessionSummaryProps {
  totalScore: number | null;
  summary: string;
  topicScores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  questionCount: number;
  companyStyle?: string | null;
  techKnowledgeEnabled?: boolean;
  topics?: string[];
  sessionId: string;
}

export function SessionSummary({
  totalScore,
  summary,
  topicScores,
  strengths,
  weaknesses,
  recommendations,
  questionCount,
  companyStyle,
  techKnowledgeEnabled,
  topics = [],
  sessionId,
}: SessionSummaryProps) {
  const router = useRouter();

  // Get company style info if available
  const companyStyleInfo = companyStyle ? getCompanyStyle(companyStyle) : null;

  // Get active knowledge bases
  const activeKnowledgeBases = techKnowledgeEnabled
    ? topics.filter((topic) => hasKnowledgeBase(topic))
    : [];

  const getScoreColor = (score: number) => {
    if (score <= 3) return 'text-red-600 dark:text-red-400';
    if (score <= 6) return 'text-amber-600 dark:text-amber-400';
    if (score <= 8) return 'text-blue-600 dark:text-blue-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score <= 3) return 'bg-red-50 dark:bg-red-950/30';
    if (score <= 6) return 'bg-amber-50 dark:bg-amber-950/30';
    if (score <= 8) return 'bg-blue-50 dark:bg-blue-950/30';
    return 'bg-green-50 dark:bg-green-950/30';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">면접 완료</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8">총 {questionCount}개의 질문에 답변하셨습니다.</p>

        {totalScore !== null && totalScore !== undefined ? (
          <div className={cn('rounded-lg p-6 mb-8', getScoreBgColor(totalScore))}>
            <div className="text-center">
              <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">종합 점수</div>
              <div className={cn('text-6xl font-bold mb-2', getScoreColor(totalScore))}>
                {totalScore.toFixed(1)}/10
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{summary}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg p-6 mb-8 bg-zinc-100 dark:bg-zinc-800">
            <div className="text-center">
              <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">종합 점수</div>
              <div className="text-4xl font-bold mb-2 text-zinc-400 dark:text-zinc-500">
                평가 없음
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{summary}</p>
            </div>
          </div>
        )}

        {(companyStyleInfo || activeKnowledgeBases.length > 0) && (
          <div className="mb-8 space-y-3">
            {companyStyleInfo && (
              <div className="bg-zinc-800 dark:bg-zinc-900 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-400 dark:text-zinc-500">회사 스타일:</span>
                  <span className="px-3 py-1 bg-emerald-900/30 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-medium">
                    {companyStyleInfo.displayName} 스타일 면접
                  </span>
                </div>
              </div>
            )}

            {activeKnowledgeBases.length > 0 && (
              <div className="bg-zinc-800 dark:bg-zinc-900 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-zinc-400 dark:text-zinc-500">활성화된 지식 베이스:</span>
                  {activeKnowledgeBases.map((topic) => (
                    <span
                      key={topic}
                      className="px-2.5 py-1 bg-indigo-900/30 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded text-xs font-medium"
                    >
                      {topic} AI
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {Object.keys(topicScores).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">주제별 점수</h2>
            <div className="space-y-3">
              {Object.entries(topicScores).map(([topic, score]) => (
                <div key={topic} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{topic}</span>
                      <span className={cn('text-sm font-bold', getScoreColor(score))}>{score.toFixed(1)}</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full transition-all', getScoreBgColor(score))}
                        style={{ width: `${(score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {strengths.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">강점</h2>
            <ul className="space-y-2">
              {strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {weaknesses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">개선점</h2>
            <ul className="space-y-2">
              {weaknesses.map((weakness, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 mt-0.5">✗</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">추천 사항</h2>
            <ul className="space-y-2">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">→</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ShareableCard
          totalScore={totalScore}
          questionCount={questionCount}
          topics={topics}
          sessionId={sessionId}
        />

        <div className="flex gap-4 justify-center pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => router.push('/history')}
            className="px-6 py-3 rounded-lg font-medium text-sm bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            히스토리로 돌아가기
          </button>
          <button
            onClick={() => router.push('/interview')}
            className="px-6 py-3 rounded-lg font-medium text-sm bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            새 면접 시작
          </button>
        </div>
      </div>
    </div>
  );
}
