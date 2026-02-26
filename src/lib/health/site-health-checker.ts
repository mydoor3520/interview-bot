/**
 * Site Health Checker
 *
 * Validates that site-specific selectors in job-parser.ts are working correctly.
 */

import { fetchJobPostingHTML, analyzePageContent } from '@/lib/ai/job-parser';

// Sample URLs for each supported site (real job posting patterns)
export const SAMPLE_URLS: Record<string, string> = {
  'saramin.co.kr': 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=49726541',
  'wanted.co.kr': 'https://www.wanted.co.kr/wd/209001',
  'jumpit.saramin.co.kr': 'https://jumpit.saramin.co.kr/position/27878',
  'career.programmers.co.kr': 'https://career.programmers.co.kr/job_positions/26866',
  'jobkorea.co.kr': 'https://www.jobkorea.co.kr/Recruit/GI_Read/46381850',
  'rallit.com': 'https://rallit.com/positions/2735',
  'rocketpunch.com': 'https://www.rocketpunch.com/jobs?selectedJobId=170385',
  'incruit.com': 'https://job.incruit.com/jobdb_info/jobpost.asp?job=2502060001581',
};

export const MIN_TEXT_LENGTH = 500; // Minimum extracted text length for success

export interface SiteHealthResult {
  domain: string;
  url: string;
  status: 'pass' | 'fail';
  extractedChars: number;
  error?: string;
  durationMs: number;
}

async function checkSite(domain: string, url: string): Promise<SiteHealthResult> {
  const startTime = Date.now();

  try {
    // Fetch HTML using the job parser's browser client
    const { html, screenshots } = await fetchJobPostingHTML(url);

    // Analyze page content to extract text
    const analysis = analyzePageContent(html, url, screenshots);

    const durationMs = Date.now() - startTime;
    const extractedChars = analysis.extractedText.length;

    // Success criteria: extracted text > MIN_TEXT_LENGTH
    const status = extractedChars >= MIN_TEXT_LENGTH ? 'pass' : 'fail';

    return {
      domain,
      url,
      status,
      extractedChars,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const error = (err as Error).message;

    return {
      domain,
      url,
      status: 'fail',
      extractedChars: 0,
      error,
      durationMs,
    };
  }
}

export async function runHealthCheck(): Promise<SiteHealthResult[]> {
  const results: SiteHealthResult[] = [];

  // Check sites sequentially to avoid overloading the browser pool
  for (const [domain, url] of Object.entries(SAMPLE_URLS)) {
    const result = await checkSite(domain, url);
    results.push(result);
  }

  return results;
}
