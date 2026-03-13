import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wb = XLSX.readFile(path.join(__dirname, 'kommo.xlsx'), { cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });

// Analyze "Etapa de leads de entrada" (4914) and "BASE FRIA" (500)
const entrada = data.filter(r => r['Etapa do lead'] === 'Etapa de leads de entrada');
const baseFria = data.filter(r => r['Etapa do lead'] === 'BASE FRIA');
const ativos = data.filter(r => !['Etapa de leads de entrada', 'BASE FRIA'].includes(r['Etapa do lead']));

function analyzeGroup(name, rows) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${name} — ${rows.length} leads`);
  console.log('='.repeat(60));

  // Tags
  const tags = {};
  rows.forEach(r => {
    const t = r['Lead tags'];
    if (t) t.split(',').map(x => x.trim()).filter(Boolean).forEach(tag => { tags[tag] = (tags[tag] || 0) + 1; });
  });
  const taggedCount = rows.filter(r => r['Lead tags'] && r['Lead tags'].trim()).length;
  console.log(`\nTags: ${taggedCount}/${rows.length} leads com tags`);
  Object.entries(tags).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log(`  ${t}: ${c}`));

  // Produto Desejado
  const prods = {};
  rows.forEach(r => {
    const p = r['Produto Desejado'];
    if (p && p.trim()) { prods[p.trim()] = (prods[p.trim()] || 0) + 1; }
  });
  const prodCount = rows.filter(r => r['Produto Desejado'] && r['Produto Desejado'].trim()).length;
  console.log(`\nProduto Desejado: ${prodCount}/${rows.length} preenchido`);
  Object.entries(prods).sort((a, b) => b[1] - a[1]).forEach(([p, c]) => console.log(`  ${p}: ${c}`));

  // Origem
  const origens = {};
  rows.forEach(r => {
    const o = r['Origem'];
    if (o && o.trim()) { origens[o.trim()] = (origens[o.trim()] || 0) + 1; }
  });
  const origemCount = rows.filter(r => r['Origem'] && r['Origem'].trim()).length;
  console.log(`\nOrigem: ${origemCount}/${rows.length} preenchido`);
  Object.entries(origens).sort((a, b) => b[1] - a[1]).forEach(([o, c]) => console.log(`  ${o}: ${c}`));

  // Responsavel
  const users = {};
  rows.forEach(r => { const u = r['Lead usuário responsável'] || '(vazio)'; users[u] = (users[u] || 0) + 1; });
  console.log(`\nResponsavel:`);
  Object.entries(users).sort((a, b) => b[1] - a[1]).forEach(([u, c]) => console.log(`  ${u}: ${c}`));

  // Vendas
  const vendas = rows.filter(r => r['Venda'] && parseFloat(r['Venda']) > 0);
  const totalVenda = vendas.reduce((s, r) => s + parseFloat(r['Venda']), 0);
  console.log(`\nVendas: ${vendas.length} leads — R$ ${totalVenda.toFixed(2)}`);

  // Has phone?
  const hasPhone = rows.filter(r => r['Celular (contato)'] || r['Telefone comercial (contato)'] || r['Tel. direto com. (contato)']).length;
  const hasName = rows.filter(r => r['Contato principal'] && r['Contato principal'].trim()).length;
  console.log(`\nCobertura: nome ${hasName}/${rows.length} | telefone ${hasPhone}/${rows.length}`);

  // Sample names (first 10)
  console.log(`\nAmostra nomes (10 primeiros):`);
  rows.slice(0, 10).forEach(r => {
    const name = r['Contato principal'] || '(sem nome)';
    const phone = r['Celular (contato)'] || r['Telefone comercial (contato)'] || '(sem tel)';
    const tag = r['Lead tags'] || '';
    const prod = r['Produto Desejado'] || '';
    const origem = r['Origem'] || '';
    console.log(`  ${name} | ${phone} | tags: ${tag} | prod: ${prod} | origem: ${origem}`);
  });
}

analyzeGroup('ETAPA DE LEADS DE ENTRADA', entrada);
analyzeGroup('BASE FRIA', baseFria);
analyzeGroup('LEADS ATIVOS (Contato/Qualif/Diag/Apres/Negoc)', ativos);
