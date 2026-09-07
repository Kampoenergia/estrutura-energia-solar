const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createStore } = require('./lib/store');
const { createPostgresStore } = require('./lib/postgres-store');
const { advertisingConfig } = require('./lib/ads');
const { limiter, protection, authentication } = require('./lib/security');
const { solarEstimate } = require('./lib/solar');
const { STATUSES, TEMPERATURES, PROPERTIES, SEGMENTS, text, digits, now, phoneDigits, validPhone, safeWebsite, readTracking, autoTemperature, normalizeLead, history, newId, filteredLeads, csvCell } = require('./lib/domain');

function createApp(options = {}) {
  const production = options.production ?? (process.env.NODE_ENV === 'production');
  const preview = options.preview ?? (process.env.PREVIEW_MODE === '1');
  const password = options.password ?? process.env.PANEL_SENHA ?? 'estrutura2026';
  if (production && (password.length < 16 || password === 'estrutura2026' || /troque|sua-senha|change-me/i.test(password))) throw new Error('Defina PANEL_SENHA com uma senha exclusiva de pelo menos 16 caracteres antes de publicar.');
  const siteUrl = options.siteUrl ?? process.env.SITE_URL ?? '';
  if (siteUrl) { const u = new URL(siteUrl); if (!['https:', 'http:'].includes(u.protocol)) throw new Error('SITE_URL inválida.'); }
  const trustProxy = options.trustProxy ?? Number(process.env.TRUST_PROXY ?? (production || preview ? 1 : 0));
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  const store = options.store || (options.dataDir ? createStore(options.dataDir) : (production || databaseUrl) ? createPostgresStore(databaseUrl) : createStore(process.env.DATA_DIR || path.join(__dirname, 'data')));
  const fetchExternal = options.fetch || global.fetch;
  const app = express();
  app.locals.store = store;
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  const advertising = advertisingConfig({ production, preview, env: options.adsEnv || process.env });
  app.use(protection({ preview, siteUrl, trustProxy, advertising }));
  app.use(express.json({ limit: '160kb' }));
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const auth = authentication({ password, production, preview });
  const publicDir = path.join(__dirname, 'public');
  const brand = { name: 'Estrutura Energia Solar', whatsapp: '5547989022728', region: ['Guaramirim', 'Jaraguá do Sul', 'Joinville'], address: 'Rua 28 de Agosto, 682 — Centro, Guaramirim/SC', instagram: 'https://www.instagram.com/estruturaenergiasolar/' };
  const readLeads = async () => (await store.read()).map(normalizeLead);
  const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });
  const invalid = (res, message) => res.status(400).json({ error: message });

  app.get('/healthz', async (req, res) => res.json({ ok: true, service: 'estrutura-solar' }));
  app.get('/robots.txt', async (req, res) => res.type('text').send('User-agent: *\nDisallow: /api/\nDisallow: /login\nDisallow: /index.html\nAllow: /captar\n'));
  app.use('/assets', express.static(path.join(publicDir, 'assets'), { maxAge: '1h', dotfiles: 'deny' }));
  app.use('/img', express.static(path.join(publicDir, 'img'), { maxAge: '1d', dotfiles: 'deny' }));
  app.get('/favicon.svg', async (req, res) => res.sendFile(path.join(publicDir, 'favicon.svg')));
  app.get('/api/site-config', async (req, res) => res.json({ ...brand, advertising, assets: {
    wordmark: fs.existsSync(path.join(publicDir, 'img/estrutura-wordmark.png')) ? '/img/estrutura-wordmark.png' : null,
    hero: fs.existsSync(path.join(publicDir, 'img/hero-solar.jpg')) ? '/img/hero-solar.jpg' : null,
    logo: fs.existsSync(path.join(publicDir, 'img/estrutura-logo.jpg')) ? '/img/estrutura-logo.jpg' : null
  } }));
  app.get(['/captar', '/captar.html'], async (req, res) => res.sendFile(path.join(publicDir, 'captar.html')));
  app.get(['/login', '/login.html'], async (req, res) => {
    res.set('Cache-Control', 'no-store').set('X-Robots-Tag', 'noindex, nofollow');
    if (auth.authed(req)) return res.redirect('/');
    res.sendFile(path.join(publicDir, 'login.html'));
  });
  app.post('/api/login', limiter({ limit: 10, windowMs: 15 * 60000, message: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' }), auth.login);

  app.post('/api/capture', limiter({ limit: 12, windowMs: 15 * 60000, message: 'Você enviou várias solicitações. Aguarde alguns minutos antes de tentar novamente.' }), async (req, res) => {
    const b = req.body || {};
    if (b.company_website) return res.status(201).json({ ok: true });
    const name = text(b.nome, 120), phone = phoneDigits(b.whatsapp), city = text(b.cidade, 100);
    const bill = Number(b.conta), propertyType = b.propertyType;
    if (name.length < 2) return invalid(res, 'Informe seu nome com pelo menos duas letras.');
    if (!validPhone(phone)) return invalid(res, 'Informe um WhatsApp brasileiro válido, com DDD.');
    if (city.length < 2) return invalid(res, 'Informe sua cidade.');
    if (!Object.hasOwn(PROPERTIES, propertyType)) return invalid(res, 'Escolha o tipo de imóvel.');
    if (!Number.isFinite(bill) || bill < 150 || bill > 20000) return invalid(res, 'Informe uma conta média entre R$ 150 e R$ 20.000. Para outros valores, fale diretamente com a equipe.');
    if (b.consentimento !== true) return invalid(res, 'Autorize o contato sobre esta solicitação para continuar.');
    const at = now(), receipt = 'ES-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const adConsent = b.advertisingConsent?.granted === true;
    const permittedTracking = { ...(b.tracking && typeof b.tracking === 'object' ? b.tracking : {}) };
    if (!adConsent) for (const key of ['fbclid','gclid','gbraid','wbraid']) delete permittedTracking[key];
    const tracking = readTracking(permittedTracking);
    let measurementEventId;
    const estimate = solarEstimate(bill, propertyType);
    const publicEstimate = { economyMonth: estimate.economyMonth, economyYear: estimate.economyYear, financingInstallment: estimate.financingInstallment, financingMonths: estimate.financingMonths, paybackMonths: estimate.paybackMonths };
    const common = { name, phone, city, propertyType, segment: propertyType, segmentLabel: PROPERTIES[propertyType], ...estimate, contaInformada: bill, contaFonte: 'informada', updatedAt: at, lastSimulationAt: at, receipt, advertisingConsent: { version: 'ads-v1', granted: adConsent, recordedAt: at } };
    await store.update(raw => {
      const index = raw.findIndex(l => phoneDigits(l.phone) === phone);
      if (index >= 0) {
        const l = normalizeLead(raw[index]);
        measurementEventId = l.adsEventId || 'lead_' + crypto.randomUUID();
        l.adsEventId = measurementEventId;
        // Preservar data de aquisição, origem inicial, estágio e temperatura manual.
        Object.assign(l, common, { lastTracking: tracking, simulationCount: (Number(l.simulationCount) || 1) + 1, consentimento: true, lastConsentAt: at, privacyVersion: '2026-09-v1' });
        if (!l.temperaturaManual) l.temperatura = autoTemperature(l);
        history(l, 'Nova pré-análise solicitada pelo site. Dados informados atualizados.');
        raw[index] = normalizeLead(l);
      } else {
        measurementEventId = 'lead_' + crypto.randomUUID();
        const l = normalizeLead({ id: newId(), adsEventId: measurementEventId, tipo: 'PF/PJ', ...common, ...tracking, canal: 'site', status: 'novo', interesse: true, temperatura: 'morno', temperaturaManual: false, createdAt: at, addedAt: at, simulatedAt: at, simulationCount: 1, consentimento: true, consentimentoAt: at, privacyVersion: '2026-09-v1', notes: 'Solicitação pelo site. Conferir fatura e local antes de apresentar dimensionamento ou valores.' });
        history(l, 'Pré-análise recebida pelo site, com autorização de contato.'); raw.push(l);
      }
    });
    // Expor somente as estimativas aprovadas: economia, retorno simples e parcela.
    // Valor total, painéis, potência e dados do CRM permanecem internos.
    res.status(201).json({ ok: true, receipt, measurement: { eventId: measurementEventId }, estimate: publicEstimate, summary: { nome: name, cidade: city, propertyType, perfil: PROPERTIES[propertyType], contaInformada: bill }, nextStep: 'Envie sua fatura para uma análise personalizada. Dimensionamento, investimento e condições dependem de avaliação técnica e comercial.' });
  });

  app.use(auth.requireAuth);
  app.get(['/', '/index.html'], async (req, res) => res.set('X-Robots-Tag', 'noindex, nofollow').sendFile(path.join(publicDir, 'index.html')));
  app.post('/api/logout', auth.logout);
  app.get('/logout', async (req, res) => res.redirect('/'));
  app.get('/api/config', async (req, res) => res.json({ ...brand, version: '1.2.0', advertising, preview, production, storageKind: store.kind || 'json', storageConfigured: store.kind === 'postgres' || Boolean(options.dataDir || process.env.DATA_DIR), storage: store.kind === 'postgres' ? 'PostgreSQL externo com transações, cópia anterior e sete backups diários lógicos. Mantenha também backup externo.' : 'Arquivo JSON local, somente para desenvolvimento nesta versão.', estimates: 'Referências internas legadas. Não são orçamento nem dimensionamento técnico.' }));
  app.get('/api/segments', async (req, res) => res.json(Object.entries(SEGMENTS).map(([key, s]) => ({ key, label: s.label.replace(/^\S+\s/, ''), propertyType: s.propertyType }))));
  app.get('/api/leads', async (req, res) => res.json(filteredLeads(await readLeads(), req.query)));

  app.post('/api/leads', async (req, res) => {
    const b = req.body || {}, name = text(b.name, 120), phone = phoneDigits(b.phone), city = text(b.city, 100);
    if (name.length < 2) return invalid(res, 'Informe o nome do contato ou estabelecimento.');
    if (phone && !validPhone(phone)) return invalid(res, 'Telefone inválido. Informe o DDD e o número, ou deixe vazio.');
    if (b.website && !safeWebsite(b.website)) return invalid(res, 'Informe um site com endereço http ou https válido.');
    const discovered = /^osm-(node|way|relation)-\d+$/.test(b.id || '');
    const id = discovered ? b.id : newId();
    const propertyType = Object.hasOwn(PROPERTIES, b.propertyType) ? b.propertyType : 'comercial';
    const bill = Number(b.contaEst || 0);
    if (!Number.isFinite(bill) || bill < 0 || bill > 1000000 || (bill > 0 && bill < 150)) return invalid(res, 'Informe uma conta a partir de R$ 150, ou deixe o valor vazio.');
    const at = now();
    const l = normalizeLead({ id, name, phone, city, propertyType, segment: Object.hasOwn(SEGMENTS, b.segment) ? b.segment : propertyType, segmentLabel: Object.hasOwn(SEGMENTS, b.segment) ? SEGMENTS[b.segment].label.replace(/^\S+\s/, '') : PROPERTIES[propertyType], tipo: discovered ? 'PJ' : 'PF/PJ', canal: discovered ? 'prospeccao' : 'manual', origem: discovered ? 'Prospecção' : 'Cadastro manual', contaFonte: discovered ? 'estimativa_segmento' : 'informada', ...(bill ? solarEstimate(bill, propertyType) : {}), contaInformada: discovered ? null : bill || null, notes: text(b.notes, 4000), address: text(b.address, 260), website: safeWebsite(b.website), lat: b.lat != null && Number.isFinite(Number(b.lat)) && Math.abs(Number(b.lat)) <= 90 ? Number(b.lat) : null, lon: b.lon != null && Number.isFinite(Number(b.lon)) && Math.abs(Number(b.lon)) <= 180 ? Number(b.lon) : null, status: 'novo', createdAt: at, addedAt: at });
    history(l, discovered ? 'Adicionado ao funil a partir do OpenStreetMap.' : 'Contato cadastrado manualmente.');
    await store.update(raw => {
      if (raw.some(other => other.id === id || (phone && phoneDigits(other.phone) === phone))) throw httpError(409, 'Esse contato já está no funil. Procure pelo nome ou telefone.');
      raw.push(l);
    }); res.status(201).json(l);
  });

  app.patch('/api/leads/:id', async (req, res) => {
    const updated = await store.update(raw => {
    const index = raw.findIndex(l => l.id === req.params.id);
    if (index < 0) throw httpError(404, 'Contato não encontrado.');
    const l = normalizeLead(raw[index]), b = req.body || {}, has = k => Object.prototype.hasOwnProperty.call(b, k), changed = [];
    const oldStatus = l.status;
    if (has('status') && !STATUSES.includes(b.status)) throw httpError(400, 'Etapa inválida.');
    if (has('temperatura') && !TEMPERATURES.includes(b.temperatura) && b.temperatura !== 'auto') throw httpError(400, 'Temperatura inválida.');
    if (has('name') && text(b.name,120).length < 2) throw httpError(400, 'Informe o nome.');
    if (has('phone') && b.phone && !validPhone(b.phone)) throw httpError(400, 'Telefone inválido.');
    if (has('phone') && b.phone && raw.some(other => other.id !== l.id && phoneDigits(other.phone) === phoneDigits(b.phone))) throw httpError(409, 'Esse telefone já está cadastrado em outro contato.');
    if (has('website') && b.website && !safeWebsite(b.website)) throw httpError(400, 'Endereço de site inválido.');
    if (has('nextContactDate') && b.nextContactDate && (!/^\d{4}-\d{2}-\d{2}$/.test(b.nextContactDate) || !Number.isFinite(Date.parse(b.nextContactDate)) || new Date(b.nextContactDate).toISOString().slice(0,10) !== b.nextContactDate)) throw httpError(400, 'Data de próximo contato inválida.');
    if (has('status')) l.status = b.status;
    for (const [field, max] of [['name',120],['city',100],['notes',4000],['nextContactDate',10]]) if (has(field)) { const v = text(b[field], max); if (l[field] !== v) changed.push(field); l[field] = v; }
    if (has('phone')) l.phone = phoneDigits(b.phone);
    if (has('website')) l.website = safeWebsite(b.website);
    if (has('faturaRecebida')) l.faturaRecebida = b.faturaRecebida === true;
    if (has('temperatura')) { l.temperaturaManual = b.temperatura !== 'auto'; if (l.temperaturaManual) l.temperatura = b.temperatura; }
    if (b.temperaturaManual === false) l.temperaturaManual = false;
    if (['contatado','interessado','visita_solicitada','visita_realizada','proposta','negociacao','fechado'].includes(l.status)) l.lastContact = l.lastContact || now();
    if (b.registrarContato === true) { l.lastContact = now(); history(l, 'Contato com o cliente registrado pelo consultor.'); }
    if (has('cnpj')) { const c = digits(b.cnpj); if (c && c.length !== 14) throw httpError(400, 'Informe um CNPJ numérico de 14 dígitos.'); l.cnpj = c; }
    if (has('cnpjData')) {
      l.cnpjData = {};
      for (const key of ['razao_social','nome_fantasia','situacao','porte','cnae','email','telefone','municipio','uf']) l.cnpjData[key] = text(b.cnpjData?.[key], 300);
    }
    l.interesse = l.interesse || ['interessado','visita_solicitada','visita_realizada','proposta','negociacao','fechado'].includes(l.status);
    l.propostaEnviada = l.propostaEnviada || ['proposta','negociacao','fechado'].includes(l.status);
    l.vendaRealizada = l.vendaRealizada || l.status === 'fechado';
    if (!l.temperaturaManual) l.temperatura = autoTemperature(l);
    if (oldStatus !== l.status) history(l, `Etapa alterada de ${oldStatus} para ${l.status}.`);
    if (changed.length || has('phone') || has('faturaRecebida') || has('temperatura') || has('cnpjData')) history(l, 'Informações de acompanhamento atualizadas.');
    l.updatedAt = now(); raw[index] = normalizeLead(l); return raw[index];
    });
    res.json(updated);
  });

  app.delete('/api/leads/:id', async (req, res) => {
    await store.update(raw => {
      const index = raw.findIndex(l => l.id === req.params.id);
      if (index < 0) throw httpError(404, 'Contato não encontrado.');
      raw.splice(index, 1);
    });
    res.json({ ok: true });
  });

  app.get('/api/metrics', async (req, res) => {
    const leads = filteredLeads(await readLeads(), req.query), total = leads.length;
    const count = predicate => leads.filter(predicate).length;
    const group = key => {
      const map = new Map(); for (const l of leads) { const v = String(l[key] || 'Não informado'); map.set(v, (map.get(v) || 0) + 1); }
      return [...map].sort((a,b) => b[1]-a[1]).slice(0,10).map(([name,count]) => ({name,count}));
    };
    const sales = count(l => l.status === 'fechado');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    res.json({ total, hot: count(l => l.temperatura === 'quente'), warm: count(l => l.temperatura === 'morno'), cold: count(l => l.temperatura === 'frio'), invoices: count(l => l.faturaRecebida), proposals: count(l => l.propostaEnviada), sales, new: count(l => l.status === 'novo'), pending: count(l => l.nextContactDate && l.nextContactDate <= today && !['fechado','perdido'].includes(l.status)), conversion: total ? Math.round(sales / total * 1000) / 10 : 0, byCity: group('city'), byCampaign: group('campanha'), byProperty: group('segmentLabel') });
  });
  app.get('/api/export.csv', async (req, res) => {
    const headers = ['Nome','WhatsApp','Cidade','Perfil','Etapa','Temperatura','Canal','Origem','Campanha','Conta informada','Conta referência interna','Potência interna (kWp)','Painéis internos','Investimento interno','Economia mensal interna','Parcela interna','Payback interno (meses)','Fatura recebida','Próximo contato','Primeiro cadastro','Última solicitação','Observações'];
    const rows = filteredLeads(await readLeads(),req.query).map(l => [l.name,l.phone,l.city,l.segmentLabel,l.status,l.temperatura,l.canal,l.origem,l.campanha,l.contaInformada,l.contaEst,l.systemKwp,l.panels,l.systemValue,l.economyMonth,l.financingInstallment,l.paybackMonths,l.faturaRecebida ? 'Sim' : 'Não',l.nextContactDate,l.createdAt,l.lastSimulationAt || l.simulatedAt,l.notes]);
    res.attachment('leads-estrutura-solar.csv').type('text/csv; charset=utf-8').send('\uFEFF' + [headers,...rows].map(row => row.map(csvCell).join(';')).join('\r\n'));
  });
  app.get('/api/backup', async (req, res) => res.attachment('leads-backup-' + new Date().toISOString().slice(0,10) + '.json').type('application/json').send(JSON.stringify(await store.read(),null,2)));

  const discoverCache = new Map();
  app.post('/api/discover', limiter({ limit: 20, windowMs: 60 * 60000, message: 'Limite temporário de buscas atingido. Aguarde antes de consultar o mapa novamente.' }), async (req, res) => {
    const city = text(req.body?.city,80), segments = [...new Set(Array.isArray(req.body?.segments) ? req.body.segments.filter(k => Object.hasOwn(SEGMENTS,k)) : [])];
    if (city.length < 2 || !segments.length) return invalid(res, 'Informe a cidade e selecione pelo menos um perfil.');
    const cacheKey = city.toLowerCase() + segments.sort().join(',');
    const cached = discoverCache.get(cacheKey); if (cached && cached.until > Date.now()) return res.json(cached.data);
    const parts = segments.map(key => `nwr${SEGMENTS[key].selector}(area.a);`).join('');
    const query = `[out:json][timeout:20];area["ISO3166-1"="BR"]["admin_level"="2"]->.br;area["name"=${JSON.stringify(city)}]["boundary"="administrative"]["admin_level"="8"](area.br)->.a;(${parts});out center tags 300;`;
    let data;
    for (const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']) {
      try {
        const r = await fetchExternal(endpoint, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'EstruturaSolar/1.1'}, body:'data='+encodeURIComponent(query), signal:AbortSignal.timeout(25000) });
        if (r.ok) { const d = await r.json(); if (Array.isArray(d.elements) && !d.remark) { data = d; break; } }
      } catch { /* Tentar a próxima fonte. */ }
    }
    if (!data) return res.status(502).json({ error:'Os mapas públicos não responderam no momento. Tente novamente mais tarde ou cadastre o contato manualmente.' });
    const results = [], seen = new Set();
    for (const element of data.elements) {
      const tags = element.tags || {}; if (!tags.name) continue;
      const key = text(tags.name).toLowerCase() + '|' + (element.lat || element.center?.lat || ''); if (seen.has(key)) continue; seen.add(key);
      const segment = segments.find(k => { const m = SEGMENTS[k].selector.match(/\["([^"]+)"="([^"]+)"\]/); return m && tags[m[1]] === m[2]; }) || segments[0];
      const spec = SEGMENTS[segment];
      const rawPhone = text(tags.phone || tags['contact:phone'],100).split(/[;,/]/)[0];
      results.push(normalizeLead({ id:`osm-${element.type}-${element.id}`, name:text(tags.name,120), phone:validPhone(rawPhone) ? phoneDigits(rawPhone) : '', city, propertyType:spec.propertyType, segment, segmentLabel:spec.label.replace(/^\S+\s/,''), tipo:'PJ', canal:'prospeccao', origem:'Prospecção', contaFonte:'estimativa_segmento', ...solarEstimate(spec.kwh*(spec.propertyType === 'industrial' ? .95 : .86),spec.propertyType), website:safeWebsite(tags.website || tags['contact:website']), address:[tags['addr:street'],tags['addr:housenumber'],tags['addr:suburb']].filter(Boolean).join(', '), lat:element.lat ?? element.center?.lat ?? null, lon:element.lon ?? element.center?.lon ?? null, status:'novo', notes:'Fonte: OpenStreetMap. Consumo estimado por segmento, não confirmado. Verificar responsável, fatura e pertinência antes de abordar.' }));
    }
    results.sort((a,b) => b.score-a.score);
    const response = { count:results.length, results, source:'© OpenStreetMap contributors · ODbL' };
    if (discoverCache.size >= 50) discoverCache.delete(discoverCache.keys().next().value);
    discoverCache.set(cacheKey,{ until:Date.now()+5*60000, data:response }); res.json(response);
  });

  app.get('/api/cnpj/:cnpj', async (req, res) => {
    const cnpj = req.params.cnpj.replace(/[.\-/\s]/g,'');
    if (!/^\d{14}$/.test(cnpj)) return invalid(res, 'Esta consulta aceita CNPJ numérico de 14 dígitos.');
    for (const source of ['https://brasilapi.com.br/api/cnpj/v1/'+cnpj,'https://minhareceita.org/'+cnpj]) {
      try {
        const r = await fetchExternal(source,{signal:AbortSignal.timeout(12000)}); if (!r.ok) continue;
        const d = await r.json();
        return res.json({ cnpj, razao_social:text(d.razao_social,300), nome_fantasia:text(d.nome_fantasia,300), situacao:text(d.descricao_situacao_cadastral || d.situacao_cadastral), porte:text(d.porte || d.descricao_porte), cnae:text(d.cnae_fiscal_descricao,300), email:text(d.email), telefone:text(d.ddd_telefone_1), municipio:text(d.municipio), uf:text(d.uf,2) });
      } catch { /* Próxima fonte. */ }
    }
    res.status(502).json({ error:'Não foi possível consultar esse CNPJ nas fontes públicas. Confirme o número e tente mais tarde.' });
  });

  app.use(async (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error:'Recurso não encontrado.' });
    res.status(404).type('text').send('Página não encontrada. Acesse /captar ou /login.');
  });
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.expose === true && [400,404,409].includes(err.status)) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error:'Dados enviados em formato inválido.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error:'Solicitação muito grande. Reduza o conteúdo e tente novamente.' });
    console.error('[Estrutura Solar]', err.code || err.name, err.code === 'DATA_CORRUPT' ? 'Arquivo de dados inválido; gravação bloqueada.' : 'Falha na operação.');
    res.status(503).json({ error:err.code === 'DATA_CORRUPT' && auth.authed(req) ? err.message : 'Não foi possível concluir agora. Seus dados não foram confirmados; tente novamente em instantes.' });
  });
  return app;
}

if (require.main === module) {
  (async () => {
    if (fs.existsSync(path.join(__dirname,'.env')) && process.loadEnvFile) process.loadEnvFile(path.join(__dirname,'.env'));
    const app = createApp();
    await app.locals.store.ready;
    const port = Number(process.env.PORT) || 3000;
    const server = app.listen(port,'0.0.0.0',() => console.log(`Estrutura Energia Solar v1.2 — porta ${port} — ${app.locals.store.kind || 'JSON local'}`));
    process.on('SIGTERM',() => server.close(async () => { await app.locals.store.close?.(); process.exit(0); }));
  })().catch(error => { console.error('[Estrutura Solar] Inicialização interrompida. Confira PANEL_SENHA e DATABASE_URL na hospedagem.', error.code || error.name); process.exit(1); });
}
module.exports = { createApp };
