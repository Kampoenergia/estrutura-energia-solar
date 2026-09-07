// Armazenamento temporário: não usa arquivos, banco externo ou backups automáticos.
function createMemoryStore() {
  let records = [], queue = Promise.resolve();
  const clone = value => structuredClone(value);
  function validate(data) {
    if (!Array.isArray(data) || data.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
      throw Object.assign(new Error('Dados de contato inválidos. A alteração não foi aplicada.'), { code: 'DATA_CORRUPT' });
    }
  }
  function read() { return clone(records); }
  function update(fn) {
    const operation = queue.then(async () => {
      const next = clone(records), result = await fn(next);
      validate(next); records = clone(next); return clone(result);
    });
    queue = operation.catch(() => {});
    return operation;
  }
  function write(data) {
    validate(data); const copy = clone(data);
    return update(next => { next.length = 0; for (const item of copy) next.push(item); });
  }
  return { kind: 'memory', read, write, update };
}
module.exports = { createMemoryStore };
