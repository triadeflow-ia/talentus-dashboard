import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GHL_TOKEN = process.env.GHL_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const RATE_LIMIT_MS = 700;
const CHECKPOINT_FILE = path.join(__dirname, 'migration-checkpoint.json');

// =============================================
// GHL IDs
// =============================================

const PIPELINES = {
  comercial: 'kR7dX3quCskPn8y1hUR5',
  nutricao: 'YGbvdHFPw2OMVgEyshGJ',
};

const STAGES = {
  // Comercial
  atendimento_inicial: 'f256b8a5-3f29-4d30-8e62-ffa5f9446372',
  qualificacao: '11d12653-7439-479d-8463-c11ef0fcedae',
  call_diagnostico: '27a470cc-39dd-4cc6-805f-b0fad0625fdb',
  apresentacao_r2: '52734fb3-a2a2-4377-b157-a5629ad4f32c',
  negociacao: '13ca7186-e4c0-4c45-8185-c91f9d422dc0',
  // Nutricao
  entrada_nutricao: '709e3be1-14af-4c11-a352-4e1566a8730a',
  reativacao_comercial: 'c5d13c5d-d9d2-4b18-9b6b-96bbb78ba7bc',
};

const GHL_USERS = {
  'gilcilene lima': '2Z0eH6IjgWDqUw5b4fqS',
  'lucas rodrigues': '9AXuakmsPmncaaojIyGw',
  'mateus cortez': '77uDX774vmKxyMxEhfCR',
  'karla yonara': 'CfeKqpQX6eWKCVVwyRsQ',
  'kyonaragomes@gmail.com': 'CfeKqpQX6eWKCVVwyRsQ',
  'jessica monteiro': 'ioyhsn2lFdBhMbZ2PFNZ',
};

// Custom field IDs
const FIELDS = {
  marca: '2KaHcDNMZDwsozLFB1lL',
  produto_interesse: 'qpiSM6URmXbv28u0aFUH',
  vendedor_responsavel: 'BckPK8Tk8yZvGWeGIBIZ',
  valor_fechado: 'LOY9OJpiGa5WfIgQE02G',
};

// Existing tags in GHL
const EXISTING_TAGS = {
  'produto_virada_digital': 'dkd1aUHPDnaYs9lkRFOQ',
  'produto_escola_negocios': 'm14LeqRKjqjI0owONqIy',
  'produto_escola_nutri': 'MeYLrDQJUboxJBgZwng9',
  'produto_formacao_nutri': '3HdfQfKFHSG8lqezJqcn',
  'produto_low_ticket_cyb': 'hk3cRZpKhrcDLw0fTwXV',
  'social_selling': 'MyEWx7Rn0OpOodDcWkFc',
  'trafego_pago': 'IBhdkpBDz8ekSDpbVo8d',
  'score_quente': 'qLnvelRoLLdHA5DnlwSS',
  'organico': 's0wWtBsrxmXBkwRk7ND9',
  'indicacao': 'HVPSHoEdDJZixpsJxS70',
  'marca_mateus': 'i7Hp8yqF8fODBkCduZNA',
  'marca_cyb': '0aJwjZpqmSvLBR8L11pq',
  'lead_novo': '8bGkBhahkfWPXrToQfpy',
  'venda_ganha': 'pZFi44Z8WfWQWhgRKCSX',
};

// Tags to CREATE
const TAGS_TO_CREATE = [
  'mentoria_gps',
  'mentoria_individual',
  'parcelamento',
  'renovacao',
  'ingresso_black',
  'ingresso_diamond',
  'produtos_front',
  'kommo_base_fria',
  'kommo_sdr',
  'kommo_social_selling',
  'kommo_cyb',
  'produto_profissional_mentory',
];

// =============================================
// Tag mapping: Kommo tag → GHL tag name
// =============================================
const TAG_MAP = {
  'VIRADA DIGITAL': 'produto_virada_digital',
  'ESCOLA NE': 'produto_escola_negocios',
  'FORMAÇÃO NE': 'produto_formacao_nutri',
  'FORMACAO NE': 'produto_formacao_nutri',
  'MENTORIA GPS': 'mentoria_gps',
  'MENTORIA INDIVIDUAL': 'mentoria_individual',
  'Social Selling': 'social_selling',
  'ANUNCIO DE TRÁFEGO': 'trafego_pago',
  'ANUNCIO DE TRAFEGO': 'trafego_pago',
  'PARCELAMENTO': 'parcelamento',
  'LAED QUENTE': 'score_quente',
  'LEAD DO INSTA': 'organico',
  'LINK DA BIO': 'organico',
  'MATEUS CORTEZ': 'marca_mateus',
  'Virada Digital Ingresso Black': 'ingresso_black',
  'Virada Digital Ingresso Diamond': 'ingresso_diamond',
  'PRODUTOS DE FRONT': 'produtos_front',
  'renovação': 'renovacao',
  'RENOVAÇÃO': 'renovacao',
  '82 cardápios': 'produto_low_ticket_cyb',
  '82 cardapios': 'produto_low_ticket_cyb',
  'GILCILENE': null, // goes to assignedTo
  'KARLA': null,
};

// Origin → tag
const ORIGIN_TAG_MAP = {
  'Tráfego Pago Whatsapp': 'trafego_pago',
  'Tráfego Pago': 'trafego_pago',
  'Tráfego Pago Formulário': 'trafego_pago',
  'Instagram Mateus': 'organico',
  'Instagram Cybelle': 'organico',
  'Indicação': 'indicacao',
  'Página de Captura (wordpress)': 'trafego_pago',
  'Base de Clientes': null,
};

// Product mapping: Kommo "Produto Desejado" → GHL "Produto de Interesse" value + tag
const PRODUCT_MAP = {
  'Virada Digital': { field: 'Virada Digital', tag: 'produto_virada_digital' },
  'Virada Digital Executivo': { field: 'Virada Digital', tag: 'produto_virada_digital' },
  'Escola Nutri Expert': { field: 'Escola Nutri Expert', tag: 'produto_escola_nutri' },
  'Mentoria Individual Mateus': { field: 'Sala Secreta', tag: 'mentoria_individual' },
  'Mentoria END': { field: 'Sala Secreta', tag: 'mentoria_individual' },
  'Cursos e Ebooks Nutrição': { field: 'Escola Nutri Expert', tag: 'produto_escola_nutri' },
  'Formação Nutri Expert': { field: 'Formacao Nutri Expert', tag: 'produto_formacao_nutri' },
  'Profissional Mentory': { field: 'Profissional Mentory', tag: 'produto_profissional_mentory' },
  'Low Ticket CYB': { field: 'Low Ticket CYB', tag: 'produto_low_ticket_cyb' },
};

// =============================================
// CybNutri detection
// =============================================
function isCybNutri(row, source) {
  if (source === 'cyb' || source === 'cyb_formacao') return true;
  const prod = (row['Produto Desejado'] || '').toLowerCase();
  const origem = (row['Origem'] || '').toLowerCase();
  const tags = (row['Lead tags'] || '').toLowerCase();

  if (prod.includes('nutri') || prod.includes('cyb') || prod.includes('cardapio') || prod.includes('cardápio')) return true;
  if (origem.includes('cybelle') || origem.includes('cyb')) return true;
  if (tags.includes('escola ne') && !tags.includes('virada')) return true;
  if (tags.includes('82 card')) return true;

  return false;
}

// =============================================
// GHL API helpers
// =============================================
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ghlFetch(pathStr, options = {}) {
  const url = `${GHL_BASE_URL}${pathStr}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${GHL_TOKEN}`,
      'Version': '2021-07-28',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL ${res.status}: ${text}`);
  }
  return res.json();
}

async function createTag(name) {
  try {
    const data = await ghlFetch(`/locations/${GHL_LOCATION_ID}/tags`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return data.tag?.id || null;
  } catch (e) {
    console.log(`  ⚠️ Tag "${name}" erro: ${e.message.substring(0, 80)}`);
    return null;
  }
}

async function findOrCreateContact(row) {
  const name = row['Contato principal'] || '';
  const phone = cleanPhone(row['Celular (contato)'] || row['Telefone comercial (contato)'] || row['Tel. direto com. (contato)'] || row['Outro telefone (contato)'] || '');
  const email = row['Email comercial (contato)'] || row['Email pessoal (contato)'] || '';

  if (!name && !phone && !email) return null;
  if (!phone && !email) return null; // GHL requires phone or email

  // Search by phone first
  if (phone) {
    try {
      const searchRes = await ghlFetch(`/contacts/search/duplicate?locationId=${GHL_LOCATION_ID}&phone=${encodeURIComponent(phone)}`);
      if (searchRes.contact?.id) return searchRes.contact.id;
    } catch (e) { /* not found, will create */ }
  }

  // Search by email
  if (email) {
    try {
      const searchRes = await ghlFetch(`/contacts/search/duplicate?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(email)}`);
      if (searchRes.contact?.id) return searchRes.contact.id;
    } catch (e) { /* not found */ }
  }

  // Create new contact
  const nameParts = name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const body = {
    locationId: GHL_LOCATION_ID,
    firstName,
    lastName,
  };
  if (phone) body.phone = phone;
  if (email) body.email = email;

  const city = row['Cidade (contato)'];
  if (city) body.city = city;

  try {
    const created = await ghlFetch('/contacts/', { method: 'POST', body: JSON.stringify(body) });
    return created.contact?.id || null;
  } catch (e) {
    console.log(`  ⚠️ Contact create error: ${e.message.substring(0, 100)}`);
    return null;
  }
}

function cleanPhone(raw) {
  if (!raw) return '';
  let p = raw.replace(/^'+/, '').replace(/[^\d+]/g, '');
  if (p && !p.startsWith('+')) {
    if (p.startsWith('55') && p.length >= 12) p = '+' + p;
    else if (p.length >= 10 && p.length <= 11) p = '+55' + p;
    else p = '+' + p;
  }
  return p;
}

async function createOpportunity(contactId, row, routing) {
  const { pipelineId, stageId, status, tags, customFields, assignedTo, monetaryValue } = routing;

  const body = {
    pipelineId,
    pipelineStageId: stageId,
    locationId: GHL_LOCATION_ID,
    contactId,
    name: row['Lead título'] || row['Contato principal'] || 'Lead Kommo',
    status: status || 'open',
    customFields: customFields || [],
  };

  if (monetaryValue > 0) body.monetaryValue = monetaryValue;
  if (assignedTo) body.assignedTo = assignedTo;

  try {
    const opp = await ghlFetch('/opportunities/', { method: 'POST', body: JSON.stringify(body) });
    const oppId = opp.opportunity?.id;

    // Add tags to contact (GHL tags go on contact, not opp)
    if (tags.length > 0 && contactId) {
      try {
        await ghlFetch(`/contacts/${contactId}`, {
          method: 'PUT',
          body: JSON.stringify({ tags }),
        });
      } catch (e) {
        console.log(`  ⚠️ Tags error for contact ${contactId}: ${e.message.substring(0, 60)}`);
      }
    }

    return oppId;
  } catch (e) {
    if (e.message.includes('400')) {
      return 'DUPLICATE';
    }
    throw e;
  }
}

// =============================================
// Routing logic
// =============================================
function routeLead(row, source) {
  const etapa = row['Etapa do lead'] || '';
  const venda = parseFloat(row['Venda']) || 0;
  const responsavel = (row['Lead usuário responsável'] || '').toLowerCase().trim();
  const kommoTags = (row['Lead tags'] || '').split(',').map(t => t.trim()).filter(Boolean);
  const produtoDesejado = row['Produto Desejado'] || '';
  const origem = row['Origem'] || '';
  const cyb = isCybNutri(row, source);

  let pipelineId, stageId, status;

  // ---- ROUTING POR SOURCE ----

  if (source === 'mateus') {
    // kommo.xlsx — Funil Mateus
    if (etapa === 'Etapa de leads de entrada') {
      pipelineId = PIPELINES.nutricao;
      stageId = STAGES.entrada_nutricao;
      status = 'open';
    } else if (etapa === 'BASE FRIA') {
      if (venda > 0) {
        pipelineId = PIPELINES.comercial;
        stageId = STAGES.negociacao;
        status = 'won';
      } else {
        pipelineId = PIPELINES.nutricao;
        stageId = STAGES.reativacao_comercial;
        status = 'open';
      }
    } else {
      // Active leads
      pipelineId = PIPELINES.comercial;
      if (venda > 0) {
        stageId = STAGES.negociacao;
        status = 'won';
      } else {
        const stageMap = {
          'Contato inicial': STAGES.atendimento_inicial,
          'Qualificação': STAGES.qualificacao,
          'Diagnóstico': STAGES.call_diagnostico,
          'Apresentação': STAGES.apresentacao_r2,
          'Negociação': STAGES.negociacao,
        };
        stageId = stageMap[etapa] || STAGES.atendimento_inicial;
        status = 'open';
      }
    }
  } else if (source === 'cyb') {
    // kommo2.xlsx — Funil CybNutri
    pipelineId = PIPELINES.nutricao;
    if (venda > 0) {
      stageId = STAGES.reativacao_comercial;
      status = 'won';
    } else if (etapa === 'Primeiro Contato' || etapa === 'Etapa de leads de entrada') {
      stageId = STAGES.entrada_nutricao;
      status = 'open';
    } else if (etapa === 'Recuperação / FollowUp' || etapa === 'Recuperacao / FollowUp' || etapa === 'BASE FRIA') {
      stageId = STAGES.reativacao_comercial;
      status = 'open';
    } else if (etapa === 'Qualificação' || etapa === 'Qualificacao') {
      // CybNutri qualificados → Comercial pipeline
      pipelineId = PIPELINES.comercial;
      stageId = STAGES.qualificacao;
      status = 'open';
    } else if (etapa === 'Negociação' || etapa === 'Negociacao' || etapa === 'Pagamento pendente') {
      pipelineId = PIPELINES.comercial;
      stageId = STAGES.negociacao;
      status = 'open';
    } else if (etapa === 'Call de Diagnóstico' || etapa === 'Call de Diagnostico') {
      pipelineId = PIPELINES.comercial;
      stageId = STAGES.call_diagnostico;
      status = 'open';
    } else {
      stageId = STAGES.entrada_nutricao;
      status = 'open';
    }
  } else if (source === 'sdr') {
    // kommo3.xlsx — SDR Qualificacao
    pipelineId = PIPELINES.comercial;
    if (venda > 0) {
      stageId = STAGES.negociacao;
      status = 'won';
    } else if (etapa === 'FollowUp-Recuperação' || etapa === 'FollowUp-Recuperacao' || etapa === 'Etapa de leads de entrada') {
      stageId = STAGES.atendimento_inicial;
      status = 'open';
    } else if (etapa === 'Diagnóstico Agendado' || etapa === 'Diagnostico Agendado') {
      stageId = STAGES.call_diagnostico;
      status = 'open';
    } else if (etapa === 'Apresentação Agendada' || etapa === 'Apresentacao Agendada') {
      stageId = STAGES.apresentacao_r2;
      status = 'open';
    } else if (etapa === 'Apresentação Realizada' || etapa === 'Apresentacao Realizada') {
      stageId = STAGES.negociacao;
      status = 'open';
    } else {
      stageId = STAGES.atendimento_inicial;
      status = 'open';
    }
  } else if (source === 'mateus_novo') {
    // kommo5.xlsx — NOVO Funil Mateus (todos entrada, leads frios)
    pipelineId = PIPELINES.nutricao;
    stageId = STAGES.entrada_nutricao;
    status = 'open';
  } else if (source === 'cyb_formacao') {
    // kommo6.xlsx — CybNutri Formacao
    pipelineId = PIPELINES.nutricao;
    if (venda > 0) {
      stageId = STAGES.reativacao_comercial;
      status = 'won';
    } else if (etapa === 'Etapa de leads de entrada') {
      stageId = STAGES.entrada_nutricao;
      status = 'open';
    } else if (etapa === 'Contato inicial') {
      pipelineId = PIPELINES.comercial;
      stageId = STAGES.atendimento_inicial;
      status = 'open';
    } else if (etapa === 'Qualificação' || etapa === 'Qualificacao') {
      pipelineId = PIPELINES.comercial;
      stageId = STAGES.qualificacao;
      status = 'open';
    } else if (etapa === 'Proposta enviada' || etapa === 'Pagamento Pendente') {
      pipelineId = PIPELINES.comercial;
      stageId = STAGES.negociacao;
      status = 'open';
    } else if (etapa === 'Recuperação/Followup' || etapa === 'Recuperacao/Followup' || etapa === 'Nutrição/Breakup' || etapa === 'Nutricao/Breakup') {
      stageId = STAGES.reativacao_comercial;
      status = 'open';
    } else {
      stageId = STAGES.entrada_nutricao;
      status = 'open';
    }
  } else if (source === 'social') {
    // kommo4.xlsx — Social Selling IG Mateus
    pipelineId = PIPELINES.nutricao;
    if (venda > 0) {
      pipelineId = PIPELINES.comercial;
      stageId = STAGES.negociacao;
      status = 'won';
    } else if (etapa === 'Lead Conectado' || etapa === 'Primeiro contato') {
      pipelineId = PIPELINES.comercial;
      stageId = STAGES.atendimento_inicial;
      status = 'open';
    } else if (etapa === 'Reativação' || etapa === 'Reativacao') {
      stageId = STAGES.reativacao_comercial;
      status = 'open';
    } else {
      // "Conversas IG Direct" (929) → Nutricao entrada
      stageId = STAGES.entrada_nutricao;
      status = 'open';
    }
  }

  // --- Determine assigned user ---
  let assignedTo = null;
  if (responsavel && GHL_USERS[responsavel]) {
    assignedTo = GHL_USERS[responsavel];
  }
  for (const tag of kommoTags) {
    if (tag === 'CONSULTOR: RODRIGUEZ' || tag.includes('RODRIGUEZ')) {
      assignedTo = assignedTo || GHL_USERS['lucas rodrigues'];
    } else if (tag === 'CONSULTORA: KARLA' || tag === 'KARLA') {
      assignedTo = assignedTo || GHL_USERS['karla yonara'];
    } else if (tag === 'CONSULTORA: GILCILENE' || tag === 'GILCILENE') {
      assignedTo = assignedTo || GHL_USERS['gilcilene lima'];
    }
  }

  // --- Build tags ---
  const ghlTags = new Set();

  // Brand tag
  ghlTags.add(cyb ? 'marca_cyb' : 'marca_mateus');

  // Source tag
  if (source === 'sdr') ghlTags.add('kommo_sdr');
  if (source === 'social') ghlTags.add('kommo_social_selling');
  if (source === 'cyb') ghlTags.add('kommo_cyb');

  // Map Kommo tags → GHL tags
  for (const tag of kommoTags) {
    const mapped = TAG_MAP[tag];
    if (mapped) ghlTags.add(mapped);
    if (tag.startsWith('fb') && /^\d+$/.test(tag.substring(2))) continue;
  }

  // Product tag + field
  if (produtoDesejado) {
    const mapped = PRODUCT_MAP[produtoDesejado];
    if (mapped && mapped.tag) ghlTags.add(mapped.tag);

    const lower = produtoDesejado.toLowerCase();
    if (lower.includes('virada')) ghlTags.add('produto_virada_digital');
    if (lower.includes('escola nutri')) ghlTags.add('produto_escola_nutri');
    if (lower.includes('formac') || lower.includes('formação')) ghlTags.add('produto_formacao_nutri');
    if (lower.includes('mentoria') && lower.includes('individual')) ghlTags.add('mentoria_individual');
    if (lower.includes('mentoria') && lower.includes('gps')) ghlTags.add('mentoria_gps');
    if (lower.includes('cursos') && lower.includes('nutri')) ghlTags.add('produto_escola_nutri');
    if (lower.includes('cardapio') || lower.includes('cardápio') || lower.includes('low ticket')) ghlTags.add('produto_low_ticket_cyb');
    if (lower.includes('profissional mentory')) ghlTags.add('produto_profissional_mentory');
  }

  // Origin tags
  if (origem) {
    const mappedOrigin = ORIGIN_TAG_MAP[origem];
    if (mappedOrigin) ghlTags.add(mappedOrigin);
    if (origem.toLowerCase().includes('instagram')) ghlTags.add('organico');
  }

  // Social selling IG → organico
  if (source === 'social') ghlTags.add('organico');

  // Won tag
  if (status === 'won') ghlTags.add('venda_ganha');

  // --- Custom fields ---
  const customFields = [];

  // Marca
  customFields.push({
    key: FIELDS.marca,
    field_value: cyb ? 'CybNutri' : 'Mateus Cortez',
  });

  // Produto de Interesse
  if (produtoDesejado) {
    const mapped = PRODUCT_MAP[produtoDesejado];
    if (mapped) {
      customFields.push({ key: FIELDS.produto_interesse, field_value: mapped.field });
    }
  } else {
    for (const tag of kommoTags) {
      if (tag === 'VIRADA DIGITAL') {
        customFields.push({ key: FIELDS.produto_interesse, field_value: 'Virada Digital' });
        break;
      }
      if (tag === 'ESCOLA NE') {
        customFields.push({ key: FIELDS.produto_interesse, field_value: 'Escola de Negocios' });
        break;
      }
      if (tag.includes('82 card')) {
        customFields.push({ key: FIELDS.produto_interesse, field_value: 'Low Ticket CYB' });
        break;
      }
    }
  }

  // Vendedor Responsavel (as custom field too)
  if (assignedTo) {
    const nameMap = {
      [GHL_USERS['lucas rodrigues']]: 'Lucas Rodrigues',
      [GHL_USERS['gilcilene lima']]: 'Gilcilene Lima',
      [GHL_USERS['karla yonara']]: 'Karla Yonara',
      [GHL_USERS['mateus cortez']]: 'Mateus Cortez',
      [GHL_USERS['jessica monteiro']]: 'Jessica Monteiro',
    };
    const vendedorName = nameMap[assignedTo];
    if (vendedorName) {
      customFields.push({ key: FIELDS.vendedor_responsavel, field_value: vendedorName });
    }
  }

  return {
    pipelineId,
    stageId,
    status,
    assignedTo,
    tags: [...ghlTags],
    customFields,
    monetaryValue: venda,
  };
}

// =============================================
// Checkpoint (save/resume)
// =============================================
function saveCheckpoint(index, stats) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ index, stats, timestamp: new Date().toISOString() }));
}

function loadCheckpoint() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
    } catch (e) { return null; }
  }
  return null;
}

// =============================================
// Load all spreadsheets
// =============================================
function loadAllData() {
  const files = [
    { file: 'kommo.xlsx', source: 'mateus' },
    { file: 'kommo2.xlsx', source: 'cyb' },
    { file: 'kommo3.xlsx', source: 'sdr' },
    { file: 'kommo4.xlsx', source: 'social' },
    { file: 'kommo5.xlsx', source: 'mateus_novo' },
    { file: 'kommo6.xlsx', source: 'cyb_formacao' },
  ];

  const allData = [];

  for (const { file, source } of files) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ ${file} nao encontrado, pulando...`);
      continue;
    }
    const wb = XLSX.readFile(filePath, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
    console.log(`  📄 ${file}: ${data.length} leads (${source})`);
    data.forEach(row => allData.push({ row, source }));
  }

  return allData;
}

// =============================================
// MAIN
// =============================================
async function main() {
  console.log('🚀 Migracao Kommo → GHL (Talentus Digital) — TODAS AS PLANILHAS');
  console.log('================================================================\n');

  // Load all data
  console.log('📊 Carregando planilhas...');
  const allData = loadAllData();
  console.log(`\n📊 TOTAL: ${allData.length} leads\n`);

  // DRY RUN flag
  const isDryRun = process.argv.includes('--dry-run');
  const isResume = process.argv.includes('--resume');
  if (isDryRun) {
    console.log('🔍 MODO DRY-RUN — nenhuma alteracao sera feita no GHL\n');
  }

  // Pre-analysis (route all leads)
  const routing = allData.map(({ row, source }) => ({ row, source, route: routeLead(row, source) }));

  // Stats by source
  const sources = { mateus: 0, cyb: 0, sdr: 0, social: 0, mateus_novo: 0, cyb_formacao: 0 };
  routing.forEach(r => sources[r.source]++);

  const nutricaoEntrada = routing.filter(r => r.route.stageId === STAGES.entrada_nutricao);
  const nutricaoReativ = routing.filter(r => r.route.stageId === STAGES.reativacao_comercial);
  const comercialWon = routing.filter(r => r.route.status === 'won');
  const comercialOpen = routing.filter(r => r.route.pipelineId === PIPELINES.comercial && r.route.status === 'open');
  const cybCount = routing.filter(r => r.route.tags.includes('marca_cyb'));
  const noContact = routing.filter(r => {
    const phone = cleanPhone(r.row['Celular (contato)'] || r.row['Telefone comercial (contato)'] || r.row['Tel. direto com. (contato)'] || r.row['Outro telefone (contato)'] || '');
    const email = r.row['Email comercial (contato)'] || r.row['Email pessoal (contato)'] || '';
    return !phone && !email;
  });

  console.log('📋 Plano de migracao:');
  console.log(`  Por fonte: Mateus ${sources.mateus} | CybNutri ${sources.cyb} | SDR ${sources.sdr} | Social ${sources.social}`);
  console.log(`  Nutricao → Entrada: ${nutricaoEntrada.length}`);
  console.log(`  Nutricao → Reativacao: ${nutricaoReativ.length}`);
  console.log(`  Comercial → Won: ${comercialWon.length}`);
  console.log(`  Comercial → Open: ${comercialOpen.length}`);
  console.log(`  CybNutri: ${cybCount.length} | Mateus: ${routing.length - cybCount.length}`);
  console.log(`  Sem telefone/email (serao PULADOS): ${noContact.length}`);
  console.log(`  Leads migraveis: ${routing.length - noContact.length}`);
  console.log(`  Total: ${routing.length}\n`);

  // Collect all needed tags
  const allTags = new Set();
  routing.forEach(r => r.route.tags.forEach(t => allTags.add(t)));
  console.log(`🏷️  Tags a usar (${allTags.size}): ${[...allTags].join(', ')}\n`);

  if (isDryRun) {
    // Show samples per source
    for (const src of ['mateus', 'cyb', 'sdr', 'social', 'mateus_novo', 'cyb_formacao']) {
      const subset = routing.filter(r => r.source === src);
      console.log(`\n--- AMOSTRA: ${src.toUpperCase()} (5 primeiros com contato) ---`);
      let shown = 0;
      for (const r of subset) {
        if (shown >= 5) break;
        const phone = cleanPhone(r.row['Celular (contato)'] || r.row['Telefone comercial (contato)'] || '');
        const email = r.row['Email comercial (contato)'] || '';
        if (!phone && !email) continue;
        const pipeline = r.route.pipelineId === PIPELINES.comercial ? 'Comercial' : 'Nutricao';
        console.log(`  ${r.row['Contato principal'] || '?'} | ${pipeline}/${r.route.status} | tags: ${r.route.tags.join(',')} | assigned: ${r.route.assignedTo || '-'}`);
        shown++;
      }
    }

    console.log('\n✅ Dry run completo. Rode sem --dry-run para executar.');
    console.log('   Para retomar uma migracao interrompida: node migrate-kommo.js --resume');
    return;
  }

  // === Check for resume ===
  let startIndex = 0;
  let stats = { success: 0, errors: 0, duplicates: 0, skipped: 0 };

  if (isResume) {
    const checkpoint = loadCheckpoint();
    if (checkpoint) {
      startIndex = checkpoint.index;
      stats = checkpoint.stats;
      console.log(`🔄 Retomando migracao do checkpoint: index ${startIndex} (salvo em ${checkpoint.timestamp})`);
      console.log(`   Stats ate agora: ✅${stats.success} ❌${stats.errors} ⏭️${stats.skipped} 🔄${stats.duplicates}\n`);
    } else {
      console.log('⚠️ Nenhum checkpoint encontrado, iniciando do zero.\n');
    }
  }

  // === STEP 1: Create missing tags ===
  console.log('1️⃣  Criando tags novas...');
  for (const tagName of TAGS_TO_CREATE) {
    if (!EXISTING_TAGS[tagName]) {
      const id = await createTag(tagName);
      if (id) {
        EXISTING_TAGS[tagName] = id;
        console.log(`  ✅ Tag criada: ${tagName} (${id})`);
      }
      await sleep(RATE_LIMIT_MS);
    }
  }

  // === STEP 2: Process leads ===
  console.log(`\n2️⃣  Migrando leads (${startIndex > 0 ? `retomando de ${startIndex}` : 'inicio'})...`);

  for (let i = startIndex; i < routing.length; i++) {
    const { row, route, source } = routing[i];
    const name = row['Contato principal'] || row['Lead título'] || '?';

    if (i % 100 === 0) {
      console.log(`\n  📊 Progresso: ${i}/${routing.length} [${source}] (✅${stats.success} ❌${stats.errors} ⏭️${stats.skipped} 🔄${stats.duplicates})`);
      // Save checkpoint every 100 leads
      saveCheckpoint(i, stats);
    }

    // Check if has phone or email
    const phone = cleanPhone(row['Celular (contato)'] || row['Telefone comercial (contato)'] || row['Tel. direto com. (contato)'] || row['Outro telefone (contato)'] || '');
    const email = row['Email comercial (contato)'] || row['Email pessoal (contato)'] || '';
    if (!phone && !email) {
      stats.skipped++;
      continue;
    }

    try {
      // Find or create contact
      await sleep(RATE_LIMIT_MS);
      const contactId = await findOrCreateContact(row);
      if (!contactId) {
        stats.skipped++;
        continue;
      }

      // Create opportunity
      await sleep(RATE_LIMIT_MS);
      const result = await createOpportunity(contactId, row, route);

      if (result === 'DUPLICATE') {
        stats.duplicates++;
      } else {
        stats.success++;
      }
    } catch (e) {
      stats.errors++;
      if (stats.errors <= 20) {
        console.log(`  ❌ [${i}/${source}] ${name}: ${e.message.substring(0, 100)}`);
      }
      if (stats.errors === 20) console.log('  (suprimindo erros subsequentes...)');
    }
  }

  // Save final checkpoint
  saveCheckpoint(routing.length, stats);

  console.log('\n================================================================');
  console.log('🏁 MIGRACAO COMPLETA');
  console.log('================================================================');
  console.log(`  ✅ Sucesso: ${stats.success}`);
  console.log(`  🔄 Duplicados: ${stats.duplicates}`);
  console.log(`  ⏭️  Pulados (sem tel/email): ${stats.skipped}`);
  console.log(`  ❌ Erros: ${stats.errors}`);
  console.log(`  📊 Total processado: ${routing.length}`);

  // Remove checkpoint file on successful completion
  if (stats.errors === 0 && fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE);
    console.log('\n  🗑️ Checkpoint removido (migracao completa sem erros)');
  }
}

main().catch(e => {
  console.error('💥 Erro fatal:', e);
  process.exit(1);
});
