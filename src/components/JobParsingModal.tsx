'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { Modal } from './Modal';

interface JobParsingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    company: string;
    position: string;
    jobDescription: string;
    requirements: string[];
    preferredQualifications: string[];
    requiredExperience: string;
  }) => void;
}

interface ParsedData {
  company: string;
  position: string;
  jobDescription: string;
  requirements: string[];
  preferredQualifications: string[];
  requiredExperience: string;
  techStack?: string[];
  location?: string;
  salaryRange?: string;
  employmentType?: string;
  deadline?: string;
  benefits?: string;
  companySize?: string;
}

interface CompanyGroup {
  company: string;
  positions: Array<{ position: string; summary: string }>;
}

type SelectionStage = 'input' | 'company' | 'position' | 'result';

type ErrorCode =
  | 'PARSE_LOGIN_REQUIRED'
  | 'PARSE_EXPIRED'
  | 'PARSE_NOT_JOB_POSTING'
  | 'PARSE_FETCH_FAILED'
  | 'SSRF_BLOCKED'
  | 'FEATURE_NOT_AVAILABLE';

// Site display names
const SITE_DISPLAY_NAMES: Record<string, string> = {
  'saramin.co.kr': '사람인',
  'wanted.co.kr': '원티드',
  'jobkorea.co.kr': '잡코리아',
  'jumpit.saramin.co.kr': '점핏',
  'programmers.co.kr': '프로그래머스',
  'rallit.com': '랠릿',
  'rocketpunch.com': '로켓펀치',
  'incruit.com': '인크루트',
};

function getSiteInfo(url: string): { name: string; status: 'supported' | 'blocked' | 'unknown' } | null {
  try {
    const hostname = new URL(url).hostname;

    // Check blocked
    const BLOCKED = ['linkedin.com', 'remember.co.kr', 'rememberapp.co.kr'];
    if (BLOCKED.some(d => hostname.includes(d))) {
      const name = hostname.includes('linkedin') ? 'LinkedIn' : 'Remember';
      return { name, status: 'blocked' };
    }

    // Check supported
    for (const [domain, displayName] of Object.entries(SITE_DISPLAY_NAMES)) {
      if (hostname.includes(domain)) {
        return { name: displayName, status: 'supported' };
      }
    }

    return { name: hostname, status: 'unknown' };
  } catch {
    return null;
  }
}

export function JobParsingModal({ isOpen, onClose, onSave }: JobParsingModalProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: ErrorCode } | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [companies, setCompanies] = useState<CompanyGroup[]>([]);
  const [stage, setStage] = useState<SelectionStage>('input');
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');
  const [companyPositions, setCompanyPositions] = useState<Array<{ position: string; summary: string }>>([]);

  // Editable form state
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [preferredQualifications, setPreferredQualifications] = useState<string[]>([]);
  const [requiredExperience, setRequiredExperience] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [newPreferredQual, setNewPreferredQual] = useState('');
  const [visionInfo, setVisionInfo] = useState<{ imageCount: number } | null>(null);
  const [showSites, setShowSites] = useState(false);
  const [siteInfo, setSiteInfo] = useState<{ name: string; status: 'supported' | 'blocked' | 'unknown' } | null>(null);

  const resetState = useCallback(() => {
    setUrl('');
    setIsLoading(false);
    setError(null);
    setParsedData(null);
    setCompanies([]);
    setStage('input');
    setSelectedCompanyName('');
    setCompanyPositions([]);
    setCompany('');
    setPosition('');
    setJobDescription('');
    setRequirements([]);
    setPreferredQualifications([]);
    setRequiredExperience('');
    setNewRequirement('');
    setNewPreferredQual('');
    setVisionInfo(null);
    setShowSites(false);
    setSiteInfo(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const getErrorMessage = (code: ErrorCode): string => {
    const messages: Record<ErrorCode, string> = {
      PARSE_LOGIN_REQUIRED: '로그인이 필요한 페이지입니다. 채용공고 내용을 복사하여 직접 입력해주세요.',
      PARSE_EXPIRED: '만료된 채용공고입니다.',
      PARSE_NOT_JOB_POSTING: '채용공고가 아닌 페이지입니다. 올바른 채용공고 URL을 입력해주세요.',
      PARSE_FETCH_FAILED: '페이지를 불러올 수 없습니다. URL을 확인해주세요.',
      SSRF_BLOCKED: '유효하지 않은 URL입니다.',
      FEATURE_NOT_AVAILABLE: '현재 이용할 수 없는 기능입니다.',
    };
    return messages[code] || '채용공고 분석 중 오류가 발생했습니다.';
  };

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError({ message: 'URL을 입력해주세요.' });
      return;
    }

    setIsLoading(true);
    setError(null);
    setParsedData(null);
    setCompanies([]);

    try {
      const response = await fetch('/api/positions/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'PARSE_MULTIPLE_POSITIONS' && data.companies) {
          setCompanies(data.companies);
          setStage('company');
          setError(null);
        } else {
          setError({
            message: data.error || getErrorMessage(data.code),
            code: data.code
          });
        }
        return;
      }

      if (data.parsed) {
        const parsed = data.parsed;
        setParsedData(parsed);
        setCompany(parsed.company || '');
        setPosition(parsed.position || '');
        setJobDescription(parsed.jobDescription || '');
        setRequirements(parsed.requirements || []);
        setPreferredQualifications(parsed.preferredQualifications || []);
        setRequiredExperience(parsed.requiredExperience || '');
        setStage('result');
        if (data.meta?.usedVision) {
          setVisionInfo({ imageCount: data.meta.imageCount });
        }
      }
    } catch (err) {
      setError({ message: '네트워크 오류가 발생했습니다. 다시 시도해주세요.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanySelect = (group: CompanyGroup) => {
    setSelectedCompanyName(group.company);
    setCompanyPositions(group.positions);
    setStage('position');
  };

  const handlePositionSelect = async (pos: { position: string; summary: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/positions/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          selectedCompany: selectedCompanyName,
          selectedPosition: pos.position,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError({
          message: data.error || '분석 중 오류가 발생했습니다.',
          code: data.code
        });
        return;
      }

      if (data.parsed) {
        const parsed = data.parsed;
        setParsedData(parsed);
        setCompany(parsed.company || '');
        setPosition(parsed.position || '');
        setJobDescription(parsed.jobDescription || '');
        setRequirements(parsed.requirements || []);
        setPreferredQualifications(parsed.preferredQualifications || []);
        setRequiredExperience(parsed.requiredExperience || '');
        setStage('result');
        if (data.meta?.usedVision) {
          setVisionInfo({ imageCount: data.meta.imageCount });
        }
      }
    } catch (err) {
      setError({ message: '네트워크 오류가 발생했습니다. 다시 시도해주세요.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    onSave({
      company: company.trim(),
      position: position.trim(),
      jobDescription: jobDescription.trim(),
      requirements: requirements.filter(r => r.trim()),
      preferredQualifications: preferredQualifications.filter(q => q.trim()),
      requiredExperience: requiredExperience.trim(),
    });
    handleClose();
  };

  const removeRequirement = (index: number) => {
    setRequirements(prev => prev.filter((_, i) => i !== index));
  };

  const removePreferredQual = (index: number) => {
    setPreferredQualifications(prev => prev.filter((_, i) => i !== index));
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setRequirements(prev => [...prev, newRequirement.trim()]);
      setNewRequirement('');
    }
  };

  const addPreferredQual = () => {
    if (newPreferredQual.trim()) {
      setPreferredQualifications(prev => [...prev, newPreferredQual.trim()]);
      setNewPreferredQual('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, addFn: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFn();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="AI 채용공고 분석">
      <div className="space-y-4">
        {/* URL Input Section */}
        {stage === 'input' && !isLoading && (
          <div className="space-y-3">
            <div>
              <label htmlFor="job-url" className="block text-sm font-medium text-zinc-100 mb-2">
                채용공고 URL
              </label>
              <input
                id="job-url"
                type="url"
                value={url}
                onChange={(e) => {
                  const newUrl = e.target.value;
                  setUrl(newUrl);
                  setSiteInfo(getSiteInfo(newUrl));
                }}
                placeholder="https://..."
                disabled={isLoading}
                className={cn(
                  "w-full px-4 py-2 rounded-lg border bg-zinc-800 text-zinc-100 placeholder-zinc-500",
                  "border-zinc-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors"
                )}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleAnalyze()}
              />

              {/* Site Recognition Indicator */}
              {siteInfo && (
                <div className="mt-2">
                  {siteInfo.status === 'supported' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-950/30 text-green-400 border border-green-900/50">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {siteInfo.name}
                    </span>
                  )}
                  {siteInfo.status === 'blocked' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-950/30 text-red-400 border border-red-900/50">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {siteInfo.name} - 지원하지 않는 사이트
                    </span>
                  )}
                  {siteInfo.status === 'unknown' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-950/30 text-yellow-400 border border-yellow-900/50">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      알 수 없는 사이트 - 파싱 시도 가능
                    </span>
                  )}
                </div>
              )}

              {/* Supported Sites Section */}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowSites(!showSites)}
                  className="text-xs text-zinc-400 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                >
                  지원되는 사이트 {showSites ? '▲' : '▼'}
                </button>
                {showSites && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.values(SITE_DISPLAY_NAMES).map(name => (
                      <span key={name} className="px-2 py-1 text-xs bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isLoading || !url.trim()}
              className={cn(
                "w-full px-4 py-2 rounded-lg font-medium transition-colors",
                "bg-blue-600 text-white hover:bg-blue-700",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? '분석 중...' : '분석하기'}
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">AI가 채용공고를 분석하고 있습니다...</p>
            <p className="text-xs text-zinc-500">이미지가 포함된 경우 분석 시간이 더 소요될 수 있습니다.</p>
          </div>
        )}

        {/* Error State */}
        {error && stage === 'input' && (
          <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50">
            <p className="text-sm text-red-400">{error.message}</p>
            {error.code === 'FEATURE_NOT_AVAILABLE' && (
              <a
                href="/pricing"
                className="inline-block mt-2 text-sm text-blue-400 hover:text-blue-300 underline"
              >
                더 알아보기
              </a>
            )}
          </div>
        )}

        {/* Company Selection */}
        {stage === 'company' && !isLoading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
              <span>회사를 선택해주세요</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {companies.map((group, index) => (
                <button
                  key={index}
                  onClick={() => handleCompanySelect(group)}
                  className={cn(
                    "w-full p-3 rounded-lg border text-left transition-colors",
                    "border-zinc-700 bg-zinc-800 hover:bg-zinc-750 hover:border-zinc-600"
                  )}
                >
                  <div className="font-medium text-zinc-100">{group.company}</div>
                  <div className="text-xs text-zinc-500">{group.positions.length}개 포지션</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Position Selection */}
        {stage === 'position' && !isLoading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
              <span>{selectedCompanyName}의 포지션을 선택해주세요</span>
            </div>
            <button
              onClick={() => setStage('company')}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← 회사 선택으로 돌아가기
            </button>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {companyPositions.map((pos, index) => (
                <button
                  key={index}
                  onClick={() => handlePositionSelect(pos)}
                  className={cn(
                    "w-full p-3 rounded-lg border text-left transition-colors",
                    "border-zinc-700 bg-zinc-800 hover:bg-zinc-750 hover:border-zinc-600"
                  )}
                >
                  <div className="font-medium text-zinc-100">{pos.position}</div>
                  {pos.summary && <div className="text-sm text-zinc-400 mt-1">{pos.summary}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Parsed Data Form */}
        {stage === 'result' && parsedData && (
          <div className="space-y-4">
            {/* Vision Info Banner */}
            {visionInfo && (
              <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/50">
                <p className="text-sm text-blue-400">
                  이미지 기반 채용공고가 감지되어 AI 이미지 분석을 사용했습니다 ({visionInfo.imageCount}개 이미지). 추출된 내용을 확인하고 필요시 수정해주세요.
                </p>
              </div>
            )}

            {/* Extended Parse Info */}
            {parsedData && (parsedData.location || parsedData.salaryRange || parsedData.employmentType || parsedData.deadline) && (
              <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {parsedData.location && (
                    <div className="text-zinc-300">
                      <span className="text-zinc-500">근무지:</span> {parsedData.location}
                    </div>
                  )}
                  {parsedData.salaryRange && (
                    <div className="text-zinc-300">
                      <span className="text-zinc-500">연봉:</span> {parsedData.salaryRange}
                    </div>
                  )}
                  {parsedData.employmentType && (
                    <div className="text-zinc-300">
                      <span className="text-zinc-500">고용형태:</span> {parsedData.employmentType}
                    </div>
                  )}
                  {parsedData.deadline && (
                    <div className="text-zinc-300">
                      <span className="text-zinc-500">마감:</span> {parsedData.deadline}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Company */}
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-zinc-100 mb-2">
                회사명
              </label>
              <input
                id="company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={cn(
                  "w-full px-4 py-2 rounded-lg border bg-zinc-800 text-zinc-100",
                  "border-zinc-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20",
                  "transition-colors"
                )}
              />
            </div>

            {/* Position */}
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-zinc-100 mb-2">
                포지션
              </label>
              <input
                id="position"
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className={cn(
                  "w-full px-4 py-2 rounded-lg border bg-zinc-800 text-zinc-100",
                  "border-zinc-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20",
                  "transition-colors"
                )}
              />
            </div>

            {/* Job Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-100 mb-2">
                직무 설명
              </label>
              <textarea
                id="description"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={4}
                className={cn(
                  "w-full px-4 py-2 rounded-lg border bg-zinc-800 text-zinc-100",
                  "border-zinc-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20",
                  "transition-colors resize-none"
                )}
              />
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-medium text-zinc-100 mb-2">
                필수 요구사항
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {requirements.map((req, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-sm border border-blue-600/30"
                  >
                    {req}
                    <button
                      onClick={() => removeRequirement(index)}
                      className="ml-1 hover:text-blue-300"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, addRequirement)}
                  placeholder="새 요구사항 추가..."
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-lg border bg-zinc-800 text-zinc-100 text-sm",
                    "border-zinc-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20",
                    "transition-colors"
                  )}
                />
                <button
                  onClick={addRequirement}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
                >
                  추가
                </button>
              </div>
            </div>

            {/* Preferred Qualifications */}
            <div>
              <label className="block text-sm font-medium text-zinc-100 mb-2">
                우대 사항
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {preferredQualifications.map((qual, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-600/20 text-green-400 text-sm border border-green-600/30"
                  >
                    {qual}
                    <button
                      onClick={() => removePreferredQual(index)}
                      className="ml-1 hover:text-green-300"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPreferredQual}
                  onChange={(e) => setNewPreferredQual(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, addPreferredQual)}
                  placeholder="새 우대사항 추가..."
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-lg border bg-zinc-800 text-zinc-100 text-sm",
                    "border-zinc-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20",
                    "transition-colors"
                  )}
                />
                <button
                  onClick={addPreferredQual}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
                >
                  추가
                </button>
              </div>
            </div>

            {/* Required Experience */}
            <div>
              <label htmlFor="experience" className="block text-sm font-medium text-zinc-100 mb-2">
                경력
              </label>
              <input
                id="experience"
                type="text"
                value={requiredExperience}
                onChange={(e) => setRequiredExperience(e.target.value)}
                placeholder="예: 3년 이상"
                className={cn(
                  "w-full px-4 py-2 rounded-lg border bg-zinc-800 text-zinc-100",
                  "border-zinc-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20",
                  "transition-colors"
                )}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-750 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
              >
                저장
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
