import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = ['kommo3.xlsx'];

for (const file of files) {
  console.log(`\n${'#'.repeat(70)}`);
  console.log(`# FILE: ${file}`);
  console.log(`${'#'.repeat(70)}`);

  const wb = XLSX.readFile(path.join(__dirname, file), { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });

  console.log(`\nSHEET: ${wb.SheetNames[0]} | ROWS: ${data.length} | COLUMNS: ${Object.keys(data[0] || {}).length}`);

  // Columns
  console.log('\nCOLUMNS:');
  Object.keys(data[0] || {}).forEach((col, i) => console.log(`  ${i + 1}. ${col}`));

  // Pipelines + Stages
  const pipelines = {};
  data.forEach(r => {
    const p = r['Funil de vendas'] || '(vazio)';
    const s = r['Etapa do lead'] || '(vazio)';
    if (!pipelines[p]) pipelines[p] = {};
    pipelines[p][s] = (pipelines[p][s] || 0) + 1;
  });
  console.log('\nPIPELINES + ETAPAS:');
  Object.entries(pipelines).forEach(([p, stages]) => {
    const total = Object.values(stages).reduce((a, b) => a + b, 0);
    console.log(`\n  [${p}] — ${total} leads`);
    Object.entries(stages).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => console.log(`    ${s}: ${c}`));
  });

  // Users
  const users = {};
  data.forEach(r => { const u = r['Lead usuário responsável'] || '(vazio)'; users[u] = (users[u] || 0) + 1; });
  console.log('\nUSUARIOS:');
  Object.entries(users).sort((a, b) => b[1] - a[1]).forEach(([u, c]) => console.log(`  ${u}: ${c}`));

  // Tags
  const tags = {};
  data.forEach(r => {
    const t = r['Lead tags'];
    if (t) t.split(',').map(x => x.trim()).filter(Boolean).forEach(tag => { tags[tag] = (tags[tag] || 0) + 1; });
  });
  const taggedCount = data.filter(r => r['Lead tags'] && r['Lead tags'].trim()).length;
  console.log(`\nTAGS: ${taggedCount}/${data.length} leads com tags (${Object.keys(tags).length} distintas)`);
  Object.entries(tags).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log(`  ${t}: ${c}`));

  // Custom fields usage
  const customCols = Object.keys(data[0] || {}).filter(k =>
    !['ID', 'Lead título', 'Empresa lead \'s', 'Contato principal', 'Empresa do contato',
     'Lead usuário responsável', 'Etapa do lead', 'Funil de vendas', 'Venda', 'Data Criada',
     'Criado por', 'Última modificação', 'Modificado por', 'Lead tags', 'Próxima tarefa',
     'Fechada em', 'Posição (contato)', 'Cidade (contato)'].includes(k)
    && !k.startsWith('Email') && !k.startsWith('Telefone') && !k.startsWith('Tel.')
    && !k.startsWith('Celular') && !k.startsWith('Faz ') && !k.startsWith('Outro')
    && !k.startsWith('Nota ')
  );
  console.log('\nCAMPOS CUSTOM COM DADOS:');
  for (const field of customCols) {
    const filled = data.filter(r => r[field] && String(r[field]).trim() !== '').length;
    if (filled > 0) {
      const vals = {};
      data.forEach(r => {
        const v = r[field];
        if (v && String(v).trim()) { const k = String(v).trim().substring(0, 60); vals[k] = (vals[k] || 0) + 1; }
      });
      const topVals = Object.entries(vals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v, c]) => `${v}(${c})`).join(', ');
      console.log(`  ${field}: ${filled}/${data.length} — ${topVals}`);
    }
  }

  // Vendas
  const vendas = data.filter(r => r['Venda'] && parseFloat(r['Venda']) > 0);
  const totalVenda = vendas.reduce((s, r) => s + parseFloat(r['Venda']), 0);
  console.log(`\nVENDAS: ${vendas.length} leads — R$ ${totalVenda.toFixed(2)}`);

  // Coverage
  const hasPhone = data.filter(r => r['Celular (contato)'] || r['Telefone comercial (contato)'] || r['Tel. direto com. (contato)']).length;
  const hasName = data.filter(r => r['Contato principal'] && r['Contato principal'].trim()).length;
  const hasEmail = data.filter(r => r['Email comercial (contato)'] || r['Email pessoal (contato)']).length;
  console.log(`\nCOBERTURA: nome ${hasName}/${data.length} | tel ${hasPhone}/${data.length} | email ${hasEmail}/${data.length}`);

  // Date range
  const dates = data.map(r => r['Data Criada']).filter(Boolean).map(d => new Date(d)).filter(d => !isNaN(d));
  if (dates.length > 0) {
    dates.sort((a, b) => a - b);
    console.log(`PERIODO: ${dates[0].toISOString().split('T')[0]} → ${dates[dates.length - 1].toISOString().split('T')[0]}`);
  }
}
