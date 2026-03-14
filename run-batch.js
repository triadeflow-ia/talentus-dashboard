import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GHL_TOKEN = process.env.GHL_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const BASE = 'https://services.leadconnectorhq.com';
const DELAY = 2000;
const CHECKPOINT = path.join(__dirname, 'batch-checkpoint.json');

const PIPELINES = {
  comercial_mateus: 'kR7dX3quCskPn8y1hUR5',
  comercial_cyb: 'l0xKJIaG2JOWnpriXGlS',
  nutricao: 'YGbvdHFPw2OMVgEyshGJ',
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
const TAG_MAP = {
  'VIRADA DIGITAL': 'produto_virada_digital', 'ESCOLA NE': 'produto_escola_negocios',
  'FORMAÇÃO NE': 'produto_formacao_nutri', 'FORMACAO NE': 'produto_formacao_nutri',
  'MENTORIA GPS': 'mentoria_gps', 'MENTORIA INDIVIDUAL': 'mentoria_individual',
  'Social Selling': 'social_selling', 'ANUNCIO DE TRÁFEGO': 'trafego_pago',
  'ANUNCIO DE TRAFEGO': 'trafego_pago', 'PARCELAMENTO': 'parcelamento',
  'LAED QUENTE': 'score_quente', 'LEAD DO INSTA': 'organico', 'LINK DA BIO': 'organico',
  'MATEUS CORTEZ': 'marca_mateus', 'Virada Digital Ingresso Black': 'ingresso_black',
  'Virada Digital Ingresso Diamond': 'ingresso_diamond', 'PRODUTOS DE FRONT': 'produtos_front',
  'renovação': 'renovacao', 'RENOVAÇÃO': 'renovacao',
  '82 cardápios': 'produto_low_ticket_cyb', '82 cardapios': 'produto_low_ticket_cyb',
};
const ORIGIN_TAG_MAP = {
  'Tráfego Pago Whatsapp': 'trafego_pago', 'Tráfego Pago': 'trafego_pago',
  'Tráfego Pago Formulário': 'trafego_pago', 'Instagram Mateus': 'organico',
  'Instagram Cybelle': 'organico', 'Indicação': 'indicacao',
  'Página de Captura (wordpress)': 'trafego_pago',
};

// --- Helpers ---
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
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
function isCybNutri(source) { return source === 'cyb' || source === 'cyb_formacao'; }
function getStage(name, cyb) { return STAGES[(cyb ? 'cyb_' : 'mateus_') + name]; }

async function ghl(pathStr, opts = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 20000);
      const r = await fetch(BASE + pathStr, {
        ...opts, signal: controller.signal,
        headers: { Authorization: 'Bearer ' + GHL_TOKEN, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' },
      });
      clearTimeout(tid);
      if (r.status === 429) { console.log('  ⏳ 429, waiting 15s...'); await sleep(15000); continue; }
      if (!r.ok) { const t = await r.text(); throw new Error(r.status + ': ' + t.substring(0, 120)); }
      return r.json();
    } catch (e) {
      if (e.name === 'AbortError') { console.log('  ⏳ Timeout, retry ' + (attempt + 1)); await sleep(5000); continue; }
      throw e;
    }
  }
  throw new Error('Failed after 3 retries');
}

// --- Routing ---
function routeLead(row, source) {
  const etapa = row['Etapa do lead'] || '';
  const venda = parseFloat(row['Venda']) || 0;
  const cyb = isCybNutri(source);
  const pC = cyb ? PIPELINES.comercial_cyb : PIPELINES.comercial_mateus;
  let pid, sid, status;

  if (source === 'mateus') {
    if (etapa === 'Etapa de leads de entrada') { pid = PIPELINES.nutricao; sid = STAGES.entrada_nutricao; status = 'open'; }
    else if (etapa === 'BASE FRIA') { if (venda > 0) { pid = pC; sid = getStage('negociacao', cyb); status = 'won'; } else { pid = PIPELINES.nutricao; sid = STAGES.reativacao_comercial; status = 'open'; } }
    else { pid = pC; if (venda > 0) { sid = getStage('negociacao', cyb); status = 'won'; } else { const m = { 'Contato inicial': 'atendimento_inicial', 'Qualificação': 'qualificacao', 'Diagnóstico': 'call_diagnostico', 'Apresentação': 'apresentacao_r2', 'Negociação': 'negociacao' }; sid = getStage(m[etapa] || 'atendimento_inicial', cyb); status = 'open'; } }
  } else if (source === 'cyb') {
    pid = PIPELINES.nutricao;
    if (venda > 0) { sid = STAGES.reativacao_comercial; status = 'won'; }
    else if (etapa === 'Primeiro Contato' || etapa === 'Etapa de leads de entrada') { sid = STAGES.entrada_nutricao; status = 'open'; }
    else if (etapa.includes('Recupera') || etapa.includes('FollowUp') || etapa === 'BASE FRIA') { sid = STAGES.reativacao_comercial; status = 'open'; }
    else if (etapa.includes('Qualifica')) { pid = pC; sid = getStage('qualificacao', cyb); status = 'open'; }
    else if (etapa.includes('Negocia') || etapa.includes('Pagamento')) { pid = pC; sid = getStage('negociacao', cyb); status = 'open'; }
    else if (etapa.includes('Call') || etapa.includes('Diagn')) { pid = pC; sid = getStage('call_diagnostico', cyb); status = 'open'; }
    else { sid = STAGES.entrada_nutricao; status = 'open'; }
  } else if (source === 'sdr') {
    pid = pC;
    if (venda > 0) { sid = getStage('negociacao', cyb); status = 'won'; }
    else if (etapa.includes('FollowUp') || etapa === 'Etapa de leads de entrada') { sid = getStage('atendimento_inicial', cyb); status = 'open'; }
    else if (etapa.includes('Diagn')) { sid = getStage('call_diagnostico', cyb); status = 'open'; }
    else if (etapa.includes('Agendada')) { sid = getStage('apresentacao_r2', cyb); status = 'open'; }
    else if (etapa.includes('Realizada')) { sid = getStage('negociacao', cyb); status = 'open'; }
    else { sid = getStage('atendimento_inicial', cyb); status = 'open'; }
  } else if (source === 'mateus_novo') { pid = PIPELINES.nutricao; sid = STAGES.entrada_nutricao; status = 'open'; }
  else if (source === 'cyb_formacao') {
    pid = PIPELINES.nutricao;
    if (venda > 0) { sid = STAGES.reativacao_comercial; status = 'won'; }
    else if (etapa === 'Etapa de leads de entrada') { sid = STAGES.entrada_nutricao; status = 'open'; }
    else if (etapa === 'Contato inicial') { pid = pC; sid = getStage('atendimento_inicial', cyb); status = 'open'; }
    else if (etapa.includes('Qualifica')) { pid = pC; sid = getStage('qualificacao', cyb); status = 'open'; }
    else if (etapa.includes('Proposta') || etapa.includes('Pagamento')) { pid = pC; sid = getStage('negociacao', cyb); status = 'open'; }
    else if (etapa.includes('Recupera') || etapa.includes('Followup') || etapa.includes('Nutri') || etapa.includes('Breakup')) { sid = STAGES.reativacao_comercial; status = 'open'; }
    else { sid = STAGES.entrada_nutricao; status = 'open'; }
  } else if (source === 'social') {
    pid = PIPELINES.nutricao;
    if (venda > 0) { pid = pC; sid = getStage('negociacao', cyb); status = 'won'; }
    else if (etapa === 'Lead Conectado' || etapa === 'Primeiro contato') { pid = pC; sid = getStage('atendimento_inicial', cyb); status = 'open'; }
    else if (etapa.includes('Reativa')) { sid = STAGES.reativacao_comercial; status = 'open'; }
    else { sid = STAGES.entrada_nutricao; status = 'open'; }
  }

  // Tags
  const tags = new Set();
  tags.add(cyb ? 'marca_cyb' : 'marca_mateus');
  if (source === 'sdr') tags.add('kommo_sdr');
  if (source === 'social') { tags.add('kommo_social_selling'); tags.add('organico'); }
  if (source === 'cyb') tags.add('kommo_cyb');
  if (status === 'won') tags.add('venda_ganha');
  const kommoTags = (row['Lead tags'] || '').split(',').map(t => t.trim()).filter(Boolean);
  for (const t of kommoTags) { if (TAG_MAP[t]) tags.add(TAG_MAP[t]); }
  const prod = row['Produto Desejado'] || '';
  if (prod && PRODUCT_MAP[prod]?.tag) tags.add(PRODUCT_MAP[prod].tag);
  if (row['Origem'] && ORIGIN_TAG_MAP[row['Origem']]) tags.add(ORIGIN_TAG_MAP[row['Origem']]);

  // Custom fields
  const cf = [{ key: FIELDS.marca, field_value: cyb ? 'CybNutri' : 'Mateus Cortez' }];
  if (prod && PRODUCT_MAP[prod]) cf.push({ key: FIELDS.produto_interesse, field_value: PRODUCT_MAP[prod].field });

  // Assigned
  let assigned = null;
  const resp = (row['Lead usuário responsável'] || '').toLowerCase().trim();
  if (resp && GHL_USERS[resp]) assigned = GHL_USERS[resp];
  for (const t of kommoTags) {
    if (t.includes('RODRIGUEZ')) assigned = assigned || GHL_USERS['lucas rodrigues'];
    else if (t === 'CONSULTORA: KARLA' || t === 'KARLA') assigned = assigned || GHL_USERS['karla yonara'];
    else if (t === 'CONSULTORA: GILCILENE' || t === 'GILCILENE') assigned = assigned || GHL_USERS['gilcilene lima'];
  }
  if (assigned) {
    const nm = { [GHL_USERS['lucas rodrigues']]: 'Lucas Rodrigues', [GHL_USERS['gilcilene lima']]: 'Gilcilene Lima', [GHL_USERS['karla yonara']]: 'Karla Yonara', [GHL_USERS['mateus cortez']]: 'Mateus Cortez', [GHL_USERS['jessica monteiro']]: 'Jessica Monteiro' };
    if (nm[assigned]) cf.push({ key: FIELDS.vendedor_responsavel, field_value: nm[assigned] });
  }

  return { pid, sid, status, tags: [...tags], cf, assigned, value: venda };
}

// --- Load data ---
function loadAll() {
  const files = [
    { file: 'kommo.xlsx', source: 'mateus' }, { file: 'kommo2.xlsx', source: 'cyb' },
    { file: 'kommo3.xlsx', source: 'sdr' }, { file: 'kommo4.xlsx', source: 'social' },
    { file: 'kommo5.xlsx', source: 'mateus_novo' }, { file: 'kommo6.xlsx', source: 'cyb_formacao' },
  ];
  const all = [];
  for (const { file, source } of files) {
    const fp = path.join(__dirname, file);
    if (!fs.existsSync(fp)) continue;
    const wb = XLSX.readFile(fp, { cellDates: true });
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, raw: false });
    console.log('  ' + file + ': ' + data.length + ' (' + source + ')');
    data.forEach(row => all.push({ row, source }));
  }
  return all;
}

// --- Main ---
async function main() {
  const batchNum = parseInt(process.argv[2]) || 0;
  if (!batchNum || batchNum < 1 || batchNum > 5) {
    console.log('Uso: node run-batch.js <1-5>\n  1: Won\n  2: Comercial Mateus (open)\n  3: Comercial CybNutri (open)\n  4: Nutricao Reativacao (open)\n  5: Nutricao Entrada (open)');
    return;
  }

  console.log('Carregando...');
  const all = loadAll();
  let items = all.map(({ row, source }) => ({ row, source, r: routeLead(row, source) }));

  // Filter batch
  const filters = {
    1: x => x.r.status === 'won',
    2: x => x.r.pid === PIPELINES.comercial_mateus && x.r.status !== 'won',
    3: x => x.r.pid === PIPELINES.comercial_cyb && x.r.status !== 'won',
    4: x => x.r.pid === PIPELINES.nutricao && x.r.sid === STAGES.reativacao_comercial && x.r.status !== 'won',
    5: x => x.r.pid === PIPELINES.nutricao && x.r.sid === STAGES.entrada_nutricao,
  };
  items = items.filter(filters[batchNum]);

  // Filter migratable
  items = items.filter(x => {
    const phone = cleanPhone(x.row['Celular (contato)'] || x.row['Telefone comercial (contato)'] || x.row['Tel. direto com. (contato)'] || x.row['Outro telefone (contato)'] || '');
    const email = x.row['Email comercial (contato)'] || x.row['Email pessoal (contato)'] || '';
    return phone || email;
  });

  console.log('\nBatch ' + batchNum + ': ' + items.length + ' leads migraveis\n');

  // Resume
  let start = 0;
  if (fs.existsSync(CHECKPOINT)) {
    const cp = JSON.parse(fs.readFileSync(CHECKPOINT, 'utf-8'));
    if (cp.batch === batchNum) { start = cp.index; console.log('Retomando de ' + start); }
  }

  let ok = 0, dup = 0, err = 0;
  const t0 = Date.now();

  for (let i = start; i < items.length; i++) {
    const { row, r } = items[i];
    const name = row['Contato principal'] || '?';
    const phone = cleanPhone(row['Celular (contato)'] || row['Telefone comercial (contato)'] || row['Tel. direto com. (contato)'] || row['Outro telefone (contato)'] || '');
    const email = row['Email comercial (contato)'] || row['Email pessoal (contato)'] || '';

    if (i % 50 === 0) {
      const mins = ((Date.now() - t0) / 60000).toFixed(1);
      console.log('[' + i + '/' + items.length + '] ' + mins + 'min | ok:' + ok + ' dup:' + dup + ' err:' + err);
      fs.writeFileSync(CHECKPOINT, JSON.stringify({ batch: batchNum, index: i }));
      if (i > start) await sleep(3000);
    }

    try {
      // Find contact
      await sleep(DELAY);
      let contactId = null;
      if (phone) {
        try {
          const s = await ghl('/contacts/?locationId=' + GHL_LOCATION_ID + '&query=' + encodeURIComponent(phone) + '&limit=1');
          if (s.contacts?.[0]?.id) contactId = s.contacts[0].id;
        } catch (e) {}
      }
      if (!contactId && email) {
        try {
          const s = await ghl('/contacts/?locationId=' + GHL_LOCATION_ID + '&query=' + encodeURIComponent(email) + '&limit=1');
          if (s.contacts?.[0]?.id) contactId = s.contacts[0].id;
        } catch (e) {}
      }

      // Create contact if needed
      if (!contactId) {
        await sleep(DELAY);
        const nameParts = name.split(' ');
        const body = { locationId: GHL_LOCATION_ID, firstName: nameParts[0] || '', lastName: nameParts.slice(1).join(' ') || '' };
        if (phone) body.phone = phone;
        if (email) body.email = email;
        if (row['Cidade (contato)']) body.city = row['Cidade (contato)'];
        try {
          const c = await ghl('/contacts/', { method: 'POST', body: JSON.stringify(body) });
          contactId = c.contact?.id;
        } catch (e) {
          const m = e.message.match(/"contactId"\s*:\s*"([^"]+)"/);
          if (m) contactId = m[1];
          else { err++; continue; }
        }
      }
      if (!contactId) { err++; continue; }

      // Create opportunity
      await sleep(DELAY);
      const oppBody = { pipelineId: r.pid, pipelineStageId: r.sid, locationId: GHL_LOCATION_ID, contactId, name: row['Lead título'] || name, status: r.status, customFields: r.cf };
      if (r.value > 0) oppBody.monetaryValue = r.value;
      if (r.assigned) oppBody.assignedTo = r.assigned;
      try {
        await ghl('/opportunities/', { method: 'POST', body: JSON.stringify(oppBody) });
        ok++;
      } catch (e) {
        if (e.message.includes('duplicate')) { dup++; }
        else { err++; if (err <= 10) console.log('  ❌ opp: ' + e.message.substring(0, 80)); }
      }

      // Set tags
      await sleep(DELAY);
      try { await ghl('/contacts/' + contactId, { method: 'PUT', body: JSON.stringify({ tags: r.tags }) }); }
      catch (e) {}

    } catch (e) {
      err++;
      if (err <= 10) console.log('  ❌ ' + name + ': ' + e.message.substring(0, 80));
    }
  }

  fs.unlinkSync(CHECKPOINT);
  const totalMin = ((Date.now() - t0) / 60000).toFixed(1);
  console.log('\n' + '='.repeat(50));
  console.log('Batch ' + batchNum + ' COMPLETO (' + totalMin + ' min)');
  console.log('  ok: ' + ok + ' | dup: ' + dup + ' | err: ' + err + ' | total: ' + items.length);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
