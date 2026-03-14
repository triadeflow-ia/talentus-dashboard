import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

// --- Pipeline/Stage mappings (same as exec-batch.js + server.js) ---
const PIPELINES = {
  comercial_mateus: 'kR7dX3quCskPn8y1hUR5',
  comercial_cyb: 'l0xKJIaG2JOWnpriXGlS',
  nutricao: 'YGbvdHFPw2OMVgEyshGJ',
};
const PIPELINE_NAMES = {
  [PIPELINES.comercial_mateus]: 'Comercial Mateus Cortez',
  [PIPELINES.comercial_cyb]: 'Comercial CybNutri',
  [PIPELINES.nutricao]: 'Nutricao',
};
const STAGES = {
  mateus_atendimento_inicial: 'f256b8a5-3f29-4d30-8e62-ffa5f9446372',
  mateus_qualificacao: '11d12653-7439-479d-8463-c11ef0fcedae',
  mateus_call_diagnostico: '27a470cc-39dd-4cc6-805f-b0fad0625fdb',
  mateus_apresentacao_r2: '52734fb3-a2a2-4377-b157-a5629ad4f32c',
  mateus_negociacao: '13ca7186-e4c0-4c45-8185-c91f9d422dc0',
  cyb_atendimento_inicial: '1c55eaa6-450c-4336-aa7a-d0762e35eb64',
  cyb_qualificacao: '321425d8-c9ea-4077-996f-b13ab8f5af24',
  cyb_call_diagnostico: 'f3c1e71b-70bc-413e-abf1-3f546642efaa',
  cyb_apresentacao_r2: 'f631bdb4-84b7-4555-97ef-3b91a16645ea',
  cyb_negociacao: 'e4d5e74f-5eaa-45ff-a758-fcae0e14ba52',
  entrada_nutricao: '709e3be1-14af-4c11-a352-4e1566a8730a',
  reativacao_comercial: 'c5d13c5d-d9d2-4b18-9b6b-96bbb78ba7bc',
};
const STAGE_NAMES = {
  [STAGES.mateus_atendimento_inicial]: 'Atendimento Inicial',
  [STAGES.mateus_qualificacao]: 'Qualificação',
  [STAGES.mateus_call_diagnostico]: 'Call Diagnóstico',
  [STAGES.mateus_apresentacao_r2]: 'Apresentação R2',
  [STAGES.mateus_negociacao]: 'Negociação',
  [STAGES.cyb_atendimento_inicial]: 'Atendimento Inicial',
  [STAGES.cyb_qualificacao]: 'Qualificação',
  [STAGES.cyb_call_diagnostico]: 'Call Diagnóstico',
  [STAGES.cyb_apresentacao_r2]: 'Apresentação R2',
  [STAGES.cyb_negociacao]: 'Negociação',
  [STAGES.entrada_nutricao]: 'Entrada Nutrição',
  [STAGES.reativacao_comercial]: 'Reativação Comercial',
};

const GHL_USERS = {
  'gilcilene lima': '2Z0eH6IjgWDqUw5b4fqS',
  'lucas rodrigues': '9AXuakmsPmncaaojIyGw',
  'mateus cortez': '77uDX774vmKxyMxEhfCR',
  'karla yonara': 'CfeKqpQX6eWKCVVwyRsQ',
  'kyonaragomes@gmail.com': 'CfeKqpQX6eWKCVVwyRsQ',
  'jessica monteiro': 'ioyhsn2lFdBhMbZ2PFNZ',
};
const USER_NAMES = {
  '2Z0eH6IjgWDqUw5b4fqS': 'Gilcilene Lima',
  '9AXuakmsPmncaaojIyGw': 'Lucas Rodrigues',
  '77uDX774vmKxyMxEhfCR': 'Mateus Cortez',
  'CfeKqpQX6eWKCVVwyRsQ': 'Karla Yonara',
  'ioyhsn2lFdBhMbZ2PFNZ': 'Jessica Monteiro',
};

const PRODUCT_MAP = {
  'Virada Digital': { f: 'Virada Digital', t: 'produto_virada_digital' },
  'Virada Digital Executivo': { f: 'Virada Digital', t: 'produto_virada_digital' },
  'Escola Nutri Expert': { f: 'Escola Nutri Expert', t: 'produto_escola_nutri' },
  'Mentoria Individual Mateus': { f: 'Sala Secreta', t: 'mentoria_individual' },
  'Mentoria END': { f: 'Sala Secreta', t: 'mentoria_individual' },
  'Cursos e Ebooks Nutrição': { f: 'Escola Nutri Expert', t: 'produto_escola_nutri' },
  'Formação Nutri Expert': { f: 'Formacao Nutri Expert', t: 'produto_formacao_nutri' },
  'Profissional Mentory': { f: 'Profissional Mentory', t: 'produto_profissional_mentory' },
  'Low Ticket CYB': { f: 'Low Ticket CYB', t: 'produto_low_ticket_cyb' },
};
const TAG_MAP = {
  'VIRADA DIGITAL': 'produto_virada_digital', 'ESCOLA NE': 'produto_escola_negocios',
  'FORMAÇÃO NE': 'produto_formacao_nutri', 'FORMACAO NE': 'produto_formacao_nutri',
  'MENTORIA GPS': 'mentoria_gps', 'MENTORIA INDIVIDUAL': 'mentoria_individual',
  'Social Selling': 'social_selling', 'ANUNCIO DE TRÁFEGO': 'trafego_pago',
  'ANUNCIO DE TRAFEGO': 'trafego_pago', 'PARCELAMENTO': 'parcelamento',
  'LAED QUENTE': 'score_quente', 'LEAD DO INSTA': 'organico', 'LINK DA BIO': 'organico',
  'Virada Digital Ingresso Black': 'ingresso_black', 'Virada Digital Ingresso Diamond': 'ingresso_diamond',
  'PRODUTOS DE FRONT': 'produtos_front', 'renovação': 'renovacao', 'RENOVAÇÃO': 'renovacao',
  '82 cardápios': 'produto_low_ticket_cyb', '82 cardapios': 'produto_low_ticket_cyb',
};
const ORIGIN_TAG_MAP = {
  'Tráfego Pago Whatsapp': 'trafego_pago', 'Tráfego Pago': 'trafego_pago',
  'Tráfego Pago Formulário': 'trafego_pago', 'Instagram Mateus': 'organico',
  'Instagram Cybelle': 'organico', 'Indicação': 'indicacao',
  'Página de Captura (wordpress)': 'trafego_pago',
};

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

function parseDate(raw) {
  if (!raw) return null;
  // Format: "06.03.2026 06:29:39"
  const m = raw.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}Z`).toISOString();
}

function isCyb(src) { return src === 'cyb' || src === 'cyb_formacao'; }
function stg(name, cyb) { return STAGES[(cyb ? 'cyb_' : 'mateus_') + name]; }

function route(row) {
  const src = row._source;
  const etapa = row['Etapa do lead'] || '';
  const venda = parseFloat(row['Venda']) || 0;
  const cyb = isCyb(src);
  const pC = cyb ? PIPELINES.comercial_cyb : PIPELINES.comercial_mateus;
  let pid, sid, status;

  if (venda > 0) { pid = pC; sid = stg('negociacao', cyb); status = 'won'; }
  else if (src === 'mateus') {
    if (etapa === 'Etapa de leads de entrada') { pid = PIPELINES.nutricao; sid = STAGES.entrada_nutricao; status = 'open'; }
    else if (etapa === 'BASE FRIA') { pid = PIPELINES.nutricao; sid = STAGES.reativacao_comercial; status = 'open'; }
    else {
      pid = pC;
      const m = { 'Contato inicial': 'atendimento_inicial', 'Qualificação': 'qualificacao', 'Diagnóstico': 'call_diagnostico', 'Apresentação': 'apresentacao_r2', 'Negociação': 'negociacao' };
      sid = stg(m[etapa] || 'atendimento_inicial', cyb); status = 'open';
    }
  }
  else if (src === 'cyb') {
    pid = PIPELINES.nutricao;
    if (etapa === 'Primeiro Contato' || etapa === 'Etapa de leads de entrada') { sid = STAGES.entrada_nutricao; status = 'open'; }
    else if (etapa.includes('Recupera') || etapa.includes('FollowUp') || etapa === 'BASE FRIA') { sid = STAGES.reativacao_comercial; status = 'open'; }
    else if (etapa.includes('Qualifica')) { pid = pC; sid = stg('qualificacao', cyb); status = 'open'; }
    else if (etapa.includes('Negocia') || etapa.includes('Pagamento')) { pid = pC; sid = stg('negociacao', cyb); status = 'open'; }
    else if (etapa.includes('Call') || etapa.includes('Diagn')) { pid = pC; sid = stg('call_diagnostico', cyb); status = 'open'; }
    else { sid = STAGES.entrada_nutricao; status = 'open'; }
  }
  else if (src === 'sdr') {
    pid = pC;
    if (etapa.includes('FollowUp') || etapa === 'Etapa de leads de entrada') { sid = stg('atendimento_inicial', cyb); status = 'open'; }
    else if (etapa.includes('Diagn')) { sid = stg('call_diagnostico', cyb); status = 'open'; }
    else if (etapa.includes('Agendada')) { sid = stg('apresentacao_r2', cyb); status = 'open'; }
    else if (etapa.includes('Realizada')) { sid = stg('negociacao', cyb); status = 'open'; }
    else { sid = stg('atendimento_inicial', cyb); status = 'open'; }
  }
  else if (src === 'mateus_novo') { pid = PIPELINES.nutricao; sid = STAGES.entrada_nutricao; status = 'open'; }
  else if (src === 'cyb_formacao') {
    pid = PIPELINES.nutricao;
    if (etapa === 'Etapa de leads de entrada') { sid = STAGES.entrada_nutricao; status = 'open'; }
    else if (etapa === 'Contato inicial') { pid = pC; sid = stg('atendimento_inicial', cyb); status = 'open'; }
    else if (etapa.includes('Qualifica')) { pid = pC; sid = stg('qualificacao', cyb); status = 'open'; }
    else if (etapa.includes('Proposta') || etapa.includes('Pagamento')) { pid = pC; sid = stg('negociacao', cyb); status = 'open'; }
    else if (etapa.includes('Recupera') || etapa.includes('Followup') || etapa.includes('Nutri') || etapa.includes('Breakup')) { sid = STAGES.reativacao_comercial; status = 'open'; }
    else { sid = STAGES.entrada_nutricao; status = 'open'; }
  }
  else if (src === 'social') {
    pid = PIPELINES.nutricao;
    if (etapa === 'Lead Conectado' || etapa === 'Primeiro contato') { pid = pC; sid = stg('atendimento_inicial', cyb); status = 'open'; }
    else if (etapa.includes('Reativa')) { sid = STAGES.reativacao_comercial; status = 'open'; }
    else { sid = STAGES.entrada_nutricao; status = 'open'; }
  }
  else {
    // fallback
    pid = pC; sid = stg('atendimento_inicial', cyb); status = 'open';
  }

  const tags = new Set();
  tags.add(cyb ? 'marca_cyb' : 'marca_mateus');
  if (src === 'sdr') tags.add('kommo_sdr');
  if (src === 'social') { tags.add('kommo_social_selling'); tags.add('organico'); }
  if (src === 'cyb') tags.add('kommo_cyb');
  if (status === 'won') tags.add('venda_ganha');
  const kt = (row['Lead tags'] || '').split(',').map(t => t.trim()).filter(Boolean);
  for (const t of kt) { if (TAG_MAP[t]) tags.add(TAG_MAP[t]); }
  const prod = row['Produto Desejado'] || '';
  if (prod && PRODUCT_MAP[prod]) tags.add(PRODUCT_MAP[prod].t);
  if (row['Origem'] && ORIGIN_TAG_MAP[row['Origem']]) tags.add(ORIGIN_TAG_MAP[row['Origem']]);

  let assigned = null;
  const resp = (row['Lead usuário responsável'] || '').toLowerCase().trim();
  if (resp && GHL_USERS[resp]) assigned = GHL_USERS[resp];
  for (const t of kt) {
    if (t.includes('RODRIGUEZ')) assigned = assigned || GHL_USERS['lucas rodrigues'];
    else if (t === 'CONSULTORA: KARLA' || t === 'KARLA') assigned = assigned || GHL_USERS['karla yonara'];
    else if (t === 'CONSULTORA: GILCILENE' || t === 'GILCILENE') assigned = assigned || GHL_USERS['gilcilene lima'];
  }

  const marca = cyb ? 'CybNutri' : 'Mateus Cortez';
  const produto = prod && PRODUCT_MAP[prod] ? PRODUCT_MAP[prod].f : (prod || null);
  const vendedor = assigned ? (USER_NAMES[assigned] || null) : null;

  return { pid, sid, status, tags: [...tags], assigned, marca, produto, vendedor, value: venda };
}

// --- Supabase REST API ---
async function supabaseInsert(table, rows) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase ${table} insert failed: ${res.status} ${txt.substring(0, 200)}`);
  }
}

// --- Main ---
async function main() {
  const batchFiles = [
    'batch1-won.json',
    'batch2-comercial-mateus.json',
    'batch3-comercial-cyb.json',
    'batch4-nutricao-reativacao.json',
    'batch5-nutricao-entrada.json',
  ];

  // Check Supabase is empty
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/opportunities?select=id&limit=1`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  const existing = await checkRes.json();
  if (existing.length > 0) {
    console.log('⚠️  Supabase ja tem dados. Limpando opportunities e contacts...');
    await fetch(`${SUPABASE_URL}/rest/v1/opportunities?id=not.is.null`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
    });
    await fetch(`${SUPABASE_URL}/rest/v1/contacts?id=not.is.null`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
    });
    console.log('✅ Supabase limpo');
  }

  let totalOpps = 0, totalContacts = 0, totalRevenue = 0;
  const contactMap = new Map(); // phone/email -> contact obj (dedup)
  const allOpps = [];

  const t0 = Date.now();

  // Phase 1: Process all batches into memory
  for (const file of batchFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) { console.log(`⚠️  ${file} nao encontrado, pulando`); continue; }
    const rows = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`📦 ${file}: ${rows.length} leads`);

    for (const row of rows) {
      const r = route(row);
      const name = (row['Contato principal'] || row['Lead título'] || '?').split('\n')[0].trim();
      const phone = cleanPhone(row['Celular (contato)'] || row['Telefone comercial (contato)'] || row['Tel. direto com. (contato)'] || row['Outro telefone (contato)'] || '');
      const email = row['Email comercial (contato)'] || row['Email pessoal (contato)'] || '';
      const createdAt = parseDate(row['Data Criada']) || new Date().toISOString();

      // Dedup contact by phone then email
      const contactKey = phone || email || name;
      let contact;
      if (contactMap.has(contactKey)) {
        contact = contactMap.get(contactKey);
        // Merge tags
        const existingTags = new Set(contact.tags || []);
        for (const t of r.tags) existingTags.add(t);
        contact.tags = [...existingTags];
        // Keep earliest created_at
        if (createdAt < contact.created_at) contact.created_at = createdAt;
      } else {
        contact = {
          id: randomUUID(),
          name,
          email: email || null,
          phone: phone || null,
          marca: r.marca,
          tags: r.tags,
          assigned_to: r.assigned,
          vendedor: r.vendedor,
          source: row['Origem'] || row._source || null,
          created_at: createdAt,
          synced_at: new Date().toISOString(),
        };
        contactMap.set(contactKey, contact);
      }

      // Create opportunity
      const opp = {
        id: randomUUID(),
        pipeline_id: r.pid,
        pipeline_name: PIPELINE_NAMES[r.pid] || r.pid,
        pipeline_stage_id: r.sid,
        pipeline_stage_name: STAGE_NAMES[r.sid] || 'Unknown',
        status: r.status,
        contact_id: contact.id,
        contact_name: name,
        contact_email: email || null,
        contact_phone: phone || null,
        monetary_value: r.value || 0,
        marca: r.marca,
        produto: r.produto,
        vendedor: r.vendedor,
        assigned_to: r.assigned,
        loss_reason: null,
        source: row['Origem'] || row._source || null,
        tags: r.tags,
        created_at: createdAt,
        updated_at: parseDate(row['Última modificação']) || createdAt,
        synced_at: new Date().toISOString(),
      };
      allOpps.push(opp);
      totalRevenue += r.value || 0;
    }
  }

  totalContacts = contactMap.size;
  totalOpps = allOpps.length;
  console.log(`\n📊 Processado: ${totalOpps} opps, ${totalContacts} contatos, R$${totalRevenue.toLocaleString('pt-BR')}`);

  // Phase 2: Bulk insert contacts (batches of 500)
  const contacts = [...contactMap.values()];
  const BATCH_SIZE = 500;
  console.log(`\n⬆️  Inserindo ${contacts.length} contatos...`);
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    await supabaseInsert('contacts', batch);
    console.log(`  contatos: ${Math.min(i + BATCH_SIZE, contacts.length)}/${contacts.length}`);
  }

  // Phase 3: Bulk insert opportunities (batches of 500)
  console.log(`⬆️  Inserindo ${allOpps.length} oportunidades...`);
  for (let i = 0; i < allOpps.length; i += BATCH_SIZE) {
    const batch = allOpps.slice(i, i + BATCH_SIZE);
    await supabaseInsert('opportunities', batch);
    console.log(`  opps: ${Math.min(i + BATCH_SIZE, allOpps.length)}/${allOpps.length}`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ IMPORTAÇÃO COMPLETA em ${elapsed}s`);
  console.log(`   ${totalContacts} contatos`);
  console.log(`   ${totalOpps} oportunidades`);
  console.log(`   R$ ${totalRevenue.toLocaleString('pt-BR')} receita total`);

  // Stats
  const wonCount = allOpps.filter(o => o.status === 'won').length;
  const openCount = allOpps.filter(o => o.status === 'open').length;
  const mateus = allOpps.filter(o => o.marca === 'Mateus Cortez').length;
  const cyb = allOpps.filter(o => o.marca === 'CybNutri').length;
  console.log(`   Won: ${wonCount} | Open: ${openCount}`);
  console.log(`   Mateus: ${mateus} | CybNutri: ${cyb}`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
