import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wb = XLSX.readFile(path.join(__dirname, 'kommo.xlsx'), { cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });

console.log('TOTAL LEADS:', data.length);

// 1. Pipelines + Stages
const pipelines = {};
data.forEach(r => {
  const p = r['Funil de vendas'] || '(vazio)';
  const s = r['Etapa do lead'] || '(vazio)';
  if (!pipelines[p]) pipelines[p] = {};
  pipelines[p][s] = (pipelines[p][s] || 0) + 1;
});
console.log('\n=== PIPELINES + ETAPAS ===');
Object.entries(pipelines).forEach(([p, stages]) => {
  const total = Object.values(stages).reduce((a, b) => a + b, 0);
  console.log(`\n[${p}] — ${total} leads`);
  Object.entries(stages).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => console.log(`  ${s}: ${c}`));
});

// 2. Users
const users = {};
data.forEach(r => { const u = r['Lead usuário responsável'] || '(vazio)'; users[u] = (users[u] || 0) + 1; });
console.log('\n=== USUARIOS RESPONSAVEIS ===');
Object.entries(users).sort((a, b) => b[1] - a[1]).forEach(([u, c]) => console.log(`  ${u}: ${c}`));

// 3. Tags
const tags = {};
data.forEach(r => {
  const t = r['Lead tags'];
  if (t) t.split(',').map(x => x.trim()).filter(Boolean).forEach(tag => { tags[tag] = (tags[tag] || 0) + 1; });
});
console.log('\n=== TAGS (TOP 40) ===');
Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([t, c]) => console.log(`  ${t}: ${c}`));
console.log(`  ... total tags distintas: ${Object.keys(tags).length}`);

// 4. Custom fields usage
const customFields = [
  'Produto Desejado', 'Faturamento Mês', 'Origem', 'Tipo', 'Status',
  'Método de Pagamento', 'Nome do Produto', 'Cod do Produto', 'Cod Venda',
  'Cod da Oferta', 'Link Pagamento', 'Nome do Afiliado',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'CPF/CNPJ (contato)', 'Instagram (contato)', 'Faturamento por Mês (contato)',
  'Área Profissional (contato)', 'Comprometimento (contato)',
];
console.log('\n=== CAMPOS CUSTOM — USO ===');
customFields.forEach(field => {
  const filled = data.filter(r => r[field] && String(r[field]).trim() !== '').length;
  const pct = ((filled / data.length) * 100).toFixed(1);
  if (filled > 0) {
    // Show top values
    const vals = {};
    data.forEach(r => {
      const v = r[field];
      if (v && String(v).trim()) { const k = String(v).trim().substring(0, 50); vals[k] = (vals[k] || 0) + 1; }
    });
    const topVals = Object.entries(vals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v, c]) => `${v}(${c})`).join(', ');
    console.log(`  ${field}: ${filled}/${data.length} (${pct}%) — ${topVals}`);
  } else {
    console.log(`  ${field}: VAZIO`);
  }
});

// 5. Venda (monetary)
const vendas = data.filter(r => r['Venda'] && parseFloat(r['Venda']) > 0);
const totalVenda = vendas.reduce((s, r) => s + parseFloat(r['Venda']), 0);
console.log(`\n=== VENDAS ===`);
console.log(`  Leads com valor: ${vendas.length}`);
console.log(`  Total: R$ ${totalVenda.toFixed(2)}`);
if (vendas.length > 0) console.log(`  Ticket medio: R$ ${(totalVenda / vendas.length).toFixed(2)}`);

// 6. Contact info coverage
const hasPhone = data.filter(r => r['Celular (contato)'] || r['Telefone comercial (contato)'] || r['Tel. direto com. (contato)'] || r['Telefone residencial (contato)'] || r['Outro telefone (contato)']).length;
const hasEmail = data.filter(r => r['Email comercial (contato)'] || r['Email pessoal (contato)'] || r['Outro email (contato)']).length;
const hasName = data.filter(r => r['Contato principal']).length;
console.log(`\n=== COBERTURA CONTATO ===`);
console.log(`  Com nome: ${hasName}/${data.length} (${((hasName/data.length)*100).toFixed(1)}%)`);
console.log(`  Com telefone: ${hasPhone}/${data.length} (${((hasPhone/data.length)*100).toFixed(1)}%)`);
console.log(`  Com email: ${hasEmail}/${data.length} (${((hasEmail/data.length)*100).toFixed(1)}%)`);

// 7. Dates range
const dates = data.map(r => r['Data Criada']).filter(Boolean).map(d => new Date(d)).filter(d => !isNaN(d));
if (dates.length > 0) {
  dates.sort((a, b) => a - b);
  console.log(`\n=== PERIODO ===`);
  console.log(`  De: ${dates[0].toISOString().split('T')[0]}`);
  console.log(`  Ate: ${dates[dates.length - 1].toISOString().split('T')[0]}`);
}
