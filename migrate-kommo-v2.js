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
const RATE_LIMIT_MS = 2000; // 2s entre requests — seguro contra 429
const BATCH_PAUSE_MS = 5000; // 5s a cada 100 leads
const CHECKPOINT_FILE = path.join(__dirname, 'migration-v2-checkpoint.json');

// =============================================
// GHL IDs — PIPELINES SEPARADOS POR MARCA
// =============================================

const PIPELINES = {
  comercial_mateus: 'kR7dX3quCskPn8y1hUR5',
  comercial_cyb: 'l0xKJIaG2JOWnpriXGlS',
  nutricao: 'YGbvdHFPw2OMVgEyshGJ',
};

const STAGES = {
  // Comercial Mateus Cortez
  mateus_atendimento_inicial: 'f256b8a5-3f29-4d30-8e62-ffa5f9446372',
  mateus_qualificacao: '11d12653-7439-479d-8463-c11ef0fcedae',
  mateus_call_diagnostico: '27a470cc-39dd-4cc6-805f-b0fad0625fdb',
  mateus_apresentacao_r2: '52734fb3-a2a2-4377-b157-a5629ad4f32c',
  mateus_negociacao: '13ca7186-e4c0-4c45-8185-c91f9d422dc0',

  // Comercial CybNutri
  cyb_atendimento_inicial: '1c55eaa6-450c-4336-aa7a-d0762e35eb64',
  cyb_qualificacao: '321425d8-c9ea-4077-996f-b13ab8f5af24',
  cyb_call_diagnostico: 'f3c1e71b-70bc-413e-abf1-3f546642efaa',
  cyb_apresentacao_r2: 'f631bdb4-84b7-4555-97ef-3b91a16645ea',
  cyb_negociacao: 'e4d5e74f-5eaa-45ff-a758-fcae0e14ba52',

  // Nutricao (mantem igual)
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

const FIELDS = {
  marca: '2KaHcDNMZDwsozLFB1lL',
  produto_interesse: 'qpiSM6URmXbv28u0aFUH',
  vendedor_responsavel: 'BckPK8Tk8yZvGWeGIBIZ',
  valor_fechado: 'LOY9OJpiGa5WfIgQE02G',
};

// Tag mapping: Kommo tag → GHL tag name
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
  'GILCILENE': null,
  'KARLA': null,
};

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

const TAGS_TO_CREATE = [
  'mentoria_gps', 'mentoria_individual', 'parcelamento', 'renovacao',
  'ingresso_black', 'ingresso_diamond', 'produtos_front',
  'kommo_base_fria', 'kommo_sdr', 'kommo_social_selling', 'kommo_cyb',
  'produto_profissional_mentory',
];

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

// =============================================
// CybNutri detection — por SOURCE (confiavel)
// =============================================
function isCybNutri(row, source) {
  // Source eh a forma MAIS confiavel de determinar marca
  if (source === 'cyb' || source === 'cyb_formacao') return true;
  if (source === 'mateus' || source === 'mateus_novo' || source === 'sdr' || source === 'social') return false;

  // Fallback: detectar por conteudo (so se source desconhecido)
  const prod = (row['Produto Desejado'] || '').toLowerCase();
  const origem = (row['Origem'] || '').toLowerCase();
  if (prod.includes('nutri') || prod.includes('cyb') || prod.includes('cardapio') || prod.includes('cardápio')) return true;
  if (origem.includes('cybelle') || origem.includes('cyb')) return true;
  return false;
}

// =============================================
// GHL API helpers
// =============================================
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ghlFetch(pathStr, options = {}, retries = 3) {
  const url = `${GHL_BASE_URL}${pathStr}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    let res;
    try {
      res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${GHL_TOKEN}`,
          'Version': '2021-07-28',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        console.log(`  ⏳ Timeout 30s em ${pathStr} (tentativa ${attempt}/${retries})`);
        await sleep(5000);
        continue;
      }
      throw e;
    }
    clearTimeout(timeoutId);
    if (res.status === 429) {
      const waitMs = 15000 * attempt;
      console.log(`  ⏳ 429 — esperando ${waitMs / 1000}s (tentativa ${attempt}/${retries})...`);
      await sleep(waitMs);
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GHL ${res.status}: ${text.substring(0, 200)}`);
    }
    return res.json();
  }
  throw new Error(`429 persistente apos ${retries} tentativas`);
}

// Parse "Data Criada" do Kommo: "06.03.2026 06:29:39" → ISO string
function parseKommoDate(raw) {
  if (!raw) return null;
  // Formato: DD.MM.YYYY HH:MM:SS
  const match = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min, ss] = match;
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}.000Z`;
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

// =============================================
// Contact: find or create
// =============================================
async function findOrCreateContact(row) {
  const name = row['Contato principal'] || '';
  const phone = cleanPhone(row['Celular (contato)'] || row['Telefone comercial (contato)'] || row['Tel. direto com. (contato)'] || row['Outro telefone (contato)'] || '');
  const email = row['Email comercial (contato)'] || row['Email pessoal (contato)'] || '';
  const dataCriada = parseKommoDate(row['Data Criada']);

  if (!name && !phone && !email) return null;
  if (!phone && !email) return null;

  // Search by phone (using query parameter, not body)
  if (phone) {
    try {
      const searchRes = await ghlFetch(`/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(phone)}&limit=1`);
      const found = searchRes.contacts?.[0];
      if (found?.id) return { id: found.id, isNew: false };
    } catch (e) { /* not found */ }
  }

  // Search by email
  if (email) {
    try {
      const searchRes = await ghlFetch(`/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(email)}&limit=1`);
      const found = searchRes.contacts?.[0];
      if (found?.id) return { id: found.id, isNew: false };
    } catch (e) { /* not found */ }
  }

  // Create new contact (dateAdded sera aplicado via update depois)
  const nameParts = name.split(' ');
  const body = {
    locationId: GHL_LOCATION_ID,
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
  };
  if (phone) body.phone = phone;
  if (email) body.email = email;

  const city = row['Cidade (contato)'];
  if (city) body.city = city;

  try {
    const created = await ghlFetch('/contacts/', { method: 'POST', body: JSON.stringify(body) });
    return { id: created.contact?.id || null, isNew: true };
  } catch (e) {
    const errText = e.message || '';
    const metaMatch = errText.match(/"contactId"\s*:\s*"([^"]+)"/);
    if (metaMatch && metaMatch[1]) return { id: metaMatch[1], isNew: false };

    if (phone) {
      try {
        const rawPhone = phone.replace(/^\+55/, '');
        const searchRes = await ghlFetch(`/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(rawPhone)}&limit=1`);
        const found = searchRes.contacts?.[0];
        if (found?.id) return { id: found.id, isNew: false };
      } catch (e2) { /* not found */ }
    }
    console.log(`  ⚠️ Contact create error: ${errText.substring(0, 100)}`);
    return null;
  }
}

// =============================================
// Tags: MERGE (nao sobrescrever!)
// =============================================
async function setContactTags(contactId, newTags) {
  if (!newTags.length || !contactId) return;

  try {
    await ghlFetch(`/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify({ tags: newTags }),
    });
  } catch (e) {
    console.log(`  ⚠️ Tags error ${contactId}: ${e.message.substring(0, 60)}`);
  }
}

// =============================================
// Opportunity: create
// =============================================
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

    // Setar tags no contato
    await sleep(RATE_LIMIT_MS);
    await setContactTags(contactId, tags);

    return oppId;
  } catch (e) {
    if (e.message.includes('400')) return 'DUPLICATE';
    throw e;
  }
}

// =============================================
// ROUTING v2 — Pipelines separados por marca
// =============================================
function getComercialStage(stageName, cyb) {
  const prefix = cyb ? 'cyb_' : 'mateus_';
  return STAGES[prefix + stageName];
}

function routeLead(row, source) {
  const etapa = row['Etapa do lead'] || '';
  const venda = parseFloat(row['Venda']) || 0;
  const responsavel = (row['Lead usuário responsável'] || '').toLowerCase().trim();
  const kommoTags = (row['Lead tags'] || '').split(',').map(t => t.trim()).filter(Boolean);
  const produtoDesejado = row['Produto Desejado'] || '';
  const origem = row['Origem'] || '';
  const cyb = isCybNutri(row, source);

  // Pipeline comercial correto baseado na marca
  const pipeComercial = cyb ? PIPELINES.comercial_cyb : PIPELINES.comercial_mateus;

  let pipelineId, stageId, status;

  // ---- ROUTING POR SOURCE ----

  if (source === 'mateus') {
    if (etapa === 'Etapa de leads de entrada') {
      pipelineId = PIPELINES.nutricao;
      stageId = STAGES.entrada_nutricao;
      status = 'open';
    } else if (etapa === 'BASE FRIA') {
      if (venda > 0) {
        pipelineId = pipeComercial;
        stageId = getComercialStage('negociacao', cyb);
        status = 'won';
      } else {
        pipelineId = PIPELINES.nutricao;
        stageId = STAGES.reativacao_comercial;
        status = 'open';
      }
    } else {
      pipelineId = pipeComercial;
      if (venda > 0) {
        stageId = getComercialStage('negociacao', cyb);
        status = 'won';
      } else {
        const stageMap = {
          'Contato inicial': 'atendimento_inicial',
          'Qualificação': 'qualificacao',
          'Diagnóstico': 'call_diagnostico',
          'Apresentação': 'apresentacao_r2',
          'Negociação': 'negociacao',
        };
        stageId = getComercialStage(stageMap[etapa] || 'atendimento_inicial', cyb);
        status = 'open';
      }
    }
  } else if (source === 'cyb') {
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
      pipelineId = pipeComercial;
      stageId = getComercialStage('qualificacao', cyb);
      status = 'open';
    } else if (etapa === 'Negociação' || etapa === 'Negociacao' || etapa === 'Pagamento pendente') {
      pipelineId = pipeComercial;
      stageId = getComercialStage('negociacao', cyb);
      status = 'open';
    } else if (etapa === 'Call de Diagnóstico' || etapa === 'Call de Diagnostico') {
      pipelineId = pipeComercial;
      stageId = getComercialStage('call_diagnostico', cyb);
      status = 'open';
    } else {
      stageId = STAGES.entrada_nutricao;
      status = 'open';
    }
  } else if (source === 'sdr') {
    pipelineId = pipeComercial;
    if (venda > 0) {
      stageId = getComercialStage('negociacao', cyb);
      status = 'won';
    } else if (etapa === 'FollowUp-Recuperação' || etapa === 'FollowUp-Recuperacao' || etapa === 'Etapa de leads de entrada') {
      stageId = getComercialStage('atendimento_inicial', cyb);
      status = 'open';
    } else if (etapa === 'Diagnóstico Agendado' || etapa === 'Diagnostico Agendado') {
      stageId = getComercialStage('call_diagnostico', cyb);
      status = 'open';
    } else if (etapa === 'Apresentação Agendada' || etapa === 'Apresentacao Agendada') {
      stageId = getComercialStage('apresentacao_r2', cyb);
      status = 'open';
    } else if (etapa === 'Apresentação Realizada' || etapa === 'Apresentacao Realizada') {
      stageId = getComercialStage('negociacao', cyb);
      status = 'open';
    } else {
      stageId = getComercialStage('atendimento_inicial', cyb);
      status = 'open';
    }
  } else if (source === 'mateus_novo') {
    pipelineId = PIPELINES.nutricao;
    stageId = STAGES.entrada_nutricao;
    status = 'open';
  } else if (source === 'cyb_formacao') {
    pipelineId = PIPELINES.nutricao;
    if (venda > 0) {
      stageId = STAGES.reativacao_comercial;
      status = 'won';
    } else if (etapa === 'Etapa de leads de entrada') {
      stageId = STAGES.entrada_nutricao;
      status = 'open';
    } else if (etapa === 'Contato inicial') {
      pipelineId = pipeComercial;
      stageId = getComercialStage('atendimento_inicial', cyb);
      status = 'open';
    } else if (etapa === 'Qualificação' || etapa === 'Qualificacao') {
      pipelineId = pipeComercial;
      stageId = getComercialStage('qualificacao', cyb);
      status = 'open';
    } else if (etapa === 'Proposta enviada' || etapa === 'Pagamento Pendente') {
      pipelineId = pipeComercial;
      stageId = getComercialStage('negociacao', cyb);
      status = 'open';
    } else if (etapa === 'Recuperação/Followup' || etapa === 'Recuperacao/Followup' || etapa === 'Nutrição/Breakup' || etapa === 'Nutricao/Breakup') {
      stageId = STAGES.reativacao_comercial;
      status = 'open';
    } else {
      stageId = STAGES.entrada_nutricao;
      status = 'open';
    }
  } else if (source === 'social') {
    pipelineId = PIPELINES.nutricao;
    if (venda > 0) {
      pipelineId = pipeComercial;
      stageId = getComercialStage('negociacao', cyb);
      status = 'won';
    } else if (etapa === 'Lead Conectado' || etapa === 'Primeiro contato') {
      pipelineId = pipeComercial;
      stageId = getComercialStage('atendimento_inicial', cyb);
      status = 'open';
    } else if (etapa === 'Reativação' || etapa === 'Reativacao') {
      stageId = STAGES.reativacao_comercial;
      status = 'open';
    } else {
      stageId = STAGES.entrada_nutricao;
      status = 'open';
    }
  }

  // --- Assigned user ---
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
  ghlTags.add(cyb ? 'marca_cyb' : 'marca_mateus');

  if (source === 'sdr') ghlTags.add('kommo_sdr');
  if (source === 'social') ghlTags.add('kommo_social_selling');
  if (source === 'cyb') ghlTags.add('kommo_cyb');

  for (const tag of kommoTags) {
    const mapped = TAG_MAP[tag];
    if (mapped) ghlTags.add(mapped);
  }

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

  if (origem) {
    const mappedOrigin = ORIGIN_TAG_MAP[origem];
    if (mappedOrigin) ghlTags.add(mappedOrigin);
    if (origem.toLowerCase().includes('instagram')) ghlTags.add('organico');
  }

  if (source === 'social') ghlTags.add('organico');
  if (status === 'won') ghlTags.add('venda_ganha');

  // --- Custom fields ---
  const customFields = [];
  customFields.push({ key: FIELDS.marca, field_value: cyb ? 'CybNutri' : 'Mateus Cortez' });

  if (produtoDesejado) {
    const mapped = PRODUCT_MAP[produtoDesejado];
    if (mapped) customFields.push({ key: FIELDS.produto_interesse, field_value: mapped.field });
  } else {
    for (const tag of kommoTags) {
      if (tag === 'VIRADA DIGITAL') { customFields.push({ key: FIELDS.produto_interesse, field_value: 'Virada Digital' }); break; }
      if (tag === 'ESCOLA NE') { customFields.push({ key: FIELDS.produto_interesse, field_value: 'Escola de Negocios' }); break; }
      if (tag.includes('82 card')) { customFields.push({ key: FIELDS.produto_interesse, field_value: 'Low Ticket CYB' }); break; }
    }
  }

  if (assignedTo) {
    const nameMap = {
      [GHL_USERS['lucas rodrigues']]: 'Lucas Rodrigues',
      [GHL_USERS['gilcilene lima']]: 'Gilcilene Lima',
      [GHL_USERS['karla yonara']]: 'Karla Yonara',
      [GHL_USERS['mateus cortez']]: 'Mateus Cortez',
      [GHL_USERS['jessica monteiro']]: 'Jessica Monteiro',
    };
    const vendedorName = nameMap[assignedTo];
    if (vendedorName) customFields.push({ key: FIELDS.vendedor_responsavel, field_value: vendedorName });
  }

  return { pipelineId, stageId, status, assignedTo, tags: [...ghlTags], customFields, monetaryValue: venda };
}

// =============================================
// Checkpoint
// =============================================
function saveCheckpoint(index, stats) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ index, stats, timestamp: new Date().toISOString() }));
}
function loadCheckpoint() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try { return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8')); } catch (e) { return null; }
  }
  return null;
}

// =============================================
// Load spreadsheets
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
    if (!fs.existsSync(filePath)) { console.log(`⚠️ ${file} nao encontrado, pulando...`); continue; }
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
  console.log('🚀 Migracao Kommo → GHL v2 (Pipelines Separados por Marca)');
  console.log('='.repeat(60) + '\n');

  // Validate pipeline IDs
  if (PIPELINES.comercial_mateus === 'PIPELINE_ID_MATEUS' || PIPELINES.comercial_cyb === 'PIPELINE_ID_CYB') {
    console.log('❌ ERRO: Pipeline IDs nao preenchidos!');
    console.log('Preencha PIPELINES.comercial_mateus e PIPELINES.comercial_cyb no topo do arquivo.');
    console.log('Rode o script de criacao de pipelines primeiro.');
    process.exit(1);
  }

  // Validate stage IDs
  const placeholderStages = Object.entries(STAGES).filter(([k, v]) => v === 'STAGE_ID');
  if (placeholderStages.length > 0) {
    console.log('❌ ERRO: Stage IDs nao preenchidos!');
    placeholderStages.forEach(([k]) => console.log(`  - ${k}`));
    process.exit(1);
  }

  console.log('📊 Carregando planilhas...');
  const allData = loadAllData();
  console.log(`\n📊 TOTAL: ${allData.length} leads\n`);

  const isDryRun = process.argv.includes('--dry-run');
  const isResume = process.argv.includes('--resume');
  const batchArg = process.argv.find(a => a.startsWith('--batch'));
  const batchNum = batchArg ? parseInt(process.argv[process.argv.indexOf(batchArg) + 1]) : null;

  if (isDryRun) console.log('🔍 MODO DRY-RUN\n');

  // Route all leads
  let routing = allData.map(({ row, source }) => ({ row, source, route: routeLead(row, source) }));

  // Filter by batch if specified
  if (batchNum) {
    const batchFilters = {
      1: r => r.route.status === 'won',
      2: r => r.route.pipelineId === PIPELINES.comercial_mateus && r.route.status !== 'won',
      3: r => r.route.pipelineId === PIPELINES.comercial_cyb && r.route.status !== 'won',
      4: r => r.route.pipelineId === PIPELINES.nutricao && r.route.stageId === STAGES.reativacao_comercial && r.route.status !== 'won',
      5: r => r.route.pipelineId === PIPELINES.nutricao && r.route.stageId === STAGES.entrada_nutricao,
    };
    const batchNames = {
      1: 'Won (vendas ganhas)',
      2: 'Comercial Mateus (open)',
      3: 'Comercial CybNutri (open)',
      4: 'Nutricao Reativacao (open)',
      5: 'Nutricao Entrada (open)',
    };
    const filter = batchFilters[batchNum];
    if (!filter) {
      console.log('❌ Batch invalido. Use --batch 1 a 5:');
      for (const [n, name] of Object.entries(batchNames)) {
        const count = routing.filter(batchFilters[n]).length;
        console.log(`  --batch ${n}: ${name} (${count} leads)`);
      }
      process.exit(1);
    }
    const fullCount = routing.length;
    routing = routing.filter(filter);
    console.log(`📦 BATCH ${batchNum}: ${batchNames[batchNum]}`);
    console.log(`   ${routing.length} leads (de ${fullCount} total)\n`);
  }

  // Stats
  const cybCount = routing.filter(r => r.route.tags.includes('marca_cyb'));
  const mateusCount = routing.filter(r => r.route.tags.includes('marca_mateus'));
  const comercialMateus = routing.filter(r => r.route.pipelineId === PIPELINES.comercial_mateus);
  const comercialCyb = routing.filter(r => r.route.pipelineId === PIPELINES.comercial_cyb);
  const nutricao = routing.filter(r => r.route.pipelineId === PIPELINES.nutricao);
  const won = routing.filter(r => r.route.status === 'won');
  const noContact = routing.filter(r => {
    const phone = cleanPhone(r.row['Celular (contato)'] || r.row['Telefone comercial (contato)'] || r.row['Tel. direto com. (contato)'] || r.row['Outro telefone (contato)'] || '');
    const email = r.row['Email comercial (contato)'] || r.row['Email pessoal (contato)'] || '';
    return !phone && !email;
  });

  console.log('📋 Plano de migracao v2:');
  console.log(`  Marca Mateus: ${mateusCount.length} | CybNutri: ${cybCount.length}`);
  console.log(`  Pipeline Comercial Mateus: ${comercialMateus.length}`);
  console.log(`  Pipeline Comercial CybNutri: ${comercialCyb.length}`);
  console.log(`  Pipeline Nutricao: ${nutricao.length}`);
  console.log(`  Won: ${won.length}`);
  console.log(`  Sem telefone/email (PULADOS): ${noContact.length}`);
  console.log(`  Migraveis: ${routing.length - noContact.length}`);
  console.log(`  Total: ${routing.length}\n`);

  // Validar datas
  const comData = routing.filter(r => parseKommoDate(r.row['Data Criada']));
  const semData = routing.filter(r => !parseKommoDate(r.row['Data Criada']));
  console.log(`  Com Data Criada: ${comData.length}/${routing.length}`);
  if (semData.length > 0) console.log(`  ⚠️  Sem Data Criada: ${semData.length}`);

  // Validar campos customizados
  const comProduto = routing.filter(r => r.route.customFields.some(f => f.key === FIELDS.produto_interesse));
  const comVendedor = routing.filter(r => r.route.customFields.some(f => f.key === FIELDS.vendedor_responsavel));
  console.log(`  Com Produto de Interesse: ${comProduto.length}`);
  console.log(`  Com Vendedor Responsavel: ${comVendedor.length}`);

  // Receita total
  const receitaTotal = routing.reduce((sum, r) => sum + (r.route.monetaryValue || 0), 0);
  console.log(`  Receita total: R$ ${receitaTotal.toLocaleString('pt-BR')}`);

  if (isDryRun) {
    // Show samples with full detail
    for (const src of ['mateus', 'cyb', 'sdr', 'social', 'mateus_novo', 'cyb_formacao']) {
      const subset = routing.filter(r => r.source === src);
      console.log(`\n--- ${src.toUpperCase()} (3 amostras com detalhe) ---`);
      let shown = 0;
      for (const r of subset) {
        if (shown >= 3) break;
        const phone = cleanPhone(r.row['Celular (contato)'] || r.row['Telefone comercial (contato)'] || '');
        const email = r.row['Email comercial (contato)'] || '';
        if (!phone && !email) continue;
        const pipeName = r.route.pipelineId === PIPELINES.comercial_mateus ? 'Com.Mateus'
          : r.route.pipelineId === PIPELINES.comercial_cyb ? 'Com.CybNutri'
          : 'Nutricao';
        const marca = r.route.tags.includes('marca_cyb') ? 'CYB' : 'MATEUS';
        const dataCriada = r.row['Data Criada'] || '-';
        const dataISO = parseKommoDate(r.row['Data Criada']) || '-';
        const campos = r.route.customFields.map(f => f.field_value).join(', ') || '-';
        const tags = r.route.tags.join(', ');
        console.log(`  ${r.row['Contato principal'] || '?'}`);
        console.log(`    Pipeline: ${pipeName} | Status: ${r.route.status} | Marca: ${marca}`);
        console.log(`    Data Kommo: ${dataCriada} → ISO: ${dataISO}`);
        console.log(`    Campos: ${campos}`);
        console.log(`    Tags: ${tags}`);
        if (r.route.monetaryValue > 0) console.log(`    Valor: R$${r.route.monetaryValue}`);
        shown++;
      }
    }
    console.log('\n✅ Dry run completo. Rode sem --dry-run para executar.');
    return;
  }

  // Resume support
  let startIndex = 0;
  let stats = { success: 0, errors: 0, duplicates: 0, skipped: 0 };
  if (isResume) {
    const cp = loadCheckpoint();
    if (cp) {
      startIndex = cp.index;
      stats = cp.stats;
      console.log(`🔄 Retomando de ${startIndex} (${cp.timestamp})`);
      console.log(`   Stats: ✅${stats.success} ❌${stats.errors} ⏭️${stats.skipped} 🔄${stats.duplicates}\n`);
    }
  }

  // Create missing tags
  console.log('1️⃣  Criando tags novas...');
  for (const tagName of TAGS_TO_CREATE) {
    if (!EXISTING_TAGS[tagName]) {
      const id = await createTag(tagName);
      if (id) { EXISTING_TAGS[tagName] = id; console.log(`  ✅ ${tagName} (${id})`); }
      await sleep(RATE_LIMIT_MS);
    }
  }

  // Process leads
  console.log(`\n2️⃣  Migrando leads (${startIndex > 0 ? `de ${startIndex}` : 'inicio'})...`);
  const startTime = Date.now();

  for (let i = startIndex; i < routing.length; i++) {
    const { row, route, source } = routing[i];
    const name = row['Contato principal'] || row['Lead título'] || '?';

    if (i % 100 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      console.log(`\n  📊 [${i}/${routing.length}] ${elapsed}min | ✅${stats.success} ❌${stats.errors} ⏭️${stats.skipped} 🔄${stats.duplicates}`);
      saveCheckpoint(i, stats);

      // Pausa maior a cada 100
      if (i > startIndex) {
        console.log(`  ⏸️  Pausa ${BATCH_PAUSE_MS / 1000}s...`);
        await sleep(BATCH_PAUSE_MS);
      }
    }

    const phone = cleanPhone(row['Celular (contato)'] || row['Telefone comercial (contato)'] || row['Tel. direto com. (contato)'] || row['Outro telefone (contato)'] || '');
    const email = row['Email comercial (contato)'] || row['Email pessoal (contato)'] || '';
    if (!phone && !email) { stats.skipped++; continue; }

    try {
      await sleep(RATE_LIMIT_MS);
      const contactResult = await findOrCreateContact(row);
      if (!contactResult || !contactResult.id) { stats.skipped++; continue; }

      // Data Criada do Kommo sera aplicada depois no Supabase (GHL API nao aceita dateAdded)

      await sleep(RATE_LIMIT_MS);
      const result = await createOpportunity(contactResult.id, row, route);

      if (result === 'DUPLICATE') { stats.duplicates++; }
      else { stats.success++; }
    } catch (e) {
      stats.errors++;
      if (stats.errors <= 20) console.log(`  ❌ [${i}/${source}] ${name}: ${e.message.substring(0, 100)}`);
      if (stats.errors === 20) console.log('  (erros subsequentes suprimidos)');
      await sleep(5000); // espera extra apos erro
    }
  }

  saveCheckpoint(routing.length, stats);

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('🏁 MIGRACAO v2 COMPLETA');
  console.log('='.repeat(60));
  console.log(`  Tempo: ${totalTime} minutos`);
  console.log(`  ✅ Sucesso: ${stats.success}`);
  console.log(`  🔄 Duplicados: ${stats.duplicates}`);
  console.log(`  ⏭️  Pulados: ${stats.skipped}`);
  console.log(`  ❌ Erros: ${stats.errors}`);
  console.log(`  📊 Total: ${routing.length}`);

  if (stats.errors === 0 && fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE);
  }
}

main().catch(e => { console.error('💥 Erro fatal:', e); process.exit(1); });
