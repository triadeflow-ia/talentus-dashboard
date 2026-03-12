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
const SELLER_META = {
  'lucas rodrigues': {
    photo: null,
    role: 'Vendedor',
    email: 'profissional.lucasrodrigues@gmail.com',
  },
  'gilcilene lima': {
    photo: null,
    role: 'Vendedor',
    email: 'gilcilenelimaadm25@gmail.com',
  },
  'kyonara gomes': {
    photo: null,
    role: 'Vendedor',
    email: 'kyonaragomes@gmail.com',
  },
  'mateus cortez': {
    photo: null,
    role: 'CEO / Estrategista',
    email: 'mateuscortez@empresacmcdigital.com',
  },
};

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

    const [contactsData, pipelineResults] = await Promise.all([
      ghlFetch(`/contacts/?locationId=${GHL_LOCATION_ID}&limit=1`),
      fetchAllPipelineOpportunities(),
    ]);

    const totalLeads = contactsData.meta?.total || contactsData.contacts?.length || 0;

    let allOpps = pipelineResults.flatMap(r => r.opportunities);
    allOpps = filterByBrand(allOpps, brand);

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
      const opps = filterByBrand(comercialResult.opportunities, brand);
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

    const pipelinesData = await ghlFetch(`/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`);
    const pipelines = pipelinesData.pipelines || [];
    const pipelineIds = Object.values(PIPELINE_IDS);
    const results = [];

    for (const pipeline of pipelines) {
      if (!pipelineIds.includes(pipeline.id)) continue;

      const opps = filterByBrand(await fetchAllOpportunities(pipeline.id), brand);

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

// Sellers — with gamification data
app.get('/api/sellers', async (req, res) => {
  try {
    const brand = req.query.brand;
    const pipelineResults = await fetchAllPipelineOpportunities();
    let allOpps = pipelineResults.flatMap(r => r.opportunities);
    allOpps = filterByBrand(allOpps, brand);

    const sellerMap = {};

    for (const opp of allOpps) {
      const vendedor = getCustomField(opp, 'vendedor') || opp.assignedTo || 'Nao atribuido';

      if (!sellerMap[vendedor]) {
        sellerMap[vendedor] = {
          name: vendedor,
          totalOpps: 0, won: 0, lost: 0, open: 0, abandoned: 0,
          revenue: 0, tickets: [],
        };
      }

      const s = sellerMap[vendedor];
      s.totalOpps++;

      if (opp.status === 'won') {
        s.won++;
        const val = parseFloat(opp.monetaryValue) || 0;
        s.revenue += val;
        if (val > 0) s.tickets.push(val);
      } else if (opp.status === 'lost') {
        s.lost++;
      } else if (opp.status === 'open') {
        s.open++;
      } else if (opp.status === 'abandoned') {
        s.abandoned++;
      }
    }

    const sellers = Object.values(sellerMap).map(s => {
      const meta = SELLER_META[s.name.toLowerCase()] || {};
      const avgTicket = s.tickets.length > 0
        ? s.tickets.reduce((a, b) => a + b, 0) / s.tickets.length
        : 0;

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
        conversionRate: s.totalOpps > 0 ? (s.won / s.totalOpps) * 100 : 0,
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

    res.json({ sellers });
  } catch (error) {
    console.error('Error in /api/sellers:', error.message);
    res.status(500).json({ error: 'Failed to fetch sellers', details: error.message });
  }
});

// Products — grouped by brand
app.get('/api/products', async (req, res) => {
  try {
    const brand = req.query.brand;
    const pipelineResults = await fetchAllPipelineOpportunities();
    let allOpps = pipelineResults.flatMap(r => r.opportunities);
    allOpps = filterByBrand(allOpps, brand);

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
