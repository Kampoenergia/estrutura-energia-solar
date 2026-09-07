const crypto = require('node:crypto');
const { advertisingCsp } = require('./ads');
function limiter({ limit, windowMs, message }) {
  const entries = new Map();
  return (req, res, next) => {
    const now = Date.now();
    if (entries.size > 2000) for (const [k, v] of entries) if (v.until <= now) entries.delete(k);
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let record = entries.get(key);
    if (!record || record.until <= now) {
      if (entries.size > 10000) return res.status(429).json({ error: message });
      record = { count: 0, until: now + windowMs }; entries.set(key, record);
    }
    record.count++;
    if (record.count > limit) {
      res.set('Retry-After', String(Math.ceil((record.until - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}
function protection({ preview, siteUrl, trustProxy, advertising }) {
  return (req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    const ads = advertisingCsp(advertising, ['/captar','/captar.html'].includes(req.path));
    res.set('Content-Security-Policy', `default-src 'self'; script-src 'self' ${ads.scripts.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data: ${ads.images.join(' ')}; connect-src 'self' ${ads.connections.join(' ')}; frame-src 'self' ${ads.frames.join(' ')}; object-src 'none'; base-uri 'self'; form-action 'self'` + (preview ? '' : "; frame-ancestors 'self'"));
    if (!preview) res.set('X-Frame-Options', 'SAMEORIGIN');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.get('origin');
      const hosts = [req.get('host')];
      if (trustProxy && req.get('x-forwarded-host')) hosts.push(req.get('x-forwarded-host').split(',')[0].trim());
      const protocol = req.secure ? 'https:' : 'http:';
      let ok = !origin;
      try {
        if (origin) {
          const parsed = new URL(origin);
          ok = siteUrl ? parsed.origin === new URL(siteUrl).origin : parsed.protocol === protocol && hosts.includes(parsed.host);
        }
      } catch { ok = false; }
      if (!ok || (!origin && req.get('sec-fetch-site') === 'cross-site')) return res.status(403).json({ error: 'Origem da solicitação não permitida. Abra o site diretamente em uma nova aba.' });
    }
    next();
  };
}
function authentication({ password, production, preview }) {
  const sessions = new Map();
  const ttl = 1000 * 60 * 60 * 12;
  const expected = crypto.createHash('sha256').update(password).digest();
  function token(req) { return (req.headers.cookie || '').match(/(?:^|;\s*)estrutura_auth=([a-f0-9]{64})(?:;|$)/)?.[1] || ''; }
  function authed(req) {
    const t = token(req), expires = sessions.get(t);
    if (!expires || expires <= Date.now()) { sessions.delete(t); return false; }
    return true;
  }
  function cookie(req, value, maxAge) {
    const secure = production || req.secure;
    return `estrutura_auth=${value}; Path=/; HttpOnly; SameSite=${preview && secure ? 'None' : 'Lax'}; Max-Age=${maxAge}` + (secure ? '; Secure' : '') + (preview && secure ? '; Partitioned' : '');
  }
  function login(req, res) {
    const candidate = crypto.createHash('sha256').update(typeof req.body?.senha === 'string' ? req.body.senha : '').digest();
    if (!crypto.timingSafeEqual(candidate, expected)) return res.status(401).json({ error: 'Senha incorreta.' });
    const now = Date.now();
    for (const [k, expires] of sessions) if (expires <= now) sessions.delete(k);
    if (sessions.size >= 2000) sessions.delete(sessions.keys().next().value);
    sessions.delete(token(req));
    const t = crypto.randomBytes(32).toString('hex'); sessions.set(t, now + ttl);
    res.set('Set-Cookie', cookie(req, t, ttl / 1000)); res.json({ ok: true });
  }
  function logout(req, res) { sessions.delete(token(req)); res.set('Set-Cookie', cookie(req, '', 0)); res.json({ ok: true }); }
  function requireAuth(req, res, next) {
    if (authed(req)) { res.set('Cache-Control', 'no-store'); return next(); }
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Sua sessão terminou. Entre novamente no painel.' });
    res.redirect('/login');
  }
  return { authed, requireAuth, login, logout };
}
module.exports = { limiter, protection, authentication };
