import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GHL_TOKEN = process.env.GHL_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const BASE = 'https://services.leadconnectorhq.com';
const DELAY = 2000;

const PIPELINES = { comercial_mateus: 'kR7dX3quCskPn8y1hUR5', comercial_cyb: 'l0xKJIaG2JOWnpriXGlS', nutricao: 'YGbvdHFPw2OMVgEyshGJ' };
const STAGES = {
  mateus_atendimento_inicial: 'f256b8a5-3f29-4d30-8e62-ffa5f9446372', mateus_qualificacao: '11d12653-7439-479d-8463-c11ef0fcedae',
  mateus_call_diagnostico: '27a470cc-39dd-4cc6-805f-b0fad0625fdb', mateus_apresentacao_r2: '52734fb3-a2a2-4377-b157-a5629ad4f32c', mateus_negociacao: '13ca7186-e4c0-4c45-8185-c91f9d422dc0',
  cyb_atendimento_inicial: '1c55eaa6-450c-4336-aa7a-d0762e35eb64', cyb_qualificacao: '321425d8-c9ea-4077-996f-b13ab8f5af24',
  cyb_call_diagnostico: 'f3c1e71b-70bc-413e-abf1-3f546642efaa', cyb_apresentacao_r2: 'f631bdb4-84b7-4555-97ef-3b91a16645ea', cyb_negociacao: 'e4d5e74f-5eaa-45ff-a758-fcae0e14ba52',
  entrada_nutricao: '709e3be1-14af-4c11-a352-4e1566a8730a', reativacao_comercial: 'c5d13c5d-d9d2-4b18-9b6b-96bbb78ba7bc',
};
const GHL_USERS = { 'gilcilene lima': '2Z0eH6IjgWDqUw5b4fqS', 'lucas rodrigues': '9AXuakmsPmncaaojIyGw', 'mateus cortez': '77uDX774vmKxyMxEhfCR', 'karla yonara': 'CfeKqpQX6eWKCVVwyRsQ', 'kyonaragomes@gmail.com': 'CfeKqpQX6eWKCVVwyRsQ', 'jessica monteiro': 'ioyhsn2lFdBhMbZ2PFNZ' };
const FIELDS = { marca: '2KaHcDNMZDwsozLFB1lL', produto_interesse: 'qpiSM6URmXbv28u0aFUH', vendedor_responsavel: 'BckPK8Tk8yZvGWeGIBIZ' };
const PRODUCT_MAP = { 'Virada Digital': { f: 'Virada Digital', t: 'produto_virada_digital' }, 'Virada Digital Executivo': { f: 'Virada Digital', t: 'produto_virada_digital' }, 'Escola Nutri Expert': { f: 'Escola Nutri Expert', t: 'produto_escola_nutri' }, 'Mentoria Individual Mateus': { f: 'Sala Secreta', t: 'mentoria_individual' }, 'Mentoria END': { f: 'Sala Secreta', t: 'mentoria_individual' }, 'Cursos e Ebooks Nutrição': { f: 'Escola Nutri Expert', t: 'produto_escola_nutri' }, 'Formação Nutri Expert': { f: 'Formacao Nutri Expert', t: 'produto_formacao_nutri' }, 'Profissional Mentory': { f: 'Profissional Mentory', t: 'produto_profissional_mentory' }, 'Low Ticket CYB': { f: 'Low Ticket CYB', t: 'produto_low_ticket_cyb' } };
const TAG_MAP = { 'VIRADA DIGITAL': 'produto_virada_digital', 'ESCOLA NE': 'produto_escola_negocios', 'FORMAÇÃO NE': 'produto_formacao_nutri', 'FORMACAO NE': 'produto_formacao_nutri', 'MENTORIA GPS': 'mentoria_gps', 'MENTORIA INDIVIDUAL': 'mentoria_individual', 'Social Selling': 'social_selling', 'ANUNCIO DE TRÁFEGO': 'trafego_pago', 'ANUNCIO DE TRAFEGO': 'trafego_pago', 'PARCELAMENTO': 'parcelamento', 'LAED QUENTE': 'score_quente', 'LEAD DO INSTA': 'organico', 'LINK DA BIO': 'organico', 'Virada Digital Ingresso Black': 'ingresso_black', 'Virada Digital Ingresso Diamond': 'ingresso_diamond', 'PRODUTOS DE FRONT': 'produtos_front', 'renovação': 'renovacao', 'RENOVAÇÃO': 'renovacao', '82 cardápios': 'produto_low_ticket_cyb', '82 cardapios': 'produto_low_ticket_cyb' };
const ORIGIN_TAG_MAP = { 'Tráfego Pago Whatsapp': 'trafego_pago', 'Tráfego Pago': 'trafego_pago', 'Tráfego Pago Formulário': 'trafego_pago', 'Instagram Mateus': 'organico', 'Instagram Cybelle': 'organico', 'Indicação': 'indicacao', 'Página de Captura (wordpress)': 'trafego_pago' };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function cleanPhone(raw) { if (!raw) return ''; let p = raw.replace(/^'+/, '').replace(/[^\d+]/g, ''); if (p && !p.startsWith('+')) { if (p.startsWith('55') && p.length >= 12) p = '+' + p; else if (p.length >= 10 && p.length <= 11) p = '+55' + p; else p = '+' + p; } return p; }

async function ghl(pathStr, opts = {}) {
  for (let a = 0; a < 3; a++) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 20000);
    try {
      const r = await fetch(BASE + pathStr, { ...opts, signal: c.signal, headers: { Authorization: 'Bearer ' + GHL_TOKEN, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' } });
      clearTimeout(t);
      if (r.status === 429) { console.log('  429, wait 15s'); await sleep(15000); continue; }
      if (!r.ok) { const txt = await r.text(); throw new Error(r.status + ': ' + txt.substring(0, 100)); }
      return r.json();
    } catch (e) { clearTimeout(t); if (e.name === 'AbortError') { console.log('  timeout, retry'); await sleep(5000); continue; } throw e; }
  }
  throw new Error('3 retries failed');
}

function isCyb(src) { return src === 'cyb' || src === 'cyb_formacao'; }
function stg(name, cyb) { return STAGES[(cyb ? 'cyb_' : 'mateus_') + name]; }

function route(row) {
  const src = row._source; const etapa = row['Etapa do lead'] || ''; const venda = parseFloat(row['Venda']) || 0;
  const cyb = isCyb(src); const pC = cyb ? PIPELINES.comercial_cyb : PIPELINES.comercial_mateus;
  let pid, sid, status;

  // REGRA GLOBAL: venda > 0 = SEMPRE comercial da marca / negociacao / won
  if (venda > 0) { pid = pC; sid = stg('negociacao', cyb); status = 'won'; }
  // Routing por source (apenas open)
  else if (src === 'mateus') { if (etapa === 'Etapa de leads de entrada') { pid = PIPELINES.nutricao; sid = STAGES.entrada_nutricao; status = 'open'; } else if (etapa === 'BASE FRIA') { pid = PIPELINES.nutricao; sid = STAGES.reativacao_comercial; status = 'open'; } else { pid = pC; const m = { 'Contato inicial': 'atendimento_inicial', 'Qualificação': 'qualificacao', 'Diagnóstico': 'call_diagnostico', 'Apresentação': 'apresentacao_r2', 'Negociação': 'negociacao' }; sid = stg(m[etapa] || 'atendimento_inicial', cyb); status = 'open'; } }
  else if (src === 'cyb') { pid = PIPELINES.nutricao; if (etapa === 'Primeiro Contato' || etapa === 'Etapa de leads de entrada') { sid = STAGES.entrada_nutricao; status = 'open'; } else if (etapa.includes('Recupera') || etapa.includes('FollowUp') || etapa === 'BASE FRIA') { sid = STAGES.reativacao_comercial; status = 'open'; } else if (etapa.includes('Qualifica')) { pid = pC; sid = stg('qualificacao', cyb); status = 'open'; } else if (etapa.includes('Negocia') || etapa.includes('Pagamento')) { pid = pC; sid = stg('negociacao', cyb); status = 'open'; } else if (etapa.includes('Call') || etapa.includes('Diagn')) { pid = pC; sid = stg('call_diagnostico', cyb); status = 'open'; } else { sid = STAGES.entrada_nutricao; status = 'open'; } }
  else if (src === 'sdr') { pid = pC; if (etapa.includes('FollowUp') || etapa === 'Etapa de leads de entrada') { sid = stg('atendimento_inicial', cyb); status = 'open'; } else if (etapa.includes('Diagn')) { sid = stg('call_diagnostico', cyb); status = 'open'; } else if (etapa.includes('Agendada')) { sid = stg('apresentacao_r2', cyb); status = 'open'; } else if (etapa.includes('Realizada')) { sid = stg('negociacao', cyb); status = 'open'; } else { sid = stg('atendimento_inicial', cyb); status = 'open'; } }
  else if (src === 'mateus_novo') { pid = PIPELINES.nutricao; sid = STAGES.entrada_nutricao; status = 'open'; }
  else if (src === 'cyb_formacao') { pid = PIPELINES.nutricao; if (etapa === 'Etapa de leads de entrada') { sid = STAGES.entrada_nutricao; status = 'open'; } else if (etapa === 'Contato inicial') { pid = pC; sid = stg('atendimento_inicial', cyb); status = 'open'; } else if (etapa.includes('Qualifica')) { pid = pC; sid = stg('qualificacao', cyb); status = 'open'; } else if (etapa.includes('Proposta') || etapa.includes('Pagamento')) { pid = pC; sid = stg('negociacao', cyb); status = 'open'; } else if (etapa.includes('Recupera') || etapa.includes('Followup') || etapa.includes('Nutri') || etapa.includes('Breakup')) { sid = STAGES.reativacao_comercial; status = 'open'; } else { sid = STAGES.entrada_nutricao; status = 'open'; } }
  else if (src === 'social') { pid = PIPELINES.nutricao; if (etapa === 'Lead Conectado' || etapa === 'Primeiro contato') { pid = pC; sid = stg('atendimento_inicial', cyb); status = 'open'; } else if (etapa.includes('Reativa')) { sid = STAGES.reativacao_comercial; status = 'open'; } else { sid = STAGES.entrada_nutricao; status = 'open'; } }

  const tags = new Set(); tags.add(cyb ? 'marca_cyb' : 'marca_mateus');
  if (src === 'sdr') tags.add('kommo_sdr'); if (src === 'social') { tags.add('kommo_social_selling'); tags.add('organico'); } if (src === 'cyb') tags.add('kommo_cyb'); if (status === 'won') tags.add('venda_ganha');
  const kt = (row['Lead tags'] || '').split(',').map(t => t.trim()).filter(Boolean);
  for (const t of kt) { if (TAG_MAP[t]) tags.add(TAG_MAP[t]); }
  const prod = row['Produto Desejado'] || ''; if (prod && PRODUCT_MAP[prod]) tags.add(PRODUCT_MAP[prod].t);
  if (row['Origem'] && ORIGIN_TAG_MAP[row['Origem']]) tags.add(ORIGIN_TAG_MAP[row['Origem']]);

  const cf = [{ key: FIELDS.marca, field_value: cyb ? 'CybNutri' : 'Mateus Cortez' }];
  if (prod && PRODUCT_MAP[prod]) cf.push({ key: FIELDS.produto_interesse, field_value: PRODUCT_MAP[prod].f });
  let assigned = null; const resp = (row['Lead usuário responsável'] || '').toLowerCase().trim();
  if (resp && GHL_USERS[resp]) assigned = GHL_USERS[resp];
  for (const t of kt) { if (t.includes('RODRIGUEZ')) assigned = assigned || GHL_USERS['lucas rodrigues']; else if (t === 'CONSULTORA: KARLA' || t === 'KARLA') assigned = assigned || GHL_USERS['karla yonara']; else if (t === 'CONSULTORA: GILCILENE' || t === 'GILCILENE') assigned = assigned || GHL_USERS['gilcilene lima']; }
  if (assigned) { const nm = { [GHL_USERS['lucas rodrigues']]: 'Lucas Rodrigues', [GHL_USERS['gilcilene lima']]: 'Gilcilene Lima', [GHL_USERS['karla yonara']]: 'Karla Yonara', [GHL_USERS['mateus cortez']]: 'Mateus Cortez', [GHL_USERS['jessica monteiro']]: 'Jessica Monteiro' }; if (nm[assigned]) cf.push({ key: FIELDS.vendedor_responsavel, field_value: nm[assigned] }); }
  return { pid, sid, status, tags: [...tags], cf, assigned, value: venda };
}

// --- MAIN ---
const jsonFile = process.argv[2];
const startFrom = parseInt(process.argv[3]) || 0;
const maxItems = parseInt(process.argv[4]) || 0;
if (!jsonFile) { console.log('Uso: node exec-batch.js <arquivo.json> [start] [max]'); process.exit(1); }

let items = JSON.parse(fs.readFileSync(path.join(__dirname, jsonFile), 'utf-8'));
const totalOriginal = items.length;
if (startFrom > 0) items = items.slice(startFrom);
if (maxItems > 0) items = items.slice(0, maxItems);
console.log('Loaded ' + items.length + ' leads from ' + jsonFile + ' (offset:' + startFrom + ' total:' + totalOriginal + ')');

let ok = 0, dup = 0, err = 0;
const t0 = Date.now();

for (let i = 0; i < items.length; i++) {
  const row = items[i];
  const r = route(row);
  const name = row['Contato principal'] || '?';
  const phone = cleanPhone(row['Celular (contato)'] || row['Telefone comercial (contato)'] || row['Tel. direto com. (contato)'] || row['Outro telefone (contato)'] || '');
  const email = row['Email comercial (contato)'] || row['Email pessoal (contato)'] || '';

  if (i % 25 === 0) { const m = ((Date.now() - t0) / 60000).toFixed(1); console.log('[' + i + '/' + items.length + '] ' + m + 'min | ok:' + ok + ' dup:' + dup + ' err:' + err); }

  // Find contact
  let cid = null;
  try {
    if (i > 0) await sleep(DELAY);
    if (phone) { const s = await ghl('/contacts/?locationId=' + GHL_LOCATION_ID + '&query=' + encodeURIComponent(phone) + '&limit=1'); cid = s.contacts?.[0]?.id || null; }
    if (!cid && email) { await sleep(DELAY); const s = await ghl('/contacts/?locationId=' + GHL_LOCATION_ID + '&query=' + encodeURIComponent(email) + '&limit=1'); cid = s.contacts?.[0]?.id || null; }
  } catch (e) { console.log('  search err: ' + e.message.substring(0, 60)); }

  // Create if needed
  if (!cid) {
    try {
      await sleep(DELAY);
      const np = name.split(' '); const body = { locationId: GHL_LOCATION_ID, firstName: np[0] || '', lastName: np.slice(1).join(' ') || '' };
      if (phone) body.phone = phone; if (email) body.email = email; if (row['Cidade (contato)']) body.city = row['Cidade (contato)'];
      const c = await ghl('/contacts/', { method: 'POST', body: JSON.stringify(body) }); cid = c.contact?.id;
    } catch (e) { const m = e.message.match(/"contactId"\s*:\s*"([^"]+)"/); if (m) cid = m[1]; else { err++; continue; } }
  }
  if (!cid) { err++; continue; }

  // Create opp
  try {
    await sleep(DELAY);
    const ob = { pipelineId: r.pid, pipelineStageId: r.sid, locationId: GHL_LOCATION_ID, contactId: cid, name: row['Lead título'] || name, status: r.status, customFields: r.cf };
    if (r.value > 0) ob.monetaryValue = r.value; if (r.assigned) ob.assignedTo = r.assigned;
    await ghl('/opportunities/', { method: 'POST', body: JSON.stringify(ob) }); ok++;
  } catch (e) { if (e.message.includes('duplicate')) dup++; else { err++; if (err <= 10) console.log('  opp err: ' + e.message.substring(0, 80)); } }

  // Tags
  try { await sleep(DELAY); await ghl('/contacts/' + cid, { method: 'PUT', body: JSON.stringify({ tags: r.tags }) }); } catch (e) {}
}

console.log('\n' + '='.repeat(40));
console.log('DONE (' + ((Date.now() - t0) / 60000).toFixed(1) + ' min)');
console.log('ok: ' + ok + ' | dup: ' + dup + ' | err: ' + err + ' | total: ' + items.length);
