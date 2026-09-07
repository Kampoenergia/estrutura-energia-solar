const crypto = require('node:crypto');
const SEGMENTS = require('./segments');
const { solarEstimate } = require('./solar');
const STATUSES = ['novo', 'contatado', 'interessado', 'visita_solicitada', 'visita_realizada', 'proposta', 'negociacao', 'fechado', 'sem_resposta', 'perdido'];
const TEMPERATURES = ['quente', 'morno', 'frio'];
const PROPERTIES = { residencial: 'Residencial', comercial: 'Comercial', industrial: 'Industrial', rural: 'Rural' };
const DDDS = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
const text = (v, max = 180) => String(v == null ? '' : v).trim().slice(0, max);
const digits = v => String(v || '').replace(/\D/g, '');
const now = () => new Date().toISOString();
function phoneDigits(v) {
  let d = digits(v);
  // 55 também é um DDD brasileiro: remover o país somente em números internacionais.
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
}
function validPhone(v) {
  const d = phoneDigits(v);
  return DDDS.has(d.slice(0, 2)) && !/^(\d)\1+$/.test(d.slice(2)) && ((d.length === 10 && /[2-9]/.test(d[2])) || (d.length === 11 && d[2] === '9'));
}
function safeWebsite(v) {
  let s = text(v, 400);
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) {
    if (!/^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(s)) return '';
    s = 'https://' + s;
  }
  try { const u = new URL(s); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; }
}
function inferOrigin(t = {}) {
  const source = text(t.utmSource || t.utm_source).toLowerCase();
  if (t.fbclid || /facebook|instagram|meta/.test(source)) return 'Meta Ads';
  if (t.gclid || t.gbraid || t.wbraid || source.includes('google')) return 'Google Ads';
  if (t.referrer) return 'Referência / orgânico';
  return 'Direto / orgânico';
}
function readTracking(t = {}) {
  if (!t || typeof t !== 'object' || Array.isArray(t)) t = {};
  const result = {};
  for (const [camel, snake] of [['utmSource','utm_source'], ['utmMedium','utm_medium'], ['utmCampaign','utm_campaign'], ['utmContent','utm_content'], ['utmTerm','utm_term']]) result[camel] = text(t[camel] || t[snake], 160);
  for (const k of ['fbclid', 'gclid', 'gbraid', 'wbraid']) result[k] = text(t[k], 240);
  // Só a origem do referenciador; não armazenar parâmetros potencialmente pessoais.
  try { result.referrer = t.referrer ? new URL(t.referrer).origin : ''; } catch { result.referrer = ''; }
  return { ...result, origem: inferOrigin(result), campanha: result.utmCampaign, anuncio: result.utmContent, plataforma: result.utmSource };
}
function autoTemperature(l) {
  if (['perdido', 'sem_resposta'].includes(l.status)) return 'frio';
  if (l.status === 'fechado' || l.faturaRecebida || ['proposta', 'negociacao', 'visita_realizada'].includes(l.status)) return 'quente';
  if (l.interesse || ['contatado', 'interessado', 'visita_solicitada'].includes(l.status) || (l.canal === 'site' && l.phone)) return 'morno';
  return 'frio';
}
function scoreLead(l) {
  const spec = Object.hasOwn(SEGMENTS, l.segment) ? SEGMENTS[l.segment] : null;
  let s = spec ? 42 + (spec.intensity - 3) * 8 : 42;
  if (l.phone) s += 20; if (l.city) s += 5; if (l.website) s += 3;
  const bill = Number(l.contaEst) || 0;
  if (bill >= 500) s += 10; if (bill >= 1000) s += 10; if (bill >= 3000) s += 8;
  if (l.propertyType === 'industrial' || l.segment === 'galpao') s += 5;
  if (l.interesse) s += 5; if (l.faturaRecebida) s += 5;
  return Math.min(100, s);
}
function normalizeLead(raw) {
  const l = { ...raw };
  l.name = text(l.name, 120); l.phone = phoneDigits(l.phone); l.city = text(l.city, 100);
  l.status = STATUSES.includes(l.status) ? l.status : 'novo';
  l.propertyType = Object.hasOwn(PROPERTIES, l.propertyType) ? l.propertyType : 'comercial';
  l.segmentLabel = text(l.segmentLabel) || PROPERTIES[l.propertyType];
  l.canal = l.canal || (l.simulatedAt || l.tipo === 'PF/PJ' || l.origem === 'landing' ? 'site' : 'prospeccao');
  l.contaFonte = l.contaFonte || (l.canal === 'prospeccao' ? 'estimativa_segmento' : 'informada');
  l.origem = l.origem === 'landing' ? 'Direto / orgânico' : text(l.origem) || 'Prospecção';
  l.createdAt = l.createdAt || l.addedAt || null; l.addedAt = l.addedAt || l.createdAt;
  l.simulatedAt = l.simulatedAt || (l.canal === 'site' ? l.createdAt : null);
  l.lastContact = l.lastContact || null; l.nextContactDate = text(l.nextContactDate, 10);
  l.campanha = text(l.campanha || l.utmCampaign, 160); l.anuncio = text(l.anuncio || l.utmContent, 160);
  l.interesse = Boolean(l.interesse || ['interessado','visita_solicitada','visita_realizada','proposta','negociacao','fechado'].includes(l.status));
  l.faturaRecebida = Boolean(l.faturaRecebida);
  l.propostaEnviada = Boolean(l.propostaEnviada || ['proposta','negociacao','fechado'].includes(l.status));
  l.vendaRealizada = Boolean(l.vendaRealizada || l.status === 'fechado');
  l.temperaturaManual = Boolean(l.temperaturaManual);
  l.temperatura = TEMPERATURES.includes(l.temperatura) ? l.temperatura : autoTemperature(l);
  l.website = safeWebsite(l.website); l.notes = text(l.notes, 4000);
  l.history = Array.isArray(l.history) ? l.history.slice(-60) : [];
  if (!l.systemValue && Number.isFinite(Number(l.contaEst)) && Number(l.contaEst) >= 150) Object.assign(l, solarEstimate(l.contaEst, l.propertyType));
  l.score = scoreLead(l);
  return l;
}
function history(l, action) { l.history = [...(l.history || []), { at: now(), action: text(action, 280) }].slice(-60); }
function newId() { return 'lead-' + crypto.randomUUID(); }
function filteredLeads(leads, query = {}) {
  let a = [...leads];
  const days = Math.max(0, Math.min(3650, Number(query.days) || 0));
  if (days) { const since = Date.now() - days * 86400000; a = a.filter(l => new Date(l.lastSimulationAt || l.simulatedAt || l.addedAt || 0).getTime() >= since); }
  for (const k of ['status', 'temperatura', 'canal']) if (query[k] && query[k] !== 'todos') a = a.filter(l => l[k] === query[k]);
  const campaign = text(query.campaign, 160).toLocaleLowerCase('pt-BR');
  if (campaign) a = a.filter(l => text(l.campanha).toLocaleLowerCase('pt-BR').includes(campaign));
  const q = text(query.q).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if (q) a = a.filter(l => [l.name,l.city,l.phone,l.campanha].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));
  return a;
}
function csvCell(v) {
  let s = String(v == null ? '' : v);
  if (/^\s*[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
module.exports = { STATUSES, TEMPERATURES, PROPERTIES, SEGMENTS, text, digits, now, phoneDigits, validPhone, safeWebsite, readTracking, autoTemperature, scoreLead, normalizeLead, history, newId, filteredLeads, csvCell };
