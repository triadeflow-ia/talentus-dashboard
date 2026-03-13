import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wb = XLSX.readFile(path.join(__dirname, 'kommo5.xlsx'), { cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });

console.log('TOTAL LEADS:', data.length);

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

const users = {};
data.forEach(r => { const u = r['Lead usuário responsável'] || '(vazio)'; users[u] = (users[u] || 0) + 1; });
console.log('\n=== USUARIOS ===');
Object.entries(users).sort((a, b) => b[1] - a[1]).forEach(([u, c]) => console.log(`  ${u}: ${c}`));

const tags = {};
data.forEach(r => {
  const t = r['Lead tags'];
  if (t) t.split(',').map(x => x.trim()).filter(Boolean).forEach(tag => { tags[tag] = (tags[tag] || 0) + 1; });
});
console.log('\n=== TAGS ===');
Object.entries(tags).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log(`  ${t}: ${c}`));

const prods = {};
data.forEach(r => {
  const p = r['Produto Desejado'];
  if (p && p.trim()) { prods[p.trim()] = (prods[p.trim()] || 0) + 1; }
});
console.log('\n=== PRODUTO DESEJADO ===');
Object.entries(prods).sort((a, b) => b[1] - a[1]).forEach(([p, c]) => console.log(`  ${p}: ${c}`));

const origens = {};
data.forEach(r => {
  const o = r['Origem'];
  if (o && o.trim()) { origens[o.trim()] = (origens[o.trim()] || 0) + 1; }
});
console.log('\n=== ORIGEM ===');
Object.entries(origens).sort((a, b) => b[1] - a[1]).forEach(([o, c]) => console.log(`  ${o}: ${c}`));

const vendas = data.filter(r => r['Venda'] && parseFloat(r['Venda']) > 0);
const totalVenda = vendas.reduce((s, r) => s + parseFloat(r['Venda']), 0);
console.log(`\n=== VENDAS === ${vendas.length} leads — R$ ${totalVenda.toFixed(2)}`);

const hasPhone = data.filter(r => r['Celular (contato)'] || r['Telefone comercial (contato)'] || r['Tel. direto com. (contato)']).length;
const hasEmail = data.filter(r => r['Email comercial (contato)'] || r['Email pessoal (contato)']).length;
const hasName = data.filter(r => r['Contato principal'] && r['Contato principal'].trim()).length;
console.log(`\n=== COBERTURA === nome ${hasName}/${data.length} | telefone ${hasPhone}/${data.length} | email ${hasEmail}/${data.length}`);
