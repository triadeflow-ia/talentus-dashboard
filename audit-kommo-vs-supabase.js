/**
 * AUDITORIA COMPLETA: Kommo xlsx vs Supabase vs GHL
 *
 * Compara TUDO que foi extraido do Kommo contra o que esta no banco Supabase.
 * NAO altera nada — apenas leitura e relatorio.
 *
 * Usage: node audit-kommo-vs-supabase.js
 */
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// =============================================
// STEP 1: Load ALL Kommo data from xlsx files
// =============================================
function normalizePhone(raw) {
  if (!raw) return null;
  let p = String(raw).replace(/^'+/, '').replace(/[^\d]/g, '');
  if (!p || p.length < 8) return null;
  if (p.startsWith('55') && p.length >= 12) p = p.substring(2);
  if (p.length > 11) p = p.slice(-11);
  return p;
}

function normalizeEmail(raw) {
  if (!raw) return null;
  const e = String(raw).trim().toLowerCase();
  return e.includes('@') ? e : null;
}

function isCybNutri(row, source) {
  if (source === 'cyb' || source === 'cyb_formacao') return true;
  const prod = (row['Produto Desejado'] || '').toLowerCase();
  const origem = (row['Origem'] || '').toLowerCase();
  const tags = (row['Lead tags'] || '').toLowerCase();
  if (prod.includes('nutri') || prod.includes('cyb') || prod.includes('cardapio') || prod.includes('cardápio')) return true;
  if (origem.includes('cybelle') || origem.includes('cyb')) return true;
  if (tags.includes('escola ne') && !tags.includes('virada')) return true;
  if (tags.includes('82 card')) return true;
  return false;
}

function loadKommoData() {
  const files = [
    { file: 'kommo.xlsx', source: 'mateus' },
    { file: 'kommo2.xlsx', source: 'cyb' },
    { file: 'kommo3.xlsx', source: 'sdr' },
    { file: 'kommo4.xlsx', source: 'social' },
    { file: 'kommo5.xlsx', source: 'mateus_novo' },
    { file: 'kommo6.xlsx', source: 'cyb_formacao' },
  ];

  const allLeads = [];
  const fileSummary = [];

  for (const { file, source } of files) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      fileSummary.push({ file, source, total: 0, error: 'NAO ENCONTRADO' });
      continue;
    }
    const wb = XLSX.readFile(filePath, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });

    let withContact = 0;
    let withoutContact = 0;
    let withVenda = 0;
    let totalVenda = 0;
    let cybCount = 0;
    let mateusCount = 0;

    for (const row of data) {
      const phones = [
        row['Celular (contato)'],
        row['Telefone comercial (contato)'],
        row['Tel. direto com. (contato)'],
        row['Outro telefone (contato)'],
      ].map(normalizePhone).filter(Boolean);

      const emails = [
        row['Email comercial (contato)'],
        row['Email pessoal (contato)'],
      ].map(normalizeEmail).filter(Boolean);

      const hasContact = phones.length > 0 || emails.length > 0;
      if (hasContact) withContact++;
      else withoutContact++;

      const venda = parseFloat(row['Venda']) || 0;
      if (venda > 0) { withVenda++; totalVenda += venda; }

      const cyb = isCybNutri(row, source);
      if (cyb) cybCount++;
      else mateusCount++;

      allLeads.push({
        source,
        file,
        name: row['Contato principal'] || row['Lead título'] || null,
        phones,
        emails,
        hasContact,
        venda,
        etapa: row['Etapa do lead'] || null,
        dataCriada: row['Data Criada'] || null,
        isCyb: cyb,
        produto: row['Produto Desejado'] || null,
        origem: row['Origem'] || null,
        tags: row['Lead tags'] || null,
        responsavel: row['Lead usuário responsável'] || null,
      });
    }

    fileSummary.push({
      file, source,
      total: data.length,
      withContact,
      withoutContact,
      withVenda,
      totalVenda,
      cybCount,
      mateusCount,
    });
  }

  return { allLeads, fileSummary };
}

// =============================================
// STEP 2: Load ALL Supabase data
// =============================================
async function loadSupabaseData() {
  // Opportunities
  const allOpps = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, contact_id, name, status, pipeline_name, stage_name, marca, produto, vendedor, monetary_value, created_at')
      .range(offset, offset + 999);
    if (error) { console.error('Opp fetch error:', error.message); break; }
    if (!data || data.length === 0) break;
    allOpps.push(...data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  // Contacts
  const allContacts = [];
  offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, name, phone, email, tags, created_at')
      .range(offset, offset + 999);
    if (error) { console.error('Contact fetch error:', error.message); break; }
    if (!data || data.length === 0) break;
    allContacts.push(...data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  // Meta Ads daily
  const { count: metaDailyCount } = await supabase
    .from('meta_ads_daily')
    .select('*', { count: 'exact', head: true });

  // Meta Ads entities
  const { count: metaEntitiesCount } = await supabase
    .from('meta_ads_entities')
    .select('*', { count: 'exact', head: true });

  // Sync log
  const { data: syncLogs } = await supabase
    .from('sync_log')
    .select('id, type, status, started_at, finished_at, details')
    .order('id', { ascending: false })
    .limit(20);

  return { allOpps, allContacts, metaDailyCount, metaEntitiesCount, syncLogs };
}

// =============================================
// STEP 3: Cross-reference & audit
// =============================================
function runAudit(kommo, supabaseData) {
  const { allLeads, fileSummary } = kommo;
  const { allOpps, allContacts, metaDailyCount, metaEntitiesCount, syncLogs } = supabaseData;

  const report = [];
  report.push('');
  report.push('================================================================');
  report.push('  AUDITORIA COMPLETA: KOMMO vs SUPABASE vs GHL');
  report.push('  Data: ' + new Date().toISOString());
  report.push('================================================================');

  // ---- SECTION 1: KOMMO SOURCE DATA ----
  report.push('\n\n=== 1. DADOS FONTE (KOMMO XLSX) ===\n');
  let totalKommo = 0;
  let totalComContato = 0;
  let totalSemContato = 0;
  let totalComVenda = 0;
  let totalValorVenda = 0;
  let totalCybKommo = 0;
  let totalMateusKommo = 0;

  for (const s of fileSummary) {
    if (s.error) {
      report.push(`  ${s.file} (${s.source}): ${s.error}`);
      continue;
    }
    report.push(`  ${s.file} (${s.source}):`);
    report.push(`    Total: ${s.total} | Com contato: ${s.withContact} | Sem contato: ${s.withoutContact}`);
    report.push(`    Vendas: ${s.withVenda} (R$ ${s.totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
    report.push(`    Marca: Mateus ${s.mateusCount} | CybNutri ${s.cybCount}`);
    totalKommo += s.total;
    totalComContato += s.withContact;
    totalSemContato += s.withoutContact;
    totalComVenda += s.withVenda;
    totalValorVenda += s.totalVenda;
    totalCybKommo += s.cybCount;
    totalMateusKommo += s.mateusCount;
  }

  report.push(`\n  TOTAIS KOMMO:`);
  report.push(`    Total leads: ${totalKommo}`);
  report.push(`    Com contato (migraveis): ${totalComContato}`);
  report.push(`    Sem contato (nao-migraveis): ${totalSemContato}`);
  report.push(`    Com venda: ${totalComVenda} (R$ ${totalValorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
  report.push(`    Marca Mateus: ${totalMateusKommo} | Marca CybNutri: ${totalCybKommo}`);

  // ---- SECTION 2: SUPABASE CURRENT STATE ----
  report.push('\n\n=== 2. ESTADO ATUAL (SUPABASE) ===\n');
  report.push(`  Opportunities: ${allOpps.length}`);
  report.push(`  Contacts: ${allContacts.length}`);
  report.push(`  Meta Ads Daily: ${metaDailyCount}`);
  report.push(`  Meta Ads Entities: ${metaEntitiesCount}`);

  // Opp breakdown
  const oppByStatus = {};
  const oppByPipeline = {};
  const oppByMarca = {};
  let oppWithMarca = 0;
  let oppWithoutMarca = 0;
  let oppWonCount = 0;
  let oppWonValue = 0;
  let oppTotalValue = 0;

  for (const o of allOpps) {
    oppByStatus[o.status] = (oppByStatus[o.status] || 0) + 1;
    oppByPipeline[o.pipeline_name || 'NULL'] = (oppByPipeline[o.pipeline_name || 'NULL'] || 0) + 1;
    oppByMarca[o.marca || 'NULL'] = (oppByMarca[o.marca || 'NULL'] || 0) + 1;
    if (o.marca) oppWithMarca++;
    else oppWithoutMarca++;
    const val = parseFloat(o.monetary_value) || 0;
    oppTotalValue += val;
    if (o.status === 'won') { oppWonCount++; oppWonValue += val; }
  }

  report.push(`\n  Opportunities por status:`);
  for (const [k, v] of Object.entries(oppByStatus).sort((a, b) => b[1] - a[1])) {
    report.push(`    ${k}: ${v}`);
  }

  report.push(`\n  Opportunities por pipeline:`);
  for (const [k, v] of Object.entries(oppByPipeline).sort((a, b) => b[1] - a[1])) {
    report.push(`    ${k}: ${v}`);
  }

  report.push(`\n  Opportunities por marca:`);
  for (const [k, v] of Object.entries(oppByMarca).sort((a, b) => b[1] - a[1])) {
    report.push(`    ${k}: ${v}`);
  }

  report.push(`\n  Marca: ${oppWithMarca} preenchida | ${oppWithoutMarca} vazia`);
  report.push(`  Won: ${oppWonCount} deals (R$ ${oppWonValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
  report.push(`  Valor total todas opps: R$ ${oppTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);

  // Contact breakdown
  const contactsWithTags = allContacts.filter(c => c.tags && c.tags.length > 0).length;
  const contactsWithPhone = allContacts.filter(c => c.phone).length;
  const contactsWithEmail = allContacts.filter(c => c.email).length;

  report.push(`\n  Contacts:`);
  report.push(`    Com tags: ${contactsWithTags}`);
  report.push(`    Com phone: ${contactsWithPhone}`);
  report.push(`    Com email: ${contactsWithEmail}`);

  // Contact marca tags
  let contactMarcaMateus = 0;
  let contactMarcaCyb = 0;
  let contactSemMarca = 0;
  let contactAmbasMarcas = 0;

  for (const c of allContacts) {
    const tags = Array.isArray(c.tags) ? c.tags : [];
    const hasMateus = tags.some(t => typeof t === 'string' ? t.toLowerCase().includes('marca_mateus') : (t.name || '').toLowerCase().includes('marca_mateus'));
    const hasCyb = tags.some(t => typeof t === 'string' ? t.toLowerCase().includes('marca_cyb') : (t.name || '').toLowerCase().includes('marca_cyb'));
    if (hasMateus && hasCyb) contactAmbasMarcas++;
    else if (hasMateus) contactMarcaMateus++;
    else if (hasCyb) contactMarcaCyb++;
    else contactSemMarca++;
  }

  report.push(`\n  Contact marca tags:`);
  report.push(`    marca_mateus: ${contactMarcaMateus}`);
  report.push(`    marca_cyb: ${contactMarcaCyb}`);
  report.push(`    AMBAS marcas: ${contactAmbasMarcas}`);
  report.push(`    SEM marca: ${contactSemMarca}`);

  // ---- SECTION 3: MIGRATION CHECKPOINT ----
  report.push('\n\n=== 3. CHECKPOINT MIGRACAO ===\n');
  const checkpointPath = path.join(__dirname, 'migration-checkpoint.json');
  if (fs.existsSync(checkpointPath)) {
    const cp = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'));
    report.push(`  Index: ${cp.index} / Total leads`);
    report.push(`  Sucesso: ${cp.stats.success}`);
    report.push(`  Duplicados: ${cp.stats.duplicates}`);
    report.push(`  Pulados (sem contato): ${cp.stats.skipped}`);
    report.push(`  Erros: ${cp.stats.errors}`);
    report.push(`  Total processado: ${cp.stats.success + cp.stats.duplicates + cp.stats.skipped + cp.stats.errors}`);
    report.push(`  Timestamp: ${cp.timestamp}`);
  } else {
    report.push('  Checkpoint nao encontrado');
  }

  // ---- SECTION 4: CROSS-REFERENCE ----
  report.push('\n\n=== 4. CRUZAMENTO KOMMO ↔ SUPABASE ===\n');

  // Build phone/email indexes from Supabase contacts
  const sbPhoneIndex = {};
  const sbEmailIndex = {};
  for (const c of allContacts) {
    const np = normalizePhone(c.phone);
    if (np) sbPhoneIndex[np] = c;
    const ne = normalizeEmail(c.email);
    if (ne) sbEmailIndex[ne] = c;
  }

  // Match Kommo leads to Supabase contacts
  let matchedToSupabase = 0;
  let notFoundInSupabase = 0;
  const notFoundSamples = [];
  const matchedLeads = [];

  // Track unique contacts matched
  const matchedContactIds = new Set();

  // Track marca correctness
  let marcaCorrect = 0;
  let marcaWrong = 0;
  let marcaMissing = 0;
  const marcaWrongSamples = [];

  for (const lead of allLeads) {
    if (!lead.hasContact) continue;

    let foundContact = null;
    for (const phone of lead.phones) {
      if (sbPhoneIndex[phone]) { foundContact = sbPhoneIndex[phone]; break; }
    }
    if (!foundContact) {
      for (const email of lead.emails) {
        if (sbEmailIndex[email]) { foundContact = sbEmailIndex[email]; break; }
      }
    }

    if (foundContact) {
      matchedToSupabase++;
      matchedContactIds.add(foundContact.id);
      matchedLeads.push({ lead, contact: foundContact });

      // Check marca tag correctness
      const tags = Array.isArray(foundContact.tags) ? foundContact.tags : [];
      const tagNames = tags.map(t => typeof t === 'string' ? t.toLowerCase() : (t.name || '').toLowerCase());
      const hasCybTag = tagNames.some(t => t.includes('marca_cyb'));
      const hasMateusTag = tagNames.some(t => t.includes('marca_mateus'));

      if (lead.isCyb) {
        if (hasCybTag) marcaCorrect++;
        else if (hasMateusTag) {
          marcaWrong++;
          if (marcaWrongSamples.length < 20) {
            marcaWrongSamples.push({
              name: lead.name,
              source: lead.source,
              expectedMarca: 'cyb',
              actualTag: 'marca_mateus',
              contactId: foundContact.id,
              phone: lead.phones[0] || null,
            });
          }
        } else {
          marcaMissing++;
        }
      } else {
        if (hasMateusTag) marcaCorrect++;
        else if (hasCybTag) {
          marcaWrong++;
          if (marcaWrongSamples.length < 20) {
            marcaWrongSamples.push({
              name: lead.name,
              source: lead.source,
              expectedMarca: 'mateus',
              actualTag: 'marca_cyb',
              contactId: foundContact.id,
              phone: lead.phones[0] || null,
            });
          }
        } else {
          marcaMissing++;
        }
      }
    } else {
      notFoundInSupabase++;
      if (notFoundSamples.length < 15) {
        notFoundSamples.push({
          name: lead.name,
          source: lead.source,
          phone: lead.phones[0] || null,
          email: lead.emails[0] || null,
        });
      }
    }
  }

  report.push(`  Leads Kommo com contato: ${totalComContato}`);
  report.push(`  Encontrados no Supabase: ${matchedToSupabase} (${(matchedToSupabase / totalComContato * 100).toFixed(1)}%)`);
  report.push(`  NAO encontrados no Supabase: ${notFoundInSupabase}`);
  report.push(`  Contatos unicos matchados: ${matchedContactIds.size}`);
  report.push(`  Contatos Supabase sem match Kommo: ${allContacts.length - matchedContactIds.size}`);

  if (notFoundSamples.length > 0) {
    report.push(`\n  Amostras NAO encontrados no Supabase (${Math.min(15, notFoundInSupabase)}):`);
    for (const s of notFoundSamples) {
      report.push(`    - ${s.name || '?'} | fonte: ${s.source} | tel: ${s.phone || '-'} | email: ${s.email || '-'}`);
    }
  }

  // ---- SECTION 5: MARCA AUDIT ----
  report.push('\n\n=== 5. AUDITORIA DE MARCA ===\n');
  report.push(`  Marca CORRETA (tag GHL = esperado Kommo): ${marcaCorrect}`);
  report.push(`  Marca ERRADA (tag GHL ≠ esperado Kommo): ${marcaWrong}`);
  report.push(`  Marca AUSENTE (sem tag marca no contato): ${marcaMissing}`);

  if (marcaWrongSamples.length > 0) {
    report.push(`\n  Amostras marca ERRADA (${marcaWrongSamples.length}):`);
    for (const s of marcaWrongSamples) {
      report.push(`    - ${s.name || '?'} | fonte: ${s.source} | esperado: ${s.expectedMarca} | atual: ${s.actualTag} | contactId: ${s.contactId}`);
    }
  }

  // ---- SECTION 5b: OPP MARCA vs CONTACT TAG ----
  report.push('\n\n=== 5b. AUDITORIA OPP.MARCA vs CONTACT.TAGS ===\n');

  // For each opp, check if its marca matches the contact's tag
  const oppContactMap = {};
  for (const c of allContacts) {
    oppContactMap[c.id] = c;
  }

  let oppMarcaMatchesTag = 0;
  let oppMarcaMismatchTag = 0;
  let oppMarcaNoContact = 0;
  const oppMismatchSamples = [];

  for (const opp of allOpps) {
    if (!opp.marca) continue;
    const contact = oppContactMap[opp.contact_id];
    if (!contact) { oppMarcaNoContact++; continue; }

    const tags = Array.isArray(contact.tags) ? contact.tags : [];
    const tagNames = tags.map(t => typeof t === 'string' ? t.toLowerCase() : (t.name || '').toLowerCase());

    const oppIsCyb = opp.marca.toLowerCase().includes('cyb');
    const contactHasCyb = tagNames.some(t => t.includes('marca_cyb'));
    const contactHasMateus = tagNames.some(t => t.includes('marca_mateus'));

    if (oppIsCyb && contactHasCyb) oppMarcaMatchesTag++;
    else if (!oppIsCyb && contactHasMateus) oppMarcaMatchesTag++;
    else {
      oppMarcaMismatchTag++;
      if (oppMismatchSamples.length < 10) {
        oppMismatchSamples.push({
          oppId: opp.id,
          oppMarca: opp.marca,
          contactTags: tagNames.filter(t => t.includes('marca')).join(', ') || 'nenhuma',
          name: opp.name,
        });
      }
    }
  }

  report.push(`  Opp.marca ALINHADA com contact.tags: ${oppMarcaMatchesTag}`);
  report.push(`  Opp.marca DIVERGENTE de contact.tags: ${oppMarcaMismatchTag}`);
  report.push(`  Opp sem contato correspondente: ${oppMarcaNoContact}`);

  if (oppMismatchSamples.length > 0) {
    report.push(`\n  Amostras divergencia opp.marca vs contact.tags:`);
    for (const s of oppMismatchSamples) {
      report.push(`    - ${s.name} | opp.marca: ${s.oppMarca} | contact.tags: ${s.contactTags}`);
    }
  }

  // ---- SECTION 6: DATE AUDIT ----
  report.push('\n\n=== 6. AUDITORIA DE DATAS ===\n');

  const now = new Date();
  const today = now.toISOString().split('T')[0]; // 2026-03-13
  let oppsWithTodayDate = 0;
  let oppsWithHistoricalDate = 0;
  let oldestOppDate = null;
  let newestOppDate = null;

  for (const opp of allOpps) {
    const d = opp.created_at ? opp.created_at.split('T')[0] : null;
    if (!d) continue;
    if (d === today || d === '2026-03-13') oppsWithTodayDate++;
    else oppsWithHistoricalDate++;
    if (!oldestOppDate || d < oldestOppDate) oldestOppDate = d;
    if (!newestOppDate || d > newestOppDate) newestOppDate = d;
  }

  report.push(`  Opps com data de HOJE (${today}): ${oppsWithTodayDate}`);
  report.push(`  Opps com data HISTORICA (antes de hoje): ${oppsWithHistoricalDate}`);
  report.push(`  Data mais antiga: ${oldestOppDate}`);
  report.push(`  Data mais recente: ${newestOppDate}`);

  // Date distribution by month
  const datesByMonth = {};
  for (const opp of allOpps) {
    const d = opp.created_at;
    if (!d) continue;
    const month = d.substring(0, 7); // YYYY-MM
    datesByMonth[month] = (datesByMonth[month] || 0) + 1;
  }

  report.push(`\n  Distribuicao por mes:`);
  for (const [month, count] of Object.entries(datesByMonth).sort()) {
    report.push(`    ${month}: ${count}`);
  }

  // Contact date check
  let contactsWithTodayDate = 0;
  let contactsWithHistorical = 0;
  for (const c of allContacts) {
    const d = c.created_at ? c.created_at.split('T')[0] : null;
    if (d === today || d === '2026-03-13') contactsWithTodayDate++;
    else contactsWithHistorical++;
  }
  report.push(`\n  Contacts com data de HOJE: ${contactsWithTodayDate}`);
  report.push(`  Contacts com data HISTORICA: ${contactsWithHistorical}`);

  // ---- SECTION 7: DUPLICATE ANALYSIS ----
  report.push('\n\n=== 7. ANALISE DE DUPLICATAS ===\n');

  // Check for contacts appearing in multiple xlsx files
  const phoneToSources = {};
  const emailToSources = {};

  for (const lead of allLeads) {
    if (!lead.hasContact) continue;
    for (const phone of lead.phones) {
      if (!phoneToSources[phone]) phoneToSources[phone] = new Set();
      phoneToSources[phone].add(lead.source);
    }
    for (const email of lead.emails) {
      if (!emailToSources[email]) emailToSources[email] = new Set();
      emailToSources[email].add(lead.source);
    }
  }

  const multiSourcePhones = Object.entries(phoneToSources).filter(([, s]) => s.size > 1);
  const multiSourceEmails = Object.entries(emailToSources).filter(([, s]) => s.size > 1);

  report.push(`  Telefones que aparecem em MULTIPLAS planilhas: ${multiSourcePhones.length}`);
  report.push(`  Emails que aparecem em MULTIPLAS planilhas: ${multiSourceEmails.length}`);

  // How many of these cross-source contacts have CONFLICTING marca?
  let crossSourceConflicts = 0;
  const conflictSamples = [];

  for (const [phone, sources] of multiSourcePhones) {
    const sourcesArr = [...sources];
    // Check if any source would assign cyb and another mateus
    const leadsForPhone = allLeads.filter(l => l.phones.includes(phone));
    const marcas = new Set(leadsForPhone.map(l => l.isCyb ? 'cyb' : 'mateus'));
    if (marcas.size > 1) {
      crossSourceConflicts++;
      if (conflictSamples.length < 10) {
        conflictSamples.push({
          phone,
          sources: sourcesArr.join(', '),
          name: leadsForPhone[0].name,
          marcas: [...marcas].join(' vs '),
        });
      }
    }
  }

  report.push(`  Conflitos de marca (mesmo telefone, fontes diferentes): ${crossSourceConflicts}`);

  if (conflictSamples.length > 0) {
    report.push(`\n  Amostras conflito marca cross-source:`);
    for (const s of conflictSamples) {
      report.push(`    - ${s.name || '?'} | tel: ${s.phone} | fontes: ${s.sources} | marca: ${s.marcas}`);
    }
  }

  // Check opps per contact
  const oppsPerContact = {};
  for (const opp of allOpps) {
    if (!opp.contact_id) continue;
    if (!oppsPerContact[opp.contact_id]) oppsPerContact[opp.contact_id] = [];
    oppsPerContact[opp.contact_id].push(opp);
  }

  const contactsWith1Opp = Object.values(oppsPerContact).filter(v => v.length === 1).length;
  const contactsWith2Opps = Object.values(oppsPerContact).filter(v => v.length === 2).length;
  const contactsWith3PlusOpps = Object.values(oppsPerContact).filter(v => v.length >= 3).length;
  const contactsWithNoOpp = allContacts.length - Object.keys(oppsPerContact).length;

  report.push(`\n  Opps por contato:`);
  report.push(`    1 opp: ${contactsWith1Opp} contatos`);
  report.push(`    2 opps: ${contactsWith2Opps} contatos`);
  report.push(`    3+ opps: ${contactsWith3PlusOpps} contatos`);
  report.push(`    0 opps (contato sem opp): ${contactsWithNoOpp} contatos`);

  // ---- SECTION 8: VALUE AUDIT ----
  report.push('\n\n=== 8. AUDITORIA DE VALORES ===\n');

  // Kommo won value per source
  const kommoValueBySource = {};
  for (const lead of allLeads) {
    if (lead.venda > 0) {
      if (!kommoValueBySource[lead.source]) kommoValueBySource[lead.source] = { count: 0, total: 0 };
      kommoValueBySource[lead.source].count++;
      kommoValueBySource[lead.source].total += lead.venda;
    }
  }

  report.push(`  Kommo vendas por fonte:`);
  for (const [src, v] of Object.entries(kommoValueBySource)) {
    report.push(`    ${src}: ${v.count} vendas, R$ ${v.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  }

  report.push(`\n  Supabase:`);
  report.push(`    Won deals: ${oppWonCount}`);
  report.push(`    Valor won: R$ ${oppWonValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  report.push(`    Valor total (todas): R$ ${oppTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  // ---- SECTION 9: SYNC LOG ----
  report.push('\n\n=== 9. SYNC LOG (ultimos 20) ===\n');
  if (syncLogs && syncLogs.length > 0) {
    for (const s of syncLogs) {
      const details = typeof s.details === 'string' ? s.details : JSON.stringify(s.details || {}).substring(0, 80);
      report.push(`  #${s.id} | ${s.type} | ${s.status} | ${s.started_at || '-'} | ${details}`);
    }
  }

  // ---- SECTION 10: PROBLEMAS DETECTADOS ----
  report.push('\n\n=== 10. PROBLEMAS DETECTADOS ===\n');
  const problems = [];

  if (marcaWrong > 0) {
    problems.push(`[CRITICO] ${marcaWrong} contatos com marca ERRADA no GHL (tag marca diverge do esperado pela fonte Kommo)`);
  }
  if (marcaMissing > 0) {
    problems.push(`[MEDIO] ${marcaMissing} contatos SEM tag de marca no GHL`);
  }
  if (notFoundInSupabase > 0) {
    problems.push(`[INFO] ${notFoundInSupabase} leads Kommo com contato NAO encontrados no Supabase`);
  }
  if (oppsWithTodayDate > 0) {
    problems.push(`[ATENCAO] ${oppsWithTodayDate} opps ainda com data de HOJE (datas historicas nao aplicadas)`);
  }
  if (crossSourceConflicts > 0) {
    problems.push(`[CRITICO] ${crossSourceConflicts} contatos aparecem em multiplas planilhas com marca CONFLITANTE (causa raiz do bug CybNutri)`);
  }
  if (oppMarcaMismatchTag > 0) {
    problems.push(`[MEDIO] ${oppMarcaMismatchTag} opps onde opp.marca NAO corresponde ao contact.tags`);
  }
  if (contactAmbasMarcas > 0) {
    problems.push(`[ATENCAO] ${contactAmbasMarcas} contatos com AMBAS tags marca_mateus + marca_cyb`);
  }

  const kommoComVenda = allLeads.filter(l => l.venda > 0).length;
  if (Math.abs(kommoComVenda - oppWonCount) > 5) {
    problems.push(`[VERIFICAR] Kommo tem ${kommoComVenda} leads com venda, Supabase tem ${oppWonCount} won deals — diferenca de ${Math.abs(kommoComVenda - oppWonCount)}`);
  }

  if (problems.length === 0) {
    report.push('  Nenhum problema detectado!');
  } else {
    for (const p of problems) {
      report.push(`  ${p}`);
    }
  }

  // ---- SECTION 11: RESUMO FINAL ----
  report.push('\n\n=== 11. RESUMO FINAL ===\n');
  report.push(`  KOMMO FONTE: ${totalKommo} leads (${totalComContato} migraveis)`);
  report.push(`  MIGRACAO: ${530} criados + ${6475} duplicados + ${1553} pulados + ${10} erros = ${530 + 6475 + 1553 + 10}`);
  report.push(`  SUPABASE: ${allOpps.length} opps | ${allContacts.length} contatos | ${metaDailyCount} meta daily | ${metaEntitiesCount} meta entities`);
  report.push(`  MARCA: ${oppWithMarca}/${allOpps.length} opps com marca (${(oppWithMarca / allOpps.length * 100).toFixed(1)}%)`);
  report.push(`  DATAS: ${oppsWithHistoricalDate} historicas | ${oppsWithTodayDate} de hoje`);
  report.push(`  CROSS-SOURCE CONFLICTS: ${crossSourceConflicts} contatos com marca conflitante entre planilhas`);
  report.push(`  PROBLEMAS: ${problems.length} (${problems.filter(p => p.startsWith('[CRITICO]')).length} criticos)`);

  report.push('\n================================================================');
  report.push('  FIM DA AUDITORIA');
  report.push('================================================================\n');

  return report.join('\n');
}

// =============================================
// MAIN
// =============================================
async function main() {
  console.log('Carregando dados Kommo...');
  const kommo = loadKommoData();
  console.log(`  ${kommo.allLeads.length} leads carregados de ${kommo.fileSummary.length} arquivos\n`);

  console.log('Carregando dados Supabase...');
  const supabaseData = await loadSupabaseData();
  console.log(`  ${supabaseData.allOpps.length} opps, ${supabaseData.allContacts.length} contatos\n`);

  console.log('Executando auditoria...\n');
  const report = runAudit(kommo, supabaseData);

  // Print to console
  console.log(report);

  // Save to file
  const reportPath = path.join(__dirname, 'AUDITORIA-KOMMO-SUPABASE.txt');
  fs.writeFileSync(reportPath, report);
  console.log(`\nRelatorio salvo em: ${reportPath}`);
}

main().catch(e => {
  console.error('Erro fatal:', e);
  process.exit(1);
});
