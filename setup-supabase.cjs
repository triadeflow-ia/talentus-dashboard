const { Client } = require('pg');

const PROJECT_ID = 'lhjtqgyosjhbfzipbikq';
const DB_PASS = 'p3aQuMosToNJrWRA';

const regions = [
  'aws-0-sa-east-1',
  'aws-0-us-east-1',
  'aws-0-us-east-2',
  'aws-0-us-west-1',
  'aws-0-eu-west-1',
  'aws-0-eu-central-1',
  'aws-0-ap-southeast-1',
];

const schema = [
  // Opportunities
  `CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL,
    pipeline_name TEXT NOT NULL,
    pipeline_stage_id TEXT,
    pipeline_stage_name TEXT,
    status TEXT NOT NULL,
    contact_id TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    monetary_value NUMERIC(12,2) DEFAULT 0,
    marca TEXT,
    produto TEXT,
    vendedor TEXT,
    assigned_to TEXT,
    loss_reason TEXT,
    source TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_opps_status ON opportunities(status)`,
  `CREATE INDEX IF NOT EXISTS idx_opps_marca ON opportunities(marca)`,
  `CREATE INDEX IF NOT EXISTS idx_opps_vendedor ON opportunities(vendedor)`,
  `CREATE INDEX IF NOT EXISTS idx_opps_pipeline ON opportunities(pipeline_id)`,
  `CREATE INDEX IF NOT EXISTS idx_opps_created ON opportunities(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_opps_pipeline_status ON opportunities(pipeline_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_opps_produto ON opportunities(produto)`,

  // Contacts
  `CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    marca TEXT,
    tags TEXT[],
    assigned_to TEXT,
    vendedor TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_marca ON contacts(marca)`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_vendedor ON contacts(vendedor)`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at)`,

  // Meta Ads Daily
  `CREATE TABLE IF NOT EXISTS meta_ads_daily (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    account_id TEXT NOT NULL,
    account_name TEXT,
    campaign_id TEXT,
    campaign_name TEXT,
    adset_id TEXT,
    adset_name TEXT,
    ad_id TEXT,
    ad_name TEXT,
    level TEXT NOT NULL,
    spend NUMERIC(10,2) DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    cpc NUMERIC(8,4) DEFAULT 0,
    cpm NUMERIC(8,4) DEFAULT 0,
    ctr NUMERIC(6,4) DEFAULT 0,
    frequency NUMERIC(6,2) DEFAULT 0,
    leads INTEGER DEFAULT 0,
    purchases INTEGER DEFAULT 0,
    purchase_value NUMERIC(10,2) DEFAULT 0,
    landing_page_views INTEGER DEFAULT 0,
    link_clicks INTEGER DEFAULT 0,
    cpl NUMERIC(8,2) DEFAULT 0,
    cpa NUMERIC(8,2) DEFAULT 0,
    synced_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_meta_date ON meta_ads_daily(date)`,
  `CREATE INDEX IF NOT EXISTS idx_meta_account ON meta_ads_daily(account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_meta_campaign ON meta_ads_daily(campaign_id)`,
  `CREATE INDEX IF NOT EXISTS idx_meta_level ON meta_ads_daily(level)`,
  `CREATE INDEX IF NOT EXISTS idx_meta_date_level ON meta_ads_daily(date, level)`,

  // Meta Ads Entities
  `CREATE TABLE IF NOT EXISTS meta_ads_entities (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT,
    parent_id TEXT,
    objective TEXT,
    daily_budget NUMERIC(10,2),
    optimization_goal TEXT,
    thumbnail_url TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_entities_account ON meta_ads_entities(account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_entities_type ON meta_ads_entities(type)`,
  `CREATE INDEX IF NOT EXISTS idx_entities_parent ON meta_ads_entities(parent_id)`,

  // Sync Log
  `CREATE TABLE IF NOT EXISTS sync_log (
    id SERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running',
    records_synced INTEGER DEFAULT 0,
    error_message TEXT
  )`,
];

async function tryConnect(region, port) {
  var connStr = 'postgresql://postgres.' + PROJECT_ID + ':' + DB_PASS + '@' + region + '.pooler.supabase.com:' + port + '/postgres';
  var client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    console.log('  OK ' + region + ':' + port);
    return client;
  } catch (err) {
    console.log('  X  ' + region + ':' + port + ' — ' + err.message.substring(0, 50));
    return null;
  }
}

async function main() {
  console.log('Trying Supabase pooler regions...\n');

  var client = null;
  for (var r of regions) {
    client = await tryConnect(r, 5432);
    if (client) break;
  }
  if (!client) {
    console.log('\nTrying port 6543...\n');
    for (var r of regions) {
      client = await tryConnect(r, 6543);
      if (client) break;
    }
  }

  if (!client) {
    console.error('\nCould not connect. Check credentials.');
    process.exit(1);
  }

  console.log('\nCreating schema...\n');

  for (var stmt of schema) {
    try {
      await client.query(stmt);
      var match = stmt.match(/(?:TABLE|INDEX).*?IF NOT EXISTS\s+(\S+)/i);
      console.log('  OK ' + (match ? match[1] : 'done'));
    } catch (err) {
      console.error('  ERR ' + err.message.substring(0, 80));
    }
  }

  var res = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );
  console.log('\nTables: ' + res.rows.map(function(r) { return r.table_name; }).join(', '));

  await client.end();
  console.log('\nDone!');
}

main().catch(function(err) { console.error('Fatal:', err.message); process.exit(1); });
