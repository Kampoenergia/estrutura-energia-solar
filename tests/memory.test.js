const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createMemoryStore } = require('../lib/memory-store');
const { createApp } = require('../server');

test('Memória: isolamento, rollback e alterações concorrentes sem arquivo', async () => {
  const store = createMemoryStore();
  await Promise.all(Array.from({length:8},(_,i)=>store.update(data=>data.push({id:String(i)}))));
  assert.equal(store.read().length,8);
  const external=store.read();external.length=0;assert.equal(store.read().length,8);
  await assert.rejects(store.update(data=>{data.length=0;throw new Error('falha');}),/falha/);
  assert.equal(store.read().length,8);
  await assert.rejects(store.update(data=>data.push(null)),/inválidos/);
  assert.equal(store.read().length,8);
  await store.write([{id:'substituido'}]);assert.deepEqual(store.read(),[{id:'substituido'}]);
  assert.deepEqual(createMemoryStore().read(),[]);
  assert.equal(store.file,undefined);
});

test('Produção temporária ignora conexão de banco e mantém senha protegida', () => {
  const app=createApp({production:true,storageMode:'memory',databaseUrl:'nao-usar-esta-conexao',password:'senha-exclusiva-de-teste-123456'});
  assert.equal(app.locals.store.kind,'memory');
  assert.throws(()=>createApp({production:true,storageMode:'memory',password:'estrutura2026'}),/PANEL_SENHA/);
});

test('Captura, resultado, painel e edição funcionam em memória',async t=>{
  const options={production:false,preview:false,trustProxy:0,storageMode:'memory',password:'senha-exclusiva-de-teste-123456'};
  const app=createApp(options),server=app.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
  const base='http://127.0.0.1:'+server.address().port;
  async function call(route,method='GET',body,cookie){return fetch(base+route,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(5000)});}
  assert.equal((await call('/api/leads')).status,401);
  const result=await call('/api/capture','POST',{nome:'Contato temporário de teste',whatsapp:'47987654321',cidade:'Joinville',propertyType:'comercial',conta:700,consentimento:true});
  assert.equal(result.status,201);const data=await result.json();assert.equal(data.estimate.economyMonth,640);assert.equal(data.estimate.financingInstallment,522.67);assert.ok(data.measurement.eventId);
  const login=await call('/api/login','POST',{senha:options.password}),cookie=login.headers.get('set-cookie').split(';')[0];
  const config=await(await call('/api/config','GET',null,cookie)).json();assert.equal(config.storageKind,'memory');
  const leads=await(await call('/api/leads','GET',null,cookie)).json();assert.equal(leads.length,1);
  const patch=await call('/api/leads/'+leads[0].id,'PATCH',{status:'proposta'},cookie);assert.equal(patch.status,200);assert.equal((await patch.json()).status,'proposta');
  assert.equal((await call('/api/export.csv','GET',null,cookie)).status,200);
  assert.equal((await(await call('/api/backup','GET',null,cookie)).json()).length,1);
  assert.equal(createApp(options).locals.store.read().length,0);
  assert.equal((await call('/api/leads/'+leads[0].id,'DELETE',null,cookie)).status,200);
  assert.equal(app.locals.store.read().length,0);
});
