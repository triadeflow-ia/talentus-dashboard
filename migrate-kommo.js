import XLSX from 'xlsx';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GHL_TOKEN = process.env.GHL_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const RATE_LIMIT_MS = 700; // 700ms between requests

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

// Product mapping: Kommo "Produto Desejado" → GHL "Produto de Interesse" value
const PRODUCT_MAP = {
  'Virada Digital': 'Virada Digital',
  'Virada Digital Executivo': 'Virada Digital',
  'Escola Nutri Expert': 'Escola Nutri Expert',
  'Mentoria Individual Mateus': 'Sala Secreta',
  'Mentoria END': 'Sala Secreta',
  'Cursos e Ebooks Nutrição': 'Escola Nutri Expert',
  'Formação Nutri Expert': 'Formacao Nutri Expert',
};

// =============================================
// CybNutri detection
// =============================================
function isCybNutri(row) {
  const prod = (row['Produto Desejado'] || '').toLowerCase();
  const origem = (row['Origem'] || '').toLowerCase();
  const tags = (row['Lead tags'] || '').toLowerCase();

  if (prod.includes('nutri') || prod.includes('cyb')) return true;
  if (origem.includes('cybelle') || origem.includes('cyb')) return true;
  if (tags.includes('escola ne') && !tags.includes('virada')) return true; // Escola NE without Virada = Nutri context

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
  // Ensure +55 prefix for BR numbers
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
      // Likely duplicate opp
      return 'DUPLICATE';
    }
    throw e;
  }
}

// =============================================
// Routing logic
// =============================================
function routeLead(row) {
  const etapa = row['Etapa do lead'] || '';
  const venda = parseFloat(row['Venda']) || 0;
  const responsavel = (row['Lead usuário responsável'] || '').toLowerCase().trim();
  const kommoTags = (row['Lead tags'] || '').split(',').map(t => t.trim()).filter(Boolean);
  const produtoDesejado = row['Produto Desejado'] || '';
  const origem = row['Origem'] || '';
  const cyb = isCybNutri(row);

  // --- Determine pipeline & stage ---
  let pipelineId, stageId, status;

  if (etapa === 'Etapa de leads de entrada') {
    // 4914 cold leads → Nutricao / Entrada
    pipelineId = PIPELINES.nutricao;
    stageId = STAGES.entrada_nutricao;
    status = 'open';
  } else if (etapa === 'BASE FRIA') {
    if (venda > 0) {
      // Won deals → Comercial / won
      pipelineId = PIPELINES.comercial;
      stageId = STAGES.negociacao;
      status = 'won';
    } else {
      // Cold worked leads → Nutricao / Reativacao
      pipelineId = PIPELINES.nutricao;
      stageId = STAGES.reativacao_comercial;
      status = 'open';
    }
  } else {
    // Active leads (Contato, Qualificacao, Diagnostico, Apresentacao, Negociacao)
    pipelineId = PIPELINES.comercial;
    if (venda > 0) {
      stageId = STAGES.negociacao;
      status = 'won';
    } else {
      // Map stages
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

  // --- Determine assigned user ---
  let assignedTo = null;
  if (responsavel && GHL_USERS[responsavel]) {
    assignedTo = GHL_USERS[responsavel];
  }
  // Also check CONSULTOR/CONSULTORA tags for assignment
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

  // Map Kommo tags → GHL tags
  for (const tag of kommoTags) {
    const mapped = TAG_MAP[tag];
    if (mapped) ghlTags.add(mapped);
    // Skip tags that are null (consultant tags) or fb IDs
    if (tag.startsWith('fb') && /^\d+$/.test(tag.substring(2))) continue;
  }

  // Product tags
  if (produtoDesejado) {
    const lower = produtoDesejado.toLowerCase();
    if (lower.includes('virada')) ghlTags.add('produto_virada_digital');
    if (lower.includes('escola nutri')) ghlTags.add('produto_escola_nutri');
    if (lower.includes('formac') || lower.includes('formação')) ghlTags.add('produto_formacao_nutri');
    if (lower.includes('mentoria') && lower.includes('individual')) ghlTags.add('mentoria_individual');
    if (lower.includes('mentoria') && lower.includes('gps')) ghlTags.add('mentoria_gps');
    if (lower.includes('cursos') && lower.includes('nutri')) ghlTags.add('produto_escola_nutri');
  }

  // Origin tags
  if (origem) {
    const mappedOrigin = ORIGIN_TAG_MAP[origem];
    if (mappedOrigin) ghlTags.add(mappedOrigin);
  }

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
      customFields.push({ key: FIELDS.produto_interesse, field_value: mapped });
    }
  } else {
    // Infer from tags
    for (const tag of kommoTags) {
      if (tag === 'VIRADA DIGITAL') {
        customFields.push({ key: FIELDS.produto_interesse, field_value: 'Virada Digital' });
        break;
      }
      if (tag === 'ESCOLA NE') {
        customFields.push({ key: FIELDS.produto_interesse, field_value: 'Escola de Negocios' });
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
// MAIN
// =============================================
async function main() {
  console.log('🚀 Migracao Kommo → GHL (Talentus Digital)');
  console.log('==========================================\n');

  // Parse spreadsheet
  const wb = XLSX.readFile(path.join(__dirname, 'kommo.xlsx'), { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
  console.log(`📊 ${data.length} leads no Kommo\n`);

  // DRY RUN flag
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    console.log('🔍 MODO DRY-RUN — nenhuma alteracao sera feita no GHL\n');
  }

  // Pre-analysis
  const routing = data.map(r => ({ row: r, route: routeLead(r) }));

  const nutricaoEntrada = routing.filter(r => r.route.stageId === STAGES.entrada_nutricao);
  const nutricaoReativ = routing.filter(r => r.route.stageId === STAGES.reativacao_comercial);
  const comercialWon = routing.filter(r => r.route.status === 'won');
  const comercialOpen = routing.filter(r => r.route.pipelineId === PIPELINES.comercial && r.route.status === 'open');
  const cybCount = routing.filter(r => r.route.tags.includes('marca_cyb'));

  console.log('📋 Plano de migracao:');
  console.log(`  Nutricao → Entrada: ${nutricaoEntrada.length}`);
  console.log(`  Nutricao → Reativacao: ${nutricaoReativ.length}`);
  console.log(`  Comercial → Won: ${comercialWon.length}`);
  console.log(`  Comercial → Open: ${comercialOpen.length}`);
  console.log(`  CybNutri: ${cybCount.length} | Mateus: ${routing.length - cybCount.length}`);
  console.log(`  Total: ${routing.length}\n`);

  // Collect all needed tags
  const allTags = new Set();
  routing.forEach(r => r.route.tags.forEach(t => allTags.add(t)));
  console.log(`🏷️  Tags a usar: ${[...allTags].join(', ')}\n`);

  if (isDryRun) {
    // Show sample of each group
    console.log('--- AMOSTRA: Nutricao Entrada (3 primeiros) ---');
    nutricaoEntrada.slice(0, 3).forEach(r => {
      console.log(`  ${r.row['Contato principal'] || '?'} | tags: ${r.route.tags.join(',')} | brand: ${r.route.customFields.find(f=>f.key===FIELDS.marca)?.field_value}`);
    });
    console.log('\n--- AMOSTRA: Nutricao Reativacao (3 primeiros) ---');
    nutricaoReativ.slice(0, 3).forEach(r => {
      console.log(`  ${r.row['Contato principal'] || '?'} | tags: ${r.route.tags.join(',')} | assigned: ${r.route.assignedTo || 'nenhum'} | prod: ${r.route.customFields.find(f=>f.key===FIELDS.produto_interesse)?.field_value || '-'}`);
    });
    console.log('\n--- AMOSTRA: Comercial Won (3 primeiros) ---');
    comercialWon.slice(0, 3).forEach(r => {
      console.log(`  ${r.row['Contato principal'] || '?'} | R$ ${r.route.monetaryValue} | tags: ${r.route.tags.join(',')} | assigned: ${r.route.assignedTo || 'nenhum'}`);
    });
    console.log('\n--- AMOSTRA: Comercial Open (3 primeiros) ---');
    comercialOpen.slice(0, 3).forEach(r => {
      console.log(`  ${r.row['Contato principal'] || '?'} | etapa: ${r.row['Etapa do lead']} | tags: ${r.route.tags.join(',')} | assigned: ${r.route.assignedTo || 'nenhum'}`);
    });
    console.log('\n✅ Dry run completo. Rode sem --dry-run para executar.');
    return;
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
  console.log('\n2️⃣  Migrando leads...');
  let success = 0;
  let errors = 0;
  let duplicates = 0;
  let skipped = 0;

  for (let i = 0; i < routing.length; i++) {
    const { row, route } = routing[i];
    const name = row['Contato principal'] || row['Lead título'] || '?';

    if (i % 100 === 0) {
      console.log(`\n  📊 Progresso: ${i}/${routing.length} (✅${success} ❌${errors} ⏭️${skipped} 🔄${duplicates})`);
    }

    try {
      // Find or create contact
      await sleep(RATE_LIMIT_MS);
      const contactId = await findOrCreateContact(row);
      if (!contactId) {
        skipped++;
        continue;
      }

      // Create opportunity
      await sleep(RATE_LIMIT_MS);
      const result = await createOpportunity(contactId, row, route);

      if (result === 'DUPLICATE') {
        duplicates++;
      } else {
        success++;
      }
    } catch (e) {
      errors++;
      if (errors <= 10) {
        console.log(`  ❌ [${i}] ${name}: ${e.message.substring(0, 100)}`);
      }
      if (errors === 10) console.log('  (suprimindo erros subsequentes...)');
    }
  }

  console.log('\n==========================================');
  console.log('🏁 MIGRACAO COMPLETA');
  console.log('==========================================');
  console.log(`  ✅ Sucesso: ${success}`);
  console.log(`  🔄 Duplicados: ${duplicates}`);
  console.log(`  ⏭️  Pulados: ${skipped}`);
  console.log(`  ❌ Erros: ${errors}`);
  console.log(`  📊 Total: ${routing.length}`);
}

main().catch(e => {
  console.error('💥 Erro fatal:', e);
  process.exit(1);
});
