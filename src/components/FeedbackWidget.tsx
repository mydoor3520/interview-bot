'use client';

import { useState } from 'react';

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('general');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          content,
          rating,
          page: window.location.pathname,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setIsOpen(false);
          setSubmitted(false);
          setContent('');
          setRating(null);
          setCategory('general');
        }, 2000);
      }
    } catch {
      // Silently fail
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        aria-label="피드백 보내기"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Feedback panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5">
          {submitted ? (
            <div className="text-center py-4">
              <div className="text-green-400 text-lg font-medium">감사합니다!</div>
              <p className="text-zinc-400 text-sm mt-1">소중한 피드백을 보내주셨습니다.</p>
            </div>
          ) : (
            <>
              <h3 className="text-white font-semibold mb-3">피드백 보내기</h3>

              {/* Category */}
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full mb-3 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">일반 의견</option>
                <option value="bug">버그 신고</option>
                <option value="feature">기능 제안</option>
                <option value="ux">UX 개선</option>
                <option value="performance">성능 이슈</option>
              </select>

              {/* Rating */}
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setRating(rating === n ? null : n)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      rating === n
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <span className="text-xs text-zinc-500 self-center ml-2">만족도</span>
              </div>

              {/* Content */}
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="의견을 입력해주세요..."
                rows={3}
                className="w-full mb-3 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Submit */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  닫기
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!content.trim() || submitting}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? '전송 중...' : '보내기'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
