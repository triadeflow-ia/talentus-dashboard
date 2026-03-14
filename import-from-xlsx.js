/**
 * Importa DIRETO dos 6 xlsx Kommo para Supabase.
 * 1 oportunidade por linha da planilha (zero dedup de opps).
 * Contatos deduplicados por telefone/email.
 * ZERO dados inventados — tudo vem das planilhas originais.
 */
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing SUPABASE env'); process.exit(1); }

// --- Mappings (from exec-batch.js) ---
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
  [STAGES.mateus_qualificacao]: 'Qualificacao',
  [STAGES.mateus_call_diagnostico]: 'Call Diagnostico',
  [STAGES.mateus_apresentacao_r2]: 'Apresentacao R2',
  [STAGES.mateus_negociacao]: 'Negociacao',
  [STAGES.cyb_atendimento_inicial]: 'Atendimento Inicial',
  [STAGES.cyb_qualificacao]: 'Qualificacao',
  [STAGES.cyb_call_diagnostico]: 'Call Diagnostico',
  [STAGES.cyb_apresentacao_r2]: 'Apresentacao R2',
  [STAGES.cyb_negociacao]: 'Negociacao',
  [STAGES.entrada_nutricao]: 'Entrada Nutricao',
  [STAGES.reativacao_comercial]: 'Reativacao Comercial',
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
  let p = String(raw).replace(/^'+/, '').replace(/[^\d+]/g, '');
  if (p && !p.startsWith('+')) {
    if (p.startsWith('55') && p.length >= 12) p = '+' + p;
    else if (p.length >= 10 && p.length <= 11) p = '+55' + p;
    else p = '+' + p;
  }
  return p.length >= 10 ? p : '';
}

function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw);
  // "06.03.2026 06:29:39"
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}Z`).toISOString();
  // Try ISO or other formats
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Determine marca from source file (the xlsx file IS the source of truth for marca)
function getMarca(src) {
  if (src === 'cyb' || src === 'cyb_formacao') return 'CybNutri';
  return 'Mateus Cortez';
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
  else { pid = pC; sid = stg('atendimento_inicial', cyb); status = 'open'; }

  // Tags
  const tags = new Set();
  tags.add(cyb ? 'marca_cyb' : 'marca_mateus');
  if (src === 'sdr') tags.add('kommo_sdr');
  if (src === 'social') { tags.add('kommo_social_selling'); tags.add('organico'); }
  if (src === 'cyb') tags.add('kommo_cyb');
  if (src === 'cyb_formacao') tags.add('kommo_cyb_formacao');
  if (src === 'mateus_novo') tags.add('kommo_mateus_novo');
  if (status === 'won') tags.add('venda_ganha');
  const kt = (row['Lead tags'] || '').split(',').map(t => t.trim()).filter(Boolean);
  for (const t of kt) { if (TAG_MAP[t]) tags.add(TAG_MAP[t]); }
  const prod = row['Produto Desejado'] || '';
  if (prod && PRODUCT_MAP[prod]) tags.add(PRODUCT_MAP[prod].t);
  if (row['Origem'] && ORIGIN_TAG_MAP[row['Origem']]) tags.add(ORIGIN_TAG_MAP[row['Origem']]);

  // Vendedor
  let assigned = null;
  const resp = (row['Lead usuário responsável'] || '').toLowerCase().trim();
  if (resp && GHL_USERS[resp]) assigned = GHL_USERS[resp];
  for (const t of kt) {
    if (t.includes('RODRIGUEZ')) assigned = assigned || GHL_USERS['lucas rodrigues'];
    else if (t === 'CONSULTORA: KARLA' || t === 'KARLA') assigned = assigned || GHL_USERS['karla yonara'];
    else if (t === 'CONSULTORA: GILCILENE' || t === 'GILCILENE') assigned = assigned || GHL_USERS['gilcilene lima'];
  }

  const marca = getMarca(src);
  const produto = prod && PRODUCT_MAP[prod] ? PRODUCT_MAP[prod].f : (prod || null);
  const vendedor = assigned ? (USER_NAMES[assigned] || null) : null;

  return { pid, sid, status, tags: [...tags], assigned, marca, produto, vendedor, value: venda };
}

// --- Supabase ---
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
    throw new Error(`Supabase ${table}: ${res.status} ${txt.substring(0, 300)}`);
  }
}

async function supabaseDelete(table) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=not.is.null`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
  });
}

// --- Main ---
async function main() {
  const XLSX_FILES = [
    { file: 'kommo.xlsx', source: 'mateus' },
    { file: 'kommo2.xlsx', source: 'cyb' },
    { file: 'kommo3.xlsx', source: 'sdr' },
    { file: 'kommo4.xlsx', source: 'social' },
    { file: 'kommo5.xlsx', source: 'mateus_novo' },
    { file: 'kommo6.xlsx', source: 'cyb_formacao' },
  ];

  console.log('🗑️  Limpando Supabase...');
  await supabaseDelete('opportunities');
  await supabaseDelete('contacts');
  console.log('✅ Limpo\n');

  const t0 = Date.now();
  const contactMap = new Map(); // phone -> contact (dedup por telefone)
  const allOpps = [];
  const skipped = { noPhone: 0, invalidPhone: 0, bySource: {} };
  const stats = { total: 0, won: 0, revenue: 0, bySource: {}, byMarca: {} };

  for (const { file, source } of XLSX_FILES) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) { console.log(`⚠️  ${file} nao encontrado`); continue; }

    const wb = XLSX.readFile(filePath);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    console.log(`📄 ${file} (${source}): ${rows.length} leads`);

    let fileWon = 0, fileRevenue = 0;

    for (const row of rows) {
      row._source = source;
      const r = route(row);

      const name = (row['Contato principal'] || row['Lead título'] || '?').split('\n')[0].trim();
      const rawPhone = row['Celular (contato)'] || row['Telefone comercial (contato)'] ||
        row['Tel. direto com. (contato)'] || row['Outro telefone (contato)'] || '';
      const phone = cleanPhone(rawPhone);
      const email = (row['Email comercial (contato)'] || row['Email pessoal (contato)'] || '').trim();
      const createdAt = parseDate(row['Data Criada']) || new Date().toISOString();

      // Leads sem telefone: won sobe mesmo assim, open pula
      const venda = parseFloat(row['Venda']) || 0;
      if (!phone && venda <= 0) {
        skipped.noPhone++;
        skipped.bySource[source] = (skipped.bySource[source] || 0) + 1;
        continue;
      }

      // Flag: won sem telefone (validar com Mateus)
      const semTelefone = !phone;

      // Contact dedup: por telefone se tiver, senao por email, senao por nome
      const contactKey = phone || email || name;
      let contact;
      if (contactMap.has(contactKey)) {
        contact = contactMap.get(contactKey);
        // Merge tags but DON'T change marca (first occurrence wins for contact)
        const existingTags = new Set(contact.tags || []);
        for (const t of r.tags) existingTags.add(t);
        contact.tags = [...existingTags];
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
          source: row['Origem'] || source,
          created_at: createdAt,
          synced_at: new Date().toISOString(),
        };
        contactMap.set(contactKey, contact);
      }

      // Tag won sem telefone para validacao posterior com Mateus
      const oppTags = [...r.tags];
      if (semTelefone) oppTags.push('validar_sem_telefone');

      // Create 1 opportunity per xlsx row — NO DEDUP
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
        source: row['Origem'] || source,
        tags: oppTags,
        created_at: createdAt,
        updated_at: parseDate(row['Última modificação']) || createdAt,
        synced_at: new Date().toISOString(),
      };
      allOpps.push(opp);

      // Stats
      stats.total++;
      if (r.status === 'won') { stats.won++; fileWon++; }
      stats.revenue += r.value || 0;
      fileRevenue += r.value || 0;
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;
      stats.byMarca[r.marca] = (stats.byMarca[r.marca] || 0) + 1;
    }

    console.log(`   → won: ${fileWon} | receita: R$ ${fileRevenue.toLocaleString('pt-BR')}`);
  }

  console.log('\n📊 RESUMO PRE-INSERT:');
  console.log(`   Opps: ${allOpps.length} | Contatos: ${contactMap.size}`);
  console.log(`   Won: ${stats.won} | Receita: R$ ${stats.revenue.toLocaleString('pt-BR')}`);
  console.log(`   Por marca: ${JSON.stringify(stats.byMarca)}`);
  console.log(`   Por source: ${JSON.stringify(stats.bySource)}`);

  // Insert contacts
  const contacts = [...contactMap.values()];
  const BATCH = 500;
  console.log(`\n⬆️  Inserindo ${contacts.length} contatos...`);
  for (let i = 0; i < contacts.length; i += BATCH) {
    const batch = contacts.slice(i, i + BATCH);
    await supabaseInsert('contacts', batch);
    if ((i + BATCH) % 2000 === 0 || i + BATCH >= contacts.length)
      console.log(`   ${Math.min(i + BATCH, contacts.length)}/${contacts.length}`);
  }

  // Insert opportunities
  console.log(`⬆️  Inserindo ${allOpps.length} oportunidades...`);
  for (let i = 0; i < allOpps.length; i += BATCH) {
    const batch = allOpps.slice(i, i + BATCH);
    await supabaseInsert('opportunities', batch);
    if ((i + BATCH) % 2000 === 0 || i + BATCH >= allOpps.length)
      console.log(`   ${Math.min(i + BATCH, allOpps.length)}/${allOpps.length}`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ IMPORTAÇÃO COMPLETA em ${elapsed}s`);
  console.log(`${'='.repeat(50)}`);
  console.log(`   📋 Oportunidades: ${allOpps.length}`);
  console.log(`   👤 Contatos:      ${contactMap.size}`);
  console.log(`   🏆 Won (vendas):  ${stats.won}`);
  console.log(`   💰 Receita total: R$ ${stats.revenue.toLocaleString('pt-BR')}`);
  console.log();
  console.log('   POR MARCA:');
  for (const [marca, count] of Object.entries(stats.byMarca)) {
    const wonMarca = allOpps.filter(o => o.marca === marca && o.status === 'won');
    const revMarca = wonMarca.reduce((s, o) => s + (o.monetary_value || 0), 0);
    console.log(`   ${marca}: ${count} opps | ${wonMarca.length} won | R$ ${revMarca.toLocaleString('pt-BR')}`);
  }
  console.log();
  console.log('   POR PLANILHA:');
  for (const [src, count] of Object.entries(stats.bySource)) {
    console.log(`   ${src}: ${count}`);
  }

  // --- AUDITORIA COMPLETA ---
  console.log();
  console.log('═══════════════════════════════════════════════════');
  console.log('   AUDITORIA COMPLETA');
  console.log('═══════════════════════════════════════════════════');

  // 1. Validacao vs planilhas originais
  const expectedBySource = { mateus: 5489, cyb: 852, sdr: 113, social: 937, mateus_novo: 587, cyb_formacao: 590 };
  console.log('\n   1. LEADS POR PLANILHA (importados / total / pulados sem tel):');
  for (const [src, expected] of Object.entries(expectedBySource)) {
    const imported = stats.bySource[src] || 0;
    const skip = skipped.bySource[src] || 0;
    const total = imported + skip;
    const match = total === expected;
    console.log(`      ${src.padEnd(14)} ${String(imported).padStart(5)} importados | ${String(skip).padStart(5)} sem tel | ${String(total).padStart(5)} total vs ${String(expected).padStart(5)} xlsx ${match ? '✅' : '❌ DIFF ' + (expected - total)}`);
  }

  // 2. Won por marca
  console.log('\n   2. VENDAS (WON) POR MARCA:');
  const wonMateus = allOpps.filter(o => o.marca === 'Mateus Cortez' && o.status === 'won');
  const wonCyb = allOpps.filter(o => o.marca === 'CybNutri' && o.status === 'won');
  const revMateus = wonMateus.reduce((s, o) => s + (o.monetary_value || 0), 0);
  const revCyb = wonCyb.reduce((s, o) => s + (o.monetary_value || 0), 0);
  console.log(`      Mateus Cortez: ${wonMateus.length} vendas | R$ ${revMateus.toLocaleString('pt-BR')}`);
  console.log(`      CybNutri:      ${wonCyb.length} vendas | R$ ${revCyb.toLocaleString('pt-BR')}`);
  console.log(`      TOTAL:         ${stats.won} vendas | R$ ${stats.revenue.toLocaleString('pt-BR')}`);

  // 3. Won por source original
  console.log('\n   3. VENDAS POR PLANILHA ORIGEM:');
  const expectedWonBySource = { mateus: { count: 146, value: 699830 }, cyb: { count: 213, value: 254593 }, sdr: { count: 8, value: 66446 }, social: { count: 1, value: 197 }, mateus_novo: { count: 0, value: 0 }, cyb_formacao: { count: 139, value: 58490 } };
  for (const [src, exp] of Object.entries(expectedWonBySource)) {
    const srcOpps = allOpps.filter(o => {
      const oppSrc = o.source;
      return oppSrc === src && o.status === 'won';
    });
    // Also check by tag
    const wonFromSrc = allOpps.filter(o => o.tags.includes('kommo_' + src) && o.status === 'won');
    // Better: just use the source field which matches _source
    const wonBySrc = allOpps.filter(o => o.source === src && o.status === 'won');
    const revBySrc = wonBySrc.reduce((s, o) => s + (o.monetary_value || 0), 0);
    const matchCount = wonBySrc.length === exp.count;
    const matchRev = Math.abs(revBySrc - exp.value) < 1;
    console.log(`      ${src.padEnd(14)} ${String(wonBySrc.length).padStart(4)} won (exp ${String(exp.count).padStart(4)}) ${matchCount ? '✅' : '❌'} | R$ ${revBySrc.toLocaleString('pt-BR').padStart(10)} (exp R$ ${exp.value.toLocaleString('pt-BR').padStart(10)}) ${matchRev ? '✅' : '❌'}`);
  }

  // 4. Opps por pipeline
  console.log('\n   4. OPPS POR PIPELINE:');
  const pipelineCounts = {};
  for (const o of allOpps) {
    const key = o.pipeline_name;
    if (!pipelineCounts[key]) pipelineCounts[key] = { total: 0, won: 0, open: 0, revenue: 0 };
    pipelineCounts[key].total++;
    if (o.status === 'won') { pipelineCounts[key].won++; pipelineCounts[key].revenue += o.monetary_value || 0; }
    else pipelineCounts[key].open++;
  }
  for (const [name, c] of Object.entries(pipelineCounts)) {
    console.log(`      ${name.padEnd(25)} ${String(c.total).padStart(5)} total | ${String(c.won).padStart(4)} won | ${String(c.open).padStart(5)} open | R$ ${c.revenue.toLocaleString('pt-BR')}`);
  }

  // 5. Opps por stage
  console.log('\n   5. OPPS POR STAGE (top 15):');
  const stageCounts = {};
  for (const o of allOpps) {
    const key = `${o.pipeline_name} > ${o.pipeline_stage_name}`;
    stageCounts[key] = (stageCounts[key] || 0) + 1;
  }
  const sortedStages = Object.entries(stageCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [name, count] of sortedStages) {
    console.log(`      ${name.padEnd(50)} ${count}`);
  }

  // 6. Contatos por marca
  console.log('\n   6. CONTATOS POR MARCA:');
  const contactsByMarca = {};
  for (const c of contactMap.values()) {
    contactsByMarca[c.marca] = (contactsByMarca[c.marca] || 0) + 1;
  }
  for (const [marca, count] of Object.entries(contactsByMarca)) {
    console.log(`      ${marca}: ${count}`);
  }

  // 7. Datas range
  const dates = allOpps.map(o => new Date(o.created_at)).filter(d => !isNaN(d.getTime())).sort((a, b) => a - b);
  console.log(`\n   7. RANGE DE DATAS: ${dates[0]?.toISOString().split('T')[0]} → ${dates[dates.length-1]?.toISOString().split('T')[0]}`);
  const noDate = allOpps.filter(o => !parseDate(o.created_at)).length;
  if (noDate > 0) console.log(`      ⚠️  ${noDate} opps sem data valida`);

  // 8. Skipped summary
  console.log(`\n   8. LEADS PULADOS (sem telefone): ${skipped.noPhone}`);
  for (const [src, count] of Object.entries(skipped.bySource)) {
    console.log(`      ${src}: ${count}`);
  }

  // 9. Overall match
  console.log('\n   9. VALIDAÇÃO FINAL:');
  const totalProcessed = allOpps.length + skipped.noPhone;
  console.log(`      Total processado: ${totalProcessed} (importados: ${allOpps.length} + pulados: ${skipped.noPhone})`);
  console.log(`      vs Planilhas:     8568 ${totalProcessed === 8568 ? '✅ CONFERE' : '❌ DIFF ' + (8568 - totalProcessed)}`);

  // Save audit report
  const report = [
    '# Auditoria Importação Supabase',
    `Data: ${new Date().toISOString()}`,
    '',
    `## Totais`,
    `- Oportunidades importadas: ${allOpps.length}`,
    `- Contatos unicos: ${contactMap.size}`,
    `- Leads pulados (sem tel): ${skipped.noPhone}`,
    `- Total processado: ${totalProcessed}`,
    `- Won: ${stats.won}`,
    `- Receita: R$ ${stats.revenue.toLocaleString('pt-BR')}`,
    '',
    `## Por Marca`,
    `- Mateus Cortez: ${stats.byMarca['Mateus Cortez'] || 0} opps | ${wonMateus.length} won | R$ ${revMateus.toLocaleString('pt-BR')}`,
    `- CybNutri: ${stats.byMarca['CybNutri'] || 0} opps | ${wonCyb.length} won | R$ ${revCyb.toLocaleString('pt-BR')}`,
    '',
    `## Por Source`,
    ...Object.entries(stats.bySource).map(([k, v]) => `- ${k}: ${v} importados, ${skipped.bySource[k] || 0} pulados`),
  ].join('\n');
  fs.writeFileSync(path.join(__dirname, 'AUDITORIA-IMPORT-SUPABASE.md'), report);
  console.log('\n   📄 Relatório salvo em AUDITORIA-IMPORT-SUPABASE.md');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
