import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import { requireAuthV2 } from '@/lib/auth/require-auth';
import { checkUserRateLimit } from '@/lib/auth/user-rate-limit';
import { checkJobParseLimit, type TierKey } from '@/lib/feature-gate';
import { validateUrlSafety } from '@/lib/security/url-validator';
import {
  fetchJobPostingHTML,
  analyzePageContent,
  buildJobParsingPrompt,
  parseJobPostingResponse,
  getSiteSupport,
} from '@/lib/ai/job-parser';
import { extractTextFromScreenshots } from '@/lib/ai/ocr';
import type { AIMessage } from '@/lib/ai/types';
import { createAIClient } from '@/lib/ai/client';
import { logTokenUsage } from '@/lib/ai/usage-logger';
import { countTokens, countMessagesTokens } from '@/lib/ai/token-counter';
import { env } from '@/lib/env';
import { cache } from '@/lib/redis/client';
import {
  checkSiteRateLimit,
  acquireSiteConcurrency,
  recordSiteRequest,
} from '@/lib/job-sites/site-rate-limiter';

const parseRequestSchema = z.object({
  url: z.string().url('유효한 URL을 입력해주세요.'),
  selectedCompany: z.string().optional(),
  selectedPosition: z.string().optional(),
  forceRefresh: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  // 1. Authentication
  const auth = requireAuthV2(request);
  if (!auth.authenticated) return auth.response;

  // 2. Rate limiting: 5 requests per minute
  const rateLimit = checkUserRateLimit(auth.user.userId, 'position-parse', 5);
  if (rateLimit) {
    return NextResponse.json(
      {
        error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryable: true,
      },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const tier = (auth.user.tier || 'FREE') as TierKey;

    // 3. Feature gate check: monthly job parse limit
    const parseLimit = await checkJobParseLimit(auth.user.userId, tier);
    if (!parseLimit.allowed) {
      return NextResponse.json(
        {
          error: parseLimit.message,
          code: 'PARSE_LIMIT_EXCEEDED',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // 4. Request validation
    const body = await request.json();
    const validation = parseRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.issues[0]?.message || '입력 데이터가 올바르지 않습니다.',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    const { url, selectedCompany, selectedPosition } = validation.data;

    // 5. Mobile URL normalization
    const MOBILE_DOMAIN_MAP: Record<string, string> = {
      'm.saramin.co.kr': 'www.saramin.co.kr',
      'm.jobkorea.co.kr': 'www.jobkorea.co.kr',
      'm.wanted.co.kr': 'www.wanted.co.kr',
      'm.incruit.com': 'job.incruit.com',
    };

    let normalizedUrl = url;
    try {
      const parsedUrl = new URL(url);
      const replacement = MOBILE_DOMAIN_MAP[parsedUrl.hostname];
      if (replacement) {
        parsedUrl.hostname = replacement;
        normalizedUrl = parsedUrl.toString();
        console.log(`[JobParse] Normalized mobile URL: ${url} → ${normalizedUrl}`);
      }
    } catch {}

    const sourceDomain = new URL(normalizedUrl).hostname;

    // Check site support status
    const siteInfo = getSiteSupport(normalizedUrl);
    if (siteInfo.support === 'blocked') {
      return NextResponse.json(
        {
          error: '해당 사이트는 자동 파싱을 지원하지 않습니다. 채용공고 내용을 직접 입력해주세요.',
          code: 'SITE_BLOCKED',
          domain: siteInfo.domain,
        },
        { status: 422 }
      );
    }

    if (siteInfo.support === 'unknown') {
      console.log(`[JobParse] Unknown site: ${siteInfo.domain}, attempting parse anyway`);
    }

    // Cache key based on normalized URL + selected filters
    const cacheKeyParts = [normalizedUrl, selectedCompany || '', selectedPosition || ''].join('|');
    const cacheKey = `jd-parse:${createHash('sha256').update(cacheKeyParts).digest('hex').slice(0, 16)}`;

    if (!validation.data.forceRefresh) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        try {
          const cachedResult = JSON.parse(cached);
          console.log('[JobParse] Cache hit for:', normalizedUrl);
          return NextResponse.json({
            parsed: cachedResult.parsed,
            meta: { ...cachedResult.meta, cached: true },
          });
        } catch {
          // Invalid cache, continue with fresh parse
        }
      }
    }

    // 6. SSRF validation
    try {
      await validateUrlSafety(normalizedUrl);
    } catch (err) {
      if ((err as Error).message === 'SSRF_BLOCKED') {
        return NextResponse.json(
          {
            error: '해당 URL은 보안상 접근할 수 없습니다.',
            code: 'SSRF_BLOCKED',
          },
          { status: 403 }
        );
      }
      throw err;
    }

    // 6.5. Site rate limiting
    const siteRateCheck = checkSiteRateLimit(sourceDomain);
    if (!siteRateCheck.allowed) {
      const retryAfterSeconds = Math.ceil(siteRateCheck.retryAfterMs / 1000);
      console.warn(`[JobParse] Site rate limit exceeded for ${sourceDomain}, retry after ${retryAfterSeconds}s`);
      return NextResponse.json(
        {
          error: `${sourceDomain}에 대한 요청이 일시적으로 제한되었습니다. ${retryAfterSeconds}초 후 다시 시도해주세요.`,
          code: 'SITE_RATE_LIMIT_EXCEEDED',
          retryable: true,
        },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    // 7. Fetch HTML + Screenshots (with concurrency control)
    const releaseConcurrency = await acquireSiteConcurrency(sourceDomain, 30_000);
    if (!releaseConcurrency) {
      console.warn(`[JobParse] Concurrency timeout for ${sourceDomain}`);
      return NextResponse.json(
        {
          error: `${sourceDomain}에 대한 동시 요청이 많습니다. 잠시 후 다시 시도해주세요.`,
          code: 'SITE_CONCURRENCY_EXCEEDED',
          retryable: true,
        },
        { status: 429 }
      );
    }

    let html: string;
    let screenshotDataUrls: string[] = [];
    try {
      const fetchResult = await fetchJobPostingHTML(normalizedUrl);
      html = fetchResult.html;
      screenshotDataUrls = fetchResult.screenshots.map(s => s.dataUrl);

      // Record successful request for rate limiting
      recordSiteRequest(sourceDomain);
    } catch (err) {
      const errorMsg = (err as Error).message;

      // Release concurrency slot on error
      releaseConcurrency();

      if (errorMsg.startsWith('FETCH_FAILED_')) {
        const statusCode = errorMsg.replace('FETCH_FAILED_', '');
        return NextResponse.json(
          {
            error: `채용 공고를 가져올 수 없습니다. (HTTP ${statusCode})`,
            code: 'PARSE_FETCH_FAILED',
            retryable: true,
          },
          { status: 502 }
        );
      }
      if (errorMsg === 'RESPONSE_TOO_LARGE') {
        return NextResponse.json(
          {
            error: '페이지 크기가 너무 큽니다. (최대 5MB)',
            code: 'RESPONSE_TOO_LARGE',
          },
          { status: 413 }
        );
      }
      return NextResponse.json(
        {
          error: '채용 공고를 가져오는 중 오류가 발생했습니다.',
          code: 'PARSE_FETCH_FAILED',
          retryable: true,
        },
        { status: 502 }
      );
    } finally {
      // Always release concurrency slot when done with fetching
      releaseConcurrency();
    }

    // 8. Analyze page content + OCR for image-heavy iframes
    const analysis = analyzePageContent(html, normalizedUrl);
    let finalText = analysis.extractedText;

    // 스크린샷이 있으면 OCR로 텍스트 추출하여 합침
    if (screenshotDataUrls.length > 0) {
      console.log('[JobParse] Running OCR on', screenshotDataUrls.length, 'screenshots...');
      try {
        const ocr = await extractTextFromScreenshots(screenshotDataUrls);
        if (ocr.text.length > 50) {
          finalText = finalText + '\n\n--- OCR 추출 텍스트 ---\n\n' + ocr.text;
          console.log('[JobParse] OCR extracted', ocr.text.length, 'chars from', ocr.count, 'screenshots');
        }
      } catch (err) {
        console.warn('[JobParse] OCR failed:', (err as Error).message);
      }
    }

    // 9. Minimum text threshold check
    if (finalText.length < 200 && screenshotDataUrls.length === 0) {
      return NextResponse.json(
        {
          error: '채용 공고 내용을 충분히 추출할 수 없습니다. 다른 URL을 시도하거나 채용공고 내용을 직접 입력해주세요.',
          code: 'INSUFFICIENT_CONTENT',
        },
        { status: 422 }
      );
    }

    // 10. Login-wall pre-detection
    const LOGIN_INDICATORS = ['로그인이 필요', '로그인 후 확인', '회원만', '로그인하세요', '로그인해 주세요', '본인인증'];
    const hasLoginIndicators = LOGIN_INDICATORS.some(indicator => finalText.includes(indicator));
    if (hasLoginIndicators && finalText.length < 500) {
      return NextResponse.json(
        {
          error: '해당 채용 공고는 로그인이 필요한 페이지입니다.',
          code: 'PARSE_LOGIN_REQUIRED',
        },
        { status: 403 }
      );
    }

    console.log('[JobParse] textLength:', finalText.length, 'selectedPosition:', selectedPosition, 'selectedCompany:', selectedCompany);
    const messages: AIMessage[] = buildJobParsingPrompt(finalText, selectedPosition, selectedCompany);

    // 11. Call AI
    const startTime = Date.now();
    const aiClient = createAIClient({ endpoint: 'job_parse' });
    let aiResponse: string;
    let inputTokens: number;
    let outputTokens: number;

    try {
      const result = await aiClient.chat({
        model: env.AI_MODEL,
        messages,
        temperature: 0.3,
        maxTokens: 4096,
      });
      aiResponse = result.content;
      console.log('[JobParse] AI response (first 3000):', aiResponse.slice(0, 3000));
      inputTokens = result.usage?.promptTokens ?? countMessagesTokens(messages);
      outputTokens = result.usage?.completionTokens ?? countTokens(result.content);
    } catch (err) {
      const errorMsg = (err as Error).message;
      await logTokenUsage({
        endpoint: 'job_parse',
        model: env.AI_MODEL,
        promptTokens: countMessagesTokens(messages),
        completionTokens: 0,
        estimated: true,
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage: errorMsg,
        userId: auth.user.userId,
        tier: auth.user.tier,
        sourceDomain,
      });
      return NextResponse.json(
        { error: 'AI 분석 중 오류가 발생했습니다.', code: 'AI_ERROR', retryable: true },
        { status: 500 }
      );
    }

    // 12. Parse AI response
    let parseResult;
    try {
      parseResult = parseJobPostingResponse(aiResponse);
    } catch (err) {
      // Log parsing failure
      await logTokenUsage({
        endpoint: 'job_parse',
        model: env.AI_MODEL,
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        estimated: true,
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage: 'PARSE_AI_FAILED',
        userId: auth.user.userId,
        tier: auth.user.tier,
        sourceDomain,
      });

      return NextResponse.json(
        {
          error: 'AI 응답을 해석할 수 없습니다.',
          code: 'PARSE_AI_FAILED',
          retryable: true,
        },
        { status: 500 }
      );
    }

    // 13. Handle error results
    if (parseResult.status === 'error') {
      // Log successful AI call but error result
      await logTokenUsage({
        endpoint: 'job_parse',
        model: env.AI_MODEL,
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        estimated: true,
        durationMs: Date.now() - startTime,
        success: true,
        userId: auth.user.userId,
        tier: auth.user.tier,
        sourceDomain,
      });

      const { errorCode, message, companies } = parseResult;

      switch (errorCode) {
        case 'LOGIN_REQUIRED':
          return NextResponse.json(
            {
              error: message || '해당 채용 공고는 로그인이 필요합니다.',
              code: 'PARSE_LOGIN_REQUIRED',
            },
            { status: 403 }
          );

        case 'EXPIRED':
          return NextResponse.json(
            {
              error: message || '해당 채용 공고가 만료되었습니다.',
              code: 'PARSE_EXPIRED',
            },
            { status: 410 }
          );

        case 'NOT_JOB_POSTING':
          return NextResponse.json(
            {
              error: message || '채용 공고가 아닙니다.',
              code: 'PARSE_NOT_JOB_POSTING',
            },
            { status: 422 }
          );

        case 'MULTIPLE_POSITIONS':
          return NextResponse.json(
            {
              error: message || '여러 포지션이 발견되었습니다. 하나를 선택해주세요.',
              code: 'PARSE_MULTIPLE_POSITIONS',
              companies: companies || [],
            },
            { status: 300 }
          );

        default:
          return NextResponse.json(
            {
              error: message || '알 수 없는 오류가 발생했습니다.',
              code: 'PARSE_UNKNOWN_ERROR',
            },
            { status: 422 }
          );
      }
    }

    // 14. Success case - Log token usage
    await logTokenUsage({
      endpoint: 'job_parse',
      model: env.AI_MODEL,
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      estimated: true,
      durationMs: Date.now() - startTime,
      success: true,
      userId: auth.user.userId,
      tier: auth.user.tier,
      sourceDomain,
    });

    // Cache for 24 hours (86400 seconds)
    const cacheValue = JSON.stringify({
      parsed: parseResult.data,
      meta: { usedVision: false, imageCount: 0 },
      cachedAt: new Date().toISOString(),
    });
    await cache.set(cacheKey, cacheValue, 86400).catch(err => {
      console.warn('[JobParse] Cache set failed:', err);
    });

    // 15. Return success response
    return NextResponse.json(
      {
        parsed: parseResult.data,
        meta: { usedVision: false, imageCount: 0 },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
