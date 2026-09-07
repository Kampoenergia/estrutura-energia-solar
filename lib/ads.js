// ID informado pelo usuário para o novo projeto. O Pixel Eduardo NÃO é utilizado.
const DEFAULT_META_PIXEL_ID = '1425129716157804';
// Identificadores do Google Ads confirmados pelo usuário em texto.
const DEFAULT_GOOGLE_ADS_ID = 'AW-17289607771';
const DEFAULT_GOOGLE_ADS_LEAD_LABEL = 'SJlgCKvclvAcENv0qbRA';
function advertisingConfig({ env = process.env, production = false, preview = false } = {}) {
  const pixel = String(env.META_PIXEL_ID ?? DEFAULT_META_PIXEL_ID).trim();
  const rawGoogle = String(env.GOOGLE_ADS_ID ?? DEFAULT_GOOGLE_ADS_ID).trim();
  const google = /^\d{6,20}$/.test(rawGoogle) ? 'AW-' + rawGoogle : rawGoogle;
  const leadLabel = String(env.GOOGLE_ADS_LEAD_LABEL ?? DEFAULT_GOOGLE_ADS_LEAD_LABEL).trim();
  const whatsappLabel = String(env.GOOGLE_ADS_WHATSAPP_LABEL || '').trim();
  const metaReady = /^\d{8,20}$/.test(pixel);
  const googleReady = /^AW-\d{6,20}$/.test(google) && /^[A-Za-z0-9_-]{3,120}$/.test(leadLabel);
  const whatsappReady = /^[A-Za-z0-9_-]{3,120}$/.test(whatsappLabel);
  const requested = env.ADS_TRACKING_ENABLED === 'true';
  const enabled = requested && production && !preview && (metaReady || googleReady);
  return {
    enabled, requested, preview, production, metaReady, googleReady,
    metaPixelId: metaReady ? pixel : '',
    googleAdsId: googleReady ? google : '',
    googleLeadLabel: googleReady ? leadLabel : '',
    googleWhatsAppLabel: googleReady && whatsappReady ? whatsappLabel : '',
    consentVersion: 'ads-v1', mode: 'basic',
    status: preview ? 'Bloqueado na prévia' : !production ? 'Bloqueado em desenvolvimento' : !requested ? 'Aguardando ativação' : enabled ? 'Habilitado; depende de consentimento e validação externa' : 'Identificadores inválidos ou ausentes'
  };
}
function advertisingCsp(config, landing) {
  const sources = { scripts: [], images: [], connections: [], frames: [] };
  if (!landing || !config?.enabled) return sources;
  if (config.metaReady) {
    sources.scripts.push('https://connect.facebook.net');
    sources.images.push('https://www.facebook.com');
    sources.connections.push('https://www.facebook.com', 'https://connect.facebook.net');
  }
  if (config.googleReady) {
    sources.scripts.push('https://www.googletagmanager.com', 'https://www.googleadservices.com', 'https://googleads.g.doubleclick.net', 'https://www.google.com');
    const hosts = ['https://www.googletagmanager.com', 'https://www.googleadservices.com', 'https://googleads.g.doubleclick.net', 'https://www.google.com', 'https://www.google.com.br', 'https://pagead2.googlesyndication.com'];
    sources.images.push(...hosts); sources.connections.push(...hosts);
    sources.frames.push('https://www.googletagmanager.com', 'https://td.doubleclick.net', 'https://www.google.com');
  }
  return sources;
}
module.exports = { advertisingConfig, advertisingCsp };
