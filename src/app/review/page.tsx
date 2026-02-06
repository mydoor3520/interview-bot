'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

interface Evaluation {
  score: number;
  feedback: string;
}

interface WeakQuestion {
  id: string;
  content: string;
  category: string;
  userAnswer: string | null;
  evaluation: Evaluation;
  session: {
    difficulty: string;
    startedAt: string;
  };
}

export default function ReviewPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<WeakQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const fetchWeakQuestions = async () => {
      try {
        const res = await fetch('/api/stats?weakQuestions=true');
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.weakQuestions);
        }
      } catch (error) {
        console.error('Failed to fetch weak questions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeakQuestions();
  }, []);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map((q) => q.id)));
    }
  };

  const handleStartReview = async () => {
    if (selectedIds.size === 0) {
      alert('복습할 질문을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      // Get selected questions
      const selectedQuestions = questions.filter((q) => selectedIds.has(q.id));

      // Get unique topics from selected questions
      const topics = [...new Set(selectedQuestions.map((q) => q.category))];

      // Get difficulty from first selected question (or use default)
      const difficulty = selectedQuestions[0]?.session?.difficulty || 'mid';

      // Create new interview session with review mode
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: topics.length > 0 ? topics : ['General'],
          difficulty,
          evaluationMode: 'immediate',
        }),
      });

      if (!res.ok) throw new Error('세션 생성 실패');

      const data = await res.json();
      router.push(`/interview/${data.session.id}`);
    } catch (err) {
      console.error('Failed to start review session:', err);
      alert('복습 세션을 시작하지 못했습니다.');
      setLoading(false);
    }
  };

  // Filter by category
  const filteredQuestions = selectedCategory
    ? questions.filter((q) => q.category === selectedCategory)
    : questions;

  // Group by category
  const groupedQuestions = filteredQuestions.reduce((acc, question) => {
    if (!acc[question.category]) acc[question.category] = [];
    acc[question.category].push(question);
    return acc;
  }, {} as Record<string, WeakQuestion[]>);

  const categories = Array.from(new Set(questions.map((q) => q.category))).sort();

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">로딩 중...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">복습</h1>
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg mb-6">복습이 필요한 질문이 없습니다.</p>
            <p className="text-zinc-500 text-sm mb-6">점수가 6점 이하인 질문이 여기에 표시됩니다.</p>
            <button
              onClick={() => router.push('/interview')}
              className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              면접 시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">복습</h1>
            <p className="text-zinc-400">점수가 낮았던 질문들을 다시 연습해보세요.</p>
          </div>
          <button
            onClick={handleStartReview}
            disabled={selectedIds.size === 0}
            className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            선택한 문제로 복습 시작 ({selectedIds.size})
          </button>
        </div>

        {/* Controls */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSelectAll}
                className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm hover:bg-zinc-700 transition-colors"
              >
                {selectedIds.size === filteredQuestions.length ? '전체 해제' : '전체 선택'}
              </button>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white"
              >
                <option value="">전체 카테고리</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-sm text-zinc-400">
              총 {filteredQuestions.length}개 질문
            </div>
          </div>
        </div>

        {/* Questions by Category */}
        <div className="space-y-8">
          {Object.entries(groupedQuestions).map(([category, categoryQuestions]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold text-white mb-4">{category}</h2>
              <div className="space-y-4">
                {categoryQuestions.map((question) => (
                  <div
                    key={question.id}
                    className={cn(
                      'bg-zinc-900 border rounded-lg p-6 transition-colors cursor-pointer',
                      selectedIds.has(question.id) ? 'border-white' : 'border-zinc-800 hover:border-zinc-700'
                    )}
                    onClick={() => toggleSelect(question.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                            selectedIds.has(question.id)
                              ? 'bg-white border-white'
                              : 'border-zinc-700'
                          )}
                        >
                          {selectedIds.has(question.id) && (
                            <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-white font-medium flex-1 mr-4">{question.content}</h3>
                          <div className="flex items-center gap-2">
                            <span className={cn('text-2xl font-bold', getScoreColor(question.evaluation.score))}>
                              {question.evaluation.score}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-zinc-400 mb-3">
                          <span>
                            {new Date(question.session.startedAt).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="px-2 py-1 bg-zinc-800 rounded text-xs">
                            {question.session.difficulty}
                          </span>
                        </div>

                        {/* Previous Answer */}
                        {question.userAnswer && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-zinc-500 mb-1">이전 답변:</p>
                            <div className="bg-zinc-800 rounded p-3">
                              <p className="text-sm text-zinc-300 line-clamp-3">{question.userAnswer}</p>
                            </div>
                          </div>
                        )}

                        {/* Feedback */}
                        <div>
                          <p className="text-xs font-medium text-zinc-500 mb-1">피드백:</p>
                          <div className="bg-zinc-800 rounded p-3">
                            <p className="text-sm text-zinc-300 line-clamp-2">{question.evaluation.feedback}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Action */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleStartReview}
            disabled={selectedIds.size === 0}
            className="px-8 py-4 bg-white text-black rounded-lg font-medium text-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            선택한 {selectedIds.size}개 문제로 복습 시작
          </button>
        </div>
      </div>
    </div>
  );
}
