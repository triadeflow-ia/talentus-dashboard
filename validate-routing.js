import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PIPELINES = {
  comercial_mateus: 'kR7dX3quCskPn8y1hUR5',
  comercial_cyb: 'l0xKJIaG2JOWnpriXGlS',
  nutricao: 'YGbvdHFPw2OMVgEyshGJ',
};
const PIPE_NAMES = {
  [PIPELINES.comercial_mateus]: 'Comercial Mateus',
  [PIPELINES.comercial_cyb]: 'Comercial CybNutri',
  [PIPELINES.nutricao]: 'Nutricao',
};
const STAGES = {
  mateus_atendimento_inicial: 'f256b8a5', mateus_qualificacao: '11d12653',
  mateus_call_diagnostico: '27a470cc', mateus_apresentacao_r2: '52734fb3', mateus_negociacao: '13ca7186',
  cyb_atendimento_inicial: '1c55eaa6', cyb_qualificacao: '321425d8',
  cyb_call_diagnostico: 'f3c1e71b', cyb_apresentacao_r2: 'f631bdb4', cyb_negociacao: 'e4d5e74f',
  entrada_nutricao: '709e3be1', reativacao_comercial: 'c5d13c5d',
};
const STAGE_NAMES = {};
for (const [k, v] of Object.entries(STAGES)) {
  STAGE_NAMES[v] = k.replace('mateus_', '').replace('cyb_', '').replace(/_/g, ' ');
}

function isCybNutri(row, source) {
  if (source === 'cyb' || source === 'cyb_formacao') return true;
  return false;
}
function getComercialStage(name, cyb) { return STAGES[(cyb ? 'cyb_' : 'mateus_') + name]; }

function routeLead(row, source) {
  const etapa = row['Etapa do lead'] || '';
  const venda = parseFloat(row['Venda']) || 0;
  const cyb = isCybNutri(row, source);
  const pipeComercial = cyb ? PIPELINES.comercial_cyb : PIPELINES.comercial_mateus;
  let pipelineId, stageId, status;

  if (source === 'mateus') {
    if (etapa === 'Etapa de leads de entrada') { pipelineId = PIPELINES.nutricao; stageId = STAGES.entrada_nutricao; status = 'open'; }
    else if (etapa === 'BASE FRIA') {
      if (venda > 0) { pipelineId = pipeComercial; stageId = getComercialStage('negociacao', cyb); status = 'won'; }
      else { pipelineId = PIPELINES.nutricao; stageId = STAGES.reativacao_comercial; status = 'open'; }
    } else {
      pipelineId = pipeComercial;
      if (venda > 0) { stageId = getComercialStage('negociacao', cyb); status = 'won'; }
      else {
        const m = { 'Contato inicial': 'atendimento_inicial', 'Qualificacao': 'qualificacao', 'Diagnostico': 'call_diagnostico', 'Apresentacao': 'apresentacao_r2', 'Negociacao': 'negociacao' };
        stageId = getComercialStage(m[etapa] || 'atendimento_inicial', cyb); status = 'open';
      }
    }
  } else if (source === 'cyb') {
    pipelineId = PIPELINES.nutricao;
    if (venda > 0) { stageId = STAGES.reativacao_comercial; status = 'won'; }
    else if (etapa === 'Primeiro Contato' || etapa === 'Etapa de leads de entrada') { stageId = STAGES.entrada_nutricao; status = 'open'; }
    else if (etapa.includes('Recupera') || etapa.includes('FollowUp') || etapa === 'BASE FRIA') { stageId = STAGES.reativacao_comercial; status = 'open'; }
    else if (etapa.includes('Qualifica')) { pipelineId = pipeComercial; stageId = getComercialStage('qualificacao', cyb); status = 'open'; }
    else if (etapa.includes('Negocia') || etapa.includes('Pagamento')) { pipelineId = pipeComercial; stageId = getComercialStage('negociacao', cyb); status = 'open'; }
    else if (etapa.includes('Call') || etapa.includes('Diagn')) { pipelineId = pipeComercial; stageId = getComercialStage('call_diagnostico', cyb); status = 'open'; }
    else { stageId = STAGES.entrada_nutricao; status = 'open'; }
  } else if (source === 'sdr') {
    pipelineId = pipeComercial;
    if (venda > 0) { stageId = getComercialStage('negociacao', cyb); status = 'won'; }
    else if (etapa.includes('FollowUp') || etapa === 'Etapa de leads de entrada') { stageId = getComercialStage('atendimento_inicial', cyb); status = 'open'; }
    else if (etapa.includes('Diagn')) { stageId = getComercialStage('call_diagnostico', cyb); status = 'open'; }
    else if (etapa.includes('Agendada')) { stageId = getComercialStage('apresentacao_r2', cyb); status = 'open'; }
    else if (etapa.includes('Realizada')) { stageId = getComercialStage('negociacao', cyb); status = 'open'; }
    else { stageId = getComercialStage('atendimento_inicial', cyb); status = 'open'; }
  } else if (source === 'mateus_novo') {
    pipelineId = PIPELINES.nutricao; stageId = STAGES.entrada_nutricao; status = 'open';
  } else if (source === 'cyb_formacao') {
    pipelineId = PIPELINES.nutricao;
    if (venda > 0) { stageId = STAGES.reativacao_comercial; status = 'won'; }
    else if (etapa === 'Etapa de leads de entrada') { stageId = STAGES.entrada_nutricao; status = 'open'; }
    else if (etapa === 'Contato inicial') { pipelineId = pipeComercial; stageId = getComercialStage('atendimento_inicial', cyb); status = 'open'; }
    else if (etapa.includes('Qualifica')) { pipelineId = pipeComercial; stageId = getComercialStage('qualificacao', cyb); status = 'open'; }
    else if (etapa.includes('Proposta') || etapa.includes('Pagamento')) { pipelineId = pipeComercial; stageId = getComercialStage('negociacao', cyb); status = 'open'; }
    else if (etapa.includes('Recupera') || etapa.includes('Followup') || etapa.includes('Nutri') || etapa.includes('Breakup')) { stageId = STAGES.reativacao_comercial; status = 'open'; }
    else { stageId = STAGES.entrada_nutricao; status = 'open'; }
  } else if (source === 'social') {
    pipelineId = PIPELINES.nutricao;
    if (venda > 0) { pipelineId = pipeComercial; stageId = getComercialStage('negociacao', cyb); status = 'won'; }
    else if (etapa === 'Lead Conectado' || etapa === 'Primeiro contato') { pipelineId = pipeComercial; stageId = getComercialStage('atendimento_inicial', cyb); status = 'open'; }
    else if (etapa.includes('Reativa')) { stageId = STAGES.reativacao_comercial; status = 'open'; }
    else { stageId = STAGES.entrada_nutricao; status = 'open'; }
  }

  return { pipeline: PIPE_NAMES[pipelineId] || '???', stage: STAGE_NAMES[stageId] || '???', status, marca: cyb ? 'CybNutri' : 'Mateus' };
}

const cases = [
  { file: 'kommo.xlsx', source: 'mateus', desc: 'MATEUS' },
  { file: 'kommo2.xlsx', source: 'cyb', desc: 'CYBNUTRI' },
  { file: 'kommo3.xlsx', source: 'sdr', desc: 'SDR' },
  { file: 'kommo4.xlsx', source: 'social', desc: 'SOCIAL' },
  { file: 'kommo5.xlsx', source: 'mateus_novo', desc: 'MATEUS NOVO' },
  { file: 'kommo6.xlsx', source: 'cyb_formacao', desc: 'CYB FORMACAO' },
];

let totalVendas = 0;
let totalReceita = 0;

for (const { file, source, desc } of cases) {
  const wb = XLSX.readFile(path.join(__dirname, file), { cellDates: true });
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null, raw: false });

  console.log('\n' + '='.repeat(70));
  console.log(`${desc} (${file}) - ${data.length} leads`);
  console.log('='.repeat(70));

  const destinos = {};
  let vendasArq = 0;
  let receitaArq = 0;
  let comData = 0;

  for (const row of data) {
    const r = routeLead(row, source);
    const key = `${r.pipeline} / ${r.stage} / ${r.status}`;
    destinos[key] = (destinos[key] || 0) + 1;

    const venda = parseFloat(row['Venda']) || 0;
    if (venda > 0) { vendasArq++; receitaArq += venda; }

    const dataCriada = row['Data Criada'];
    if (dataCriada) comData++;
  }

  totalVendas += vendasArq;
  totalReceita += receitaArq;

  console.log(`\nDestino dos leads:`);
  for (const [dest, count] of Object.entries(destinos).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${dest}: ${count}`);
  }

  console.log(`\nVendas: ${vendasArq} (R$ ${receitaArq.toLocaleString('pt-BR')})`);
  console.log(`Com Data Criada: ${comData}/${data.length}`);

  // 2 exemplos vendas
  const comVenda = data.filter(r => parseFloat(r['Venda']) > 0);
  if (comVenda.length > 0) {
    console.log('\n  Exemplos VENDAS:');
    for (const row of comVenda.slice(0, 2)) {
      const r = routeLead(row, source);
      const nome = row['Contato principal'] || '?';
      const prod = row['Produto Desejado'] || '-';
      const resp = row['Lead usuário responsável'] || '-';
      const tags = row['Lead tags'] || '-';
      const data = row['Data Criada'] || '-';
      console.log(`    ${nome}`);
      console.log(`      DESTINO: ${r.pipeline} / ${r.stage} / ${r.status} | marca: ${r.marca}`);
      console.log(`      Produto: ${prod} | Valor: R$${row['Venda']} | Resp: ${resp}`);
      console.log(`      Data Criada: ${data}`);
      console.log(`      Tags Kommo: ${tags.length > 100 ? tags.substring(0, 100) + '...' : tags}`);
    }
  }

  // 2 exemplos ativos
  const ativos = data.filter(r => {
    const e = r['Etapa do lead'] || '';
    return !parseFloat(r['Venda']) && e !== 'Etapa de leads de entrada' && e !== 'Conversas IG Direct' && e !== 'BASE FRIA';
  });
  if (ativos.length > 0) {
    console.log('\n  Exemplos ATIVOS:');
    for (const row of ativos.slice(0, 2)) {
      const r = routeLead(row, source);
      const nome = row['Contato principal'] || '?';
      const etapa = row['Etapa do lead'];
      const prod = row['Produto Desejado'] || '-';
      const resp = row['Lead usuário responsável'] || '-';
      const data = row['Data Criada'] || '-';
      console.log(`    ${nome}`);
      console.log(`      KOMMO: etapa="${etapa}" | produto="${prod}" | resp="${resp}"`);
      console.log(`      DESTINO: ${r.pipeline} / ${r.stage} / ${r.status} | marca: ${r.marca}`);
      console.log(`      Data Criada: ${data}`);
    }
  }
}

console.log('\n' + '='.repeat(70));
console.log('TOTAIS');
console.log('='.repeat(70));
console.log(`Total vendas: ${totalVendas}`);
console.log(`Total receita: R$ ${totalReceita.toLocaleString('pt-BR')}`);
