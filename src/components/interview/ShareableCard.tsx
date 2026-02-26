'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/components/Toast';

interface ShareableCardProps {
  totalScore: number | null;
  questionCount: number;
  topics: string[];
  sessionId: string;
}

export function ShareableCard({
  totalScore,
  questionCount,
  topics,
  sessionId,
}: ShareableCardProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

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

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${sessionId}`;
  const shareText = `AI 모의 면접에서 ${totalScore?.toFixed(1) || '?'}점을 받았어요! #InterviewBot #면접준비`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast('복사되었습니다!', 'success');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast('복사에 실패했습니다.', 'error');
    }
  };

  const handleShare = (platform: 'kakao' | 'twitter' | 'linkedin') => {
    setIsSharing(true);

    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    let url = '';
    switch (platform) {
      case 'kakao':
        url = `https://story.kakao.com/share?url=${encodedUrl}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
    }

    window.open(url, '_blank', 'width=600,height=400');
    setTimeout(() => setIsSharing(false), 1000);
  };

  return (
    <div className="mb-8">
      <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl p-6 border border-zinc-700 shadow-xl">
        {/* Score Display */}
        <div className="text-center mb-6">
          {totalScore !== null && totalScore !== undefined ? (
            <>
              <div className={cn(
                'inline-block bg-gradient-to-br rounded-2xl p-8 mb-4',
                getScoreBgColor(totalScore)
              )}>
                <div className={cn('text-6xl font-bold', getScoreColor(totalScore))}>
                  {totalScore.toFixed(1)}
                </div>
                <div className="text-zinc-400 text-sm mt-2">/ 10</div>
              </div>
            </>
          ) : (
            <div className="inline-block bg-zinc-800 rounded-2xl p-8 mb-4">
              <div className="text-4xl font-bold text-zinc-500">-</div>
              <div className="text-zinc-400 text-sm mt-2">평가 없음</div>
            </div>
          )}

          {/* Branding */}
          <div className="mb-4">
            <div className="text-xl font-bold text-zinc-100 mb-1">InterviewBot으로 면접 연습 중!</div>
            <div className="text-sm text-zinc-400">총 {questionCount}개의 질문에 답변했습니다</div>
          </div>

          {/* Topic Tags */}
          {topics.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {topics.map((topic) => (
                <span
                  key={topic}
                  className="px-3 py-1 bg-zinc-700 text-zinc-300 rounded-full text-xs font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Share Buttons */}
        <div className="border-t border-zinc-700 pt-4">
          <div className="text-center text-sm text-zinc-400 mb-3">결과 공유하기</div>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-zinc-300 font-medium">링크 복사</span>
            </button>

            <button
              onClick={() => handleShare('kakao')}
              disabled={isSharing}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-yellow-600 hover:bg-yellow-500 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5 text-yellow-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3C6.5 3 2 6.58 2 11c0 2.84 1.74 5.34 4.43 6.88-.18.63-.63 2.15-.73 2.48-.12.42.15.42.31.3.13-.08 1.95-1.3 2.63-1.76.74.11 1.5.17 2.36.17 5.5 0 10-3.58 10-8S17.5 3 12 3z"/>
              </svg>
              <span className="text-xs text-yellow-900 font-medium">카카오톡</span>
            </button>

            <button
              onClick={() => handleShare('twitter')}
              disabled={isSharing}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700 disabled:opacity-50"
            >
              <svg className="w-5 h-5 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span className="text-xs text-zinc-300 font-medium">X</span>
            </button>

            <button
              onClick={() => handleShare('linkedin')}
              disabled={isSharing}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span className="text-xs text-white font-medium">LinkedIn</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
