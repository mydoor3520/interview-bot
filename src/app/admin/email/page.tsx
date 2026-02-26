'use client';

import { useState, useEffect } from 'react';

interface SendHistory {
  id: string;
  createdAt: string;
  details: {
    target: string;
    subject: string;
    recipientCount: number;
    sent: number;
    failed: number;
  };
}

export default function EmailPage() {
  const [target, setTarget] = useState<'all' | 'FREE' | 'PRO' | 'specific'>('all');
  const [specificEmails, setSpecificEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [error, setError] = useState('');
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
    errors?: string[];
  } | null>(null);
  const [history, setHistory] = useState<SendHistory[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/admin/email');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const handlePreview = async () => {
    setError('');
    setSendResult(null);

    if (!subject || !bodyText) {
      setError('제목과 내용을 입력해주세요.');
      return;
    }

    if (target === 'specific' && !specificEmails.trim()) {
      setError('수신자 이메일을 입력해주세요.');
      return;
    }

    setIsPreviewing(true);

    try {
      let emailList: string[] = [];
      if (target === 'specific') {
        emailList = specificEmails
          .split(',')
          .map(e => e.trim())
          .filter(e => e);

        if (emailList.length === 0) {
          setError('유효한 이메일 주소를 입력해주세요.');
          setIsPreviewing(false);
          return;
        }

        if (emailList.length > 1000) {
          setError('최대 1000명까지 발송 가능합니다.');
          setIsPreviewing(false);
          return;
        }

        setRecipientCount(emailList.length);
      } else {
        const res = await fetch('/api/admin/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, subject, bodyText, confirmed: false }),
        });

        const data = await res.json();

        if (res.ok && data.requiresConfirmation) {
          setRecipientCount(data.recipientCount);
        } else {
          setError(data.error || '미리보기 실패');
          setIsPreviewing(false);
          return;
        }
      }
    } catch (error) {
      console.error('Preview error:', error);
      setError('미리보기 중 오류가 발생했습니다.');
      setIsPreviewing(false);
    }
  };

  const handleSend = async () => {
    if (!recipientCount) {
      setError('먼저 미리보기를 확인해주세요.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      let emailList: string[] = [];
      if (target === 'specific') {
        emailList = specificEmails
          .split(',')
          .map(e => e.trim())
          .filter(e => e);
      }

      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          specificEmails: target === 'specific' ? emailList : undefined,
          subject,
          bodyText,
          confirmed: true,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSendResult({ sent: data.sent, failed: data.failed, errors: data.errors });

        // Reset form
        setTarget('all');
        setSpecificEmails('');
        setSubject('');
        setBodyText('');
        setRecipientCount(null);
        setIsPreviewing(false);

        // Refresh history
        fetchHistory();
      } else {
        setError(data.error || '이메일 발송 실패');
      }
    } catch (error) {
      console.error('Send error:', error);
      setError('이메일 발송 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">이메일 발송</h1>
        <p className="text-zinc-400 text-sm mt-1">
          사용자에게 공지 또는 마케팅 이메일을 발송합니다.
        </p>
      </div>

      {/* Send Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            수신 대상
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-zinc-300">
              <input
                type="radio"
                name="target"
                value="all"
                checked={target === 'all'}
                onChange={(e) => setTarget(e.target.value as typeof target)}
                className="text-indigo-600"
              />
              <span>전체 사용자 (이메일 수신 동의자)</span>
            </label>
            <label className="flex items-center space-x-2 text-zinc-300">
              <input
                type="radio"
                name="target"
                value="FREE"
                checked={target === 'FREE'}
                onChange={(e) => setTarget(e.target.value as typeof target)}
                className="text-indigo-600"
              />
              <span>무료 사용자만</span>
            </label>
            <label className="flex items-center space-x-2 text-zinc-300">
              <input
                type="radio"
                name="target"
                value="PRO"
                checked={target === 'PRO'}
                onChange={(e) => setTarget(e.target.value as typeof target)}
                className="text-indigo-600"
              />
              <span>PRO 구독자만</span>
            </label>
            <label className="flex items-center space-x-2 text-zinc-300">
              <input
                type="radio"
                name="target"
                value="specific"
                checked={target === 'specific'}
                onChange={(e) => setTarget(e.target.value as typeof target)}
                className="text-indigo-600"
              />
              <span>특정 사용자</span>
            </label>
          </div>
        </div>

        {target === 'specific' && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              이메일 주소 (쉼표로 구분, 최대 1000명)
            </label>
            <textarea
              value={specificEmails}
              onChange={(e) => setSpecificEmails(e.target.value)}
              placeholder="user1@example.com, user2@example.com, ..."
              rows={4}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            제목
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="이메일 제목"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            내용 (HTML은 지원되지 않습니다)
          </label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="이메일 내용을 입력하세요..."
            rows={10}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-950 border border-red-800 rounded">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Preview Result */}
        {isPreviewing && recipientCount !== null && !error && (
          <div className="p-4 bg-indigo-950 border border-indigo-800 rounded">
            <p className="text-indigo-200">
              <strong>{recipientCount}명</strong>에게 이메일이 발송됩니다.
            </p>
            <p className="text-indigo-300 text-sm mt-1">
              제목: {subject}
            </p>
          </div>
        )}

        {/* Send Result */}
        {sendResult && (
          <div className="p-4 bg-green-950 border border-green-800 rounded space-y-2">
            <p className="text-green-200">
              발송 완료: 성공 <strong>{sendResult.sent}</strong>건, 실패 <strong>{sendResult.failed}</strong>건
            </p>
            {sendResult.errors && sendResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-green-300 text-sm font-medium">오류 (최대 10건):</p>
                <ul className="text-green-300 text-xs mt-1 space-y-1">
                  {sendResult.errors.map((err, idx) => (
                    <li key={idx} className="truncate">{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePreview}
            disabled={isLoading || !subject || !bodyText}
            className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded transition"
          >
            미리보기
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || !isPreviewing || recipientCount === null}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded transition font-medium"
          >
            {isLoading ? '발송 중...' : '발송 확인'}
          </button>
        </div>
      </div>

      {/* Send History */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">최근 발송 기록</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  일시
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  대상
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  제목
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                  수신자
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                  성공
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                  실패
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    발송 기록이 없습니다.
                  </td>
                </tr>
              ) : (
                history.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      {new Date(log.createdAt).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      {log.details.target === 'all' && '전체'}
                      {log.details.target === 'FREE' && '무료'}
                      {log.details.target === 'PRO' && 'PRO'}
                      {log.details.target === 'specific' && '특정'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300 truncate max-w-xs">
                      {log.details.subject}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300 text-right">
                      {log.details.recipientCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-400 text-right">
                      {log.details.sent}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-400 text-right">
                      {log.details.failed}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
