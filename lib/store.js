const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
function createStore(dir) {
  const directory = path.resolve(dir);
  const file = path.join(directory, 'leads.json');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  function read() {
    let source;
    try { source = fs.readFileSync(file, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
    try {
      const data = JSON.parse(source);
      if (!Array.isArray(data) || data.some(l => !l || typeof l !== 'object' || Array.isArray(l))) throw new Error('Formato inválido');
      return data;
    } catch {
      const e = new Error('O arquivo de leads precisa de revisão. Nenhum dado foi sobrescrito. Restaure um backup antes de continuar.');
      e.code = 'DATA_CORRUPT'; throw e;
    }
  }
  function write(data) {
    // Uma leitura válida é obrigatória antes de substituir um arquivo existente.
    read();
    const tmp = file + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
    try {
      if (fs.existsSync(file)) {
        const backupDir = path.join(directory, 'backups');
        fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
        const daily = path.join(backupDir, new Date().toISOString().slice(0,10) + '.json');
        if (!fs.existsSync(daily)) fs.copyFileSync(file, daily);
        const old = fs.readdirSync(backupDir).filter(n => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
        for (const name of old.slice(0, Math.max(0, old.length - 30))) fs.unlinkSync(path.join(backupDir, name));
        fs.copyFileSync(file, file + '.bak');
      }
      const fd = fs.openSync(tmp, 'wx', 0o600);
      try { fs.writeFileSync(fd, JSON.stringify(data, null, 2)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      fs.renameSync(tmp, file);
    } finally { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); }
  }
  function update(fn) { const data = read(); const result = fn(data); write(data); return result; }
  return { read, write, update, directory, file };
}
module.exports = { createStore };
