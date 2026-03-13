import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  { file: 'kommo.xlsx', name: 'Mateus' },
  { file: 'kommo2.xlsx', name: 'CybNutri' },
  { file: 'kommo3.xlsx', name: 'SDR' },
  { file: 'kommo4.xlsx', name: 'Social IG' },
  { file: 'kommo5.xlsx', name: 'Mateus Novo' },
  { file: 'kommo6.xlsx', name: 'CybNutri Formacao' },
];

for (const { file, name } of files) {
  const wb = XLSX.readFile(path.join(__dirname, file), { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });

  const semContato = data.filter(r => {
    const phone = r['Celular (contato)'] || r['Telefone comercial (contato)'] || r['Tel. direto com. (contato)'] || r['Outro telefone (contato)'] || '';
    const email = r['Email comercial (contato)'] || r['Email pessoal (contato)'] || '';
    return !phone.trim() && !email.trim();
  });

  console.log(`${name}: ${semContato.length}/${data.length} sem telefone/email`);
  if (semContato.length > 0) {
    console.log(`  Amostra:`);
    semContato.slice(0, 3).forEach(r => {
      console.log(`    ${r['Contato principal'] || '(sem nome)'} | etapa: ${r['Etapa do lead'] || '-'}`);
    });
  }
}
