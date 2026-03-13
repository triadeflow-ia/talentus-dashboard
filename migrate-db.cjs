/**
 * Add unique constraints needed for Supabase upserts
 * Run once: node migrate-db.cjs
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lhjtqgyosjhbfzipbikq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_KEY) {
  // Try loading from .env
  require('dotenv').config();
}

const sb = createClient(
  process.env.SUPABASE_URL || SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY
);

async function migrate() {
  console.log('Running database migrations...\n');

  // Add unique constraint for meta_ads_daily upserts
  // Using RPC to run raw SQL
  const migrations = [
    {
      name: 'Add unique constraint on meta_ads_daily',
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_daily_unique
            ON meta_ads_daily(date, account_id, COALESCE(campaign_id, ''), level)`,
    },
    {
      name: 'Add unique constraint on meta_ads_daily (adset level)',
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_daily_adset_unique
            ON meta_ads_daily(date, account_id, COALESCE(campaign_id, ''), COALESCE(adset_id, ''), level)`,
    },
  ];

  for (const m of migrations) {
    console.log(`  Running: ${m.name}...`);
    const { error } = await sb.rpc('exec_sql', { sql: m.sql }).single();
    if (error) {
      // Try via direct query if RPC not available
      console.log(`  Note: RPC not available, constraint may need manual SQL.`);
      console.log(`  SQL: ${m.sql}`);
    } else {
      console.log(`  OK`);
    }
  }

  // Test connection by reading sync_log
  const { data, error } = await sb.from('sync_log').select('*').order('id', { ascending: false }).limit(5);
  if (error) {
    console.log('\nSync log check failed:', error.message);
  } else {
    console.log(`\nSync log entries: ${data?.length || 0}`);
    if (data && data.length > 0) {
      for (const row of data) {
        console.log(`  [${row.source}] ${row.status} — ${row.records_synced || 0} records (${row.started_at})`);
      }
    }
  }

  // Check opportunities count
  const { count: oppCount } = await sb.from('opportunities').select('*', { count: 'exact', head: true });
  console.log(`\nOpportunities in DB: ${oppCount || 0}`);

  // Check meta_ads_daily count
  const { count: metaCount } = await sb.from('meta_ads_daily').select('*', { count: 'exact', head: true });
  console.log(`Meta ads daily records: ${metaCount || 0}`);

  // Check meta_ads_entities count
  const { count: entityCount } = await sb.from('meta_ads_entities').select('*', { count: 'exact', head: true });
  console.log(`Meta ads entities: ${entityCount || 0}`);

  // Check contacts count
  const { count: contactCount } = await sb.from('contacts').select('*', { count: 'exact', head: true });
  console.log(`Contacts: ${contactCount || 0}`);

  console.log('\nDone!');
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
