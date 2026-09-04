const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '300kb' }));

// ================= AUTENTICAÇÃO DO PAINEL =================
const SENHA = process.env.PANEL_SENHA || 'estrutura2026';
const TOKEN = crypto.createHash('sha256').update('estrutura-solar-salt::' + SENHA).digest('hex');
function getCookie(req, name) { const c = req.headers.cookie || ''; const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)')); return m ? m[1] : null; }
function isAuthed(req) { return getCookie(req, 'estrutura_auth') === TOKEN; }
function isPublicPath(p) { return p === '/captar' || p === '/captar.html' || p === '/login' || p === '/login.html' || p === '/api/login' || p === '/api/capture' || p.startsWith('/img/') || p.startsWith('/favicon'); }
app.use((req, res, next) => { if (isPublicPath(req.path)) return next(); if (isAuthed(req)) return next(); if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Não autorizado. Faça login no painel.' }); return res.redirect('/login'); });
app.post('/api/login', (req, res) => { if ((req.body || {}).senha !== SENHA) return res.status(401).json({ error: 'Senha incorreta.' }); res.setHeader('Set-Cookie', `estrutura_auth=${TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`); res.json({ ok: true }); });
app.get('/login', (req, res) => { if (isAuthed(req)) return res.redirect('/'); res.sendFile(path.join(__dirname, 'public', 'login.html')); });
app.get('/logout', (req, res) => { res.setHeader('Set-Cookie', 'estrutura_auth=; Path=/; HttpOnly; Max-Age=0'); res.redirect('/login'); });
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data', 'leads.json');
const STATUS_VALUES = ['novo', 'contatado', 'interessado', 'visita_solicitada', 'visita_realizada', 'proposta', 'negociacao', 'fechado', 'sem_resposta', 'perdido'];
const TEMPERATURE_VALUES = ['quente', 'morno', 'frio'];
const CITY_REGION = ['Guaramirim', 'Jaraguá do Sul', 'Joinville'];

// ================= PROSPECÇÃO =================
const SEGMENTS = {
  industria: { label: '🏭 Indústria / fábrica', selector: '["industrial"="yes"]', kwh: 28000, intensity: 5, propertyType: 'industrial' },
  galpao: { label: '🏢 Galpão / centro logístico', selector: '["building"="warehouse"]', kwh: 18000, intensity: 5, propertyType: 'comercial' },
  supermercado: { label: '🛒 Supermercado', selector: '["shop"="supermarket"]', kwh: 12000, intensity: 5, propertyType: 'comercial' },
  hotel: { label: '🏨 Hotel / pousada', selector: '["tourism"="hotel"]', kwh: 9000, intensity: 5, propertyType: 'comercial' },
  restaurante: { label: '🍽️ Restaurante', selector: '["amenity"="restaurant"]', kwh: 4500, intensity: 4, propertyType: 'comercial' },
  padaria: { label: '🥖 Padaria', selector: '["shop"="bakery"]', kwh: 4500, intensity: 4, propertyType: 'comercial' },
  academia: { label: '💪 Academia', selector: '["leisure"="fitness_centre"]', kwh: 4000, intensity: 4, propertyType: 'comercial' },
  posto: { label: '⛽ Posto de combustível', selector: '["amenity"="fuel"]', kwh: 5000, intensity: 4, propertyType: 'comercial' },
  escola: { label: '🏫 Escola / faculdade', selector: '["amenity"="school"]', kwh: 6000, intensity: 4, propertyType: 'comercial' },
  hospital: { label: '🏥 Hospital / clínica', selector: '["amenity"="hospital"]', kwh: 11000, intensity: 5, propertyType: 'comercial' },
  condominio: { label: '🏘️ Condomínio / síndico', selector: '["building"="apartments"]', kwh: 7000, intensity: 4, propertyType: 'residencial' },
  agro: { label: '🌾 Agro / propriedade rural', selector: '["landuse"="farmyard"]', kwh: 8000, intensity: 4, propertyType: 'rural' },
};

// ================= CÁLCULO SOLAR =================
const PRICE_PER_PANEL = 1500;
const FINANCE_RATE_START = 0.018; // parâmetro interno; não é exibido no site
const FINANCE_MONTHS = 72;
const POST_SOLAR_BILL = 60;
function priceInstallment(principal, rate, months) { const p = Number(principal) || 0; const i = Number(rate) || 0; const n = Number(months) || FINANCE_MONTHS; if (p <= 0 || n <= 0) return 0; if (i <= 0) return p / n; return p * i / (1 - Math.pow(1 + i, -n)); }
function solarEstimate(conta, propertyType = 'comercial') {
  const bill = Math.max(150, Number(conta) || 0);
  const tariffs = { residencial: 0.82, comercial: 0.86, industrial: 0.95, rural: 0.86 };
  const tariff = tariffs[propertyType] || tariffs.comercial;
  const kwh = bill / tariff;
  // Calibração informada: uma conta de R$ 500 corresponde a 10 placas.
  const panels = Math.max(3, Math.round(bill / 50));
  const kwp = Math.round(panels * 0.55 * 10) / 10;
  const remainingBill = Math.min(POST_SOLAR_BILL, Math.round(bill * 100) / 100);
  const economyMonth = Math.max(0, Math.round((bill - remainingBill) * 100) / 100);
  const economyYear = Math.round(economyMonth * 12 * 100) / 100;
  const systemValue = panels * PRICE_PER_PANEL;
  const financingInstallment = Math.round(priceInstallment(systemValue, FINANCE_RATE_START, FINANCE_MONTHS) * 100) / 100;
  const paybackMonths = economyMonth > 0 ? Math.round((systemValue / economyMonth) * 10) / 10 : 0;
  return { contaEst: Math.round(bill), tariff, kwhEst: Math.round(kwh), systemKwp: kwp, panels, economyMonth, economyYear, remainingBill, systemValue, financingMonths: FINANCE_MONTHS, financingInstallment, paybackMonths, paybackYears: Math.round((paybackMonths / 12) * 10) / 10, pricePerPanel: PRICE_PER_PANEL };
}

function cleanText(value, max = 180) { return String(value == null ? '' : value).trim().slice(0, max); }
function digits(value) { return String(value || '').replace(/\D/g, ''); }
function isoNow() { return new Date().toISOString(); }
function validStatus(v) { return STATUS_VALUES.includes(v) ? v : 'novo'; }
function validTemp(v) { return TEMPERATURE_VALUES.includes(v) ? v : null; }
function inferOrigin(t = {}) { const source = String(t.utmSource || t.utm_source || '').toLowerCase(); if (t.fbclid || /facebook|instagram|meta/.test(source)) return 'Meta Ads'; if (t.gclid || source.includes('google')) return 'Google Ads'; if (t.referrer) return 'Referência / orgânico'; return 'Direto / orgânico'; }
function autoTemperature(l) {
  if (l.vendaRealizada || l.status === 'fechado') return 'quente';
  if (l.faturaRecebida || l.status === 'proposta' || l.status === 'negociacao' || l.status === 'visita_realizada') return 'quente';
  if (l.status === 'sem_resposta' || l.status === 'perdido') return 'frio';
  if (l.interesse || ['contatado', 'interessado', 'visita_solicitada'].includes(l.status)) return 'morno';
  if (l.tipo === 'PF/PJ' && l.phone) return 'morno';
  return 'frio';
}
function normalizeLead(input) {
  const l = { ...input };
  l.status = validStatus(l.status);
  l.temperatura = validTemp(l.temperatura) || autoTemperature(l);
  l.addedAt = l.addedAt || l.createdAt || null;
  l.createdAt = l.createdAt || l.addedAt || null;
  l.simulatedAt = l.simulatedAt || (l.origem === 'landing' ? l.addedAt : null);
  l.lastContact = l.lastContact || null;
  l.interesse = Boolean(l.interesse || ['interessado', 'visita_solicitada', 'visita_realizada', 'proposta', 'negociacao', 'fechado'].includes(l.status));
  l.faturaRecebida = Boolean(l.faturaRecebida);
  l.propostaEnviada = Boolean(l.propostaEnviada || ['proposta', 'negociacao', 'fechado'].includes(l.status));
  l.vendaRealizada = Boolean(l.vendaRealizada || l.status === 'fechado');
  l.origem = l.origem || 'Prospecção';
  l.campanha = l.campanha || l.utmCampaign || '';
  l.anuncio = l.anuncio || l.utmContent || '';
  return l;
}

function loadLeads() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return raw.map(l => {
      const lead = normalizeLead(l);
      if (!lead.systemValue && lead.contaEst) Object.assign(lead, solarEstimate(lead.contaEst, lead.propertyType || 'comercial'));
      return lead;
    });
  } catch { return []; }
}
function saveLeads(leads) { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2)); }
function scoreLead(l) {
  const spec = SEGMENTS[l.segment];
  let s = spec ? 42 + (spec.intensity - 3) * 8 : 42;
  if (l.phone) s += 20; if (l.city) s += 5; if (l.website) s += 3;
  const bill = Number(l.contaEst) || 0; if (bill >= 500) s += 10; if (bill >= 1000) s += 10; if (bill >= 3000) s += 8;
  if (l.propertyType === 'industrial' || l.segment === 'galpao') s += 5; if (l.interesse) s += 5; if (l.faturaRecebida) s += 5;
  return Math.min(100, s);
}

// ================= PROSPECÇÃO OPENSTREETMAP =================
app.post('/api/discover', async (req, res) => {
  const city = cleanText(req.body && req.body.city, 80);
  const segments = Array.isArray(req.body && req.body.segments) ? req.body.segments.filter(k => SEGMENTS[k]) : [];
  if (!city || !segments.length) return res.status(400).json({ error: 'Informe a cidade e pelo menos um segmento.' });
  const parts = [];
  for (const key of segments) parts.push(`node${SEGMENTS[key].selector}(area.a);way${SEGMENTS[key].selector}(area.a);`);
  const query = `[out:json][timeout:35];area["name"="${city.replace(/"/g, '')}"]["boundary"="administrative"]->.a;(${parts.join('')});out center tags 400;`;
  const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
  try {
    let data = null, lastError = null;
    for (const endpoint of endpoints) {
      try { const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'EstruturaSolarLeadAgent/1.0' }, body: 'data=' + encodeURIComponent(query), signal: AbortSignal.timeout(40000) }); if (!r.ok) { lastError = new Error('HTTP ' + r.status); continue; } data = await r.json(); break; } catch (e) { lastError = e; }
    }
    if (!data) throw lastError || new Error('As fontes de mapas não responderam.');
    const seen = new Set(), results = [];
    for (const element of data.elements || []) {
      const tags = element.tags || {}; if (!tags.name) continue;
      const lat = element.lat || (element.center && element.center.lat) || null; const lon = element.lon || (element.center && element.center.lon) || null;
      const unique = String(tags.name).toLowerCase().trim() + '|' + (lat || ''); if (seen.has(unique)) continue; seen.add(unique);
      let segment = segments[0]; for (const key of segments) { const m = SEGMENTS[key].selector.match(/\["([^\"]+)"[=~]"?\^?\(?([^)"$\]]+)/); if (m && tags[m[1]] && m[2].split('|').includes(tags[m[1]])) { segment = key; break; } }
      const spec = SEGMENTS[segment]; const estimate = solarEstimate(spec.kwh * (spec.propertyType === 'industrial' ? .95 : .86), spec.propertyType);
      const lead = normalizeLead({ id: 'osm-' + element.type + '-' + element.id, tipo: 'PJ', name: cleanText(tags.name, 160), segment, segmentLabel: spec.label, propertyType: spec.propertyType, phone: cleanText(tags.phone || tags['contact:phone'], 60), website: cleanText(tags.website || tags['contact:website'], 220), address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:suburb'] || tags['addr:neighbourhood']].filter(Boolean).join(', '), city, lat, lon, ...estimate, status: 'novo', origem: 'Prospecção', notes: 'Encontrado em fonte pública. Confirmar responsável e fatura antes do contato.' });
      lead.score = scoreLead(lead); results.push(lead);
    }
    results.sort((a, b) => b.score - a.score); res.json({ count: results.length, results });
  } catch (e) { res.status(502).json({ error: 'Falha na busca de mapas: ' + e.message }); }
});

// ================= CNPJ =================
app.get('/api/cnpj/:cnpj', async (req, res) => {
  const cnpj = digits(req.params.cnpj); if (cnpj.length !== 14) return res.status(400).json({ error: 'O CNPJ deve ter 14 dígitos.' });
  for (const source of ['https://brasilapi.com.br/api/cnpj/v1/' + cnpj, 'https://minhareceita.org/' + cnpj]) {
    try { const r = await fetch(source, { signal: AbortSignal.timeout(12000) }); if (!r.ok) continue; const d = await r.json(); return res.json({ cnpj, razao_social: d.razao_social || '', nome_fantasia: d.nome_fantasia || '', situacao: d.descricao_situacao_cadastral || d.situacao_cadastral || '', porte: d.porte || d.descricao_porte || '', cnae: (d.cnae_fiscal_descricao || '') + (d.cnae_fiscal ? ` (${d.cnae_fiscal})` : ''), email: d.email || '', telefone: d.ddd_telefone_1 || '', municipio: d.municipio || '', uf: d.uf || '', socios: (d.qsa || []).map(s => (s.nome_socio || '') + (s.qualificacao_socio ? ' — ' + s.qualificacao_socio : '')).slice(0, 6) }); } catch { /* próxima fonte */ }
  }
  res.status(502).json({ error: 'Nenhuma fonte pública respondeu para este CNPJ.' });
});

// ================= CAPTURA DA LANDING =================
app.post('/api/capture', (req, res) => {
  const body = req.body || {}; const nome = cleanText(body.nome, 120); const whatsapp = digits(body.whatsapp); const cidade = cleanText(body.cidade, 100); const propertyType = ['residencial', 'comercial', 'industrial', 'rural'].includes(body.propertyType) ? body.propertyType : 'residencial'; const conta = Number(body.conta);
  if (!nome || whatsapp.length < 10 || !Number.isFinite(conta) || conta < 150) return res.status(400).json({ error: 'Preencha nome, WhatsApp válido e uma conta média de pelo menos R$ 150.' });
  const tracking = body.tracking && typeof body.tracking === 'object' ? body.tracking : body; const createdAt = isoNow(); const estimate = solarEstimate(conta, propertyType); const leads = loadLeads(); const existing = leads.find(l => phoneDigits(l.phone) === phoneDigits(whatsapp));
  const common = { name: nome, phone: phoneDigits(whatsapp), city: cidade, propertyType, ...estimate, origem: cleanText(tracking.origem, 80) || 'Direto / orgânico', plataforma: cleanText(tracking.utmSource || tracking.utm_source, 100), campanha: cleanText(tracking.utmCampaign || tracking.utm_campaign, 160), anuncio: cleanText(tracking.utmContent || tracking.utm_content, 160), utmSource: cleanText(tracking.utmSource || tracking.utm_source, 120), utmMedium: cleanText(tracking.utmMedium || tracking.utm_medium, 120), utmCampaign: cleanText(tracking.utmCampaign || tracking.utm_campaign, 160), utmContent: cleanText(tracking.utmContent || tracking.utm_content, 160), utmTerm: cleanText(tracking.utmTerm || tracking.utm_term, 160), fbclid: cleanText(tracking.fbclid, 240), gclid: cleanText(tracking.gclid, 240), referrer: cleanText(tracking.referrer, 300), simulatedAt: createdAt, createdAt, consentimento: body.consentimento !== false };
  if (existing) { Object.assign(existing, common, { lastSimulationAt: createdAt }); existing.temperatura = autoTemperature(existing); existing.score = scoreLead(existing); saveLeads(leads); return res.json({ ok: true, dup: true, economiaAno: existing.economyYear || existing.economiaAno, leadId: existing.id }); }
  const lead = normalizeLead({ id: 'solar-' + Date.now(), tipo: 'PF/PJ', segment: propertyType, segmentLabel: propertyType === 'residencial' ? '🏠 Residencial' : propertyType === 'industrial' ? '🏭 Indústria' : propertyType === 'rural' ? '🌾 Rural' : '🏢 Comércio / empresa', ...common, status: 'novo', temperatura: 'morno', temperaturaManual: false, interesse: true, faturaRecebida: false, propostaEnviada: false, vendaRealizada: false, notes: 'Lead captado pela landing. Solicitar fatura e confirmar viabilidade.' });
  lead.score = scoreLead(lead); leads.push(lead); saveLeads(leads); return res.json({ ok: true, economiaAno: lead.economyYear, leadId: lead.id });
});
function phoneDigits(value) { let d = digits(value); if (d.startsWith('55')) d = d.slice(2); if (d.startsWith('0')) d = d.slice(1); return d; }
app.get('/captar', (req, res) => res.sendFile(path.join(__dirname, 'public', 'captar.html')));

// ================= FUNIL =================
app.get('/api/leads', (req, res) => res.json(loadLeads()));
app.post('/api/leads', (req, res) => { const incoming = req.body || {}; if (!incoming.id || !incoming.name) return res.status(400).json({ error: 'Lead inválido.' }); const leads = loadLeads(); if (leads.some(l => l.id === incoming.id)) return res.status(409).json({ error: 'Lead já está no funil.' }); const lead = normalizeLead({ ...incoming, addedAt: isoNow() }); lead.score = scoreLead(lead); leads.push(lead); saveLeads(leads); res.json({ ok: true, total: leads.length }); });
app.patch('/api/leads/:id', (req, res) => {
  const leads = loadLeads(); const lead = leads.find(l => l.id === req.params.id); if (!lead) return res.status(404).json({ error: 'Lead não encontrado.' }); const body = req.body || {};
  if (Object.prototype.hasOwnProperty.call(body, 'status')) lead.status = validStatus(body.status);
  if (Object.prototype.hasOwnProperty.call(body, 'temperatura')) { const t = validTemp(body.temperatura); if (t) lead.temperatura = t; }
  if (Object.prototype.hasOwnProperty.call(body, 'temperaturaManual')) lead.temperaturaManual = Boolean(body.temperaturaManual);
  for (const f of ['notes', 'website', 'cnpj', 'lastContact']) if (Object.prototype.hasOwnProperty.call(body, f)) lead[f] = cleanText(body[f], f === 'notes' ? 1200 : 260);
  if (Object.prototype.hasOwnProperty.call(body, 'phone')) lead.phone = phoneDigits(body.phone);
  for (const f of ['faturaRecebida', 'propostaEnviada', 'vendaRealizada', 'interesse']) if (Object.prototype.hasOwnProperty.call(body, f)) lead[f] = Boolean(body[f]);
  if (Object.prototype.hasOwnProperty.call(body, 'cnpjData')) lead.cnpjData = body.cnpjData && typeof body.cnpjData === 'object' ? body.cnpjData : null;
  if (['contatado', 'interessado', 'visita_solicitada', 'visita_realizada', 'proposta', 'negociacao'].includes(lead.status)) lead.lastContact = lead.lastContact || isoNow();
  if (lead.status === 'visita_realizada') lead.interesse = true; if (lead.status === 'proposta' || lead.status === 'negociacao' || lead.status === 'fechado') lead.propostaEnviada = true; if (lead.status === 'fechado') lead.vendaRealizada = true; if (lead.status === 'sem_resposta') lead.temperatura = 'frio';
  lead.temperatura = lead.temperaturaManual ? (validTemp(lead.temperatura) || 'morno') : autoTemperature(lead); lead.score = scoreLead(lead); saveLeads(leads); res.json(lead);
});
app.delete('/api/leads/:id', (req, res) => { saveLeads(loadLeads().filter(l => l.id !== req.params.id)); res.json({ ok: true }); });

// ================= INDICADORES =================
app.get('/api/metrics', (req, res) => {
  let leads = loadLeads(); const days = Number(req.query.days) || 0; const campaign = cleanText(req.query.campaign, 160).toLowerCase();
  if (days) { const cutoff = Date.now() - days * 86400000; leads = leads.filter(l => new Date(l.simulatedAt || l.addedAt || 0).getTime() >= cutoff); }
  if (campaign) leads = leads.filter(l => String(l.campanha || l.utmCampaign || '').toLowerCase().includes(campaign));
  const total = leads.length, hot = leads.filter(l => l.temperatura === 'quente').length, warm = leads.filter(l => l.temperatura === 'morno').length, cold = leads.filter(l => l.temperatura === 'frio').length, invoices = leads.filter(l => l.faturaRecebida).length, proposals = leads.filter(l => l.propostaEnviada).length, sales = leads.filter(l => l.vendaRealizada || l.status === 'fechado').length;
  const kwh = leads.filter(l => Number(l.kwhEst) > 0).map(l => Number(l.kwhEst)); const econ = leads.filter(l => Number(l.economyMonth) > 0).map(l => Number(l.economyMonth));
  const group = key => Object.entries(leads.reduce((a, l) => { const v = String(l[key] || 'Não informado'); a[v] = (a[v] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => ({ name, count }));
  res.json({ total, hot, warm, cold, invoices, proposals, sales, conversion: total ? Math.round((sales / total) * 1000) / 10 : 0, avgKwh: kwh.length ? Math.round(kwh.reduce((a, b) => a + b, 0) / kwh.length) : 0, avgEconomyMonth: econ.length ? Math.round(econ.reduce((a, b) => a + b, 0) / econ.length) : 0, byCity: group('city'), byProperty: group('segmentLabel'), byCampaign: group('campanha') });
});

app.get('/api/export.csv', (req, res) => {
  const leads = loadLeads(); const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const header = ['Nome', 'Tipo', 'WhatsApp', 'Cidade', 'Segmento', 'Conta (R$/mês)', 'Sistema (kWp)', 'Painéis', 'Valor do sistema', 'Economia (R$/mês)', 'Parcela financiamento', 'Payback (meses)', 'Status', 'Temperatura', 'Origem', 'Campanha', 'Data da simulação', 'Último contato', 'Fatura', 'Proposta', 'Venda', 'Score', 'Observações'];
  const rows = leads.map(l => [l.name, l.tipo, l.phone, l.city, l.segmentLabel, l.contaEst, l.systemKwp, l.panels, l.systemValue, l.economyMonth, l.financingInstallment, l.paybackMonths, l.status, l.temperatura, l.origem, l.campanha, l.simulatedAt || l.addedAt, l.lastContact, l.faturaRecebida ? 'Sim' : 'Não', l.propostaEnviada ? 'Sim' : 'Não', l.vendaRealizada ? 'Sim' : 'Não', l.score, l.notes].map(esc).join(';'));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', 'attachment; filename="leads-estrutura-solar.csv"'); res.send('\uFEFF' + header.map(esc).join(';') + '\n' + rows.join('\n'));
});
app.get('/api/segments', (req, res) => res.json(Object.entries(SEGMENTS).map(([key, s]) => ({ key, label: s.label, kwh: s.kwh, intensity: s.intensity, propertyType: s.propertyType }))));
app.get('/api/config', (req, res) => res.json({ brand: 'Estrutura Energia Solar', whatsapp: '5547989022728', region: CITY_REGION }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('Estrutura Energia Solar — agente de leads na porta ' + PORT));
