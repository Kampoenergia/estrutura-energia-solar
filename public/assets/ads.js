// Medição direta de Meta e Google Ads. Não instalar as mesmas tags também via GTM.
const CONSENT_KEY = 'estrutura_ads_consent_v1';
const EVENTS_KEY = 'estrutura_ads_events_v1';
const MAX_AGE = 180 * 86400000;
let settings = { enabled: false }, choice = null, initialized = false, started = false;
let seen = new Set(), lastWhatsApp = 0;
const status = { meta: 'inativo', google: 'inativo', leadAttempts: 0, whatsappAttempts: 0 };
function stored(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Sem armazenamento: preferência só nesta página. */ } }
function remove(key) { try { localStorage.removeItem(key); } catch {} }
const preference = stored(CONSENT_KEY);
if (preference && preference.version === 'ads-v1' && typeof preference.granted === 'boolean' && Date.now() - preference.at < MAX_AGE) choice = preference;
function loadScript(src, name) {
  if (document.querySelector('script[data-estrutura-ad="' + name + '"]')) return;
  const script = document.createElement('script'); script.async = true; script.src = src; script.dataset.estruturaAd = name;
  status[name] = 'carregando';
  script.onload = () => { status[name] = 'biblioteca carregada; recebimento depende da plataforma'; };
  script.onerror = () => { status[name] = 'bloqueado ou indisponível'; };
  document.head.appendChild(script);
}
function googleConsent(granted) {
  return { ad_storage: granted ? 'granted' : 'denied', ad_user_data: granted ? 'granted' : 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
}
function start() {
  if (started || !settings.enabled || !hasAdConsent()) return;
  started = true;
  const history = stored(EVENTS_KEY);
  if (history && Date.now() - history.at < MAX_AGE && Array.isArray(history.ids)) seen = new Set(history.ids.filter(id => typeof id === 'string').slice(-100));
  if (settings.metaPixelId) {
    if (!window.fbq) {
      const fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
      fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
      window.fbq = fbq; if (!window._fbq) window._fbq = fbq;
    }
    // Sem correspondência avançada ou coleta automática de campos do formulário.
    window.fbq('set', 'autoConfig', false, settings.metaPixelId);
    window.fbq('init', settings.metaPixelId);
    window.fbq('consent', 'grant');
    window.fbq('trackSingle', settings.metaPixelId, 'PageView');
    loadScript('https://connect.facebook.net/en_US/fbevents.js', 'meta');
  }
  if (settings.googleAdsId && settings.googleLeadLabel) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', googleConsent(false));
    window.gtag('set', 'ads_data_redaction', true);
    window.gtag('consent', 'update', googleConsent(true));
    window.gtag('js', new Date());
    window.gtag('config', settings.googleAdsId, { allow_enhanced_conversions: false, allow_ad_personalization_signals: false });
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(settings.googleAdsId), 'google');
  }
}
function clearAdCookies() {
  const names = document.cookie.split(';').map(v => v.split('=')[0].trim()).filter(n => /^_fb[pc]$|^_gcl_/.test(n));
  const pieces = location.hostname.split('.');
  const domains = ['', ...pieces.map((_, i) => '.' + pieces.slice(i).join('.'))];
  for (const name of names) for (const domain of domains) document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '') + (domain ? '; Domain=' + domain : '');
}
function choose(granted) {
  choice = { version: 'ads-v1', granted, at: Date.now() }; save(CONSENT_KEY, choice);
  document.getElementById('ad-consent-banner')?.remove();
  if (granted) { start(); return; }
  remove(EVENTS_KEY); seen.clear(); clearAdCookies();
  try { sessionStorage.removeItem('estrutura_tracking'); } catch {}
  if (started) {
    try { window.fbq?.('consent', 'revoke'); window.gtag?.('consent', 'update', googleConsent(false)); } catch {}
    // Recarregar encerra as bibliotecas já carregadas. O aviso é exibido antes da escolha.
    location.reload();
  }
}
function showChoices() {
  document.getElementById('ad-consent-banner')?.remove();
  const panel = document.createElement('section'); panel.id = 'ad-consent-banner'; panel.className = 'ad-consent-banner';
  panel.setAttribute('aria-label', 'Preferências de medição de anúncios');
  const title = document.createElement('h2'); title.textContent = settings.enabled ? 'Podemos medir os resultados dos anúncios?' : 'Medição de anúncios desativada neste ambiente';
  const text = document.createElement('p');
  text.textContent = settings.enabled ? 'Com sua permissão, Meta e Google podem usar cookies e dados de navegação para medir nossas campanhas. O formulário funciona mesmo se você recusar. Nome, telefone e valores da simulação não são incluídos nos eventos que configuramos.' : 'As tags não são carregadas na prévia ou enquanto a ativação não estiver configurada. Nenhum evento de anúncio é enviado por esta integração neste estado.';
  const actions = document.createElement('div'); actions.className = 'ad-consent-actions';
  const button = (label, handler) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'button button-secondary button-small'; b.textContent = label; b.addEventListener('click', handler); actions.appendChild(b); };
  if (settings.enabled) { button('Permitir medição', () => choose(true)); button('Recusar medição', () => choose(false)); }
  else button('Entendi', () => panel.remove());
  button('Privacidade', () => document.getElementById('privacy-dialog')?.showModal());
  panel.append(title, text, actions);
  if (started) { const notice = document.createElement('p'); notice.className = 'ad-consent-note'; notice.textContent = 'Se você recusar agora, a página será recarregada para interromper as tags já carregadas. Conclua ou salve seu formulário antes de alterar.'; panel.appendChild(notice); }
  document.body.appendChild(panel);
}
export function hasAdConsent() { return choice?.granted === true; }
export function advertisingConsent() { return { version: 'ads-v1', granted: hasAdConsent(), reportedAt: choice?.at ? new Date(choice.at).toISOString() : null }; }
export function initAdvertising(config = {}) {
  if (initialized) return; initialized = true; settings = config;
  document.querySelectorAll('[data-ad-preferences]').forEach(button => button.addEventListener('click', showChoices));
  window.estruturaAdsStatus = () => ({ enabled: Boolean(settings.enabled), consent: choice?.granted ?? 'não escolhido', ...status });
  if (!settings.enabled) return;
  if (!choice) showChoices(); else if (hasAdConsent()) start();
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]'); if (!link || !hasAdConsent() || !started) return;
    let url; try { url = new URL(link.href); } catch { return; }
    if (url.hostname !== 'wa.me' && url.hostname !== 'api.whatsapp.com') return;
    if (Date.now() - lastWhatsApp < 1200) return; lastWhatsApp = Date.now();
    // NUNCA enviar o href: a mensagem de WhatsApp contém dados pessoais.
    const placement = link.id === 'result-whatsapp' ? 'resultado' : 'pagina';
    const eventId = 'wa_' + crypto.randomUUID(); status.whatsappAttempts++;
    if (settings.metaPixelId) window.fbq?.('trackSingleCustom', settings.metaPixelId, 'WhatsAppClick', { placement }, { eventID: eventId });
    if (settings.googleAdsId && settings.googleWhatsAppLabel) window.gtag?.('event', 'conversion', { send_to: settings.googleAdsId + '/' + settings.googleWhatsAppLabel, transaction_id: eventId });
  });
}
export function trackConfirmedLead(eventId) {
  try {
    if (!started || !settings.enabled || !hasAdConsent() || !/^lead_[a-f0-9-]{20,50}$/.test(eventId || '') || seen.has(eventId)) return;
    seen.add(eventId); save(EVENTS_KEY, { at: Date.now(), ids: [...seen].slice(-100) }); status.leadAttempts++;
    // A conversão representa um contato, não uma compra: sem receita ou valor financeiro.
    if (settings.metaPixelId) window.fbq?.('trackSingle', settings.metaPixelId, 'Lead', { content_name: 'Solicitacao solar' }, { eventID: eventId });
    if (settings.googleAdsId && settings.googleLeadLabel) window.gtag?.('event', 'conversion', { send_to: settings.googleAdsId + '/' + settings.googleLeadLabel, transaction_id: eventId });
  } catch { /* Falhas de medição nunca devem interromper a captura do contato. */ }
}
