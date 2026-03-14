/**
 * Run Meta Ads sync only (skip GHL)
 * Usage: node --require dotenv/config run-meta-sync.js
 */
import { syncMeta } from './sync.js';

console.log('=== META ADS SYNC ===');
console.log('Time:', new Date().toISOString());

try {
  await syncMeta(90);
  console.log('\n=== META ADS SYNC COMPLETE ===');
} catch (e) {
  console.error('Meta sync failed:', e.message);
  process.exit(1);
}
