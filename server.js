const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '200kb' }));

// ================= AUTENTICAÇÃO DO PAINEL =================
const SENHA = process.env.PANEL_SENHA || 'estrutura2026';
const TOKEN = crypto.createHash('sha256').update('estrutura-solar-salt::' + SENHA).digest('hex');

function getCookie(req, name) {
  const c = req.headers.cookie || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}
function isAuthed(req) { return getCookie(req, 'estrutura_auth') === TOKEN; }
function isPublicPath(p) {
  return p === '/captar' || p === '/captar.html' || p === '/login' || p === '/login.html' ||
    p === '/api/login' || p === '/api/capture' || p.startsWith('/img/') || p.startsWith('/favicon');
}

app.use((req, res, next) => {
  if (isPublicPath(req.path)) return next();
  if (isAuthed(req)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Não autorizado. Faça login no painel.' });
  return res.redirect('/login');
});

app.post('/api/login', (req, res) => {
  const { senha } = req.body || {};
  if (senha !== SENHA) return res.status(401).json({ error: 'Senha incorreta.' });
  res.setHeader('Set-Cookie', `estrutura_auth=${TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`);
  res.json({ ok: true });
});
app.get('/login', (req, res) => {
  if (isAuthed(req)) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'estrutura_auth=; Path=/; HttpOnly; Max-Age=0');
  res.redirect('/login');
});
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data', 'leads.json');
const CITY_REGION = ['Jaraguá do Sul', 'Guaramirim', 'Joinville'];

// ================= CATÁLOGO DE PROSPECÇÃO =================
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

// ================= ESTIMATIVA SOLAR =================
// Os parâmetros de preço e financiamento são usados no cálculo; a taxa não é
// exibida para o cliente. A proposta final continua dependendo da análise real.
const PRICE_PER_PANEL = 1500;
const FINANCE_RATE_START = 0.018; // 1,8% ao mês, usado apenas internamente
const FINANCE_MONTHS = 72;
const POST_SOLAR_BILL = 60;
function priceInstallment(principal, rate, months) {
  const p = Number(principal) || 0;
  const i = Number(rate) || 0;
  const n = Number(months) || FINANCE_MONTHS;
  if (p <= 0 || n <= 0) return 0;
  if (i <= 0) return p / n;
  return p * i / (1 - Math.pow(1 + i, -n));
}
function solarEstimate(conta, propertyType = 'comercial') {
  const bill = Math.max(150, Number(conta) || 0);
  const tariffs = { residencial: 0.82, comercial: 0.86, industrial: 0.95, rural: 0.86 };
  const tariff = tariffs[propertyType] || tariffs.comercial;
  const kwh = bill / tariff;
  // Calibração informada: conta de R$ 500 corresponde a 10 placas.
  const panels = Math.max(3, Math.round(bill / 50));
  const kwp = Math.round(panels * 0.55 * 10) / 10;
  // Referência informada pela empresa: custo restante próximo de R$ 60/mês.
  const remainingBill = Math.min(POST_SOLAR_BILL, Math.round(bill * 100) / 100);
  const economyMonth = Math.max(0, Math.round((bill - remainingBill) * 100) / 100);
  const economyYear = Math.round(economyMonth * 12 * 100) / 100;
  const systemValue = panels * PRICE_PER_PANEL;
  const financingInstallment = Math.round(priceInstallment(systemValue, FINANCE_RATE_START, FINANCE_MONTHS) * 100) / 100;
  const totalMonthlyWithFinancing = Math.round((remainingBill + financingInstallment) * 100) / 100;
  const monthlyDifference = Math.round((bill - totalMonthlyWithFinancing) * 100) / 100;
  const paybackMonths = economyMonth > 0 ? Math.round((systemValue / economyMonth) * 10) / 10 : 0;
  const paybackYears = Math.round((paybackMonths / 12) * 10) / 10;
  return {
    contaEst: Math.round(bill), tariff, kwhEst: Math.round(kwh), systemKwp: kwp, panels,
    economyMonth, economyYear, remainingBill, systemValue,
    financingMonths: FINANCE_MONTHS, financingInstallment, totalMonthlyWithFinancing, monthlyDifference,
    paybackMonths, paybackYears, pricePerPanel: PRICE_PER_PANEL,
  };
}
function scoreLead(lead) {
  const spec = SEGMENTS[lead.segment];
  let score = spec ? 42 + (spec.intensity - 3) * 8 : 42;
  if (lead.phone) score += 20;
  if (lead.city) score += 5;
  if (lead.website) score += 3;
  const bill = Number(lead.contaEst) || 0;
  if (bill >= 500) score += 10;
  if (bill >= 1000) score += 10;
  if (bill >= 3000) score += 8;
  if (lead.propertyType === 'industrial' || lead.segment === 'galpao') score += 5;
  return Math.min(100, score);
}
function cleanText(value, max = 180) { return String(value == null ? '' : value).trim().slice(0, max); }
function digits(value) { return String(value || '').replace(/\D/g, ''); }
function loadLeads() { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return []; } }
function saveLeads(leads) { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2)); }
function cityAreaQuery(city) {
  const safe = cleanText(city, 80).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `area["name"="${safe}"]["boundary"="administrative"]->.a;`;
}

// ================= PROSPECÇÃO OSM =================
app.post('/api/discover', async (req, res) => {
  const city = cleanText(req.body && req.body.city, 80);
  const segments = Array.isArray(req.body && req.body.segments) ? req.body.segments.filter(key => SEGMENTS[key]) : [];
  if (!city || !segments.length) return res.status(400).json({ error: 'Informe a cidade e pelo menos um segmento.' });
  const parts = segments.map(key => `node${SEGMENTS[key].selector}(area.a);way${SEGMENTS[key].selector}(area.a);`).join('');
  const query = `[out:json][timeout:35];${cityAreaQuery(city)}(${parts});out center tags 400;`;
  const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
  try {
    let data = null, lastError = null;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'EstruturaSolarLeadAgent/1.0' }, body: 'data=' + encodeURIComponent(query), signal: AbortSignal.timeout(40000) });
        if (!response.ok) { lastError = new Error('HTTP ' + response.status + ' em ' + endpoint); continue; }
        data = await response.json(); break;
      } catch (error) { lastError = error; }
    }
    if (!data) throw lastError || new Error('As fontes de mapas não responderam.');
    const seen = new Set(), results = [];
    for (const element of data.elements || []) {
      const tags = element.tags || {};
      if (!tags.name) continue;
      const lat = element.lat || (element.center && element.center.lat) || null;
      const lon = element.lon || (element.center && element.center.lon) || null;
      const unique = (String(tags.name).toLowerCase().trim() + '|' + (lat || '')).slice(0, 220);
      if (seen.has(unique)) continue;
      seen.add(unique);
      let segment = segments[0];
      for (const key of segments) {
        const m = SEGMENTS[key].selector.match(/\["([^\"]+)"[=~]"([^\"]+)"\]/);
        if (m && String(tags[m[1]] || '') === m[2]) { segment = key; break; }
      }
      const spec = SEGMENTS[segment];
      const estimate = solarEstimate(spec.kwh * (spec.propertyType === 'industrial' ? 0.95 : 0.86), spec.propertyType);
      const lead = {
        id: 'osm-' + element.type + '-' + element.id, tipo: 'PJ', name: cleanText(tags.name, 160), segment,
        segmentLabel: spec.label, propertyType: spec.propertyType,
        phone: cleanText(tags.phone || tags['contact:phone'], 60), website: cleanText(tags.website || tags['contact:website'], 220),
        address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:suburb'] || tags['addr:neighbourhood']].filter(Boolean).join(', '),
        city, lat, lon, ...estimate, status: 'novo',
        notes: 'Encontrado na prospecção pública do OpenStreetMap. Confirmar responsável e viabilidade técnica antes do contato.',
        cnpj: '', cnpjData: null, origem: 'prospeccao', addedAt: null,
      };
      lead.score = scoreLead(lead); results.push(lead);
    }
    results.sort((a, b) => b.score - a.score);
    return res.json({ count: results.length, results });
  } catch (error) { return res.status(502).json({ error: 'Falha na busca de mapas: ' + error.message }); }
});

// ================= CNPJ =================
app.get('/api/cnpj/:cnpj', async (req, res) => {
  const cnpj = digits(req.params.cnpj);
  if (cnpj.length !== 14) return res.status(400).json({ error: 'O CNPJ deve ter 14 dígitos.' });
  for (const source of ['https://brasilapi.com.br/api/cnpj/v1/' + cnpj, 'https://minhareceita.org/' + cnpj]) {
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) continue;
      const d = await response.json();
      return res.json({ cnpj, razao_social: d.razao_social || '', nome_fantasia: d.nome_fantasia || '', situacao: d.descricao_situacao_cadastral || d.situacao_cadastral || '', porte: d.porte || d.descricao_porte || '', cnae: (d.cnae_fiscal_descricao || '') + (d.cnae_fiscal ? ` (${d.cnae_fiscal})` : ''), capital_social: d.capital_social || 0, abertura: d.data_inicio_atividade || '', email: d.email || '', telefone: d.ddd_telefone_1 || '', municipio: d.municipio || '', uf: d.uf || '', socios: (d.qsa || []).map(s => (s.nome_socio || '') + (s.qualificacao_socio ? ' — ' + s.qualificacao_socio : '')).slice(0, 6) });
    } catch { /* próxima fonte */ }
  }
  return res.status(502).json({ error: 'Nenhuma fonte pública respondeu para este CNPJ.' });
});

// ================= CAPTAÇÃO PELA LANDING =================
app.post('/api/capture', (req, res) => {
  const body = req.body || {};
  const nome = cleanText(body.nome, 120);
  const whatsapp = digits(body.whatsapp);
  const cidade = cleanText(body.cidade || '', 80);
  const propertyType = ['residencial', 'comercial', 'industrial', 'rural'].includes(body.propertyType) ? body.propertyType : 'residencial';
  const conta = Number(body.conta);
  if (!nome || whatsapp.length < 10 || !Number.isFinite(conta) || conta < 150) return res.status(400).json({ error: 'Preencha nome, WhatsApp válido e uma conta média de pelo menos R$ 150.' });
  const estimate = solarEstimate(conta, propertyType);
  const leads = loadLeads();
  if (leads.some(l => digits(l.phone) === whatsapp)) return res.json({ ok: true, dup: true, economiaAno: estimate.economyYear, estimate });
  const lead = {
    id: 'solar-' + Date.now(), tipo: 'PF/PJ', name: nome,
    segment: propertyType, segmentLabel: propertyType === 'residencial' ? '🏠 Residencial' : propertyType === 'industrial' ? '🏭 Indústria' : propertyType === 'rural' ? '🌾 Rural' : '🏢 Comércio / empresa',
    propertyType, phone: whatsapp, website: '', address: '', city: cidade,
    ...estimate, economiaEst: estimate.economyYear,
    status: 'novo', notes: 'Lead captado pela landing. Conferir fatura e confirmar proposta.', origem: 'landing', cnpj: '', cnpjData: null, addedAt: new Date().toISOString(),
  };
  lead.score = scoreLead(lead); leads.push(lead); saveLeads(leads);
  return res.json({ ok: true, economiaAno: lead.economyYear, estimate });
});
app.get('/captar', (req, res) => res.sendFile(path.join(__dirname, 'public', 'captar.html')));

// ================= FUNIL =================
app.get('/api/leads', (req, res) => res.json(loadLeads()));
app.post('/api/leads', (req, res) => {
  const incoming = req.body || {};
  if (!incoming.id || !incoming.name) return res.status(400).json({ error: 'Lead inválido.' });
  const leads = loadLeads();
  if (leads.some(l => l.id === incoming.id)) return res.status(409).json({ error: 'Lead já está no funil.' });
  const lead = { ...incoming, addedAt: new Date().toISOString() }; lead.score = scoreLead(lead); leads.push(lead); saveLeads(leads); return res.json({ ok: true, total: leads.length });
});
app.patch('/api/leads/:id', (req, res) => {
  const leads = loadLeads(), lead = leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado.' });
  for (const field of ['status', 'notes', 'phone', 'website', 'cnpj']) if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) lead[field] = cleanText(req.body[field], field === 'notes' ? 1200 : 220);
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'cnpjData')) lead.cnpjData = req.body.cnpjData && typeof req.body.cnpjData === 'object' ? req.body.cnpjData : null;
  lead.score = scoreLead(lead); saveLeads(leads); return res.json(lead);
});
app.delete('/api/leads/:id', (req, res) => { saveLeads(loadLeads().filter(l => l.id !== req.params.id)); res.json({ ok: true }); });

app.get('/api/export.csv', (req, res) => {
  const esc = value => '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
  const leads = loadLeads();
  const header = ['Nome', 'Tipo', 'Segmento', 'Cidade', 'Endereço', 'Telefone', 'Site', 'CNPJ', 'Razão social', 'Score', 'Consumo estimado (kWh/mês)', 'Conta estimada (R$/mês)', 'Sistema estimado (kWp)', 'Painéis', 'Valor do sistema', 'Economia estimada (R$/mês)', 'Economia estimada (R$/ano)', 'Parcela a partir (R$/mês)', 'Financiamento (meses)', 'Payback estimado (meses)', 'Status', 'Notas'];
  const rows = leads.map(l => [l.name, l.tipo, l.segmentLabel, l.city, l.address, l.phone, l.website, l.cnpj, l.cnpjData ? l.cnpjData.razao_social : '', l.score, l.kwhEst, l.contaEst, l.systemKwp, l.panels, l.systemValue, l.economyMonth, l.economyYear || l.economiaAno, l.financingInstallment, l.financingMonths, l.paybackMonths, l.status, l.notes].map(esc).join(';'));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', 'attachment; filename="leads-estrutura-solar.csv"'); res.send('\uFEFF' + header.map(esc).join(';') + '\n' + rows.join('\n'));
});
app.get('/api/segments', (req, res) => res.json(Object.entries(SEGMENTS).map(([key, s]) => ({ key, label: s.label, intensity: s.intensity, propertyType: s.propertyType }))));
app.get('/api/config', (req, res) => res.json({ brand: 'Estrutura Energia Solar', region: CITY_REGION }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('Estrutura Energia Solar — agente de leads na porta ' + PORT));
