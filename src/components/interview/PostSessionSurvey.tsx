'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';

interface PostSessionSurveyProps {
  sessionId: string;
  questions: Array<{ id: string; content: string }>;
  onComplete: () => void;
}

export function PostSessionSurvey({ sessionId, questions, onComplete }: PostSessionSurveyProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState<number | null>(null);
  const [helpfulQuestionId, setHelpfulQuestionId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/interview', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          userRating: rating,
          mostHelpfulQuestionId: helpfulQuestionId || undefined,
        }),
      });

      if (!res.ok) throw new Error('설문 제출 실패');

      toast('소중한 의견 감사합니다!', 'success');
      onComplete();
    } catch (err) {
      console.error('Survey submission failed:', err);
      toast('설문 제출에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const truncate = (str: string, maxLen: number) => {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '...';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-zinc-100 mb-6">면접 연습은 어떠셨나요?</h2>

        {/* Question 1: Rating */}
        <div className="mb-6">
          <p className="text-sm font-medium text-zinc-300 mb-3">이 면접 연습이 도움이 되었나요?</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="text-3xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label={`${star}점`}
              >
                {rating && star <= rating ? (
                  <span className="text-yellow-500">★</span>
                ) : (
                  <span className="text-zinc-600">☆</span>
                )}
              </button>
            ))}
          </div>
          {rating && (
            <p className="text-xs text-zinc-500 mt-2">{rating}점 선택됨</p>
          )}
        </div>

        {/* Question 2: Most Helpful Question */}
        {questions.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-zinc-300 mb-3">가장 도움이 된 질문은?</p>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-zinc-800 rounded-lg p-3 bg-zinc-950">
              {questions.map((q) => (
                <label
                  key={q.id}
                  className="flex items-start gap-3 p-2 rounded hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="helpfulQuestion"
                    value={q.id}
                    checked={helpfulQuestionId === q.id}
                    onChange={(e) => setHelpfulQuestionId(e.target.value)}
                    className="mt-1 accent-blue-500"
                  />
                  <span className="text-sm text-zinc-400 flex-1">{truncate(q.content, 80)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onComplete}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-300 transition-colors disabled:opacity-50"
          >
            건너뛰기
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!rating || isSubmitting}
            className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '제출 중...' : '제출하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
