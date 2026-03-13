import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  { file: 'kommo.xlsx', source: 'mateus', label: 'Funil de Vendas Mateus' },
  { file: 'kommo2.xlsx', source: 'cyb', label: 'Funil de Vendas CybNutri' },
  { file: 'kommo3.xlsx', source: 'sdr', label: 'SDR - Setor de Qualificação' },
  { file: 'kommo4.xlsx', source: 'social', label: 'Social Selling - IG Mateus' },
  { file: 'kommo5.xlsx', source: 'mateus_novo', label: 'NOVO - Funil de Vendas Mateus' },
  { file: 'kommo6.xlsx', source: 'cyb_formacao', label: 'NOVO - Funil de Vendas Formação' },
];

const allData = [];
const perSource = {};

for (const { file, source, label } of files) {
  const wb = XLSX.readFile(path.join(__dirname, file), { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
  perSource[source] = { data, label, file };
  data.forEach(r => allData.push({ row: r, source }));
}

// Helper
function hasContact(r) {
  const phone = r['Celular (contato)'] || r['Telefone comercial (contato)'] || r['Tel. direto com. (contato)'] || r['Outro telefone (contato)'] || '';
  const email = r['Email comercial (contato)'] || r['Email pessoal (contato)'] || '';
  return !!(phone.trim() || email.trim());
}

const report = {};

// === PER SOURCE DETAILED ===
for (const [src, { data, label }] of Object.entries(perSource)) {
  const migraveis = data.filter(hasContact);
  const pulados = data.filter(r => !hasContact(r));

  // Etapas
  const etapas = {};
  data.forEach(r => { const e = r['Etapa do lead'] || '(vazio)'; etapas[e] = (etapas[e] || 0) + 1; });

  // Etapas migraveis
  const etapasMig = {};
  migraveis.forEach(r => { const e = r['Etapa do lead'] || '(vazio)'; etapasMig[e] = (etapasMig[e] || 0) + 1; });

  // Users
  const users = {};
  data.forEach(r => { const u = r['Lead usuário responsável'] || '(sem atribuição)'; users[u] = (users[u] || 0) + 1; });

  const usersMig = {};
  migraveis.forEach(r => { const u = r['Lead usuário responsável'] || '(sem atribuição)'; usersMig[u] = (usersMig[u] || 0) + 1; });

  // Tags
  const tags = {};
  data.forEach(r => {
    const t = r['Lead tags'];
    if (t) t.split(',').map(x => x.trim()).filter(Boolean).forEach(tag => { tags[tag] = (tags[tag] || 0) + 1; });
  });
  const tagsMig = {};
  migraveis.forEach(r => {
    const t = r['Lead tags'];
    if (t) t.split(',').map(x => x.trim()).filter(Boolean).forEach(tag => { tagsMig[tag] = (tagsMig[tag] || 0) + 1; });
  });

  // Produtos
  const prods = {};
  data.forEach(r => { const p = r['Produto Desejado']; if (p && p.trim()) prods[p.trim()] = (prods[p.trim()] || 0) + 1; });

  // Origens
  const origens = {};
  data.forEach(r => { const o = r['Origem']; if (o && o.trim()) origens[o.trim()] = (origens[o.trim()] || 0) + 1; });

  // Vendas
  const vendas = data.filter(r => r['Venda'] && parseFloat(r['Venda']) > 0);
  const totalVenda = vendas.reduce((s, r) => s + parseFloat(r['Venda']), 0);
  const vendasMig = migraveis.filter(r => r['Venda'] && parseFloat(r['Venda']) > 0);
  const totalVendaMig = vendasMig.reduce((s, r) => s + parseFloat(r['Venda']), 0);

  // Cobertura
  const hasPhone = data.filter(r => r['Celular (contato)'] || r['Telefone comercial (contato)'] || r['Tel. direto com. (contato)'] || r['Outro telefone (contato)']).length;
  const hasEmail = data.filter(r => r['Email comercial (contato)'] || r['Email pessoal (contato)']).length;
  const hasName = data.filter(r => r['Contato principal'] && r['Contato principal'].trim()).length;

  // Dates
  const dates = data.map(r => r['Data Criada']).filter(Boolean).map(d => new Date(d)).filter(d => !isNaN(d));
  dates.sort((a, b) => a - b);

  report[src] = {
    label, total: data.length, migraveis: migraveis.length, pulados: pulados.length,
    etapas, etapasMig, users, usersMig, tags, tagsMig, prods, origens,
    vendas: vendas.length, totalVenda, vendasMig: vendasMig.length, totalVendaMig,
    hasPhone, hasEmail, hasName,
    dateFrom: dates[0]?.toISOString().split('T')[0] || '-',
    dateTo: dates[dates.length-1]?.toISOString().split('T')[0] || '-',
  };
}

// === GLOBAL TOTALS ===
const totalLeads = allData.length;
const totalMigraveis = allData.filter(d => hasContact(d.row)).length;
const totalPulados = totalLeads - totalMigraveis;
const totalVendas = allData.filter(d => d.row['Venda'] && parseFloat(d.row['Venda']) > 0);
const totalReceita = totalVendas.reduce((s, d) => s + parseFloat(d.row['Venda']), 0);
const vendasMigTotal = allData.filter(d => hasContact(d.row) && d.row['Venda'] && parseFloat(d.row['Venda']) > 0);
const receitaMigTotal = vendasMigTotal.reduce((s, d) => s + parseFloat(d.row['Venda']), 0);

// All tags globally
const allTags = {};
allData.forEach(d => {
  const t = d.row['Lead tags'];
  if (t) t.split(',').map(x => x.trim()).filter(Boolean).forEach(tag => { allTags[tag] = (allTags[tag] || 0) + 1; });
});

// All users globally
const allUsers = {};
allData.forEach(d => { const u = d.row['Lead usuário responsável'] || '(sem atribuição)'; allUsers[u] = (allUsers[u] || 0) + 1; });

// All products globally
const allProds = {};
allData.forEach(d => { const p = d.row['Produto Desejado']; if (p && p.trim()) allProds[p.trim()] = (allProds[p.trim()] || 0) + 1; });

// All origins
const allOrigens = {};
allData.forEach(d => { const o = d.row['Origem']; if (o && o.trim()) allOrigens[o.trim()] = (allOrigens[o.trim()] || 0) + 1; });

// Output as JSON for the report builder
console.log(JSON.stringify({ report, totalLeads, totalMigraveis, totalPulados, totalVendas: totalVendas.length, totalReceita, vendasMigTotal: vendasMigTotal.length, receitaMigTotal, allTags, allUsers, allProds, allOrigens }, null, 2));
