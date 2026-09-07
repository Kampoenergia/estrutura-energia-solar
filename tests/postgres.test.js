const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { PGlite } = require('@electric-sql/pglite');
const { createPostgresStore } = require('../lib/postgres-store');
const { createApp } = require('../server');

// PostgreSQL local em WebAssembly; sem conexão ou credenciais do Neon.
function localPool(db) {
  let tail = Promise.resolve();
  const pool = {
    async connect() {
      const previous = tail; let unlock;
      tail = new Promise(resolve => { unlock = resolve; });
      await previous;
      return { query: (sql, params) => db.query(sql, params), release: unlock };
    },
    async query(sql, params) { const client = await this.connect(); try { return await client.query(sql, params); } finally { client.release(); } },
    on() {}, async end() {}
  }; return pool;
}
async function serve(t, store) {
  const app = createApp({ store, production: false, preview: false, trustProxy: 0, password: 'teste-postgres-senha-exclusiva' });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const url = 'http://127.0.0.1:' + server.address().port;
  return async (route, method = 'GET', body, cookie) => fetch(url + route, {method, headers:{...(body ? {'Content-Type':'application/json'} : {}), ...(cookie ? {Cookie:cookie} : {})}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000), redirect:'manual'});
}

test('PostgreSQL: transações, persistência, API e backups', async t => {
  const db = new PGlite(); await db.waitReady; t.after(() => db.close());
  const pool = localPool(db), store = createPostgresStore(null, {pool}); await store.ready;
  await t.test('Inicialização cria uma base vazia isolada', async () => { assert.deepEqual(await store.read(), []); });
  await t.test('Dados sobrevivem a uma nova instância do repositório', async () => {
    await store.update(data => data.push({id:'persistencia',name:'Contato fictício de teste'}));
    const reopened = createPostgresStore(null, {pool}); await reopened.ready;
    assert.equal((await reopened.read())[0].id, 'persistencia');
  });
  await t.test('Erro dentro da alteração faz rollback', async () => {
    const before = await store.read();
    await assert.rejects(store.update(data => {data.push({id:'nao-salvar'});throw new Error('falha-teste');}), /falha-teste/);
    assert.deepEqual(await store.read(), before);
  });
  await t.test('Capturas concorrentes não perdem contatos; reenvio preserva ID de medição', async t => {
    await store.write([]); const call = await serve(t, store);
    const base = {nome:'Teste PostgreSQL',cidade:'Joinville',propertyType:'comercial',conta:700,consentimento:true};
    const responses = await Promise.all(Array.from({length:8},(_,i)=>call('/api/capture','POST',{...base,whatsapp:'4798765432'+i})));
    responses.forEach(r=>assert.equal(r.status,201));
    const first = await responses[0].json(); assert.ok(first.measurement.eventId);
    assert.equal((await store.read()).length,8);
    const again = await (await call('/api/capture','POST',{...base,whatsapp:'47987654320'})).json();
    assert.equal(again.measurement.eventId,first.measurement.eventId);assert.equal((await store.read()).length,8);
    const login = await call('/api/login','POST',{senha:'teste-postgres-senha-exclusiva'});const cookie=login.headers.get('set-cookie').split(';')[0];
    const list = await (await call('/api/leads','GET',null,cookie)).json();const id=list[0].id;
    const patch=await call('/api/leads/'+id,'PATCH',{status:'proposta',notes:'Teste de acompanhamento'},cookie);assert.equal(patch.status,200);assert.equal((await patch.json()).status,'proposta');
    const backup=await (await call('/api/backup','GET',null,cookie)).json();assert.equal(backup.length,8);
    const config=await (await call('/api/config','GET',null,cookie)).json();assert.equal(config.storageKind,'postgres');assert.ok(!JSON.stringify(config).includes('DATABASE_URL'));
    assert.equal((await call('/api/export.csv','GET',null,cookie)).status,200);
    assert.equal((await call('/api/leads/'+id,'DELETE',null,cookie)).status,200);assert.equal((await store.read()).length,7);
  });
  await t.test('Cadastro manual duplicado concorrente não cria dois registros', async t => {
    const call=await serve(t,store),login=await call('/api/login','POST',{senha:'teste-postgres-senha-exclusiva'}),cookie=login.headers.get('set-cookie').split(';')[0];
    const lead={name:'Manual fictício',phone:'47987650000',city:'Guaramirim'};
    const results=await Promise.all([call('/api/leads','POST',lead,cookie),call('/api/leads','POST',lead,cookie)]);
    assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
  });
  await t.test('Backups lógicos limitados a sete dias e uma versão anterior', async () => {
    for(let day=1;day<=12;day++) await pool.query('INSERT INTO estrutura_solar_backups(day,payload) VALUES ($1::date,$2::jsonb) ON CONFLICT(day) DO NOTHING',['2025-01-'+String(day).padStart(2,'0'),'[]']);
    const before=await store.read();await store.update(data=>data.push({id:'backup-teste'}));
    assert.equal((await pool.query('SELECT day FROM estrutura_solar_backups')).rows.length,7);
    assert.deepEqual((await pool.query("SELECT payload FROM estrutura_solar_state WHERE key='previous'")).rows[0].payload,before);
  });
  await t.test('Dados corrompidos não são apagados silenciosamente', async () => {
    await pool.query("UPDATE estrutura_solar_state SET payload='[null]'::jsonb WHERE key='leads'");
    await assert.rejects(store.read(),/Nenhum dado/);
    await assert.rejects(store.update(data=>data.push({id:'x'})),/Nenhum dado/);
    assert.deepEqual((await pool.query("SELECT payload FROM estrutura_solar_state WHERE key='leads'")).rows[0].payload,[null]);
  });
});

test('Falha ao persistir não devolve confirmação nem evento de conversão', async t => {
  const call=await serve(t,{kind:'postgres',read:async()=>[],update:async()=>{throw Object.assign(new Error('Banco indisponível'),{code:'DB_TEST_FAILURE'});}});
  const response=await call('/api/capture','POST',{nome:'Contato de teste',whatsapp:'47987654321',cidade:'Joinville',propertyType:'comercial',conta:700,consentimento:true});
  assert.equal(response.status,503);const data=await response.json();assert.equal(data.measurement,undefined);assert.equal(data.ok,undefined);
});
test('Modo PostgreSQL explícito exige DATABASE_URL',()=>{
  assert.throws(()=>createApp({production:true,storageMode:'postgres',password:'senha-longa-e-exclusiva-para-testar',databaseUrl:''}),/DATABASE_URL/);
});
