import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { cn } from '@/lib/utils/cn';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SharePage({ params }: PageProps) {
  const { sessionId } = await params;

  const session = await (prisma.interviewSession.findUnique as Function)({
    where: { id: sessionId },
    select: {
      totalScore: true,
      topics: true,
      questionCount: true,
      questions: {
        select: {
          category: true,
          evaluation: {
            select: {
              score: true,
            },
          },
        },
      },
    },
  }) as { totalScore: number | null; topics: string[]; questionCount: number; questions: Array<{ category: string; evaluation: { score: number } | null }> } | null;

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 rounded-xl p-8 border border-zinc-800 text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">공유 링크를 찾을 수 없습니다</h1>
          <p className="text-zinc-400 mb-6">세션이 삭제되었거나 존재하지 않습니다.</p>
          <Link
            href="/signup"
            className="inline-block px-6 py-3 rounded-lg font-medium text-sm bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            InterviewBot 시작하기
          </Link>
        </div>
      </div>
    );
  }

  // Calculate topic scores from questions
  const topicScoresMap: Record<string, { total: number; count: number }> = {};
  for (const question of session.questions) {
    if (question.evaluation) {
      const topic = question.category;
      if (!topicScoresMap[topic]) {
        topicScoresMap[topic] = { total: 0, count: 0 };
      }
      topicScoresMap[topic].total += question.evaluation.score;
      topicScoresMap[topic].count += 1;
    }
  }

  const topicScores: Record<string, number> = {};
  for (const [topic, { total, count }] of Object.entries(topicScoresMap)) {
    topicScores[topic] = total / count;
  }

  const getScoreColor = (score: number) => {
    if (score <= 3) return 'text-red-400';
    if (score <= 6) return 'text-amber-400';
    if (score <= 8) return 'text-blue-400';
    return 'text-green-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score <= 3) return 'from-red-500/20 to-red-600/10';
    if (score <= 6) return 'from-amber-500/20 to-amber-600/10';
    if (score <= 8) return 'from-blue-500/20 to-blue-600/10';
    return 'from-green-500/20 to-green-600/10';
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl p-8 border border-zinc-700 shadow-2xl mb-6">
          {/* Logo/Branding */}
          <div className="text-center mb-8">
            <div className="inline-block bg-zinc-800 rounded-full px-4 py-2 mb-4">
              <span className="text-zinc-100 font-bold text-lg">InterviewBot</span>
            </div>
            <p className="text-zinc-400 text-sm">AI 모의 면접 연습 플랫폼</p>
          </div>

          {/* Score Display */}
          <div className="text-center mb-8">
            {session.totalScore !== null && session.totalScore !== undefined ? (
              <>
                <div className={cn(
                  'inline-block bg-gradient-to-br rounded-2xl p-8 mb-4',
                  getScoreBgColor(session.totalScore)
                )}>
                  <div className={cn('text-7xl font-bold', getScoreColor(session.totalScore))}>
                    {session.totalScore.toFixed(1)}
                  </div>
                  <div className="text-zinc-400 text-lg mt-2">/ 10</div>
                </div>
                <div className="text-zinc-300 text-lg font-medium mb-2">
                  면접 점수
                </div>
              </>
            ) : (
              <div className="inline-block bg-zinc-800 rounded-2xl p-8 mb-4">
                <div className="text-5xl font-bold text-zinc-500">-</div>
                <div className="text-zinc-400 text-sm mt-2">평가 없음</div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-zinc-100 mb-1">{session.questionCount}</div>
              <div className="text-sm text-zinc-400">답변한 질문</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-zinc-100 mb-1">{session.topics.length}</div>
              <div className="text-sm text-zinc-400">연습한 주제</div>
            </div>
          </div>

          {/* Topics */}
          {session.topics.length > 0 && (
            <div className="mb-6">
              <div className="text-sm text-zinc-400 mb-3 text-center">연습한 주제</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {session.topics.map((topic) => (
                  <span
                    key={topic}
                    className="px-4 py-2 bg-zinc-700 text-zinc-200 rounded-full text-sm font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Topic Scores */}
          {Object.keys(topicScores).length > 0 && (
            <div className="border-t border-zinc-700 pt-6">
              <div className="text-sm text-zinc-400 mb-4 text-center">주제별 점수</div>
              <div className="space-y-3">
                {Object.entries(topicScores).map(([topic, score]) => (
                  <div key={topic} className="flex items-center gap-3">
                    <span className="text-sm text-zinc-300 min-w-[80px]">{topic}</span>
                    <div className="flex-1 bg-zinc-700 rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full', `bg-gradient-to-r ${getScoreBgColor(score)}`)}
                        style={{ width: `${(score / 10) * 100}%` }}
                      />
                    </div>
                    <span className={cn('text-sm font-bold min-w-[40px] text-right', getScoreColor(score))}>
                      {score.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA Card */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 text-center">
          <h2 className="text-xl font-bold text-zinc-100 mb-2">나도 면접 연습하기</h2>
          <p className="text-zinc-400 mb-6 text-sm">
            AI와 함께 실전같은 면접을 준비하세요
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/signup"
              className="px-6 py-3 rounded-lg font-medium text-sm bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors"
            >
              무료로 시작하기
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded-lg font-medium text-sm bg-zinc-800 text-zinc-100 hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
