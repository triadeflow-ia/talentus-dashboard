/**
 * Fix Kommo Dates — Update Supabase opportunities with original Kommo creation dates
 *
 * The GHL migration created all leads with today's date. This script reads the
 * Kommo xlsx files, matches leads by phone/email with Supabase contacts, and
 * updates the opportunities' created_at with the original "Data Criada" from Kommo.
 *
 * Usage: node fix-kommo-dates.js [--dry-run]
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
const isDryRun = process.argv.includes('--dry-run');

// =============================================
// Parse Kommo date format: "DD.MM.YYYY HH:MM:SS"
// =============================================
function parseKommoDate(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  // Format: DD.MM.YYYY HH:MM:SS
  const match = str.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [, dd, mm, yyyy, hh, mi, ss] = match;
    return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}-03:00`).toISOString(); // BRT
  }
  // Fallback: try Date.parse
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// =============================================
// Normalize phone for matching
// =============================================
function normalizePhone(raw) {
  if (!raw) return null;
  let p = String(raw).replace(/^'+/, '').replace(/[^\d]/g, '');
  if (!p || p.length < 8) return null;
  // Remove country code prefix for matching
  if (p.startsWith('55') && p.length >= 12) p = p.substring(2);
  // Keep last 11 digits (DDD + number)
  if (p.length > 11) p = p.slice(-11);
  return p;
}

function normalizeEmail(raw) {
  if (!raw) return null;
  const e = String(raw).trim().toLowerCase();
  return e.includes('@') ? e : null;
}

// =============================================
// Load all Kommo data with dates
// =============================================
function loadKommoData() {
  const files = [
    { file: 'kommo.xlsx', source: 'mateus' },
    { file: 'kommo2.xlsx', source: 'cyb' },
    { file: 'kommo3.xlsx', source: 'sdr' },
    { file: 'kommo4.xlsx', source: 'social' },
    { file: 'kommo5.xlsx', source: 'mateus_novo' },
    { file: 'kommo6.xlsx', source: 'cyb_formacao' },
  ];

  const leads = [];

  for (const { file, source } of files) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.log(`  Skip: ${file} not found`);
      continue;
    }
    const wb = XLSX.readFile(filePath, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });

    let withDate = 0;
    for (const row of data) {
      const dataCriada = parseKommoDate(row['Data Criada']);
      const fechadaEm = parseKommoDate(row['Fechada em']);
      if (!dataCriada) continue;

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

      if (phones.length === 0 && emails.length === 0) continue;

      leads.push({
        name: row['Contato principal'] || row['Lead titulo'] || null,
        phones,
        emails,
        dataCriada,
        fechadaEm,
        source,
      });
      withDate++;
    }
    console.log(`  ${file}: ${data.length} rows, ${withDate} with date + contact info`);
  }

  return leads;
}

// =============================================
// Load Supabase contacts and build phone/email index
// =============================================
async function loadSupabaseContacts() {
  console.log('\nLoading Supabase contacts...');
  const allContacts = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, phone, email, name')
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('  Error fetching contacts:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allContacts.push(...data);
    offset += limit;
    if (data.length < limit) break;
  }

  console.log(`  Loaded ${allContacts.length} contacts`);

  // Build indexes
  const phoneIndex = {}; // normalized phone → contact_id
  const emailIndex = {}; // email → contact_id

  for (const c of allContacts) {
    const np = normalizePhone(c.phone);
    if (np) phoneIndex[np] = c.id;
    const ne = normalizeEmail(c.email);
    if (ne) emailIndex[ne] = c.id;
  }

  console.log(`  Phone index: ${Object.keys(phoneIndex).length} | Email index: ${Object.keys(emailIndex).length}`);
  return { phoneIndex, emailIndex };
}

// =============================================
// Match Kommo leads to Supabase contact IDs
// =============================================
function matchLeads(leads, phoneIndex, emailIndex) {
  let matched = 0;
  let unmatched = 0;

  const results = []; // { contactId, dataCriada, fechadaEm }

  for (const lead of leads) {
    let contactId = null;

    // Try phone match first (most reliable)
    for (const phone of lead.phones) {
      if (phoneIndex[phone]) {
        contactId = phoneIndex[phone];
        break;
      }
    }

    // Fallback to email
    if (!contactId) {
      for (const email of lead.emails) {
        if (emailIndex[email]) {
          contactId = emailIndex[email];
          break;
        }
      }
    }

    if (contactId) {
      results.push({
        contactId,
        dataCriada: lead.dataCriada,
        fechadaEm: lead.fechadaEm,
      });
      matched++;
    } else {
      unmatched++;
    }
  }

  console.log(`\nMatching: ${matched} matched, ${unmatched} unmatched`);
  return results;
}

// =============================================
// Update Supabase opportunities with Kommo dates
// =============================================
async function updateDates(matches) {
  console.log(`\nUpdating ${matches.length} opportunities in Supabase...`);

  let updated = 0;
  let errors = 0;
  let noOpp = 0;

  // Group by contactId (one contact can have multiple opps — use earliest date)
  const contactDates = {};
  for (const m of matches) {
    if (!contactDates[m.contactId] || m.dataCriada < contactDates[m.contactId].dataCriada) {
      contactDates[m.contactId] = m;
    }
  }

  const contactIds = Object.keys(contactDates);
  console.log(`  Unique contacts: ${contactIds.length}`);

  // Process in batches of 50
  for (let i = 0; i < contactIds.length; i += 50) {
    const batch = contactIds.slice(i, i + 50);

    if (i % 500 === 0) {
      console.log(`  Progress: ${i}/${contactIds.length} (updated: ${updated}, no-opp: ${noOpp}, errors: ${errors})`);
    }

    // Get all opportunities for these contacts
    const { data: opps, error } = await supabase
      .from('opportunities')
      .select('id, contact_id, created_at')
      .in('contact_id', batch);

    if (error) {
      console.error(`  Batch error: ${error.message}`);
      errors += batch.length;
      continue;
    }

    if (!opps || opps.length === 0) {
      noOpp += batch.length;
      continue;
    }

    // Update each opportunity
    for (const opp of opps) {
      const match = contactDates[opp.contact_id];
      if (!match) continue;

      if (isDryRun) {
        updated++;
        continue;
      }

      const updateData = { created_at: match.dataCriada };
      if (match.fechadaEm) updateData.updated_at = match.fechadaEm;

      const { error: updateError } = await supabase
        .from('opportunities')
        .update(updateData)
        .eq('id', opp.id);

      if (updateError) {
        errors++;
        if (errors <= 10) console.error(`  Update error: ${updateError.message}`);
      } else {
        updated++;
      }
    }
  }

  return { updated, errors, noOpp };
}

// =============================================
// Also update contact created_at
// =============================================
async function updateContactDates(matches) {
  console.log('\nUpdating contact dates...');
  let updated = 0;

  // Group by contactId (earliest date)
  const contactDates = {};
  for (const m of matches) {
    if (!contactDates[m.contactId] || m.dataCriada < contactDates[m.contactId]) {
      contactDates[m.contactId] = m.dataCriada;
    }
  }

  const entries = Object.entries(contactDates);
  for (let i = 0; i < entries.length; i += 50) {
    const batch = entries.slice(i, i + 50);

    if (i % 500 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${entries.length}`);
    }

    for (const [contactId, dataCriada] of batch) {
      if (isDryRun) { updated++; continue; }

      const { error } = await supabase
        .from('contacts')
        .update({ created_at: dataCriada })
        .eq('id', contactId);

      if (!error) updated++;
    }
  }

  return updated;
}

// =============================================
// MAIN
// =============================================
async function main() {
  console.log('=== Fix Kommo Dates ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  // Step 1: Load Kommo data
  console.log('Step 1: Loading Kommo xlsx files...');
  const leads = loadKommoData();
  console.log(`  Total leads with dates: ${leads.length}`);

  // Step 2: Load Supabase contacts
  const { phoneIndex, emailIndex } = await loadSupabaseContacts();

  // Step 3: Match
  console.log('\nStep 3: Matching leads to contacts...');
  const matches = matchLeads(leads, phoneIndex, emailIndex);

  if (matches.length === 0) {
    console.log('\nNo matches found. Sync may need to complete first.');
    return;
  }

  // Step 4: Update opportunity dates
  console.log('\nStep 4: Updating opportunity dates...');
  const { updated, errors, noOpp } = await updateDates(matches);
  console.log(`\n  Opportunities updated: ${updated}`);
  console.log(`  No opportunity found: ${noOpp}`);
  console.log(`  Errors: ${errors}`);

  // Step 5: Update contact dates
  const contactsUpdated = await updateContactDates(matches);
  console.log(`  Contacts updated: ${contactsUpdated}`);

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`  Kommo leads with dates: ${leads.length}`);
  console.log(`  Matched to Supabase: ${matches.length}`);
  console.log(`  Opps updated: ${updated}`);
  console.log(`  Contacts updated: ${contactsUpdated}`);
  console.log(`  Errors: ${errors}`);
  if (isDryRun) console.log('\n  [DRY RUN — no changes made]');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
