const fs = require('node:fs');
const path = require('node:path');
const { createPostgresStore } = require('../lib/postgres-store');
(async () => {
  const env = path.join(__dirname,'../.env');
  if (fs.existsSync(env) && process.loadEnvFile) process.loadEnvFile(env);
  const file = process.argv[2];
  if (!file || !process.argv.includes('--confirmar')) throw new Error('Uso: node scripts/restore-backup.js arquivo.json --confirmar. A operação substitui a base atual.');
  const data = JSON.parse(fs.readFileSync(file,'utf8'));
  if (!Array.isArray(data) || data.some(l=>!l||typeof l!=='object'||Array.isArray(l))) throw new Error('Backup inválido. Use o JSON exportado pelo painel.');
  const store = createPostgresStore(process.env.DATABASE_URL);
  try { await store.ready; await store.write(data); console.log('Backup restaurado:',data.length,'registros.'); }
  finally { await store.close(); }
})().catch(error => { console.error('Restauração não concluída. Confira os argumentos, o arquivo e a conexão do banco.',error.code||error.name); process.exitCode=1; });
