import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GHL_TOKEN = process.env.GHL_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const RATE_LIMIT_MS = 2000;

// =============================================
// Helpers
// =============================================
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ghlFetch(pathStr, options = {}, retries = 5) {
  const url = `${GHL_BASE_URL}${pathStr}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
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
    if (res.status === 429) {
      const waitMs = 10000 * attempt;
      console.log(`  429 rate limit — esperando ${waitMs / 1000}s (tentativa ${attempt}/${retries})...`);
      await sleep(waitMs);
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GHL ${res.status}: ${text.substring(0, 300)}`);
    }
    return res.json();
  }
  throw new Error(`429 persistente apos ${retries} tentativas`);
}

// =============================================
// Pipeline + Stages definitions
// =============================================
const STAGE_NAMES = [
  'Atendimento Inicial',
  'Qualificacao',
  'Call Diagnostico',
  'Apresentacao R2',
  'Negociacao',
];

const PIPELINES_TO_CREATE = [
  { name: 'Comercial Mateus Cortez', key: 'comercial_mateus', stagePrefix: 'mateus' },
  { name: 'Comercial CybNutri', key: 'comercial_cyb', stagePrefix: 'cyb' },
];

// =============================================
// Create pipeline with stages
// =============================================
async function createPipeline(pipelineName, stages) {
  console.log(`\nCriando pipeline: "${pipelineName}"...`);

  const body = {
    name: pipelineName,
    locationId: GHL_LOCATION_ID,
    stages: stages.map((name, i) => ({
      name,
      position: i,
    })),
  };

  const data = await ghlFetch(`/opportunities/pipelines`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return data;
}

// =============================================
// Update migrate-kommo-v2.js with real IDs
// =============================================
function updateMigrateScript(results) {
  const filePath = path.join(__dirname, 'migrate-kommo-v2.js');
  if (!fs.existsSync(filePath)) {
    console.log('\nmigrate-kommo-v2.js nao encontrado — pulando atualizacao automatica.');
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  for (const result of results) {
    const { key, pipelineId, stagePrefix, stages } = result;

    // Replace pipeline ID placeholder
    if (key === 'comercial_mateus') {
      content = content.replace("'PIPELINE_ID_MATEUS'", `'${pipelineId}'`);
    } else if (key === 'comercial_cyb') {
      content = content.replace("'PIPELINE_ID_CYB'", `'${pipelineId}'`);
    }

    // Replace stage ID placeholders
    const stageKeyMap = {
      'Atendimento Inicial': 'atendimento_inicial',
      'Qualificacao': 'qualificacao',
      'Call Diagnostico': 'call_diagnostico',
      'Apresentacao R2': 'apresentacao_r2',
      'Negociacao': 'negociacao',
    };

    for (const stage of stages) {
      const stageKey = stageKeyMap[stage.name];
      if (!stageKey) continue;

      const fullKey = `${stagePrefix}_${stageKey}`;
      // Match pattern like: mateus_atendimento_inicial: 'STAGE_ID',
      const regex = new RegExp(`(${fullKey}:\\s*)'STAGE_ID'`);
      content = content.replace(regex, `$1'${stage.id}'`);
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('\nmigrate-kommo-v2.js atualizado com IDs reais.');
}

// =============================================
// MAIN
// =============================================
async function main() {
  console.log('='.repeat(60));
  console.log('  CRIAR PIPELINES GHL — Talentus Digital');
  console.log('='.repeat(60));
  console.log(`  Location: ${GHL_LOCATION_ID}`);
  console.log(`  Base URL: ${GHL_BASE_URL}\n`);

  if (!GHL_TOKEN || !GHL_LOCATION_ID) {
    console.error('Erro: GHL_TOKEN e GHL_LOCATION_ID devem estar no .env');
    process.exit(1);
  }

  const results = [];

  for (const pipeline of PIPELINES_TO_CREATE) {
    try {
      const data = await createPipeline(pipeline.name, STAGE_NAMES);

      const pipelineId = data.pipeline?.id || data.id;
      const stagesRaw = data.pipeline?.stages || data.stages || [];

      // Sort stages by position to match our order
      const sortedStages = [...stagesRaw].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      const stageResults = sortedStages.map((s, i) => ({
        name: STAGE_NAMES[i] || s.name,
        id: s.id || s._id,
        position: s.position ?? i,
      }));

      results.push({
        key: pipeline.key,
        name: pipeline.name,
        pipelineId,
        stagePrefix: pipeline.stagePrefix,
        stages: stageResults,
      });

      console.log(`  Pipeline criado: ${pipeline.name} (${pipelineId})`);
      for (const stage of stageResults) {
        console.log(`    Stage: ${stage.name} → ${stage.id}`);
      }

      await sleep(RATE_LIMIT_MS);
    } catch (e) {
      console.error(`\nErro ao criar pipeline "${pipeline.name}": ${e.message}`);
      process.exit(1);
    }
  }

  // =============================================
  // Print results in copy-paste format
  // =============================================
  console.log('\n' + '='.repeat(60));
  console.log('  IDs CRIADOS — COPIAR/COLAR');
  console.log('='.repeat(60));

  for (const r of results) {
    console.log(`\n  // ${r.name}`);
    console.log(`  Pipeline ID: '${r.pipelineId}'`);
    for (const s of r.stages) {
      const stageKey = s.name.toLowerCase()
        .replace(/\s+/g, '_')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      console.log(`  ${r.stagePrefix}_${stageKey}: '${s.id}'`);
    }
  }

  // =============================================
  // JS object format (ready to paste)
  // =============================================
  console.log('\n' + '-'.repeat(60));
  console.log('  FORMATO JS (pronto pra colar no migrate-kommo-v2.js):');
  console.log('-'.repeat(60));

  console.log('\nconst PIPELINES = {');
  for (const r of results) {
    console.log(`  ${r.key}: '${r.pipelineId}',`);
  }
  console.log("  nutricao: 'YGbvdHFPw2OMVgEyshGJ',");
  console.log('};');

  console.log('\nconst STAGES = {');
  for (const r of results) {
    console.log(`  // ${r.name}`);
    const stageKeyMap = {
      'Atendimento Inicial': 'atendimento_inicial',
      'Qualificacao': 'qualificacao',
      'Call Diagnostico': 'call_diagnostico',
      'Apresentacao R2': 'apresentacao_r2',
      'Negociacao': 'negociacao',
    };
    for (const s of r.stages) {
      const sk = stageKeyMap[s.name] || s.name.toLowerCase().replace(/\s+/g, '_');
      console.log(`  ${r.stagePrefix}_${sk}: '${s.id}',`);
    }
    console.log('');
  }
  console.log("  entrada_nutricao: '709e3be1-14af-4c11-a352-4e1566a8730a',");
  console.log("  reativacao_comercial: 'c5d13c5d-d9d2-4b18-9b6b-96bbb78ba7bc',");
  console.log('};');

  // =============================================
  // Auto-update migrate-kommo-v2.js
  // =============================================
  updateMigrateScript(results);

  console.log('\nConcluido.');
}

main().catch(e => { console.error('Erro fatal:', e); process.exit(1); });
