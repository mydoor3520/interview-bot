#!/usr/bin/env tsx
/**
 * Selector Health Check Script
 *
 * Validates that site-specific selectors in job-parser.ts are working correctly.
 * Tests each of the 8 supported Korean job sites with sample URLs.
 *
 * Usage:
 *   npx tsx scripts/check-site-selectors.ts
 */

import { runHealthCheck, SAMPLE_URLS, MIN_TEXT_LENGTH, type SiteHealthResult } from '../src/lib/health/site-health-checker';

async function main() {
  try {
    console.log('🚀 Starting selector health check...');
    console.log(`Testing ${Object.keys(SAMPLE_URLS).length} sites\n`);

    const results = await runHealthCheck();

    // Log individual results
    results.forEach((r) => {
      if (r.status === 'pass') {
        console.log(`✅ ${r.domain}: ${r.extractedChars} chars extracted (${r.durationMs}ms)`);
      } else {
        console.log(`❌ ${r.domain}: ${r.error || `Only ${r.extractedChars} chars extracted (expected >= ${MIN_TEXT_LENGTH})`}`);
      }
    });

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 HEALTH CHECK SUMMARY');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;

    console.log(`\nTotal: ${results.length} sites`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
      console.log('\n⚠️  Failed sites:');
      results
        .filter(r => r.status === 'fail')
        .forEach(r => {
          console.log(`  - ${r.domain}: ${r.error || `Only ${r.extractedChars} chars`}`);
        });
    }

    // Exit with error code if any site failed
    if (failed > 0) {
      process.exit(1);
    }

    console.log('\n✨ All sites passed!\n');
    process.exit(0);
  } catch (err) {
    console.error('💥 Fatal error:', (err as Error).message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
