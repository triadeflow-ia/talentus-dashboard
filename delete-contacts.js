import dotenv from 'dotenv';
dotenv.config();

const GHL_TOKEN = process.env.GHL_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const RATE_LIMIT_MS = 2000;
const BATCH_PAUSE_MS = 5000;

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
      },
    });
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

async function main() {
  console.log('🗑️  Deletando contatos GHL (batch-and-delete)');
  console.log(`Location: ${GHL_LOCATION_ID}\n`);

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
      console.log(`  ⚠️ Erro buscando: ${e.message}`);
      await sleep(10000);
      continue;
    }

    if (contacts.length === 0) {
      emptyBatches++;
      if (emptyBatches >= 2) {
        await sleep(5000);
        try {
          const check = await ghlFetch(`/contacts/?locationId=${GHL_LOCATION_ID}&limit=1`);
          if ((check.contacts || []).length === 0) break;
          emptyBatches = 0;
        } catch (e) { break; }
      }
      continue;
    }

    emptyBatches = 0;
    console.log(`📦 Batch ${batchNum}: ${contacts.length} contatos (total: ${totalDeleted})`);

    for (const contact of contacts) {
      try {
        await ghlFetch(`/contacts/${contact.id}`, { method: 'DELETE' });
        totalDeleted++;
      } catch (e) {
        totalErrors++;
        if (totalErrors <= 10) console.log(`  ❌ ${e.message.substring(0, 80)}`);
        await sleep(3000);
      }
      await sleep(RATE_LIMIT_MS);
    }

    console.log(`  ✅ Batch ${batchNum} OK | Total: ${totalDeleted} | Erros: ${totalErrors}`);
    console.log(`  ⏸️  Pausa ${BATCH_PAUSE_MS / 1000}s...\n`);
    await sleep(BATCH_PAUSE_MS);
  }

  console.log('='.repeat(50));
  console.log(`🏁 CONTATOS DELETADOS: ${totalDeleted} | Erros: ${totalErrors}`);
}

main().catch(e => { console.error('💥', e); process.exit(1); });
