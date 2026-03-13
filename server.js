import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3940;
const GHL_TOKEN = process.env.GHL_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

// --- Meta Ads ---
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// --- Pipeline IDs ---
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

// --- Seller metadata (photos, team info) ---
// GHL User IDs: Lucas=9AXuakmsPmncaaojIyGw, Gilcilene=2Z0eH6IjgWDqUw5b4fqS,
// Kyonara=CfeKqpQX6eWKCVVwyRsQ, Mateus=77uDX774vmKxyMxEhfCR, Jessica=W4iYpPWuyc1lVnfyIKa5
const SELLER_META = {
  'lucas rodrigues': {
    photo: 'https://api.dicebear.com/9.x/notionists/svg?seed=Lucas&backgroundColor=26428B',
    role: 'Vendedor',
    email: 'profissional.lucasrodrigues@gmail.com',
    ghlId: '9AXuakmsPmncaaojIyGw',
  },
  'gilcilene lima': {
    photo: 'https://api.dicebear.com/9.x/notionists/svg?seed=Gilcilene&backgroundColor=10b981',
    role: 'Vendedora',
    email: 'gilcilenelimaadm25@gmail.com',
    ghlId: '2Z0eH6IjgWDqUw5b4fqS',
  },
  'kyonara gomes': {
    photo: 'https://api.dicebear.com/9.x/notionists/svg?seed=Kyonara&backgroundColor=8b5cf6',
    role: 'Vendedora',
    email: 'kyonaragomes@gmail.com',
    ghlId: 'CfeKqpQX6eWKCVVwyRsQ',
  },
  'mateus cortez': {
    photo: 'https://api.dicebear.com/9.x/notionists/svg?seed=Mateus&backgroundColor=f59e0b',
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

// --- Middleware ---
app.use(cors());
app.use(express.json());

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

// --- Helper: Get custom field value from opp ---
function getCustomField(opp, ...keys) {
  const fields = opp.customFields || [];
  for (const f of fields) {
    const k = (f.key || f.fieldKey || '').toLowerCase();
    if (keys.some(key => k.includes(key))) return f.value;
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

// --- Helper: Filter opps by seller ---
function filterBySeller(opps, seller) {
  if (!seller || seller === 'all') return opps;
  return opps.filter(opp => {
    const vendedor = resolveSellerName(getCustomField(opp, 'vendedor') || opp.assignedTo) || '';
    return vendedor.toLowerCase().includes(seller.toLowerCase());
  });
}

// --- Routes ---

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// Overview — aggregated KPIs
app.get('/api/overview', async (req, res) => {
  try {
    const brand = req.query.brand;
    const seller = req.query.seller;

    const [contactsData, pipelineResults] = await Promise.all([
      ghlFetch(`/contacts/?locationId=${GHL_LOCATION_ID}&limit=1`),
      fetchAllPipelineOpportunities(),
    ]);

    const totalLeads = contactsData.meta?.total || contactsData.contacts?.length || 0;

    let allOpps = pipelineResults.flatMap(r => r.opportunities);
    allOpps = filterByBrand(allOpps, brand);
    allOpps = filterBySeller(allOpps, seller);

    const pipelineSummary = [];
    for (const { pipelineId, opportunities } of pipelineResults) {
      const opps = filterByBrand(opportunities, brand);
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

    // Build commercial funnel from Comercial pipeline stages
    const comercialResult = pipelineResults.find(r => r.pipelineId === PIPELINE_IDS.comercial);
    let commercialFunnel = [];
    if (comercialResult) {
      const opps = filterBySeller(filterByBrand(comercialResult.opportunities, brand), seller);
      const pipelinesData = await ghlFetch(`/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`);
      const comercialPipeline = (pipelinesData.pipelines || []).find(p => p.id === PIPELINE_IDS.comercial);
      if (comercialPipeline) {
        commercialFunnel = (comercialPipeline.stages || [])
          .sort((a, b) => a.position - b.position)
          .map(stage => ({
            name: stage.name,
            count: opps.filter(o => o.pipelineStageId === stage.id && o.status === 'open').length,
          }));
      }
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

// Pipelines — stages + opportunity counts
app.get('/api/pipelines', async (req, res) => {
  try {
    const brand = req.query.brand;
    const seller = req.query.seller;

    const pipelinesData = await ghlFetch(`/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`);
    const pipelines = pipelinesData.pipelines || [];
    const pipelineIds = Object.values(PIPELINE_IDS);
    const results = [];

    for (const pipeline of pipelines) {
      if (!pipelineIds.includes(pipeline.id)) continue;

      const opps = filterBySeller(filterByBrand(await fetchAllOpportunities(pipeline.id), brand), seller);

      const stages = (pipeline.stages || [])
        .sort((a, b) => a.position - b.position)
        .map(stage => {
          const stageOpps = opps.filter(o => o.pipelineStageId === stage.id);
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

      const open = opps.filter(o => o.status === 'open').length;
      const won = opps.filter(o => o.status === 'won').length;
      const lost = opps.filter(o => o.status === 'lost').length;
      const abandoned = opps.filter(o => o.status === 'abandoned').length;

      results.push({
        id: pipeline.id,
        name: pipeline.name,
        totalOpps: opps.length,
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
    const pipelineResults = await fetchAllPipelineOpportunities();
    let allOpps = pipelineResults.flatMap(r => r.opportunities);
    allOpps = filterByBrand(allOpps, brand);
    allOpps = filterBySeller(allOpps, seller);

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
    const pipelineResults = await fetchAllPipelineOpportunities();
    let allOpps = pipelineResults.flatMap(r => r.opportunities);
    allOpps = filterByBrand(allOpps, brand);
    allOpps = filterBySeller(allOpps, seller);

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
    const [contactFieldsData, oppFieldsData, pipelinesData, usersData, calendarsData] = await Promise.all([
      ghlFetch(`/locations/${GHL_LOCATION_ID}/customFields`).catch(() => ({ customFields: [] })),
      ghlFetch(`/locations/${GHL_LOCATION_ID}/customFields?model=opportunity`).catch(() => ({ customFields: [] })),
      ghlFetch(`/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`).catch(() => ({ pipelines: [] })),
      ghlFetch(`/users/?locationId=${GHL_LOCATION_ID}`).catch(() => ({ users: [] })),
      ghlFetch(`/calendars/?locationId=${GHL_LOCATION_ID}`).catch(() => ({ calendars: [] })),
    ]);

    const contactFields = contactFieldsData.customFields || [];
    const oppFields = oppFieldsData.customFields || [];
    const pipelines = pipelinesData.pipelines || [];
    const users = usersData.users || [];
    const calendars = calendarsData.calendars || [];

    res.json({
      fields: contactFields.length + oppFields.length,
      pipelines: pipelines.length,
      tags: 38,
      users: users.length,
      calendars: calendars.length,
    });
  } catch (error) {
    console.error('Error in /api/crm-structure:', error.message);
    res.status(500).json({ error: 'Failed to fetch CRM structure', details: error.message });
  }
});

// Sellers list (for dropdown filter)
app.get('/api/sellers-list', async (req, res) => {
  try {
    const pipelineResults = await fetchAllPipelineOpportunities();
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

    const pipelineResults = await fetchAllPipelineOpportunities();
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

    const pipelineResults = await fetchAllPipelineOpportunities();
    let allOpps = pipelineResults.flatMap(r => r.opportunities);
    allOpps = filterByBrand(allOpps, brand);

    if (seller && seller !== 'all') {
      allOpps = allOpps.filter(opp => {
        const vendedor = resolveSellerName(getCustomField(opp, 'vendedor') || opp.assignedTo) || '';
        return vendedor.toLowerCase().includes(seller.toLowerCase());
      });
    }

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
// META ADS ENDPOINTS
// =============================================

// Helper: Meta API fetch
async function metaFetch(path, params = {}) {
  if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
    return null; // Not configured
  }
  const url = new URL(`${META_BASE_URL}${path}`);
  url.searchParams.set('access_token', META_ACCESS_TOKEN);
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API error ${res.status}: ${text}`);
  }
  return res.json();
}

// Helper: get date range
function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - parseInt(days));
  return {
    since: start.toISOString().split('T')[0],
    until: end.toISOString().split('T')[0],
  };
}

// Meta connection status
app.get('/api/meta/status', (req, res) => {
  res.json({
    connected: !!(META_ACCESS_TOKEN && META_AD_ACCOUNT_ID),
    adAccountId: META_AD_ACCOUNT_ID ? META_AD_ACCOUNT_ID.replace(/act_/, 'act_***') : null,
  });
});

// Meta account-level insights (KPIs)
app.get('/api/meta/insights', async (req, res) => {
  try {
    if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
      return res.json({ connected: false, data: null });
    }

    const days = req.query.days || '30';
    const { since, until } = getDateRange(days);

    const data = await metaFetch(`/${META_AD_ACCOUNT_ID}/insights`, {
      fields: 'spend,impressions,reach,clicks,cpc,cpm,ctr,actions,cost_per_action_type,frequency,unique_clicks,cost_per_unique_click',
      time_range: JSON.stringify({ since, until }),
      level: 'account',
    });

    const insights = data?.data?.[0] || {};

    // Extract conversions from actions
    const actions = insights.actions || [];
    const leads = actions.find(a => a.action_type === 'lead')?.value || 0;
    const purchases = actions.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0;
    const landingPageViews = actions.find(a => a.action_type === 'landing_page_view')?.value || 0;
    const linkClicks = actions.find(a => a.action_type === 'link_click')?.value || 0;

    // Extract cost per action
    const costPerAction = insights.cost_per_action_type || [];
    const cpl = costPerAction.find(a => a.action_type === 'lead')?.value || 0;
    const cpa = costPerAction.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0;

    res.json({
      connected: true,
      data: {
        spend: parseFloat(insights.spend || 0),
        impressions: parseInt(insights.impressions || 0),
        reach: parseInt(insights.reach || 0),
        clicks: parseInt(insights.clicks || 0),
        uniqueClicks: parseInt(insights.unique_clicks || 0),
        cpc: parseFloat(insights.cpc || 0),
        cpm: parseFloat(insights.cpm || 0),
        ctr: parseFloat(insights.ctr || 0),
        frequency: parseFloat(insights.frequency || 0),
        costPerUniqueClick: parseFloat(insights.cost_per_unique_click || 0),
        leads: parseInt(leads),
        purchases: parseInt(purchases),
        landingPageViews: parseInt(landingPageViews),
        linkClicks: parseInt(linkClicks),
        cpl: parseFloat(cpl),
        cpa: parseFloat(cpa),
        period: { since, until, days: parseInt(days) },
      },
    });
  } catch (error) {
    console.error('Error in /api/meta/insights:', error.message);
    res.status(500).json({ error: 'Failed to fetch Meta insights', details: error.message });
  }
});

// Meta campaigns list with insights
app.get('/api/meta/campaigns', async (req, res) => {
  try {
    if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
      return res.json({ connected: false, campaigns: [] });
    }

    const days = req.query.days || '30';
    const { since, until } = getDateRange(days);

    // Fetch campaigns
    const campaignsData = await metaFetch(`/${META_AD_ACCOUNT_ID}/campaigns`, {
      fields: 'name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time',
      limit: '100',
      filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'ARCHIVED'] }]),
    });

    const campaigns = campaignsData?.data || [];

    // Fetch insights for each campaign
    const campaignIds = campaigns.map(c => c.id);
    let campaignInsights = {};

    if (campaignIds.length > 0) {
      const insightsData = await metaFetch(`/${META_AD_ACCOUNT_ID}/insights`, {
        fields: 'campaign_id,campaign_name,spend,impressions,reach,clicks,cpc,cpm,ctr,actions,cost_per_action_type,unique_clicks',
        time_range: JSON.stringify({ since, until }),
        level: 'campaign',
        limit: '500',
      });

      for (const row of (insightsData?.data || [])) {
        const actions = row.actions || [];
        const costPerAction = row.cost_per_action_type || [];
        const leads = actions.find(a => a.action_type === 'lead')?.value || 0;
        const purchases = actions.find(a => a.action_type === 'purchase')?.value || 0;
        const linkClicks = actions.find(a => a.action_type === 'link_click')?.value || 0;
        const cpl = costPerAction.find(a => a.action_type === 'lead')?.value || 0;

        campaignInsights[row.campaign_id] = {
          spend: parseFloat(row.spend || 0),
          impressions: parseInt(row.impressions || 0),
          reach: parseInt(row.reach || 0),
          clicks: parseInt(row.clicks || 0),
          uniqueClicks: parseInt(row.unique_clicks || 0),
          cpc: parseFloat(row.cpc || 0),
          cpm: parseFloat(row.cpm || 0),
          ctr: parseFloat(row.ctr || 0),
          leads: parseInt(leads),
          purchases: parseInt(purchases),
          linkClicks: parseInt(linkClicks),
          cpl: parseFloat(cpl),
        };
      }
    }

    // Merge campaigns with insights
    const result = campaigns.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
      lifetimeBudget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
      startTime: c.start_time,
      stopTime: c.stop_time,
      createdTime: c.created_time,
      insights: campaignInsights[c.id] || null,
    }));

    // Sort by spend descending
    result.sort((a, b) => (b.insights?.spend || 0) - (a.insights?.spend || 0));

    res.json({
      connected: true,
      campaigns: result,
      total: result.length,
      period: { since, until, days: parseInt(days) },
    });
  } catch (error) {
    console.error('Error in /api/meta/campaigns:', error.message);
    res.status(500).json({ error: 'Failed to fetch Meta campaigns', details: error.message });
  }
});

// Meta daily timeline (spend + results over time)
app.get('/api/meta/timeline', async (req, res) => {
  try {
    if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
      return res.json({ connected: false, timeline: [] });
    }

    const days = req.query.days || '30';
    const { since, until } = getDateRange(days);

    const data = await metaFetch(`/${META_AD_ACCOUNT_ID}/insights`, {
      fields: 'spend,impressions,clicks,actions,reach',
      time_range: JSON.stringify({ since, until }),
      time_increment: '1',
      level: 'account',
      limit: '500',
    });

    const timeline = (data?.data || []).map(row => {
      const actions = row.actions || [];
      const leads = actions.find(a => a.action_type === 'lead')?.value || 0;
      const linkClicks = actions.find(a => a.action_type === 'link_click')?.value || 0;
      return {
        date: row.date_start,
        spend: parseFloat(row.spend || 0),
        impressions: parseInt(row.impressions || 0),
        clicks: parseInt(row.clicks || 0),
        reach: parseInt(row.reach || 0),
        leads: parseInt(leads),
        linkClicks: parseInt(linkClicks),
      };
    });

    res.json({ connected: true, timeline, period: { since, until, days: parseInt(days) } });
  } catch (error) {
    console.error('Error in /api/meta/timeline:', error.message);
    res.status(500).json({ error: 'Failed to fetch Meta timeline', details: error.message });
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
});
