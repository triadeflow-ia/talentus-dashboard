/**
 * Supabase Sync Module — Syncs GHL + Meta Ads data to Supabase
 * Used by server.js via import { startSync, syncGHL, syncMeta } from './sync.js'
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GHL_TOKEN = process.env.GHL_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

let supabase = null;

export function getSupabase() {
  if (!supabase && SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabase;
}

// --- GHL API Helper ---
async function ghlFetch(pathStr) {
  const url = `${GHL_BASE_URL}${pathStr}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GHL_TOKEN}`,
      'Version': '2021-07-28',
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL API ${res.status}: ${text.substring(0, 200)}`);
  }
  return res.json();
}

// --- Meta API Helper ---
async function metaFetch(path, params = {}) {
  if (!META_ACCESS_TOKEN) return null;
  const url = new URL(`${META_BASE_URL}${path}`);
  url.searchParams.set('access_token', META_ACCESS_TOKEN);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API ${res.status}: ${text.substring(0, 200)}`);
  }
  return res.json();
}

// --- GHL User ID → Name mapping ---
const SELLER_META = {
  '9AXuakmsPmncaaojIyGw': 'Lucas Rodrigues',
  '2Z0eH6IjgWDqUw5b4fqS': 'Gilcilene Lima',
  'CfeKqpQX6eWKCVVwyRsQ': 'Karla Yonara',
  '77uDX774vmKxyMxEhfCR': 'Mateus Cortez',
  'W4iYpPWuyc1lVnfyIKa5': 'Jessica Monteiro',
};

function resolveSellerName(raw) {
  if (!raw) return null;
  if (SELLER_META[raw]) return SELLER_META[raw];
  return raw;
}

// GHL Custom Field ID → logical name mapping
const CUSTOM_FIELD_MAP = {
  '2KaHcDNMZDwsozLFB1lL': 'marca',
  'qpiSM6URmXbv28u0aFUH': 'produto',
  'BckPK8Tk8yZvGWeGIBIZ': 'vendedor',
  'LOY9OJpiGa5WfIgQE02G': 'valor_fechado',
};

function getCustomField(opp, ...keys) {
  const fields = opp.customFields || [];
  for (const f of fields) {
    // Check by field ID mapping
    const fieldId = f.id || f.key || '';
    const mappedName = CUSTOM_FIELD_MAP[fieldId];
    if (mappedName && keys.some(key => mappedName.includes(key))) {
      return f.value || f.fieldValue || f.field_value || null;
    }
    // Check by key/fieldKey name (fallback)
    const k = (f.key || f.fieldKey || '').toLowerCase();
    if (keys.some(key => k.includes(key))) {
      return f.value || f.fieldValue || f.field_value || null;
    }
  }
  return null;
}

// --- Pipeline info ---
const PIPELINE_IDS = {
  comercial: 'kR7dX3quCskPn8y1hUR5',
  nutricao: 'YGbvdHFPw2OMVgEyshGJ',
  onboarding: 'dEwvGqgx6Z89e0sRzyW6',
  recuperacao: '1MYy0chmMviDTSxC1JH2',
  sucesso: 'KHdJOMDLNrB8G7aSxZM6',
  suporte: 'AOaBfkNUCZlYskkU3aMh',
};

const PIPELINE_NAMES = {
  [PIPELINE_IDS.comercial]: 'Comercial',
  [PIPELINE_IDS.nutricao]: 'Nutricao',
  [PIPELINE_IDS.onboarding]: 'Onboarding de Produto',
  [PIPELINE_IDS.recuperacao]: 'Recuperacao',
  [PIPELINE_IDS.sucesso]: 'Sucesso do Cliente',
  [PIPELINE_IDS.suporte]: 'Suporte',
};

// ==========================
// GHL SYNC
// ==========================
export async function syncGHL() {
  const sb = getSupabase();
  if (!sb || !GHL_TOKEN) {
    console.log('[sync] Skipping GHL sync — missing credentials');
    return;
  }

  console.log('[sync] Starting GHL sync...');
  const startedAt = new Date().toISOString();

  // Log sync start
  const { data: logEntry } = await sb.from('sync_log').insert({
    source: 'ghl', started_at: startedAt, status: 'running',
  }).select('id').single();
  const logId = logEntry?.id;

  try {
    let totalSynced = 0;

    // Sync opportunities from all pipelines
    for (const [key, pipelineId] of Object.entries(PIPELINE_IDS)) {
      const pipelineName = PIPELINE_NAMES[pipelineId] || key;
      console.log(`[sync]   Pipeline: ${pipelineName}`);

      // Fetch pipeline stages for stage name resolution
      let stageMap = {};
      try {
        const pipelinesData = await ghlFetch(`/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`);
        const pipeline = (pipelinesData.pipelines || []).find(p => p.id === pipelineId);
        if (pipeline) {
          for (const stage of (pipeline.stages || [])) {
            stageMap[stage.id] = stage.name;
          }
        }
      } catch (e) {
        console.warn(`[sync]   Could not fetch stages: ${e.message}`);
      }

      // Paginate all opportunities
      let startAfterId = '';
      let hasMore = true;
      while (hasMore) {
        const query = new URLSearchParams({
          location_id: GHL_LOCATION_ID,
          pipeline_id: pipelineId,
          limit: '100',
        });
        if (startAfterId) query.set('startAfterId', startAfterId);

        const data = await ghlFetch(`/opportunities/search?${query.toString()}`);
        const opps = data.opportunities || [];

        if (opps.length > 0) {
          const rows = opps.map(opp => ({
            id: opp.id,
            pipeline_id: pipelineId,
            pipeline_name: pipelineName,
            pipeline_stage_id: opp.pipelineStageId || null,
            pipeline_stage_name: stageMap[opp.pipelineStageId] || opp.pipelineStageName || null,
            status: opp.status || 'open',
            contact_id: opp.contactId || opp.contact?.id || null,
            contact_name: opp.contact?.name || opp.contactName || null,
            contact_email: opp.contact?.email || null,
            contact_phone: opp.contact?.phone || null,
            monetary_value: parseFloat(opp.monetaryValue) || 0,
            marca: getCustomField(opp, 'marca') || null,
            produto: getCustomField(opp, 'produto') || null,
            vendedor: resolveSellerName(getCustomField(opp, 'vendedor') || opp.assignedTo) || null,
            assigned_to: opp.assignedTo || null,
            loss_reason: getCustomField(opp, 'motivo') || null,
            source: getCustomField(opp, 'origem') || null,
            tags: opp.tags || [],
            created_at: opp.createdAt || opp.dateAdded || new Date().toISOString(),
            updated_at: opp.updatedAt || opp.lastStatusChangeAt || null,
            synced_at: new Date().toISOString(),
          }));

          const { error } = await sb.from('opportunities').upsert(rows, { onConflict: 'id' });
          if (error) console.error(`[sync]   Upsert error: ${error.message}`);
          else totalSynced += rows.length;
        }

        if (opps.length < 100) {
          hasMore = false;
        } else {
          startAfterId = opps[opps.length - 1].id;
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // Sync contacts
    console.log('[sync]   Syncing contacts...');
    let contactsStartAfter = null;
    let contactsSynced = 0;
    let hasMoreContacts = true;
    while (hasMoreContacts) {
      let url = `/contacts/?locationId=${GHL_LOCATION_ID}&limit=100`;
      if (contactsStartAfter) url += `&startAfterId=${contactsStartAfter}`;

      const data = await ghlFetch(url);
      const contacts = data.contacts || [];

      if (contacts.length > 0) {
        const rows = contacts.map(c => ({
          id: c.id,
          name: c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ') || null,
          email: c.email || null,
          phone: c.phone || null,
          marca: null, // contacts don't have custom fields in list endpoint
          tags: c.tags || [],
          assigned_to: c.assignedTo || null,
          vendedor: resolveSellerName(c.assignedTo) || null,
          source: c.source || null,
          created_at: c.dateAdded || new Date().toISOString(),
          synced_at: new Date().toISOString(),
        }));

        const { error } = await sb.from('contacts').upsert(rows, { onConflict: 'id' });
        if (error) console.error(`[sync]   Contacts upsert error: ${error.message}`);
        else contactsSynced += rows.length;
      }

      if (contacts.length < 100) {
        hasMoreContacts = false;
      } else {
        contactsStartAfter = contacts[contacts.length - 1].id;
      }
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`[sync] GHL sync complete: ${totalSynced} opps, ${contactsSynced} contacts`);

    if (logId) {
      await sb.from('sync_log').update({
        finished_at: new Date().toISOString(),
        status: 'success',
        records_synced: totalSynced + contactsSynced,
      }).eq('id', logId);
    }
  } catch (err) {
    console.error(`[sync] GHL sync error: ${err.message}`);
    if (logId) {
      await sb.from('sync_log').update({
        finished_at: new Date().toISOString(),
        status: 'error',
        error_message: err.message.substring(0, 500),
      }).eq('id', logId);
    }
  }
}

// ==========================
// META ADS SYNC
// ==========================
const INSIGHTS_FIELDS = 'spend,impressions,reach,clicks,cpc,cpm,ctr,actions,action_values,cost_per_action_type,frequency,unique_clicks,cost_per_unique_click';

function extractActions(row) {
  const actions = row.actions || [];
  const actionValues = row.action_values || [];
  const costPerAction = row.cost_per_action_type || [];
  return {
    leads: parseInt(actions.find(a => a.action_type === 'lead')?.value || 0),
    purchases: parseInt(actions.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0),
    purchaseValue: parseFloat(actionValues.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0),
    landingPageViews: parseInt(actions.find(a => a.action_type === 'landing_page_view')?.value || 0),
    linkClicks: parseInt(actions.find(a => a.action_type === 'link_click')?.value || 0),
    cpl: parseFloat(costPerAction.find(a => a.action_type === 'lead')?.value || 0),
    cpa: parseFloat(costPerAction.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0),
  };
}

export async function syncMeta(days = 90) {
  const sb = getSupabase();
  if (!sb || !META_ACCESS_TOKEN) {
    console.log('[sync] Skipping Meta sync — missing credentials');
    return;
  }

  console.log(`[sync] Starting Meta Ads sync (last ${days} days)...`);
  const startedAt = new Date().toISOString();

  const { data: logEntry } = await sb.from('sync_log').insert({
    source: 'meta', started_at: startedAt, status: 'running',
  }).select('id').single();
  const logId = logEntry?.id;

  try {
    let totalSynced = 0;

    // Get all ad accounts
    const accountsData = await metaFetch('/me/adaccounts', {
      fields: 'name,account_id,account_status,currency,business_name,amount_spent',
      limit: '50',
    });
    const accounts = (accountsData?.data || []).filter(a => a.account_status === 1);

    for (const account of accounts) {
      const accountId = account.id;
      const accountName = account.name;
      console.log(`[sync]   Account: ${accountName} (${accountId})`);

      // Date range
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      const since = start.toISOString().split('T')[0];
      const until = end.toISOString().split('T')[0];

      // --- Sync entities (campaigns, adsets, ads) ---
      // Campaigns
      const campaignsData = await metaFetch(`/${accountId}/campaigns`, {
        fields: 'name,status,objective,daily_budget',
        limit: '200',
        filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'ARCHIVED'] }]),
      });
      const campaigns = campaignsData?.data || [];
      if (campaigns.length > 0) {
        const entityRows = campaigns.map(c => ({
          id: c.id, account_id: accountId, type: 'campaign',
          name: c.name, status: c.status, objective: c.objective,
          daily_budget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
          synced_at: new Date().toISOString(),
        }));
        await sb.from('meta_ads_entities').upsert(entityRows, { onConflict: 'id' });
      }

      // Adsets
      const adsetsData = await metaFetch(`/${accountId}/adsets`, {
        fields: 'name,status,campaign_id,daily_budget,optimization_goal',
        limit: '200',
      });
      const adsets = adsetsData?.data || [];
      if (adsets.length > 0) {
        const entityRows = adsets.map(a => ({
          id: a.id, account_id: accountId, type: 'adset',
          name: a.name, status: a.status, parent_id: a.campaign_id,
          daily_budget: a.daily_budget ? parseFloat(a.daily_budget) / 100 : null,
          optimization_goal: a.optimization_goal,
          synced_at: new Date().toISOString(),
        }));
        await sb.from('meta_ads_entities').upsert(entityRows, { onConflict: 'id' });
      }

      // Ads
      const adsData = await metaFetch(`/${accountId}/ads`, {
        fields: 'name,status,adset_id,campaign_id,creative{thumbnail_url}',
        limit: '200',
      });
      const ads = adsData?.data || [];
      if (ads.length > 0) {
        const entityRows = ads.map(a => ({
          id: a.id, account_id: accountId, type: 'ad',
          name: a.name, status: a.status, parent_id: a.adset_id,
          thumbnail_url: a.creative?.thumbnail_url || null,
          synced_at: new Date().toISOString(),
        }));
        await sb.from('meta_ads_entities').upsert(entityRows, { onConflict: 'id' });
      }

      // --- Sync daily insights at campaign level ---
      console.log(`[sync]     Fetching campaign insights...`);
      const campaignInsights = await metaFetch(`/${accountId}/insights`, {
        fields: `campaign_id,campaign_name,${INSIGHTS_FIELDS}`,
        time_range: JSON.stringify({ since, until }),
        time_increment: '1',
        level: 'campaign',
        limit: '5000',
      });

      for (const row of (campaignInsights?.data || [])) {
        const ex = extractActions(row);
        const dailyRow = {
          date: row.date_start,
          account_id: accountId,
          account_name: accountName,
          campaign_id: row.campaign_id,
          campaign_name: row.campaign_name,
          level: 'campaign',
          spend: parseFloat(row.spend || 0),
          impressions: parseInt(row.impressions || 0),
          reach: parseInt(row.reach || 0),
          clicks: parseInt(row.clicks || 0),
          unique_clicks: parseInt(row.unique_clicks || 0),
          cpc: parseFloat(row.cpc || 0),
          cpm: parseFloat(row.cpm || 0),
          ctr: parseFloat(row.ctr || 0),
          frequency: parseFloat(row.frequency || 0),
          ...ex,
          landing_page_views: ex.landingPageViews,
          link_clicks: ex.linkClicks,
          purchase_value: ex.purchaseValue,
          synced_at: new Date().toISOString(),
        };
        // Remove camelCase duplicates
        delete dailyRow.landingPageViews;
        delete dailyRow.linkClicks;
        delete dailyRow.purchaseValue;

        const { error } = await sb.from('meta_ads_daily').upsert(dailyRow, {
          onConflict: 'date,account_id,campaign_id,level',
          ignoreDuplicates: false,
        });
        if (error && !error.message.includes('duplicate')) {
          // Fallback: try insert with manual conflict check
          await sb.from('meta_ads_daily')
            .delete()
            .eq('date', dailyRow.date)
            .eq('account_id', dailyRow.account_id)
            .eq('campaign_id', dailyRow.campaign_id)
            .eq('level', 'campaign');
          await sb.from('meta_ads_daily').insert(dailyRow);
        }
        totalSynced++;
      }

      // --- Sync daily insights at account level (aggregated) ---
      console.log(`[sync]     Fetching account insights...`);
      const accountInsights = await metaFetch(`/${accountId}/insights`, {
        fields: INSIGHTS_FIELDS,
        time_range: JSON.stringify({ since, until }),
        time_increment: '1',
        level: 'account',
        limit: '500',
      });

      for (const row of (accountInsights?.data || [])) {
        const ex = extractActions(row);
        const dailyRow = {
          date: row.date_start,
          account_id: accountId,
          account_name: accountName,
          level: 'account',
          spend: parseFloat(row.spend || 0),
          impressions: parseInt(row.impressions || 0),
          reach: parseInt(row.reach || 0),
          clicks: parseInt(row.clicks || 0),
          unique_clicks: parseInt(row.unique_clicks || 0),
          cpc: parseFloat(row.cpc || 0),
          cpm: parseFloat(row.cpm || 0),
          ctr: parseFloat(row.ctr || 0),
          frequency: parseFloat(row.frequency || 0),
          ...ex,
          landing_page_views: ex.landingPageViews,
          link_clicks: ex.linkClicks,
          purchase_value: ex.purchaseValue,
          synced_at: new Date().toISOString(),
        };
        delete dailyRow.landingPageViews;
        delete dailyRow.linkClicks;
        delete dailyRow.purchaseValue;

        await sb.from('meta_ads_daily')
          .delete()
          .eq('date', dailyRow.date)
          .eq('account_id', dailyRow.account_id)
          .eq('level', 'account')
          .is('campaign_id', null);
        await sb.from('meta_ads_daily').insert(dailyRow);
        totalSynced++;
      }

      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`[sync] Meta sync complete: ${totalSynced} daily records`);

    if (logId) {
      await sb.from('sync_log').update({
        finished_at: new Date().toISOString(),
        status: 'success',
        records_synced: totalSynced,
      }).eq('id', logId);
    }
  } catch (err) {
    console.error(`[sync] Meta sync error: ${err.message}`);
    if (logId) {
      await sb.from('sync_log').update({
        finished_at: new Date().toISOString(),
        status: 'error',
        error_message: err.message.substring(0, 500),
      }).eq('id', logId);
    }
  }
}

// ==========================
// START SYNC (called from server.js)
// ==========================
export async function startSync() {
  const sb = getSupabase();
  if (!sb) {
    console.log('[sync] Supabase not configured — sync disabled');
    return;
  }

  console.log('[sync] Initial sync starting...');

  // Run initial sync
  await syncGHL();
  await syncMeta(90); // backfill 90 days

  // Schedule periodic syncs
  setInterval(() => {
    console.log('[sync] Periodic GHL sync...');
    syncGHL().catch(e => console.error('[sync] GHL periodic error:', e.message));
  }, 15 * 60 * 1000); // every 15 min

  setInterval(() => {
    console.log('[sync] Periodic Meta sync...');
    syncMeta(7).catch(e => console.error('[sync] Meta periodic error:', e.message));
  }, 30 * 60 * 1000); // every 30 min

  console.log('[sync] Sync scheduled: GHL every 15min, Meta every 30min');
}
