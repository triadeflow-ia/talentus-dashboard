import dotenv from 'dotenv';
dotenv.config();

const GHL_TOKEN = process.env.GHL_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RATE_LIMIT_MS = 2000; // 2s entre requests
const BATCH_PAUSE_MS = 5000; // 5s entre batches de 100

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ghlFetch(pathStr, options = {}, retries = 3) {
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
      const waitMs = 15000 * attempt; // 15s, 30s, 45s
      console.log(`  ⏳ Rate limit (429) — esperando ${waitMs / 1000}s (tentativa ${attempt}/${retries})...`);
      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GHL ${res.status}: ${text.substring(0, 200)}`);
    }
    return res.json();
  }
  throw new Error(`GHL 429: rate limit persistente apos ${retries} tentativas`);
}

// =============================================
// Delete opps: busca 100 → deleta → repete
// =============================================
async function deleteAllOpportunities() {
  console.log('\n1️⃣  Deletando oportunidades (batch-and-delete)...');

  let totalDeleted = 0;
  let totalErrors = 0;
  let batchNum = 0;
  let emptyBatches = 0;

  while (true) {
    batchNum++;

    // Buscar proximo lote (sempre do inicio, pois deletamos os anteriores)
    let opps;
    try {
      const res = await ghlFetch(`/opportunities/search?location_id=${GHL_LOCATION_ID}&limit=100`);
      opps = res.opportunities || [];
    } catch (e) {
      console.log(`  ⚠️ Erro buscando opps: ${e.message}`);
      await sleep(10000);
      continue;
    }

    if (opps.length === 0) {
      emptyBatches++;
      if (emptyBatches >= 2) {
        console.log('  ✅ Sem mais opps. Verificando uma ultima vez...');
        await sleep(5000);
        try {
          const check = await ghlFetch(`/opportunities/search?location_id=${GHL_LOCATION_ID}&limit=1`);
          if ((check.opportunities || []).length === 0) break;
          console.log('  Ainda tem opps, continuando...');
          emptyBatches = 0;
        } catch (e) { break; }
      }
      continue;
    }

    emptyBatches = 0;
    console.log(`\n  📦 Batch ${batchNum}: ${opps.length} opps (total deletado: ${totalDeleted})`);

    // Deletar cada opp do lote
    for (const opp of opps) {
      try {
        await ghlFetch(`/opportunities/${opp.id}`, { method: 'DELETE' });
        totalDeleted++;
      } catch (e) {
        totalErrors++;
        if (totalErrors <= 10) console.log(`  ❌ Erro: ${e.message.substring(0, 80)}`);
        await sleep(3000);
      }
      await sleep(RATE_LIMIT_MS);
    }

    console.log(`  ✅ Batch ${batchNum} concluido | Total: ${totalDeleted} deletadas | Erros: ${totalErrors}`);

    // Pausa entre batches
    console.log(`  ⏸️  Pausa ${BATCH_PAUSE_MS / 1000}s...`);
    await sleep(BATCH_PAUSE_MS);
  }

  console.log(`\n  🏁 Opps: ${totalDeleted} deletadas | ${totalErrors} erros`);
  return totalDeleted;
}

// =============================================
// Delete contacts: mesma estrategia batch-and-delete
// =============================================
async function deleteAllContacts() {
  console.log('\n2️⃣  Deletando contatos (batch-and-delete)...');

  let totalDeleted = 0;
  let totalErrors = 0;
  let batchNum = 0;
  let emptyBatches = 0;

  while (true) {
    batchNum++;

    let contacts;
    try {
      const res = await ghlFetch(`/contacts/?locationId=${GHL_LOCATION_ID}&limit=100`);
      contacts = res.contacts || [];
    } catch (e) {
      console.log(`  ⚠️ Erro buscando contatos: ${e.message}`);
      await sleep(10000);
      continue;
    }

    if (contacts.length === 0) {
      emptyBatches++;
      if (emptyBatches >= 2) {
        console.log('  ✅ Sem mais contatos. Verificando uma ultima vez...');
        await sleep(5000);
        try {
          const check = await ghlFetch(`/contacts/?locationId=${GHL_LOCATION_ID}&limit=1`);
          if ((check.contacts || []).length === 0) break;
          console.log('  Ainda tem contatos, continuando...');
          emptyBatches = 0;
        } catch (e) { break; }
      }
      continue;
    }

    emptyBatches = 0;
    console.log(`\n  📦 Batch ${batchNum}: ${contacts.length} contatos (total deletado: ${totalDeleted})`);

    for (const contact of contacts) {
      try {
        await ghlFetch(`/contacts/${contact.id}`, { method: 'DELETE' });
        totalDeleted++;
      } catch (e) {
        totalErrors++;
        if (totalErrors <= 10) console.log(`  ❌ Erro: ${e.message.substring(0, 80)}`);
        await sleep(3000);
      }
      await sleep(RATE_LIMIT_MS);
    }

    console.log(`  ✅ Batch ${batchNum} concluido | Total: ${totalDeleted} deletados | Erros: ${totalErrors}`);
    console.log(`  ⏸️  Pausa ${BATCH_PAUSE_MS / 1000}s...`);
    await sleep(BATCH_PAUSE_MS);
  }

  console.log(`\n  🏁 Contatos: ${totalDeleted} deletados | ${totalErrors} erros`);
  return totalDeleted;
}

// =============================================
// Truncate Supabase
// =============================================
async function truncateSupabase() {
  console.log('\n3️⃣  Limpando tabelas Supabase...');

  const tables = ['opportunities', 'contacts'];

  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=not.is.null`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`  ✅ ${table}: ${data.length} registros deletados`);
      } else {
        const text = await res.text();
        console.log(`  ❌ ${table}: ${text.substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`  ❌ ${table}: ${e.message}`);
    }
  }
}

// =============================================
// Delete old Comercial pipeline
// =============================================
async function deleteComercialPipeline() {
  console.log('\n4️⃣  Deletando pipeline Comercial antigo...');

  const PIPELINE_COMERCIAL = 'kR7dX3quCskPn8y1hUR5';

  try {
    await ghlFetch(`/opportunities/pipelines/${PIPELINE_COMERCIAL}?locationId=${GHL_LOCATION_ID}`, {
      method: 'DELETE',
    });
    console.log(`  ✅ Pipeline Comercial (${PIPELINE_COMERCIAL}) deletado`);
  } catch (e) {
    console.log(`  ⚠️ Erro deletando pipeline: ${e.message.substring(0, 100)}`);
    console.log('  (pode ja ter sido deletado ou ter opps restantes)');
  }
}

// =============================================
// Create new pipelines
// =============================================
async function createNewPipelines() {
  console.log('\n5️⃣  Criando pipelines novos...');

  const stages = [
    { name: 'Atendimento Inicial' },
    { name: 'Qualificação' },
    { name: 'Call Diagnóstico' },
    { name: 'Apresentação R2' },
    { name: 'Negociação' },
  ];

  const pipelines = [
    { name: 'Comercial Mateus Cortez' },
    { name: 'Comercial CybNutri' },
  ];

  const created = {};

  for (const pipe of pipelines) {
    try {
      const res = await ghlFetch(`/opportunities/pipelines`, {
        method: 'POST',
        body: JSON.stringify({
          locationId: GHL_LOCATION_ID,
          name: pipe.name,
          stages,
        }),
      });

      const pipelineData = res.pipeline || res;
      const pipelineId = pipelineData.id;
      const pipelineStages = pipelineData.stages || [];

      created[pipe.name] = {
        id: pipelineId,
        stages: pipelineStages.map(s => ({ id: s.id, name: s.name })),
      };

      console.log(`  ✅ ${pipe.name}: ${pipelineId}`);
      pipelineStages.forEach(s => console.log(`     - ${s.name}: ${s.id}`));

      await sleep(RATE_LIMIT_MS);
    } catch (e) {
      console.log(`  ❌ ${pipe.name}: ${e.message.substring(0, 150)}`);
    }
  }

  return created;
}

// =============================================
// MAIN
// =============================================
async function main() {
  console.log('='.repeat(60));
  console.log('🔄 RESET TOTAL — Talentus Digital GHL + Supabase');
  console.log('='.repeat(60));
  console.log(`Location: ${GHL_LOCATION_ID}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Rate limit: ${RATE_LIMIT_MS}ms entre requests`);
  console.log(`Batch pause: ${BATCH_PAUSE_MS}ms entre batches de 100`);
  console.log(`Estrategia: batch-and-delete (busca 100 → deleta → repete)`);

  console.log('\n⚠️  Isso vai DELETAR TUDO (opps + contatos + Supabase)');
  console.log('Iniciando em 5 segundos... (Ctrl+C para cancelar)\n');
  await sleep(5000);

  const startTime = Date.now();

  // Step 1: Delete opps (before contacts)
  const oppsDeleted = await deleteAllOpportunities();

  // Step 2: Delete contacts
  const contactsDeleted = await deleteAllContacts();

  // Step 3: Clean Supabase
  await truncateSupabase();

  // Step 4: Delete old pipeline
  await deleteComercialPipeline();

  // Step 5: Create new pipelines
  const newPipelines = await createNewPipelines();

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('🏁 RESET COMPLETO');
  console.log('='.repeat(60));
  console.log(`  Tempo total: ${elapsed} minutos`);
  console.log(`  Opps deletadas: ${oppsDeleted}`);
  console.log(`  Contatos deletados: ${contactsDeleted}`);
  console.log(`  Supabase limpo: opportunities + contacts`);
  console.log(`  Pipeline antigo removido: Comercial`);
  console.log(`\n  📋 NOVOS PIPELINES:`);
  for (const [name, data] of Object.entries(newPipelines)) {
    console.log(`  ${name}: ${data.id}`);
    data.stages.forEach(s => console.log(`    - ${s.name}: ${s.id}`));
  }
  console.log('\n  ⚠️  COPIE os IDs acima para atualizar migrate-kommo.js');
}

main().catch(e => {
  console.error('💥 Erro fatal:', e);
  process.exit(1);
});
