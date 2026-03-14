/**
 * Run GHL + Meta sync locally (one-shot)
 * Usage: node --env-file=.env run-sync.js
 *   or:  node -e "require('dotenv').config()" && node run-sync.js
 */
import 'dotenv/config';
import { syncGHL, syncMeta } from './sync.js';

console.log('=== LOCAL SYNC START ===');
console.log('Time:', new Date().toISOString());

try {
  await syncGHL();
  console.log('\nGHL sync done. Starting Meta Ads sync (90 days)...\n');
  await syncMeta(90);
  console.log('\n=== ALL SYNCS COMPLETE ===');
} catch (e) {
  console.error('Sync failed:', e.message);
  process.exit(1);
}
