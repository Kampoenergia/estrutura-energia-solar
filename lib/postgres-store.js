const { Pool } = require('pg');

function corrupt() {
  const error = new Error('A base precisa de revisão. Nenhum dado foi sobrescrito. Restaure um backup antes de continuar.');
  error.code = 'DATA_CORRUPT'; return error;
}
function validate(data) {
  if (!Array.isArray(data) || data.some(item => !item || typeof item !== 'object' || Array.isArray(item))) throw corrupt();
  return data;
}
function createPostgresStore(connectionString, options = {}) {
  if (!options.pool) {
    if (!connectionString) throw new Error('Configure DATABASE_URL no ambiente da hospedagem. Não coloque a senha no código.');
    let url; try { url = new URL(connectionString); } catch { throw new Error('DATABASE_URL inválida.'); }
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL deve ser uma conexão PostgreSQL.');
    // Usar TLS com validação do certificado, sem opções que a enfraqueçam na URL.
    for (const key of ['sslmode','sslcert','sslkey','sslrootcert','ssl','uselibpqcompat']) url.searchParams.delete(key);
    connectionString = url.toString();
  }
  const pool = options.pool || new Pool({ connectionString, ssl: { rejectUnauthorized: true }, enableChannelBinding: true, max: 3, connectionTimeoutMillis: 15000, idleTimeoutMillis: 10000, statement_timeout: 20000, application_name: 'estrutura-solar' });
  pool.on?.('error', () => { console.error('[Estrutura Solar] Conexão ociosa do banco encerrada; nova conexão será tentada quando necessário.'); });

  const ready = (async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`CREATE TABLE IF NOT EXISTS estrutura_solar_state (
        key text PRIMARY KEY,
        payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'array'),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
      await client.query(`CREATE TABLE IF NOT EXISTS estrutura_solar_backups (
        day date PRIMARY KEY,
        payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'array'),
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
      const existing = await client.query("SELECT payload FROM estrutura_solar_state WHERE key = 'leads'");
      if (!existing.rows.length) {
        const old = await client.query("SELECT 1 FROM estrutura_solar_state UNION ALL SELECT 1 FROM estrutura_solar_backups LIMIT 1");
        if (old.rows.length) throw corrupt();
        await client.query("INSERT INTO estrutura_solar_state (key,payload) VALUES ('leads','[]'::jsonb) ON CONFLICT (key) DO NOTHING");
      } else validate(existing.rows[0].payload);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  })();
  // Mantém o erro disponível para ready/read/update, sem rejeição não observada.
  ready.catch(() => {});

  async function read() {
    await ready;
    const result = await pool.query("SELECT payload FROM estrutura_solar_state WHERE key = 'leads'");
    if (!result.rows.length) throw corrupt();
    return validate(result.rows[0].payload);
  }
  async function mutate(fn, replacement) {
    await ready;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL lock_timeout = '15s'");
      const result = await client.query("SELECT payload FROM estrutura_solar_state WHERE key = 'leads' FOR UPDATE");
      if (!result.rows.length) throw corrupt();
      const data = validate(result.rows[0].payload), before = JSON.stringify(data);
      const output = replacement ? undefined : await fn(data);
      const after = replacement ? validate(replacement) : validate(data);
      // Backups lógicos no mesmo banco: versão anterior + até sete cópias diárias.
      await client.query("INSERT INTO estrutura_solar_state (key,payload) VALUES ('previous',$1::jsonb) ON CONFLICT (key) DO UPDATE SET payload=EXCLUDED.payload, updated_at=now()", [before]);
      await client.query('INSERT INTO estrutura_solar_backups (day,payload) VALUES (CURRENT_DATE,$1::jsonb) ON CONFLICT (day) DO NOTHING', [before]);
      await client.query('DELETE FROM estrutura_solar_backups WHERE day NOT IN (SELECT day FROM estrutura_solar_backups ORDER BY day DESC LIMIT 7)');
      await client.query("UPDATE estrutura_solar_state SET payload=$1::jsonb, updated_at=now() WHERE key='leads'", [JSON.stringify(after)]);
      await client.query('COMMIT');
      return output;
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  }
  async function write(data) { validate(data); await mutate(null, data); }
  async function update(fn) { return mutate(fn); }
  async function close() { await ready.catch(() => {}); await pool.end(); }
  return { kind: 'postgres', ready, read, write, update, close };
}
module.exports = { createPostgresStore };
