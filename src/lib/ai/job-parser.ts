import * as cheerio from 'cheerio';
import type { AIMessage, AIContentBlock } from './types';
import { validateUrlSafety } from '@/lib/security/url-validator';
import { fetchWithBrowser, type FetchPageResult, type PageScreenshot } from '@/lib/browser/playwright-client';
import { normalizeTechStack } from '@/lib/job-sites/tech-normalizer';
import { normalizeJobPosting } from '@/lib/job-sites/data-normalizer';

// HTML Parsing Utilities
const REMOVE_TAGS = [
  'script', 'style', 'nav', 'footer', 'header', 'iframe',
  'svg', 'noscript', 'aside', 'form', 'button', 'input',
  'select', 'textarea', 'meta', 'link',
];

// 채용 사이트별 메인 콘텐츠 셀렉터 (사이드바/추천 공고 제외)
const SITE_CONTENT_SELECTORS: Record<string, { content: string[]; remove: string[] }> = {
  'saramin.co.kr': {
    content: ['.wrap_jv_cont', '.cont_jv_detail', '#content'],
    remove: [
      '.wrap_recommend', '.wrap_banner', '.wrap_relate',
      '.wrap_hot100', '.wrap_advert', '.area_ad',
      '.wrap_side', '#GNB', '.search_wrap',
      '.wrap_quick_menu', '.wrap_footer',
    ],
  },
  'wanted.co.kr': {
    // Next.js SSR (WDS 디자인 시스템), __NEXT_DATA__ JSON 추출 우선 사용
    // WDS 클래스는 빌드마다 변경 가능 → 구조적 셀렉터 사용
    content: ['main', '[class^="wds-"]'],
    remove: [
      'nav', 'footer', 'header',
      '[class*="Recommend"]', '[class*="recommend"]',
      '[class*="Banner"]', '[class*="banner"]',
      '[class*="aside"]',
      '[class*="carousel"]',
      '[class*="follow"]',
      '[class*="amplitude"]',
    ],
  },
  'jumpit.saramin.co.kr': {
    content: ['.position_detail', 'main'],
    remove: ['.aside', '[class*="recommend"]', '[class*="banner"]'],
  },
  'programmers.co.kr': {
    content: ['.job-detail', 'main'],
    remove: ['.aside', '[class*="recommend"]', '[class*="banner"]'],
  },
  'jobkorea.co.kr': {
    content: [
      '.lyDetailCont',                    // 데스크톱 상세 콘텐츠 레이어
      '#view_contents_wrap',              // 모바일 메인 콘텐츠
      '.tempate-detailed-summary-root',   // 자유양식 템플릿 래퍼
      '.coDetailCtInner',                 // 상세 콘텐츠 내부
      '.zoomDesc',                        // 확대 가능한 설명 영역
      '#container',                       // 폴백: 기본 콘텐츠 래퍼
    ],
    remove: [
      '#recentList', '#scrapList',        // 사이드바
      '.sideStarNews', '#lyStarNews',     // 뉴스 사이드바
      '.landingBannerSimple',             // 랜딩 배너
      '[class^="divAdBnnr"]', '[class^="imgAdBnnr"]', // 광고 배너
      '.lyPool',                          // 인재풀 레이어
      '.devCriteo',                       // 크리테오 트래킹
      '.modal-popup', '.modal-acceptance', // 모달
      '.toast-popup',                     // 토스트
      '#smartmatch_wrap',                 // 스마트 매칭
      '.devMainList',                     // 다른 채용 목록
      '.devAgiWrap',                      // 공고 리스트 래퍼
      '.pushLyApplied',                   // 지원 모달
    ],
  },
  'rallit.com': {
    // CSS-in-JS (emotion) 사용 → 해시 클래스 불안정, 구조적 셀렉터 사용
    content: ['#__next main', '#__next article', '[class*="position"]', '[class*="detail"]', '#__next'],
    remove: [
      'nav', 'header', 'footer',
      '[class*="recommend"]', '[class*="similar"]',
      '[class*="banner"]', '[class*="sidebar"]',
      '[class*="sticky"]', '[class*="bookmark"]',
      '[class*="apply"]', '[class*="modal"]',
    ],
  },
  'rocketpunch.com': {
    // Panda CSS 기반 SPA, 목록/상세 분할 레이아웃 (/jobs?selectedJobId=N)
    // CloudFront 봇 감지로 간헐적 403 → Playwright 필수
    // 주의: #job-content는 좌측 목록 패널을 가리키므로 사용하지 않음
    content: [
      '[class*="textStyle_Textual"]',     // Panda CSS: 상세 본문 텍스트 (주요업무, 자격요건 등)
      '[class*="textStyle_Title"]',       // Panda CSS: 제목/섹션 헤더
      '[class*="white-space_pre-line"]',  // 상세 패널 내 줄바꿈 보존 콘텐츠
      'main',
    ],
    remove: [
      '#job-content',                     // 좌측 채용 목록 패널 (상세가 아님!)
      '[class*="job-list"]',              // 좌측 목록
      '[class*="job-card"]',              // 개별 채용 카드
      'nav', 'header', 'footer',
      '[class*="recommend"]', '[class*="similar"]',
      '[class*="banner"]', '[class*="ad-"]',
      '[class*="filter"]',               // 상단 필터
      '[class*="cookie"]',               // 쿠키 동의
    ],
  },
  'incruit.com': {
    // SSR (ASP 기반), iframe 없음, jQuery 기반
    // job.incruit.com (데스크톱), m.incruit.com (모바일)
    content: [
      '.jobcompany_info .conts .job_info_detail',  // 데스크톱: 메인 채용 상세
      '.jobcompany_info .conts',                    // 데스크톱 폴백: 콘텐츠 래퍼
      '.jobcompany_info',                           // 데스크톱 폴백: 외부 컨테이너
      '.c-r-tab-body .contents',                    // 모바일: 탭 콘텐츠
      '.c-r-tab-body',                              // 모바일 폴백: 탭 바디
    ],
    remove: [
      '#rubaner-wrap', '#rubaner-top',              // 배너 래퍼
      '.rubaner-sider',                             // 사이드 배너
      '.menu_btm',                                  // 하단 메뉴/내비게이션
      '.statistics',                                // 조회 통계
      '[class*="powerlink"]',                       // 네이버 파워링크 광고
      '#appDownInlay_Sub_interest',                 // 앱 다운로드 모달
      '#appDownInlay_Sub_scrap',                    // 앱 스크랩 모달
      '[id^="appdown_"]',                           // 앱 다운로드 버튼
      '.navs',                                      // 모바일 탭 내비게이션
      '.btn-scraps',                                // 북마크 버튼
      '[class*="alliance"]',                        // 광고 제휴
      '[class*="recommend"]',                       // 추천 공고
      '[class*="banner"]',                          // 배너 광고
    ],
  },
};

// 자동 파싱이 불가능한 사이트 (로그인 필수, 강력한 봇 차단 등)
const BLOCKED_DOMAINS = [
  'linkedin.com',
  'linkedin.co.kr',
  'rememberapp.co.kr',
  'remember.co.kr',
];

// 지원되는 구직 사이트 목록
const SUPPORTED_SITES = [
  'saramin.co.kr',
  'wanted.co.kr',
  'jumpit.saramin.co.kr',
  'programmers.co.kr',
  'jobkorea.co.kr',
  'rallit.com',
  'rocketpunch.com',
  'incruit.com',
];

export type SiteSupport = 'supported' | 'blocked' | 'unknown';

export function getSiteSupport(url: string): { support: SiteSupport; domain: string } {
  try {
    const hostname = new URL(url).hostname;

    // Check blocked domains
    if (BLOCKED_DOMAINS.some(d => hostname.includes(d))) {
      return { support: 'blocked', domain: hostname };
    }

    // Check supported sites
    if (SUPPORTED_SITES.some(d => hostname.includes(d))) {
      return { support: 'supported', domain: hostname };
    }

    return { support: 'unknown', domain: hostname };
  } catch {
    return { support: 'unknown', domain: 'invalid' };
  }
}

function getSiteConfig(url: string): { content: string[]; remove: string[] } | null {
  try {
    const hostname = new URL(url).hostname;
    for (const [domain, config] of Object.entries(SITE_CONTENT_SELECTORS)) {
      if (hostname.includes(domain)) return config;
    }
  } catch {}
  return null;
}

export interface ParsedJobPosting {
  company: string;
  position: string;
  jobDescription: string;
  requirements: string[];
  preferredQualifications: string[];
  requiredExperience: string | null;
  techStack: string[];
  salaryRange?: string | null;
  location?: string | null;
  employmentType?: string | null;
  deadline?: string | null;
  benefits?: string[];
  companySize?: string | null;
}

export interface ParseSuccessResult {
  status: 'success';
  data: ParsedJobPosting;
}

export interface CompanyPositionGroup {
  company: string;
  positions: Array<{ position: string; summary: string }>;
}

export interface ParseErrorResult {
  status: 'error';
  errorCode: string;
  message: string;
  companies?: CompanyPositionGroup[];
}

export type ParseResult = ParseSuccessResult | ParseErrorResult;

export function extractTextFromHTML(html: string): string {
  const $ = cheerio.load(html);
  REMOVE_TAGS.forEach(tag => $(tag).remove());
  const text = $('body').text()
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.slice(0, 50_000);
}

// AI Parsing Prompt
export function buildJobParsingPrompt(textContent: string, selectedPosition?: string, selectedCompany?: string): AIMessage[] {
  let positionDirective = '';
  if (selectedCompany && selectedPosition) {
    positionDirective = `\n\n## 중요: 특정 회사/포지션 지정\n이 페이지에 여러 회사와 포지션이 있습니다. "${selectedCompany}"의 "${selectedPosition}" 포지션에 대한 정보만 추출해주세요. 다른 회사/포지션은 무시하세요. 반드시 "success" 상태로 해당 포지션의 정보를 반환하세요.`;
  } else if (selectedPosition) {
    positionDirective = `\n\n## 중요: 특정 포지션 지정\n이 페이지에 여러 포지션이 있습니다. "${selectedPosition}" 포지션에 대한 정보만 추출해주세요. 다른 포지션은 무시하세요. 반드시 "success" 상태로 해당 포지션의 정보를 반환하세요.`;
  }

  return [
    {
      role: 'system' as const,
      content: `당신은 채용 공고 파싱 전문가입니다. 주어진 웹페이지 텍스트에서 채용 공고 정보를 추출하여 JSON으로 반환합니다.

## 성공 응답 스키마
{
  "status": "success",
  "data": {
    "company": "회사명",
    "position": "포지션명",
    "jobDescription": "직무 설명 전문",
    "requirements": ["필수 자격요건 1", "필수 자격요건 2"],
    "preferredQualifications": ["우대사항 1", "우대사항 2"],
    "requiredExperience": "3년 이상",
    "techStack": ["기술 1", "기술 2"],
    "salaryRange": "연봉 범위 (예: '5,000~7,000만원') 또는 null",
    "location": "근무지 (예: '서울 강남구') 또는 null",
    "employmentType": "고용 형태 (정규직/계약직/인턴) 또는 null",
    "deadline": "마감일 (예: '2026-03-15', '상시채용') 또는 null",
    "benefits": ["복리후생 1", "복리후생 2"],
    "companySize": "회사 규모 (예: '스타트업 (10-50명)') 또는 null"
  }
}

## 에러 응답 스키마
{
  "status": "error",
  "errorCode": "LOGIN_REQUIRED" | "EXPIRED" | "NOT_JOB_POSTING" | "MULTIPLE_POSITIONS",
  "message": "에러 설명"
}

MULTIPLE_POSITIONS인 경우 (회사별로 그룹핑):
{
  "status": "error",
  "errorCode": "MULTIPLE_POSITIONS",
  "message": "여러 포지션이 발견되었습니다.",
  "companies": [
    {
      "company": "회사명",
      "positions": [
        { "position": "포지션명", "summary": "주요 기술/요구사항 요약" }
      ]
    }
  ]
}

## 규칙
- 반드시 위 JSON 스키마만 반환하세요. 다른 텍스트를 포함하지 마세요.
- 정보가 없는 필드는 빈 배열 [] 또는 null로 반환하세요.
- techStack은 요구사항/우대사항에서 기술 관련 항목을 별도로 추출하세요.
- 경력 요구사항은 "N년 이상", "N~M년" 형태로 정규화하세요.
- MULTIPLE_POSITIONS 응답 시, 반드시 companies 배열로 회사별 포지션을 그룹핑하세요.${positionDirective}`
    },
    {
      role: 'user' as const,
      content: `다음 웹페이지 텍스트에서 채용 공고 정보를 추출해주세요:\n\n${textContent}`
    }
  ];
}

// AI Response Parser
export function parseJobPostingResponse(response: string): ParseResult {
  let jsonStr = response.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.status === 'success' && parsed.data) {
      const data = {
        company: parsed.data.company || '',
        position: parsed.data.position || '',
        jobDescription: parsed.data.jobDescription || '',
        requirements: Array.isArray(parsed.data.requirements) ? parsed.data.requirements : [],
        preferredQualifications: Array.isArray(parsed.data.preferredQualifications) ? parsed.data.preferredQualifications : [],
        requiredExperience: parsed.data.requiredExperience || null,
        techStack: Array.isArray(parsed.data.techStack) ? normalizeTechStack(parsed.data.techStack) : [],
        salaryRange: parsed.data.salaryRange || null,
        location: parsed.data.location || null,
        employmentType: parsed.data.employmentType || null,
        deadline: parsed.data.deadline || null,
        benefits: Array.isArray(parsed.data.benefits) ? parsed.data.benefits : [],
        companySize: parsed.data.companySize || null,
      };
      return {
        status: 'success',
        data: normalizeJobPosting(data),
      };
    }
    if (parsed.status === 'error') {
      const result: ParseErrorResult = {
        status: 'error',
        errorCode: parsed.errorCode || 'UNKNOWN',
        message: parsed.message || '알 수 없는 오류가 발생했습니다.',
      };

      // companies 필드 처리 (새 포맷 우선, 구형 flat positions fallback)
      if (parsed.companies && Array.isArray(parsed.companies)) {
        result.companies = parsed.companies;
      } else if (parsed.positions && Array.isArray(parsed.positions)) {
        // 구형 flat 포맷 → company 기준 그룹핑
        const groupMap = new Map<string, Array<{ position: string; summary: string }>>();
        for (const pos of parsed.positions) {
          const company = pos.company || '기타';
          if (!groupMap.has(company)) groupMap.set(company, []);
          groupMap.get(company)!.push({ position: pos.position || '', summary: pos.summary || '' });
        }
        result.companies = Array.from(groupMap.entries()).map(([company, positions]) => ({
          company,
          positions,
        }));
      }

      return result;
    }
    throw new Error('Invalid response format');
  } catch (err) {
    if ((err as Error).message === 'Invalid response format') {
      throw new Error('PARSE_AI_FAILED');
    }
    throw new Error('PARSE_AI_FAILED');
  }
}

// HTML Fetch Utilities
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB
const FETCH_TIMEOUT = 10_000; // 10초

export async function fetchJobPostingHTML(url: string): Promise<FetchPageResult> {
  // Playwright first (handles CSR sites)
  try {
    const result = await fetchWithBrowser(url, { timeout: 30_000 });
    if (result.html.length > MAX_RESPONSE_SIZE) {
      throw new Error('RESPONSE_TOO_LARGE');
    }
    return result;
  } catch (err) {
    const msg = (err as Error).message;
    // Propagate these errors immediately (no fallback)
    if (msg === 'RESPONSE_TOO_LARGE' || msg === 'SSRF_BLOCKED') throw err;

    // Playwright failed — fallback to basic fetch (works for SSR sites)
    console.warn('[JobParser] Playwright failed, falling back to fetch:', msg);
    const html = await fetchWithFetch(url);
    return { html, screenshots: [] };
  }
}

async function fetchWithFetch(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InterviewBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

    if (!res.ok) throw new Error(`FETCH_FAILED_${res.status}`);

    const contentLength = parseInt(res.headers.get('content-length') || '0');
    if (contentLength > MAX_RESPONSE_SIZE) throw new Error('RESPONSE_TOO_LARGE');

    const html = await res.text();
    if (html.length > MAX_RESPONSE_SIZE) throw new Error('RESPONSE_TOO_LARGE');

    return html;
  } finally {
    clearTimeout(timeout);
  }
}

// Image Analysis Types and Constants
export interface ImageAnalysisResult {
  isImageHeavy: boolean;
  imageUrls: string[];
  extractedText: string;
  imageCount: number;
  textLength: number;
  screenshots: PageScreenshot[];
}

const AD_TRACKING_PATTERNS = [
  /google-analytics\.com/i, /googletagmanager\.com/i, /facebook\.com\/tr/i,
  /doubleclick\.net/i, /pixel\./i, /beacon\./i, /analytics\./i, /adservice\./i,
];

const NON_CONTENT_IMG_PATTERNS = [
  /logo/i, /icon/i, /avatar/i, /favicon/i, /emoji/i, /badge/i,
  /button/i, /arrow/i, /spinner/i, /loading/i, /spacer/i, /1x1/i, /blank\./i,
];

const CONTENT_SELECTORS = [
  'main', 'article', '[role="main"]',
  '.job-description', '[class*="recruit"]', '[class*="jd"]',
  '[class*="description"]', '[class*="content"]', '[class*="detail"]', '[class*="posting"]',
];

const MAX_IMAGES = 5;
const MIN_IMAGE_DIMENSION = 100;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_TOTAL_IMAGE_SIZE = 8 * 1024 * 1024;
const IMAGE_FETCH_TIMEOUT = 8_000;

// Image Analysis Function
export function analyzePageContent(html: string, pageUrl?: string, screenshots?: PageScreenshot[]): ImageAnalysisResult {
  const $ = cheerio.load(html);

  // Collect iframe content images BEFORE REMOVE_TAGS (which removes 'iframe')
  // data-iframe-content divs are added by playwright-client.ts when merging iframe HTML
  let hasIframeImages = false;
  const iframeImages: { url: string; score: number }[] = [];

  $('[data-iframe-content]').each((_, container) => {
    $(container).find('img').each((_, img) => {
      const $img = $(img);
      const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original');
      if (src && !AD_TRACKING_PATTERNS.some(p => p.test(src))) {
        iframeImages.push({ url: src, score: 20 });
        hasIframeImages = true;
      }
    });
  });

  // iframe 콘텐츠(data-iframe-content)를 먼저 추출 (REMOVE_TAGS가 iframe 내 태그를 지우기 전)
  const iframeTexts: string[] = [];
  $('[data-iframe-content]').each((_, container) => {
    const $container = $(container);
    const iframeText = $container.text().replace(/\s+/g, ' ').trim();
    if (iframeText.length > 50) {
      iframeTexts.push(iframeText);
    }
  });

  REMOVE_TAGS.forEach(tag => $(tag).remove());

  // 사이트별 불필요한 요소 제거 (사이드바, 추천 공고, 배너 등)
  const siteConfig = pageUrl ? getSiteConfig(pageUrl) : null;
  if (siteConfig) {
    siteConfig.remove.forEach(sel => $(sel).remove());
  }

  // Wanted: __NEXT_DATA__ JSON에서 구조화된 채용 정보 직접 추출 (CSS 셀렉터보다 안정적)
  let text = '';
  if (pageUrl?.includes('wanted.co.kr')) {
    const nextDataScript = $('script#__NEXT_DATA__').text();
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);

        // Wanted __NEXT_DATA__ 경로 fallback (스키마 변경 대비)
        const WANTED_DATA_PATHS = [
          // Current known path (as of 2026-02)
          (data: any) => data?.props?.pageProps?.initialData,
          // Alternative paths (Wanted may restructure)
          (data: any) => data?.props?.pageProps?.job,
          (data: any) => data?.props?.pageProps?.position,
          (data: any) => data?.props?.pageProps?.jobDetail,
          (data: any) => data?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data,
          // Deep search fallback: find any object with common JD fields
          (data: any) => {
            const findJobData = (obj: any, depth = 0): any => {
              if (depth > 5 || !obj || typeof obj !== 'object') return null;
              // Check if this object looks like a job posting
              if (obj.position && (obj.company || obj.company_name) && (obj.main_tasks || obj.requirements)) {
                return obj;
              }
              // Recursively search nested objects/arrays
              for (const val of Object.values(obj)) {
                const result = findJobData(val, depth + 1);
                if (result) return result;
              }
              return null;
            };
            return findJobData(data);
          },
        ];

        let job = null;
        let usedFallback = -1;

        for (let i = 0; i < WANTED_DATA_PATHS.length; i++) {
          job = WANTED_DATA_PATHS[i](nextData);
          if (job) {
            usedFallback = i;
            break;
          }
        }

        if (job) {
          // Schema change detection (primary path failed, fallback succeeded)
          if (usedFallback > 0) {
            console.warn(`[JobParser] Wanted __NEXT_DATA__ schema changed! Primary path failed, using fallback #${usedFallback}`);
          }

          const sections = [
            job.position && `포지션: ${job.position}`,
            job.company?.company_name && `회사: ${job.company.company_name}`,
            job.intro && `소개:\n${job.intro}`,
            job.main_tasks && `주요업무:\n${job.main_tasks}`,
            job.requirements && `자격요건:\n${job.requirements}`,
            job.preferred_points && `우대사항:\n${job.preferred_points}`,
            job.benefits && `혜택 및 복지:\n${job.benefits}`,
            job.address && `근무지: ${job.address}`,
          ].filter(Boolean);
          if (sections.length > 0) {
            text = sections.join('\n\n');
            console.log(`[JobParser] Wanted __NEXT_DATA__ extracted: ${text.length} chars`);
          }
        }

        // Wanted internal API detection (for future fallback data source)
        if (!job) {
          const bodyHtml = $.html();
          const apiPatternMatches = [
            ...Array.from(bodyHtml.matchAll(/wanted\.co\.kr\/api\/v4\/jobs\/(\d+)/g)),
            ...Array.from(bodyHtml.matchAll(/\/api\/chaos\/jobs\/v1\/(\d+)/g)),
          ];
          if (apiPatternMatches.length > 0) {
            const jobIds = Array.from(new Set(apiPatternMatches.map(m => m[1])));
            console.log(`[JobParser] Wanted internal API detected: /api/.../jobs/${jobIds[0]} (potential secondary data source)`);
          }
        }
      } catch {
        console.warn('[JobParser] Wanted __NEXT_DATA__ parse failed, falling back to CSS selectors');
      }
    }
  }

  // 사이트별 메인 콘텐츠 영역 우선 추출
  if (!text && siteConfig) {
    for (const sel of siteConfig.content) {
      const el = $(sel);
      if (el.length > 0) {
        text = el.text().replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        if (text.length > 200) break;
      }
    }
  }
  // Selector-miss logging
  if (siteConfig && (!text || text.length < 200)) {
    const hostname = pageUrl ? new URL(pageUrl).hostname : 'unknown';
    console.warn(`[JobParser] Selector miss for ${hostname}: none of [${siteConfig.content.join(', ')}] matched, falling back to body`);
  }

  // 폴백: 전체 body 텍스트
  if (!text || text.length < 200) {
    text = $('body').text().replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  // iframe 콘텐츠를 메인 텍스트에 합치기 (상세 요강 등)
  if (iframeTexts.length > 0) {
    text = text + '\n\n--- 상세 요강 ---\n\n' + iframeTexts.join('\n\n');
  }

  const extractedText = text.slice(0, 50_000);

  // Main page images (existing filtering/scoring logic)
  const allImages = $('img').toArray();
  const mainImages: { url: string; score: number }[] = [];

  for (const img of allImages) {
    const $img = $(img);
    const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original');
    if (!src) continue;

    if (AD_TRACKING_PATTERNS.some(p => p.test(src))) continue;
    if (NON_CONTENT_IMG_PATTERNS.some(p => p.test(src))) continue;

    const width = parseInt($img.attr('width') || '0', 10);
    const height = parseInt($img.attr('height') || '0', 10);
    if ((width > 0 && width < MIN_IMAGE_DIMENSION) || (height > 0 && height < MIN_IMAGE_DIMENSION)) continue;

    const style = $img.attr('style') || '';
    const styleWidth = parseInt(style.match(/width:\s*(\d+)/)?.[1] || '0', 10);
    const styleHeight = parseInt(style.match(/height:\s*(\d+)/)?.[1] || '0', 10);
    if ((styleWidth > 0 && styleWidth < MIN_IMAGE_DIMENSION) || (styleHeight > 0 && styleHeight < MIN_IMAGE_DIMENSION)) continue;

    let score = 0;
    const isInContent = CONTENT_SELECTORS.some(sel => $img.closest(sel).length > 0);
    if (isInContent) score += 10;

    const maxDim = Math.max(width, height, styleWidth, styleHeight);
    if (maxDim >= 400) score += 5;
    else if (maxDim >= 200) score += 3;
    else score += 1;

    mainImages.push({ url: src, score });
  }

  // Merge iframe + main images, take top MAX_IMAGES
  const combinedImages = [...iframeImages, ...mainImages];
  combinedImages.sort((a, b) => b.score - a.score);
  const topImages = combinedImages.slice(0, MAX_IMAGES);

  // Vision trigger logic:
  // 1. Always use Vision if we have iframe images (highest priority - often contains JD details)
  // 2. Use Vision if we have screenshots
  // 3. Fallback: use Vision if text is insufficient AND we have images
  const hasScreenshots = (screenshots ?? []).length > 0;
  const hasEnoughText = extractedText.length >= 1000;
  const isImageHeavy =
    hasIframeImages ||  // iframe images = always Vision (JD content embedded in iframe)
    hasScreenshots ||
    (!hasEnoughText && (
      (extractedText.length < 200 && topImages.length >= 1) ||
      (extractedText.length < 500 && topImages.length >= 3)
    ));

  return {
    isImageHeavy,
    imageUrls: topImages.map(img => img.url),
    extractedText,
    imageCount: topImages.length,
    textLength: extractedText.length,
    screenshots: screenshots ?? [],
  };
}

// Image Download Function
interface DownloadedImage {
  dataUrl: string;
  originalUrl: string;
  sizeBytes: number;
}

export async function downloadImages(
  imageUrls: string[],
  pageUrl: string,
): Promise<{ images: DownloadedImage[]; errors: string[] }> {
  const images: DownloadedImage[] = [];
  const errors: string[] = [];
  let totalSize = 0;

  for (const rawUrl of imageUrls) {
    try {
      const absoluteUrl = new URL(rawUrl, pageUrl).toString();
      await validateUrlSafety(absoluteUrl);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT);

      try {
        const res = await fetch(absoluteUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; InterviewBot/1.0)',
            'Accept': 'image/*',
          },
          redirect: 'follow',
        });

        if (!res.ok) { errors.push(`Image fetch failed (${res.status}): ${rawUrl}`); continue; }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) { errors.push(`Not an image (${contentType}): ${rawUrl}`); continue; }

        const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
        if (contentLength > MAX_IMAGE_SIZE) { errors.push(`Image too large: ${rawUrl}`); continue; }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length > MAX_IMAGE_SIZE) { errors.push(`Image too large: ${rawUrl}`); continue; }
        if (totalSize + buffer.length > MAX_TOTAL_IMAGE_SIZE) { errors.push(`Total size budget exceeded`); break; }

        const mimeType = contentType.split(';')[0].trim();
        const base64 = buffer.toString('base64');
        images.push({ dataUrl: `data:${mimeType};base64,${base64}`, originalUrl: rawUrl, sizeBytes: buffer.length });
        totalSize += buffer.length;
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      const msg = (err as Error).message;
      errors.push(msg === 'SSRF_BLOCKED' ? `SSRF blocked: ${rawUrl}` : `Download error: ${rawUrl}`);
    }
  }

  return { images, errors };
}

// Vision Prompt Builder
export function buildVisionJobParsingPrompt(
  textContent: string,
  imageDataUrls: string[],
  selectedPosition?: string,
  selectedCompany?: string,
): AIMessage[] {
  const userContent: AIContentBlock[] = [];

  userContent.push({
    type: 'text',
    text: textContent.length > 0
      ? `다음은 채용 공고 웹페이지에서 추출된 정보입니다. 이미지에 포함된 텍스트도 읽어서 채용 공고 정보를 추출해주세요.\n\n## 추출된 텍스트\n${textContent}\n\n## 이미지\n아래 이미지는 채용 공고 페이지의 주요 콘텐츠입니다. 이미지에서 텍스트를 읽고 채용 정보를 추출해주세요.`
      : '텍스트 추출이 불가능한 페이지입니다. 아래 이미지에서 직접 채용 공고 정보를 읽어주세요.',
  });

  for (const dataUrl of imageDataUrls) {
    userContent.push({ type: 'image_url', image_url: { url: dataUrl, detail: 'low' } });
  }

  let positionDirective = '';
  if (selectedCompany && selectedPosition) {
    positionDirective = `\n\n## 중요: 특정 회사/포지션 지정\n이 페이지에 여러 회사와 포지션이 있습니다. "${selectedCompany}"의 "${selectedPosition}" 포지션에 대한 정보만 추출해주세요. 다른 회사/포지션은 무시하세요. 반드시 "success" 상태로 해당 포지션의 정보를 반환하세요.`;
  } else if (selectedPosition) {
    positionDirective = `\n\n## 중요: 특정 포지션 지정\n이 페이지에 여러 포지션이 있습니다. "${selectedPosition}" 포지션에 대한 정보만 추출해주세요. 다른 포지션은 무시하세요. 반드시 "success" 상태로 해당 포지션의 정보를 반환하세요.`;
  }

  return [
    {
      role: 'system' as const,
      content: `당신은 채용 공고 파싱 전문가입니다. 주어진 웹페이지 텍스트와 이미지에서 채용 공고 정보를 추출하여 JSON으로 반환합니다.

## 중요 지시사항
- 이미지에 한국어 텍스트가 포함되어 있을 수 있습니다. 이미지의 텍스트를 정확히 읽어주세요.
- 이미지와 텍스트에서 얻은 정보를 종합하여 하나의 완전한 채용 공고 정보를 만들어주세요.
- 이미지에서 읽은 내용이 텍스트와 중복될 수 있습니다. 중복을 제거하고 가장 완전한 정보를 사용하세요.

## 성공 응답 스키마
{
  "status": "success",
  "data": {
    "company": "회사명",
    "position": "포지션명",
    "jobDescription": "직무 설명 전문",
    "requirements": ["필수 자격요건 1", "필수 자격요건 2"],
    "preferredQualifications": ["우대사항 1", "우대사항 2"],
    "requiredExperience": "3년 이상",
    "techStack": ["기술 1", "기술 2"],
    "salaryRange": "연봉 범위 (예: '5,000~7,000만원') 또는 null",
    "location": "근무지 (예: '서울 강남구') 또는 null",
    "employmentType": "고용 형태 (정규직/계약직/인턴) 또는 null",
    "deadline": "마감일 (예: '2026-03-15', '상시채용') 또는 null",
    "benefits": ["복리후생 1", "복리후생 2"],
    "companySize": "회사 규모 (예: '스타트업 (10-50명)') 또는 null"
  }
}

## 에러 응답 스키마
{
  "status": "error",
  "errorCode": "LOGIN_REQUIRED" | "EXPIRED" | "NOT_JOB_POSTING" | "MULTIPLE_POSITIONS",
  "message": "에러 설명"
}

MULTIPLE_POSITIONS인 경우 (회사별로 그룹핑):
{
  "status": "error",
  "errorCode": "MULTIPLE_POSITIONS",
  "message": "여러 포지션이 발견되었습니다.",
  "companies": [
    {
      "company": "회사명",
      "positions": [
        { "position": "포지션명", "summary": "주요 기술/요구사항 요약" }
      ]
    }
  ]
}

## 규칙
- 반드시 위 JSON 스키마만 반환하세요. 다른 텍스트를 포함하지 마세요.
- 정보가 없는 필드는 빈 배열 [] 또는 null로 반환하세요.
- techStack은 요구사항/우대사항에서 기술 관련 항목을 별도로 추출하세요.
- 경력 요구사항은 "N년 이상", "N~M년" 형태로 정규화하세요.
- MULTIPLE_POSITIONS 응답 시, 반드시 companies 배열로 회사별 포지션을 그룹핑하세요.${positionDirective}`,
    },
    {
      role: 'user' as const,
      content: userContent,
    },
  ];
}
