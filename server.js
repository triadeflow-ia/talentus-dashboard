import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { startSync } from './sync.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3940;
const GHL_TOKEN = process.env.GHL_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

// --- Meta Ads (multi-account) ---
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID; // default account (optional)
const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// --- Pipeline IDs ---
const PIPELINE_COMERCIAL_MATEUS = process.env.PIPELINE_COMERCIAL_MATEUS || 'kR7dX3quCskPn8y1hUR5';
const PIPELINE_COMERCIAL_CYB = process.env.PIPELINE_COMERCIAL_CYB || 'l0xKJIaG2JOWnpriXGlS';

const PIPELINE_IDS = {
  comercialMateus: PIPELINE_COMERCIAL_MATEUS,
  comercialCyb: PIPELINE_COMERCIAL_CYB,
  nutricao: 'YGbvdHFPw2OMVgEyshGJ',
  onboarding: 'dEwvGqgx6Z89e0sRzyW6',
  recuperacao: '1MYy0chmMviDTSxC1JH2',
  sucesso: 'KHdJOMDLNrB8G7aSxZM6',
  suporte: 'AOaBfkNUCZlYskkU3aMh',
};

// IDs of commercial pipelines (used for funnel aggregation)
const COMMERCIAL_PIPELINE_IDS = [PIPELINE_IDS.comercialMateus, PIPELINE_IDS.comercialCyb];

const PIPELINE_NAMES = {
  [PIPELINE_IDS.comercialMateus]: 'Comercial Mateus Cortez',
  [PIPELINE_IDS.comercialCyb]: 'Comercial CybNutri',
  [PIPELINE_IDS.nutricao]: 'Nutricao',
  [PIPELINE_IDS.onboarding]: 'Onboarding de Produto',
  [PIPELINE_IDS.recuperacao]: 'Recuperacao',
  [PIPELINE_IDS.sucesso]: 'Sucesso do Cliente',
  [PIPELINE_IDS.suporte]: 'Suporte',
};

// --- Seller metadata (photos, team info) ---
// GHL User IDs: Lucas=9AXuakmsPmncaaojIyGw, Gilcilene=2Z0eH6IjgWDqUw5b4fqS,
// Karla Yonara=CfeKqpQX6eWKCVVwyRsQ, Mateus=77uDX774vmKxyMxEhfCR, Jessica=W4iYpPWuyc1lVnfyIKa5
const SELLER_META = {
  'lucas rodrigues': {
    photo: '/photos/lucas-rodrigues.jpg',
    role: 'Vendedor',
    email: 'profissional.lucasrodrigues@gmail.com',
    ghlId: '9AXuakmsPmncaaojIyGw',
  },
  'gilcilene lima': {
    photo: '/photos/gilcilene-lima.jpg',
    role: 'Vendedora',
    email: 'gilcilenelimaadm25@gmail.com',
    ghlId: '2Z0eH6IjgWDqUw5b4fqS',
  },
  'karla yonara': {
    photo: '/photos/karla-yonara.jpg',
    role: 'Vendedora',
    email: 'kyonaragomes@gmail.com',
    ghlId: 'CfeKqpQX6eWKCVVwyRsQ',
  },
  'mateus cortez': {
    photo: '/photos/mateus-cortez.jpg',
    role: 'CEO / Estrategista',
    email: 'mateuscortez@empresacmcdigital.com',
    ghlId: '77uDX774vmKxyMxEhfCR',
  },
  'jessica monteiro': {
    photo: 'https://api.dicebear.com/9.x/notionists/svg?seed=Jessica&backgroundColor=ec4899',
    role: 'Suporte / Admin',
    email: 'suporte@empresacmcdigital.com',
    ghlId: 'W4iYpPWuyc1lVnfyIKa5',
  },
};

// Build reverse lookup: GHL ID → seller name
const GHL_ID_TO_NAME = {};
for (const [name, meta] of Object.entries(SELLER_META)) {
  if (meta.ghlId) {
    GHL_ID_TO_NAME[meta.ghlId] = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}

// Resolve GHL user ID to seller name
function resolveSellerName(rawName) {
  if (!rawName) return null;
  // If it's a GHL user ID, resolve to name
  if (GHL_ID_TO_NAME[rawName]) return GHL_ID_TO_NAME[rawName];
  return rawName;
}

// --- Brand/Product definitions ---
const BRAND_PRODUCTS = {
  'Mateus Cortez': {
    slug: 'mateus',
    color: '#6366f1',
    products: ['Virada Digital', 'Escola de Negocios', 'Sala Secreta', 'Performance Day'],
  },
  'CybNutri': {
    slug: 'cyb',
    color: '#10b981',
    products: ['Low Ticket CYB', 'Formacao Nutri Expert', 'Escola Nutri Expert', 'Profissional Mentory'],
  },
};

// --- Startup validation ---
if (!GHL_TOKEN) console.warn('⚠️  GHL_TOKEN not set — GHL endpoints will fail');
if (!GHL_LOCATION_ID) console.warn('⚠️  GHL_LOCATION_ID not set — GHL endpoints will fail');
if (!META_ACCESS_TOKEN) console.warn('ℹ️  META_ACCESS_TOKEN not set — Meta Ads disabled');

// --- In-memory cache ---
const cache = {
  data: null,
  timestamp: 0,
  ttl: 2 * 60 * 1000, // 2 minutes
  fetching: null,
};

// Read opportunities from Supabase (no rate limit, fast)
async function getOpportunitiesFromSupabase() {
  const { getSupabase } = await import('./sync.js');
  const sb = getSupabase();
  if (!sb) return null;

  // Supabase REST returns max 1000 rows per request — paginate to get all
  let allData = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await sb.from('opportunities').select('*').range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error('[supabase] Read error:', error.message);
      return allData.length > 0 ? null : null;
    }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  if (allData.length === 0) return null;
  const data = allData;

  // Group by pipeline_id and convert to GHL-like format
  const pipelineMap = {};
  for (const row of data) {
    const pid = row.pipeline_id;
    if (!pipelineMap[pid]) pipelineMap[pid] = [];
    pipelineMap[pid].push({
      id: row.id,
      pipelineId: row.pipeline_id,
      pipelineStageId: row.pipeline_stage_id,
      pipelineStageName: row.pipeline_stage_name,
      status: row.status,
      contactId: row.contact_id,
      contact: { name: row.contact_name, email: row.contact_email, phone: row.contact_phone },
      contactName: row.contact_name,
      monetaryValue: row.monetary_value,
      assignedTo: row.assigned_to,
      tags: row.tags || [],
      createdAt: row.created_at,
      dateAdded: row.created_at,
      updatedAt: row.updated_at,
      customFields: [
        { key: 'marca', value: row.marca },
        { key: 'produto', value: row.produto },
        { key: 'vendedor_responsavel', value: row.vendedor },
        { key: 'motivo_perda', value: row.loss_reason },
        { key: 'origem', value: row.source },
      ].filter(f => f.value),
    });
  }

  return Object.entries(pipelineMap).map(([pipelineId, opportunities]) => ({
    pipelineId,
    opportunities,
  }));
}

async function getCachedOpportunities() {
  const now = Date.now();
  if (cache.data && (now - cache.timestamp) < cache.ttl) {
    return cache.data;
  }
  if (cache.fetching) return cache.fetching;

  cache.fetching = (async () => {
    // Try Supabase first (no rate limit)
    const supabaseData = await getOpportunitiesFromSupabase();
    if (supabaseData && supabaseData.length > 0) {
      console.log(`[cache] Loaded ${supabaseData.reduce((n, p) => n + p.opportunities.length, 0)} opps from Supabase`);
      cache.data = supabaseData;
      cache.timestamp = Date.now();
      cache.fetching = null;
      return supabaseData;
    }

    // Fallback to GHL API
    console.log('[cache] Supabase empty, falling back to GHL API...');
    const results = await fetchAllPipelineOpportunities();
    cache.data = results;
    cache.timestamp = Date.now();
    cache.fetching = null;
    return results;
  })().catch(err => {
    cache.fetching = null;
    throw err;
  });

  return cache.fetching;
}

// --- Middleware ---
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://talentus.triadeflow.ai', 'https://faithful-nature-production.up.railway.app']
    : true,
}));
app.use(express.json());

// Serve static photos (seller avatars)
app.use('/photos', express.static(path.join(__dirname, 'public', 'photos')));

// Serve portal (Central de Acompanhamento)
app.use('/portal', express.static(path.join(__dirname, 'public', 'portal')));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
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
    throw new Error(`GHL API error ${res.status}: ${text}`);
  }
  return res.json();
}

// Fetch all opportunities for a pipeline with pagination
async function fetchAllOpportunities(pipelineId) {
  const allOpps = [];
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
    allOpps.push(...opps);

    if (opps.length < 100) {
      hasMore = false;
    } else {
      startAfterId = opps[opps.length - 1].id;
    }
  }
  return allOpps;
}

// Fetch all opportunities across all pipelines
async function fetchAllPipelineOpportunities() {
  const pipelineIds = Object.values(PIPELINE_IDS);
  const results = await Promise.all(
    pipelineIds.map(async (pid) => {
      const opps = await fetchAllOpportunities(pid);
      return { pipelineId: pid, opportunities: opps };
    })
  );
  return results;
}

// --- Tag-based marca/produto extraction ---
const TAG_MARCA_MAP = {
  'marca_mateus': 'Mateus Cortez',
  'marca_cyb': 'CybNutri',
};
const TAG_PRODUTO_MAP = {
  'produto_virada_digital': 'Virada Digital',
  'produto_escola_negocios': 'Escola de Negocios',
  'produto_escola_nutri': 'Escola Nutri Expert',
  'produto_formacao_nutri': 'Formacao Nutri Expert',
  'produto_low_ticket_cyb': 'Low Ticket CYB',
  'produto_profissional_mentory': 'Profissional Mentory',
  'mentoria_individual': 'Sala Secreta',
  'mentoria_gps': 'Sala Secreta',
};

function getMarcaFromTags(tags) {
  if (!tags || !Array.isArray(tags)) return null;
  for (const tag of tags) {
    if (TAG_MARCA_MAP[tag]) return TAG_MARCA_MAP[tag];
  }
  return null;
}

function getProdutoFromTags(tags) {
  if (!tags || !Array.isArray(tags)) return null;
  for (const tag of tags) {
    if (TAG_PRODUTO_MAP[tag]) return TAG_PRODUTO_MAP[tag];
  }
  return null;
}

// GHL Custom Field ID → logical name mapping (fallback)
const CUSTOM_FIELD_MAP = {
  '2KaHcDNMZDwsozLFB1lL': 'marca',
  'qpiSM6URmXbv28u0aFUH': 'produto',
  'BckPK8Tk8yZvGWeGIBIZ': 'vendedor',
  'LOY9OJpiGa5WfIgQE02G': 'valor_fechado',
};

// --- Helper: Get custom field value from opp ---
function getCustomField(opp, ...keys) {
  // 1. Try customFields first (direct field from Supabase: key='marca', key='produto', etc.)
  const fields = opp.customFields || [];
  for (const f of fields) {
    const k = (f.key || f.fieldKey || '').toLowerCase();
    if (keys.some(key => k.includes(key))) {
      const val = f.value || f.fieldValue || f.field_value || null;
      if (val) return val;
    }
    // Also check by GHL field ID
    const fieldId = f.id || f.key || '';
    const mappedName = CUSTOM_FIELD_MAP[fieldId];
    if (mappedName && keys.some(key => mappedName.includes(key))) {
      const val = f.value || f.fieldValue || f.field_value || null;
      if (val) return val;
    }
  }
  // 2. Fallback: try tags (GHL stores marca/produto as contact tags)
  const tags = opp.contact?.tags || opp.tags || [];
  if (keys.includes('marca')) {
    const marca = getMarcaFromTags(tags);
    if (marca) return marca;
  }
  if (keys.includes('produto')) {
    const produto = getProdutoFromTags(tags);
    if (produto) return produto;
  }
  return null;
}

// --- Helper: Filter opps by brand ---
function filterByBrand(opps, brand) {
  if (!brand || brand === 'all') return opps;
  return opps.filter(opp => {
    const marca = getCustomField(opp, 'marca');
    if (!marca) return false;
    const m = marca.toLowerCase();
    if (brand === 'mateus') return m.includes('mateus');
    if (brand === 'cyb') return m.includes('cyb') || m.includes('nutri');
    return true;
  });
}

// --- Helper: Filter opps by days (period) ---
function filterByDays(opps, days) {
  if (!days) return opps;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(days));
  return opps.filter(opp => {
    const created = new Date(opp.createdAt || opp.dateAdded);
    return created >= cutoff;
  });
}

// --- Helper: Filter opps by seller ---
function filterBySeller(opps, seller) {
  if (!seller || seller === 'all') return opps;
  return opps.filter(opp => {
    const vendedor = resolveSellerName(getCustomField(opp, 'vendedor') || opp.assignedTo) || '';
    return vendedor.toLowerCase().includes(seller.toLowerCase());
  });
}

// --- Cached pipeline stages (avoid GHL API calls) ---
const pipelineStagesCache = { data: null, timestamp: 0, ttl: 30 * 60 * 1000 }; // 30 min

async function getCachedPipelineStages() {
  const now = Date.now();
  if (pipelineStagesCache.data && (now - pipelineStagesCache.timestamp) < pipelineStagesCache.ttl) {
    return pipelineStagesCache.data;
  }
  try {
    const pipelinesData = await ghlFetch(`/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`);
    pipelineStagesCache.data = pipelinesData.pipelines || [];
    pipelineStagesCache.timestamp = Date.now();
    return pipelineStagesCache.data;
  } catch (e) {
    console.error('[cache] Pipeline stages fetch error:', e.message);
    return pipelineStagesCache.data || []; // return stale data if available
  }
}

// --- Cached contacts count (Supabase first, GHL fallback) ---
const contactsCountCache = { count: 0, timestamp: 0, ttl: 15 * 60 * 1000 }; // 15 min

async function getCachedContactsCount() {
  const now = Date.now();
  if (contactsCountCache.count > 0 && (now - contactsCountCache.timestamp) < contactsCountCache.ttl) {
    return contactsCountCache.count;
  }
  try {
    // Try Supabase first (no rate limit)
    const { getSupabase } = await import('./sync.js');
    const sb = getSupabase();
    if (sb) {
      const { count } = await sb.from('contacts').select('id', { count: 'exact', head: true });
      if (count > 0) {
        contactsCountCache.count = count;
        contactsCountCache.timestamp = Date.now();
        return count;
      }
    }
    // Fallback to GHL
    const data = await ghlFetch(`/contacts/?locationId=${GHL_LOCATION_ID}&limit=1`);
    contactsCountCache.count = data.meta?.total || data.contacts?.length || 0;
    contactsCountCache.timestamp = Date.now();
    return contactsCountCache.count;
  } catch (e) {
    console.error('[cache] Contacts count error:', e.message);
    return contactsCountCache.count;
  }
}

// --- Cached CRM structure (avoid 5 GHL API calls per request) ---
const crmCache = { data: null, timestamp: 0, ttl: 60 * 60 * 1000 }; // 1 hour

// --- Routes ---

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    cache: { age: cache.data ? Math.round((Date.now() - cache.timestamp) / 1000) : null },
  });
});

// Force cache refresh
app.post('/api/cache/clear', (req, res) => {
  cache.data = null;
  cache.timestamp = 0;
  cache.fetching = null;
  res.json({ cleared: true });
});

// Overview — aggregated KPIs
app.get('/api/overview', async (req, res) => {
  try {
    const brand = req.query.brand;
    const seller = req.query.seller;
    const days = req.query.days;

    const [totalLeads, pipelineResults] = await Promise.all([
      getCachedContactsCount(),
      getCachedOpportunities(),
    ]);

    let allOpps = pipelineResults.flatMap(r => r.opportunities);
    allOpps = filterByBrand(allOpps, brand);
    allOpps = filterBySeller(allOpps, seller);
    allOpps = filterByDays(allOpps, days);

    const pipelineSummary = [];
    for (const { pipelineId, opportunities } of pipelineResults) {
      let opps = filterByBrand(opportunities, brand);
      opps = filterBySeller(opps, seller);
      opps = filterByDays(opps, days);
      const open = opps.filter(o => o.status === 'open').length;
      const won = opps.filter(o => o.status === 'won').length;
      const lost = opps.filter(o => o.status === 'lost').length;
      const abandoned = opps.filter(o => o.status === 'abandoned').length;
      const revenue = opps.filter(o => o.status === 'won')
        .reduce((sum, o) => sum + (parseFloat(o.monetaryValue) || 0), 0);

      pipelineSummary.push({
        pipelineId,
        pipelineName: PIPELINE_NAMES[pipelineId] || pipelineId,
        total: opps.length,
        open, won, lost, abandoned, revenue,
      });
    }

    const wonOpps = allOpps.filter(o => o.status === 'won');
    const totalRevenue = wonOpps.reduce((sum, o) => sum + (parseFloat(o.monetaryValue) || 0), 0);
    const openCount = allOpps.filter(o => o.status === 'open').length;
    const wonCount = wonOpps.length;
    const lostCount = allOpps.filter(o => o.status === 'lost').length;
    const conversionRate = allOpps.length > 0 ? (wonCount / allOpps.length) * 100 : 0;
    const avgTicket = wonCount > 0 ? totalRevenue / wonCount : 0;

    // Build commercial funnel from both Comercial pipelines (Mateus + CybNutri)
    const comercialResults = pipelineResults.filter(r => COMMERCIAL_PIPELINE_IDS.includes(r.pipelineId));
    let commercialFunnel = [];
    if (comercialResults.length > 0) {
      const allComercialOpps = comercialResults.flatMap(r => r.opportunities);
      const opps = filterByDays(filterBySeller(filterByBrand(allComercialOpps, brand), seller), days);
      const pipelines = await getCachedPipelineStages();
      // Merge stages from all commercial pipelines by stage name
      const stageCountMap = {};
      for (const comercialPipeline of pipelines.filter(p => COMMERCIAL_PIPELINE_IDS.includes(p.id))) {
        for (const stage of (comercialPipeline.stages || []).sort((a, b) => a.position - b.position)) {
          const stageOpps = opps.filter(o => o.pipelineStageId === stage.id && o.status === 'open').length;
          if (!stageCountMap[stage.name]) {
            stageCountMap[stage.name] = { name: stage.name, count: 0, position: stage.position };
          }
          stageCountMap[stage.name].count += stageOpps;
        }
      }
      commercialFunnel = Object.values(stageCountMap).sort((a, b) => a.position - b.position);
    }

    res.json({
      totalLeads,
      totalOpps: allOpps.length,
      openOpps: openCount,
      wonOpps: wonCount,
      lostOpps: lostCount,
      abandonedOpps: allOpps.filter(o => o.status === 'abandoned').length,
      conversionRate,
      totalRevenue,
      avgTicket,
      commercialFunnel,
      pipelineSummary,
    });
  } catch (error) {
    console.error('Error in /api/overview:', error.message);
    res.status(500).json({ error: 'Failed to fetch overview', details: error.message });
  }
});

// Pipelines — stages + opportunity counts (reads from Supabase via cache)
app.get('/api/pipelines', async (req, res) => {
  try {
    const brand = req.query.brand;
    const seller = req.query.seller;
    const days = req.query.days;

    // Get opps from Supabase cache (same source as /api/overview, /api/sellers)
    const pipelineResults = await getCachedOpportunities();
    let allOpps = pipelineResults.flatMap(r => r.opportunities);
    allOpps = filterByBrand(allOpps, brand);
    allOpps = filterBySeller(allOpps, seller);
    allOpps = filterByDays(allOpps, days);

    // Try to get stage definitions from GHL, fallback to Supabase-derived stages
    let pipelineStages;
    try {
      pipelineStages = await getCachedPipelineStages();
    } catch (e) {
      pipelineStages = null;
    }

    const pipelineIds = Object.values(PIPELINE_IDS);
    const results = [];

    for (const pid of pipelineIds) {
      const pipelineOpps = allOpps.filter(o => o.pipelineId === pid);
      if (pipelineOpps.length === 0) continue;

      // Get stage info from GHL cache if available, otherwise derive from Supabase data
      let stages;
      const ghlPipeline = pipelineStages?.find(p => p.id === pid);
      if (ghlPipeline && ghlPipeline.stages?.length > 0) {
        stages = ghlPipeline.stages
          .sort((a, b) => a.position - b.position)
          .map(stage => {
            const stageOpps = pipelineOpps.filter(o => o.pipelineStageId === stage.id);
            return {
              id: stage.id,
              name: stage.name,
              position: stage.position,
              count: stageOpps.filter(o => o.status === 'open').length,
              totalOpps: stageOpps.length,
              open: stageOpps.filter(o => o.status === 'open').length,
              won: stageOpps.filter(o => o.status === 'won').length,
              lost: stageOpps.filter(o => o.status === 'lost').length,
              revenue: stageOpps.filter(o => o.status === 'won')
                .reduce((sum, o) => sum + (parseFloat(o.monetaryValue) || 0), 0),
            };
          });
      } else {
        // Derive stages from opp data (pipelineStageName field from Supabase)
        const stageMap = {};
        for (const opp of pipelineOpps) {
          const sid = opp.pipelineStageId;
          if (!stageMap[sid]) stageMap[sid] = { id: sid, name: opp.pipelineStageName || 'Unknown', opps: [] };
          stageMap[sid].opps.push(opp);
        }
        stages = Object.values(stageMap).map((s, i) => ({
          id: s.id,
          name: s.name,
          position: i,
          count: s.opps.filter(o => o.status === 'open').length,
          totalOpps: s.opps.length,
          open: s.opps.filter(o => o.status === 'open').length,
          won: s.opps.filter(o => o.status === 'won').length,
          lost: s.opps.filter(o => o.status === 'lost').length,
          revenue: s.opps.filter(o => o.status === 'won')
            .reduce((sum, o) => sum + (parseFloat(o.monetaryValue) || 0), 0),
        }));
      }

      const open = pipelineOpps.filter(o => o.status === 'open').length;
      const won = pipelineOpps.filter(o => o.status === 'won').length;
      const lost = pipelineOpps.filter(o => o.status === 'lost').length;
      const abandoned = pipelineOpps.filter(o => o.status === 'abandoned').length;

      results.push({
        id: pid,
        name: PIPELINE_NAMES[pid] || pid,
        totalOpps: pipelineOpps.length,
        stages,
        summary: { open, won, lost, abandoned },
      });
    }

    res.json({ pipelines: results });
  } catch (error) {
    console.error('Error in /api/pipelines:', error.message);
    res.status(500).json({ error: 'Failed to fetch pipelines', details: error.message });
  }
});

// Sellers — comprehensive manager view
app.get('/api/sellers', async (req, res) => {
  try {
    const brand = req.query.brand;
    const seller = req.query.seller;
    const days = req.query.days;
    const pipelineResults = await getCachedOpportunities();
    let allOpps = pipelineResults.flatMap(r => r.opportunities);
    allOpps = filterByBrand(allOpps, brand);
    allOpps = filterBySeller(allOpps, seller);
    allOpps = filterByDays(allOpps, days);

    const now = new Date();
    const sellerMap = {};

    for (const opp of allOpps) {
      const vendedor = resolveSellerName(getCustomField(opp, 'vendedor') || opp.assignedTo) || 'Nao atribuido';

      if (!sellerMap[vendedor]) {
        sellerMap[vendedor] = {
          name: vendedor,
          totalOpps: 0, won: 0, lost: 0, open: 0, abandoned: 0,
          revenue: 0, tickets: [],
          closingDays: [],     // days to close each won opp
          openAgingDays: [],   // how many days each open opp has been sitting
          lostReasons: [],     // loss reasons
          products: {},        // products sold { name: { count, revenue } }
          stages: {},          // current stage distribution for open opps
          biggestSale: 0,
          recentWon30d: 0,     // won in last 30 days
          recentRevenue30d: 0, // revenue in last 30 days
        };
      }

      const s = sellerMap[vendedor];
      s.totalOpps++;

      const createdAt = new Date(opp.createdAt || opp.dateAdded);
      const produto = getCustomField(opp, 'produto') || 'Nao especificado';

      if (opp.status === 'won') {
        s.won++;
        const val = parseFloat(opp.monetaryValue) || 0;
        s.revenue += val;
        if (val > 0) s.tickets.push(val);
        if (val > s.biggestSale) s.biggestSale = val;

        // Closing velocity: days from creation to last status change
        const updatedAt = new Date(opp.lastStatusChangeAt || opp.updatedAt || opp.createdAt);
        const diffDays = Math.max(1, Math.round((updatedAt - createdAt) / (1000 * 60 * 60 * 24)));
        s.closingDays.push(diffDays);

        // Recent wins (30 days)
        const daysSinceWon = Math.round((now - updatedAt) / (1000 * 60 * 60 * 24));
        if (daysSinceWon <= 30) {
          s.recentWon30d++;
          s.recentRevenue30d += val;
        }

        // Products won
        if (!s.products[produto]) s.products[produto] = { count: 0, revenue: 0 };
        s.products[produto].count++;
        s.products[produto].revenue += val;

      } else if (opp.status === 'lost') {
        s.lost++;
        const lossReason = getCustomField(opp, 'motivo') || opp.lostReasonId || null;
        if (lossReason) s.lostReasons.push(lossReason);

      } else if (opp.status === 'open') {
        s.open++;
        // Aging: days since creation
        const agingDays = Math.round((now - createdAt) / (1000 * 60 * 60 * 24));
        s.openAgingDays.push(agingDays);

        // Stage distribution
        const stageName = opp.pipelineStageName || opp.pipelineStageId || 'Desconhecido';
        s.stages[stageName] = (s.stages[stageName] || 0) + 1;

      } else if (opp.status === 'abandoned') {
        s.abandoned++;
      }
    }

    const sellers = Object.values(sellerMap).map(s => {
      const meta = SELLER_META[s.name.toLowerCase()] || {};
      const avgTicket = s.tickets.length > 0
        ? s.tickets.reduce((a, b) => a + b, 0) / s.tickets.length : 0;
      const avgClosingDays = s.closingDays.length > 0
        ? Math.round(s.closingDays.reduce((a, b) => a + b, 0) / s.closingDays.length) : null;
      const avgOpenAging = s.openAgingDays.length > 0
        ? Math.round(s.openAgingDays.reduce((a, b) => a + b, 0) / s.openAgingDays.length) : null;
      const maxOpenAging = s.openAgingDays.length > 0
        ? Math.max(...s.openAgingDays) : null;

      // Loss reason summary
      const lostReasonCounts = {};
      for (const r of s.lostReasons) {
        lostReasonCounts[r] = (lostReasonCounts[r] || 0) + 1;
      }

      return {
        name: s.name,
        photo: meta.photo || null,
        role: meta.role || 'Vendedor',
        email: meta.email || null,
        totalOpps: s.totalOpps,
        won: s.won,
        lost: s.lost,
        open: s.open,
        abandoned: s.abandoned,
        revenue: s.revenue,
        avgTicket,
        biggestSale: s.biggestSale,
        conversionRate: s.totalOpps > 0 ? (s.won / s.totalOpps) * 100 : 0,
        // Velocity
        avgClosingDays,
        // Pipeline health
        avgOpenAging,
        maxOpenAging,
        openStages: Object.entries(s.stages).map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        // Recent performance (30d)
        recentWon30d: s.recentWon30d,
        recentRevenue30d: s.recentRevenue30d,
        // Products
        topProducts: Object.entries(s.products)
          .map(([name, d]) => ({ name, ...d }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        // Loss reasons
        lostReasons: Object.entries(lostReasonCounts)
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      };
    });

    sellers.sort((a, b) => b.revenue - a.revenue);

    // Add rank and badges
    sellers.forEach((s, i) => {
      s.rank = i + 1;
      if (i === 0 && s.revenue > 0) s.badge = 'gold';
      else if (i === 1 && s.revenue > 0) s.badge = 'silver';
      else if (i === 2 && s.revenue > 0) s.badge = 'bronze';
      else s.badge = null;
    });

    // Team KPIs
    const teamTotalOpps = sellers.reduce((sum, s) => sum + s.totalOpps, 0);
    const teamWon = sellers.reduce((sum, s) => sum + s.won, 0);
    const teamLost = sellers.reduce((sum, s) => sum + s.lost, 0);
    const teamOpen = sellers.reduce((sum, s) => sum + s.open, 0);
    const teamRevenue = sellers.reduce((sum, s) => sum + s.revenue, 0);
    const teamAvgTicket = teamWon > 0 ? teamRevenue / teamWon : 0;
    const teamConversion = teamTotalOpps > 0 ? (teamWon / teamTotalOpps) * 100 : 0;
    const allClosingDays = sellers.filter(s => s.avgClosingDays != null).map(s => s.avgClosingDays);
    const teamAvgClosing = allClosingDays.length > 0
      ? Math.round(allClosingDays.reduce((a, b) => a + b, 0) / allClosingDays.length) : null;
    const teamRecentWon = sellers.reduce((sum, s) => sum + s.recentWon30d, 0);
    const teamRecentRevenue = sellers.reduce((sum, s) => sum + s.recentRevenue30d, 0);

    // Revenue concentration — % of top seller
    const topSellerRevenue = sellers.length > 0 ? sellers[0].revenue : 0;
    const revenueConcentration = teamRevenue > 0 ? (topSellerRevenue / teamRevenue) * 100 : 0;

    res.json({
      sellers,
      teamKPIs: {
        totalOpps: teamTotalOpps,
        won: teamWon,
        lost: teamLost,
        open: teamOpen,
        revenue: teamRevenue,
        avgTicket: teamAvgTicket,
        conversionRate: teamConversion,
        avgClosingDays: teamAvgClosing,
        recentWon30d: teamRecentWon,
        recentRevenue30d: teamRecentRevenue,
        revenueConcentration,
        activeSellers: sellers.filter(s => s.totalOpps > 0).length,
      },
    });
  } catch (error) {
    console.error('Error in /api/sellers:', error.message);
    res.status(500).json({ error: 'Failed to fetch sellers', details: error.message });
  }
});

// Products — grouped by brand
app.get('/api/products', async (req, res) => {
  try {
    const brand = req.query.brand;
    const seller = req.query.seller;
    const days = req.query.days;
    const pipelineResults = await getCachedOpportunities();
    let allOpps = pipelineResults.flatMap(r => r.opportunities);
    allOpps = filterByBrand(allOpps, brand);
    allOpps = filterBySeller(allOpps, seller);
    allOpps = filterByDays(allOpps, days);

    // Build product map from opportunities
    const productData = {};
    for (const opp of allOpps) {
      const produto = getCustomField(opp, 'produto') || 'Nao especificado';
      const marca = getCustomField(opp, 'marca') || 'Sem marca';

      const key = `${produto}__${marca}`;
      if (!productData[key]) {
        productData[key] = { name: produto, brand: marca, opps: 0, won: 0, revenue: 0 };
      }
      productData[key].opps++;
      if (opp.status === 'won') {
        productData[key].won++;
        productData[key].revenue += parseFloat(opp.monetaryValue) || 0;
      }
    }

    // Group into brand structure
    const brands = Object.entries(BRAND_PRODUCTS).map(([brandName, brandInfo]) => {
      const products = brandInfo.products.map(prodName => {
        // Find matching product data
        const match = Object.values(productData).find(
          p => p.name.toLowerCase() === prodName.toLowerCase()
            || p.name.toLowerCase().includes(prodName.toLowerCase().split(' ')[0])
        );
        return {
          name: prodName,
          opps: match?.opps || 0,
          won: match?.won || 0,
          revenue: match?.revenue || 0,
        };
      });

      return {
        name: brandName,
        slug: brandInfo.slug,
        color: brandInfo.color,
        products,
      };
    });

    // Filter brands if brand param
    const filteredBrands = (brand && brand !== 'all')
      ? brands.filter(b => b.slug === brand)
      : brands;

    res.json({ brands: filteredBrands });
  } catch (error) {
    console.error('Error in /api/products:', error.message);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

// Project Status — TDI implementation progress
app.get('/api/project-status', (req, res) => {
  res.json({
    phases: [
      { name: 'Diagnostico', status: 'completed', date: '2026-02-24' },
      { name: 'Blueprint', status: 'completed', date: '2026-03-10' },
      {
        name: 'Implantacao', status: 'completed', date: '2026-03-12',
        details: { fields: 22, pipelines: 6, tags: 38, users: 4, calendars: 2 },
      },
      { name: 'Automacao', status: 'in_progress', details: { workflowsTotal: 13, workflowsDone: 0 } },
      { name: 'Treinamento', status: 'in_progress', details: { materialsGenerated: true } },
      { name: 'Auditoria', status: 'pending' },
      { name: 'Escala', status: 'pending' },
    ],
    score: { verify: '99%', passed: 86, failed: 0, warnings: 1 },
  });
});

// CRM Structure
app.get('/api/crm-structure', async (req, res) => {
  try {
    // Use 1-hour cache to avoid 5 GHL API calls per request
    const now = Date.now();
    if (crmCache.data && (now - crmCache.timestamp) < crmCache.ttl) {
      return res.json(crmCache.data);
    }

    const [contactFieldsData, oppFieldsData, pipelinesData, usersData, calendarsData] = await Promise.all([
      ghlFetch(`/locations/${GHL_LOCATION_ID}/customFields`).catch(() => ({ customFields: [] })),
      ghlFetch(`/locations/${GHL_LOCATION_ID}/customFields?model=opportunity`).catch(() => ({ customFields: [] })),
      ghlFetch(`/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`).catch(() => ({ pipelines: [] })),
      ghlFetch(`/users/?locationId=${GHL_LOCATION_ID}`).catch(() => ({ users: [] })),
      ghlFetch(`/calendars/?locationId=${GHL_LOCATION_ID}`).catch(() => ({ calendars: [] })),
    ]);

    const result = {
      fields: (contactFieldsData.customFields || []).length + (oppFieldsData.customFields || []).length,
      pipelines: (pipelinesData.pipelines || []).length,
      tags: 38,
      users: (usersData.users || []).length,
      calendars: (calendarsData.calendars || []).length,
    };
    crmCache.data = result;
    crmCache.timestamp = Date.now();
    res.json(result);
  } catch (error) {
    console.error('Error in /api/crm-structure:', error.message);
    if (crmCache.data) return res.json(crmCache.data); // return stale if available
    res.status(500).json({ error: 'Failed to fetch CRM structure', details: error.message });
  }
});

// Sellers list (for dropdown filter)
app.get('/api/sellers-list', async (req, res) => {
  try {
    const pipelineResults = await getCachedOpportunities();
    const allOpps = pipelineResults.flatMap(r => r.opportunities);

    const sellerNames = new Set();
    for (const opp of allOpps) {
      const vendedor = resolveSellerName(getCustomField(opp, 'vendedor') || opp.assignedTo);
      if (vendedor && vendedor !== 'Nao atribuido') sellerNames.add(vendedor);
    }

    res.json({ sellers: [...sellerNames].sort() });
  } catch (error) {
    console.error('Error in /api/sellers-list:', error.message);
    res.status(500).json({ error: 'Failed to fetch sellers list', details: error.message });
  }
});

// Timeline — opportunities grouped by date (for line charts)
app.get('/api/timeline', async (req, res) => {
  try {
    const brand = req.query.brand;
    const seller = req.query.seller;
    const days = parseInt(req.query.days) || 30;

    const pipelineResults = await getCachedOpportunities();
    let allOpps = pipelineResults.flatMap(r => r.opportunities);
    allOpps = filterByBrand(allOpps, brand);

    // Filter by seller
    if (seller && seller !== 'all') {
      allOpps = allOpps.filter(opp => {
        const vendedor = resolveSellerName(getCustomField(opp, 'vendedor') || opp.assignedTo) || '';
        return vendedor.toLowerCase().includes(seller.toLowerCase());
      });
    }

    // Build daily buckets for the last N days
    const now = new Date();
    const buckets = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      buckets[key] = { date: key, leads: 0, won: 0, lost: 0, revenue: 0, opps: 0 };
    }

    for (const opp of allOpps) {
      const created = opp.createdAt || opp.dateAdded;
      if (!created) continue;
      const dateKey = new Date(created).toISOString().split('T')[0];
      if (buckets[dateKey]) {
        buckets[dateKey].opps++;
        if (opp.status === 'won') {
          buckets[dateKey].won++;
          buckets[dateKey].revenue += parseFloat(opp.monetaryValue) || 0;
        } else if (opp.status === 'lost') {
          buckets[dateKey].lost++;
        }
      }
    }

    // Sort chronologically
    const timeline = Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));

    // Add cumulative values
    let cumRevenue = 0;
    let cumWon = 0;
    for (const day of timeline) {
      cumRevenue += day.revenue;
      cumWon += day.won;
      day.cumRevenue = cumRevenue;
      day.cumWon = cumWon;
    }

    res.json({ timeline, totalDays: days });
  } catch (error) {
    console.error('Error in /api/timeline:', error.message);
    res.status(500).json({ error: 'Failed to fetch timeline', details: error.message });
  }
});

// Distribution — data for donut/pie charts
app.get('/api/distribution', async (req, res) => {
  try {
    const brand = req.query.brand;
    const seller = req.query.seller;
    const days = req.query.days;

    const pipelineResults = await getCachedOpportunities();
    let allOpps = pipelineResults.flatMap(r => r.opportunities);
    allOpps = filterByBrand(allOpps, brand);
    allOpps = filterBySeller(allOpps, seller);
    allOpps = filterByDays(allOpps, days);

    // By status
    const byStatus = {};
    for (const opp of allOpps) {
      const s = opp.status || 'open';
      byStatus[s] = (byStatus[s] || 0) + 1;
    }

    // By product
    const byProduct = {};
    for (const opp of allOpps) {
      const prod = getCustomField(opp, 'produto') || 'Nao especificado';
      if (!byProduct[prod]) byProduct[prod] = { name: prod, count: 0, revenue: 0 };
      byProduct[prod].count++;
      if (opp.status === 'won') {
        byProduct[prod].revenue += parseFloat(opp.monetaryValue) || 0;
      }
    }

    // By brand
    const byBrand = {};
    for (const opp of allOpps) {
      const marca = getCustomField(opp, 'marca') || 'Sem marca';
      if (!byBrand[marca]) byBrand[marca] = { name: marca, count: 0, revenue: 0 };
      byBrand[marca].count++;
      if (opp.status === 'won') {
        byBrand[marca].revenue += parseFloat(opp.monetaryValue) || 0;
      }
    }

    // By seller
    const bySeller = {};
    for (const opp of allOpps) {
      const vendedor = resolveSellerName(getCustomField(opp, 'vendedor') || opp.assignedTo) || 'Nao atribuido';
      if (!bySeller[vendedor]) bySeller[vendedor] = { name: vendedor, count: 0, revenue: 0, won: 0 };
      bySeller[vendedor].count++;
      if (opp.status === 'won') {
        bySeller[vendedor].won++;
        bySeller[vendedor].revenue += parseFloat(opp.monetaryValue) || 0;
      }
    }

    res.json({
      byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
      byProduct: Object.values(byProduct).sort((a, b) => b.revenue - a.revenue),
      byBrand: Object.values(byBrand).sort((a, b) => b.revenue - a.revenue),
      bySeller: Object.values(bySeller).sort((a, b) => b.revenue - a.revenue),
    });
  } catch (error) {
    console.error('Error in /api/distribution:', error.message);
    res.status(500).json({ error: 'Failed to fetch distribution', details: error.message });
  }
});

// =============================================
// =============================================
// META ADS ENDPOINTS (multi-account)
// =============================================

// Helper: Meta API fetch (no account dependency)
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
    throw new Error(`Meta API error ${res.status}: ${text}`);
  }
  return res.json();
}

// Helper: date range from days
function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - parseInt(days));
  return { since: start.toISOString().split('T')[0], until: end.toISOString().split('T')[0] };
}

// Helper: extract actions from Meta insights row
function extractActions(row) {
  const actions = row.actions || [];
  const actionValues = row.action_values || [];
  const costPerAction = row.cost_per_action_type || [];
  const leads = parseInt(actions.find(a => a.action_type === 'lead')?.value || 0);
  const purchases = parseInt(actions.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0);
  const purchaseValue = parseFloat(actionValues.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0);
  const landingPageViews = parseInt(actions.find(a => a.action_type === 'landing_page_view')?.value || 0);
  const linkClicks = parseInt(actions.find(a => a.action_type === 'link_click')?.value || 0);
  const cpl = parseFloat(costPerAction.find(a => a.action_type === 'lead')?.value || 0);
  const cpa = parseFloat(costPerAction.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0);
  return { leads, purchases, purchaseValue, landingPageViews, linkClicks, cpl, cpa };
}

// Helper: format insights row
function formatInsightsRow(row) {
  const ex = extractActions(row);
  return {
    spend: parseFloat(row.spend || 0),
    impressions: parseInt(row.impressions || 0),
    reach: parseInt(row.reach || 0),
    clicks: parseInt(row.clicks || 0),
    uniqueClicks: parseInt(row.unique_clicks || 0),
    cpc: parseFloat(row.cpc || 0),
    cpm: parseFloat(row.cpm || 0),
    ctr: parseFloat(row.ctr || 0),
    frequency: parseFloat(row.frequency || 0),
    ...ex,
  };
}

const INSIGHTS_FIELDS = 'spend,impressions,reach,clicks,cpc,cpm,ctr,actions,action_values,cost_per_action_type,frequency,unique_clicks,cost_per_unique_click';

// --- Meta: connection status ---
app.get('/api/meta/status', (req, res) => {
  res.json({ connected: !!META_ACCESS_TOKEN });
});

// --- Helper: get Supabase client for Meta reads ---
async function getMetaSupabase() {
  try {
    const { getSupabase } = await import('./sync.js');
    return getSupabase();
  } catch { return null; }
}

// --- Meta: list all ad accounts (from Supabase entities, fallback Meta API) ---
app.get('/api/meta/accounts', async (req, res) => {
  try {
    if (!META_ACCESS_TOKEN) return res.json({ connected: false, accounts: [] });

    // Try Supabase first — get distinct accounts from meta_ads_entities
    const sb = await getMetaSupabase();
    if (sb) {
      const { data: entities } = await sb.from('meta_ads_entities').select('account_id').eq('type', 'campaign');
      if (entities && entities.length > 0) {
        const accountIds = [...new Set(entities.map(e => e.account_id))];
        // Get account-level spend totals from daily table
        const accounts = [];
        for (const accId of accountIds) {
          const { data: spendData } = await sb.from('meta_ads_daily')
            .select('account_name, spend')
            .eq('account_id', accId)
            .eq('level', 'account');
          const totalSpend = (spendData || []).reduce((sum, r) => sum + (r.spend || 0), 0);
          const accName = spendData?.[0]?.account_name || accId;
          accounts.push({ id: accId, accountId: accId.replace('act_', ''), name: accName, business: '', currency: 'BRL', amountSpent: Math.round(totalSpend * 100) });
        }
        accounts.sort((a, b) => b.amountSpent - a.amountSpent);
        console.log(`[meta] Accounts from Supabase: ${accounts.length}`);
        return res.json({ connected: true, accounts });
      }
    }

    // Fallback: Meta API
    const data = await metaFetch('/me/adaccounts', {
      fields: 'name,account_id,account_status,currency,business_name,amount_spent',
      limit: '50',
    });
    const accounts = (data?.data || [])
      .filter(a => [1, 3].includes(a.account_status))
      .map(a => ({ id: a.id, accountId: a.account_id, name: a.name, business: a.business_name || '', currency: a.currency, amountSpent: parseInt(a.amount_spent || '0') }))
      .sort((a, b) => b.amountSpent - a.amountSpent);
    res.json({ connected: true, accounts });
  } catch (error) {
    console.error('Error in /api/meta/accounts:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Meta: account insights (KPIs) — Supabase first ---
app.get('/api/meta/insights', async (req, res) => {
  try {
    if (!META_ACCESS_TOKEN) return res.json({ connected: false, data: null });
    const accountId = req.query.account_id || META_AD_ACCOUNT_ID;
    if (!accountId) return res.json({ connected: true, data: null, error: 'No account selected' });
    const days = req.query.days || '30';
    const { since, until } = getDateRange(days);

    // Try Supabase first
    const sb = await getMetaSupabase();
    if (sb) {
      const { data: rows } = await sb.from('meta_ads_daily')
        .select('*')
        .eq('account_id', accountId)
        .eq('level', 'account')
        .gte('date', since)
        .lte('date', until);

      if (rows && rows.length > 0) {
        const agg = {
          spend: 0, impressions: 0, reach: 0, clicks: 0, uniqueClicks: 0,
          leads: 0, purchases: 0, purchaseValue: 0, linkClicks: 0, landingPageViews: 0,
          cpc: 0, cpm: 0, ctr: 0, frequency: 0, cpl: 0, cpa: 0,
        };
        for (const r of rows) {
          agg.spend += r.spend || 0;
          agg.impressions += r.impressions || 0;
          agg.reach += r.reach || 0;
          agg.clicks += r.clicks || 0;
          agg.uniqueClicks += r.unique_clicks || 0;
          agg.leads += r.leads || 0;
          agg.purchases += r.purchases || 0;
          agg.purchaseValue += r.purchase_value || 0;
          agg.linkClicks += r.link_clicks || 0;
          agg.landingPageViews += r.landing_page_views || 0;
        }
        // Calculate derived metrics
        if (agg.clicks > 0) agg.cpc = agg.spend / agg.clicks;
        if (agg.impressions > 0) agg.cpm = (agg.spend / agg.impressions) * 1000;
        if (agg.impressions > 0) agg.ctr = (agg.clicks / agg.impressions) * 100;
        if (agg.leads > 0) agg.cpl = agg.spend / agg.leads;
        if (agg.purchases > 0) agg.cpa = agg.spend / agg.purchases;
        if (agg.reach > 0) agg.frequency = agg.impressions / agg.reach;
        agg.costPerUniqueClick = agg.uniqueClicks > 0 ? agg.spend / agg.uniqueClicks : 0;
        agg.period = { since, until, days: parseInt(days) };
        console.log(`[meta] Insights from Supabase: ${rows.length} days, spend=${agg.spend.toFixed(2)}`);
        return res.json({ connected: true, data: agg });
      }
    }

    // Fallback: Meta API
    const data = await metaFetch(`/${accountId}/insights`, {
      fields: INSIGHTS_FIELDS,
      time_range: JSON.stringify({ since, until }),
      level: 'account',
    });
    const row = data?.data?.[0] || {};
    const formatted = formatInsightsRow(row);
    formatted.costPerUniqueClick = parseFloat(row.cost_per_unique_click || 0);
    formatted.period = { since, until, days: parseInt(days) };
    res.json({ connected: true, data: formatted });
  } catch (error) {
    console.error('Error in /api/meta/insights:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Meta: campaigns with insights — Supabase first ---
app.get('/api/meta/campaigns', async (req, res) => {
  try {
    if (!META_ACCESS_TOKEN) return res.json({ connected: false, campaigns: [] });
    const accountId = req.query.account_id || META_AD_ACCOUNT_ID;
    if (!accountId) return res.json({ connected: true, campaigns: [] });
    const days = req.query.days || '30';
    const { since, until } = getDateRange(days);

    // Try Supabase first
    const sb = await getMetaSupabase();
    if (sb) {
      // Get campaigns from entities table
      const { data: campEntities } = await sb.from('meta_ads_entities')
        .select('*')
        .eq('account_id', accountId)
        .eq('type', 'campaign');

      // Get campaign insights from daily table
      const { data: dailyRows } = await sb.from('meta_ads_daily')
        .select('*')
        .eq('account_id', accountId)
        .eq('level', 'campaign')
        .gte('date', since)
        .lte('date', until);

      if (campEntities && campEntities.length > 0) {
        // Aggregate daily insights per campaign
        const insightsMap = {};
        for (const r of (dailyRows || [])) {
          if (!r.campaign_id) continue;
          if (!insightsMap[r.campaign_id]) {
            insightsMap[r.campaign_id] = { spend: 0, impressions: 0, reach: 0, clicks: 0, uniqueClicks: 0, leads: 0, purchases: 0, purchaseValue: 0, linkClicks: 0, landingPageViews: 0, cpl: 0, cpa: 0 };
          }
          const a = insightsMap[r.campaign_id];
          a.spend += r.spend || 0;
          a.impressions += r.impressions || 0;
          a.reach += r.reach || 0;
          a.clicks += r.clicks || 0;
          a.uniqueClicks += (r.unique_clicks || 0);
          a.leads += r.leads || 0;
          a.purchases += r.purchases || 0;
          a.purchaseValue += r.purchase_value || 0;
          a.linkClicks += r.link_clicks || 0;
          a.landingPageViews += r.landing_page_views || 0;
        }
        // Calculate derived metrics
        for (const a of Object.values(insightsMap)) {
          if (a.clicks > 0) a.cpc = a.spend / a.clicks;
          if (a.impressions > 0) { a.cpm = (a.spend / a.impressions) * 1000; a.ctr = (a.clicks / a.impressions) * 100; }
          if (a.leads > 0) a.cpl = a.spend / a.leads;
          if (a.purchases > 0) a.cpa = a.spend / a.purchases;
          if (a.reach > 0) a.frequency = a.impressions / a.reach;
        }

        const result = campEntities.map(c => ({
          id: c.id, name: c.name, status: c.status, objective: c.objective,
          dailyBudget: c.daily_budget || null,
          insights: insightsMap[c.id] || null,
        }));
        result.sort((a, b) => (b.insights?.spend || 0) - (a.insights?.spend || 0));
        console.log(`[meta] Campaigns from Supabase: ${result.length}`);
        return res.json({ connected: true, campaigns: result, total: result.length, period: { since, until } });
      }
    }

    // Fallback: Meta API
    const campaignsData = await metaFetch(`/${accountId}/campaigns`, {
      fields: 'name,status,objective,daily_budget,lifetime_budget,start_time,stop_time',
      limit: '200',
      filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'ARCHIVED'] }]),
    });
    const campaigns = campaignsData?.data || [];
    const insightsData = await metaFetch(`/${accountId}/insights`, {
      fields: `campaign_id,campaign_name,${INSIGHTS_FIELDS}`,
      time_range: JSON.stringify({ since, until }),
      level: 'campaign',
      limit: '500',
    });
    const insightsMap = {};
    for (const row of (insightsData?.data || [])) {
      insightsMap[row.campaign_id] = formatInsightsRow(row);
    }
    const result = campaigns.map(c => ({
      id: c.id, name: c.name, status: c.status, objective: c.objective,
      dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
      insights: insightsMap[c.id] || null,
    }));
    result.sort((a, b) => (b.insights?.spend || 0) - (a.insights?.spend || 0));
    res.json({ connected: true, campaigns: result, total: result.length, period: { since, until } });
  } catch (error) {
    console.error('Error in /api/meta/campaigns:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Meta: ad sets with insights — Supabase first ---
app.get('/api/meta/adsets', async (req, res) => {
  try {
    if (!META_ACCESS_TOKEN) return res.json({ connected: false, adsets: [] });
    const accountId = req.query.account_id || META_AD_ACCOUNT_ID;
    const campaignId = req.query.campaign_id;
    if (!accountId) return res.json({ connected: true, adsets: [] });
    const days = req.query.days || '30';
    const { since, until } = getDateRange(days);

    // Try Supabase first
    const sb = await getMetaSupabase();
    if (sb) {
      let query = sb.from('meta_ads_entities').select('*').eq('account_id', accountId).eq('type', 'adset');
      if (campaignId) query = query.eq('parent_id', campaignId);
      const { data: adsetEntities } = await query;

      if (adsetEntities && adsetEntities.length > 0) {
        // No adset-level daily data in current sync — return entities with null insights
        const result = adsetEntities.map(a => ({
          id: a.id, name: a.name, status: a.status, campaignId: a.parent_id,
          dailyBudget: a.daily_budget || null,
          optimizationGoal: a.optimization_goal,
          insights: null,
        }));
        console.log(`[meta] Adsets from Supabase: ${result.length}`);
        return res.json({ connected: true, adsets: result, total: result.length, period: { since, until } });
      }
    }

    // Fallback: Meta API
    const parentPath = campaignId ? `/${campaignId}/adsets` : `/${accountId}/adsets`;
    const adsetsData = await metaFetch(parentPath, {
      fields: 'name,status,campaign_id,daily_budget,lifetime_budget,targeting,optimization_goal',
      limit: '200',
    });
    const adsets = adsetsData?.data || [];
    const insightsData = await metaFetch(`/${accountId}/insights`, {
      fields: `adset_id,adset_name,${INSIGHTS_FIELDS}`,
      time_range: JSON.stringify({ since, until }),
      level: 'adset',
      limit: '500',
      ...(campaignId ? { filtering: JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaignId }]) } : {}),
    });
    const insightsMap = {};
    for (const row of (insightsData?.data || [])) {
      insightsMap[row.adset_id] = formatInsightsRow(row);
    }
    const result = adsets.map(a => ({
      id: a.id, name: a.name, status: a.status, campaignId: a.campaign_id,
      dailyBudget: a.daily_budget ? parseFloat(a.daily_budget) / 100 : null,
      optimizationGoal: a.optimization_goal,
      insights: insightsMap[a.id] || null,
    }));
    result.sort((a, b) => (b.insights?.spend || 0) - (a.insights?.spend || 0));
    res.json({ connected: true, adsets: result, total: result.length, period: { since, until } });
  } catch (error) {
    console.error('Error in /api/meta/adsets:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Meta: individual ads with insights — Supabase first ---
app.get('/api/meta/ads', async (req, res) => {
  try {
    if (!META_ACCESS_TOKEN) return res.json({ connected: false, ads: [] });
    const accountId = req.query.account_id || META_AD_ACCOUNT_ID;
    const adsetId = req.query.adset_id;
    if (!accountId) return res.json({ connected: true, ads: [] });
    const days = req.query.days || '30';
    const { since, until } = getDateRange(days);

    // Try Supabase first
    const sb = await getMetaSupabase();
    if (sb) {
      let query = sb.from('meta_ads_entities').select('*').eq('account_id', accountId).eq('type', 'ad');
      if (adsetId) query = query.eq('parent_id', adsetId);
      const { data: adEntities } = await query;

      if (adEntities && adEntities.length > 0) {
        const result = adEntities.map(a => ({
          id: a.id, name: a.name, status: a.status, adsetId: a.parent_id, campaignId: null,
          thumbnail: a.thumbnail_url || null,
          insights: null,
        }));
        console.log(`[meta] Ads from Supabase: ${result.length}`);
        return res.json({ connected: true, ads: result, total: result.length, period: { since, until } });
      }
    }

    // Fallback: Meta API
    const parentPath = adsetId ? `/${adsetId}/ads` : `/${accountId}/ads`;
    const adsData = await metaFetch(parentPath, {
      fields: 'name,status,adset_id,campaign_id,creative{thumbnail_url,title,body}',
      limit: '200',
    });
    const ads = adsData?.data || [];
    const insightsData = await metaFetch(`/${accountId}/insights`, {
      fields: `ad_id,ad_name,${INSIGHTS_FIELDS}`,
      time_range: JSON.stringify({ since, until }),
      level: 'ad',
      limit: '500',
      ...(adsetId ? { filtering: JSON.stringify([{ field: 'adset.id', operator: 'EQUAL', value: adsetId }]) } : {}),
    });
    const insightsMap = {};
    for (const row of (insightsData?.data || [])) {
      insightsMap[row.ad_id] = formatInsightsRow(row);
    }
    const result = ads.map(a => ({
      id: a.id, name: a.name, status: a.status, adsetId: a.adset_id, campaignId: a.campaign_id,
      thumbnail: a.creative?.thumbnail_url || null,
      insights: insightsMap[a.id] || null,
    }));
    result.sort((a, b) => (b.insights?.spend || 0) - (a.insights?.spend || 0));
    res.json({ connected: true, ads: result, total: result.length, period: { since, until } });
  } catch (error) {
    console.error('Error in /api/meta/ads:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Meta: daily timeline — Supabase first ---
app.get('/api/meta/timeline', async (req, res) => {
  try {
    if (!META_ACCESS_TOKEN) return res.json({ connected: false, timeline: [] });
    const accountId = req.query.account_id || META_AD_ACCOUNT_ID;
    if (!accountId) return res.json({ connected: true, timeline: [] });
    const days = req.query.days || '30';
    const campaignId = req.query.campaign_id;
    const { since, until } = getDateRange(days);

    // Try Supabase first
    const sb = await getMetaSupabase();
    if (sb) {
      let query = sb.from('meta_ads_daily').select('*')
        .eq('account_id', accountId)
        .gte('date', since)
        .lte('date', until)
        .order('date', { ascending: true });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId).eq('level', 'campaign');
      } else {
        query = query.eq('level', 'account');
      }

      const { data: rows } = await query;
      if (rows && rows.length > 0) {
        const timeline = rows.map(r => ({
          date: r.date,
          spend: r.spend || 0,
          impressions: r.impressions || 0,
          clicks: r.clicks || 0,
          reach: r.reach || 0,
          leads: r.leads || 0,
          linkClicks: r.link_clicks || 0,
          landingPageViews: r.landing_page_views || 0,
        }));
        console.log(`[meta] Timeline from Supabase: ${timeline.length} days`);
        return res.json({ connected: true, timeline, period: { since, until, days: parseInt(days) } });
      }
    }

    // Fallback: Meta API
    const data = await metaFetch(`/${accountId}/insights`, {
      fields: 'spend,impressions,clicks,actions,reach',
      time_range: JSON.stringify({ since, until }),
      time_increment: '1',
      level: 'account',
      limit: '500',
      ...(campaignId ? { filtering: JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaignId }]) } : {}),
    });
    const timeline = (data?.data || []).map(row => {
      const ex = extractActions(row);
      return {
        date: row.date_start,
        spend: parseFloat(row.spend || 0),
        impressions: parseInt(row.impressions || 0),
        clicks: parseInt(row.clicks || 0),
        reach: parseInt(row.reach || 0),
        leads: ex.leads,
        linkClicks: ex.linkClicks,
        landingPageViews: ex.landingPageViews,
      };
    });
    res.json({ connected: true, timeline, period: { since, until, days: parseInt(days) } });
  } catch (error) {
    console.error('Error in /api/meta/timeline:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- SPA Fallback ---
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Talentus Dashboard API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`GHL Location: ${GHL_LOCATION_ID}`);

  // Start Supabase sync in background (non-blocking)
  startSync().catch(err => console.error('[sync] Failed to start:', err.message));
});
