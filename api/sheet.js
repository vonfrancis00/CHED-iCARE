import { createHmac, timingSafeEqual } from 'node:crypto';

// Auth is checked before these shared, short-lived data caches are consulted.
// Never cache login, account operations or errors.
const dataCache = new Map();
const dataRequests = new Map();
let dataRevision = 0;
const DATA_CACHE_MS = 5 * 60 * 1000;

function invalidateData() {
  dataRevision += 1;
  dataCache.clear();
  dataRequests.clear();
}

async function readGoogleData(upstream, signal, cacheable) {
  const key = upstream.toString();
  const revision = dataRevision;
  const cached = dataCache.get(key);
  if (cacheable && cached && cached.expires > Date.now()) return cached.payload;
  if (cacheable && dataRequests.has(key)) return dataRequests.get(key);
  const pending = (async () => {
    const response = await fetchGoogle(upstream, signal, upstream.searchParams.get('action') !== 'clearDashboardCache');
    if (!response.ok) throw new Error(`Google returned HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
    if (cacheable && payload.success === true && revision === dataRevision) {
      if (dataCache.size >= 100) dataCache.delete(dataCache.keys().next().value);
      dataCache.set(key, { payload, expires: Date.now() + DATA_CACHE_MS });
    }
    return payload;
  })();
  if (cacheable) dataRequests.set(key, pending);
  try {
    return await pending;
  } finally {
    if (dataRequests.get(key) === pending) dataRequests.delete(key);
  }
}

function session(req, secret) {
  const token = (req.headers?.cookie || '').split('; ').find(part => part.startsWith('childcare_session='))?.slice(18);
  if (!token || !secret) return null;
  const [data, signature] = token.split('.');
  if (!data || !signature) return null;
  const expected = createHmac('sha256', secret).update(data).digest('hex');
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    return payload.expires > Date.now() ? payload.user : null;
  } catch { return null; }
}

function setSession(res, user, secret, secure) {
  const data = Buffer.from(JSON.stringify({ user, expires: Date.now() + 8 * 3600000 })).toString('base64url');
  const signature = createHmac('sha256', secret).update(data).digest('hex');
  res.setHeader('Set-Cookie', `childcare_session=${data}.${signature}; HttpOnly; SameSite=Lax; Path=/api/sheet; Max-Age=28800${secure ? '; Secure' : ''}`);
}

// Keep Google's ContentService redirects on the server, outside the browser.
export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'private, no-store');
  const configuredCode = (env.SHEET_API_ACCESS_CODE || env.VITE_SHEET_API_ACCESS_CODE || '').trim();
  const secret = (env.SESSION_SECRET || configuredCode).trim();
  const secure = env.NODE_ENV === 'production' || !!req.headers?.['x-forwarded-proto']?.includes('https');
  const input = new URL(req.url, 'https://local.invalid');
  const action = input.searchParams.get('action');
  // This fixed warm-up only prepares server memory. It never returns records
  // or accepts filters/URLs from an unauthenticated visitor.
  const prepareRecords = action === 'prepareRecords';
  if (!secret) return res.status(503).json({ success: false, message: 'Configure SESSION_SECRET on the server before enabling login.' });
  if (action === 'logout' && req.method === 'POST') {
    res.setHeader('Set-Cookie', `childcare_session=; HttpOnly; SameSite=Lax; Path=/api/sheet; Max-Age=0${secure ? '; Secure' : ''}`);
    return res.status(200).json({ success: true });
  }
  if (action === 'session' && req.method === 'GET') return res.status(200).json({ success: true, user: session(req, secret) });
  if (!['prepareRecords', 'login', 'createUser', 'updateUser', 'deleteUser', 'listUsers', 'getDashboardData', 'getInstitutions', 'getSurveyResponses', 'clearDashboardCache'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Unknown action.' });
  }
  if (['login', 'createUser', 'updateUser', 'deleteUser'].includes(action) ? req.method !== 'POST' : req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed.' });
  const currentUser = session(req, secret);
  if (action !== 'login' && !prepareRecords && !currentUser) return res.status(401).json({ success: false, message: 'Please sign in.' });
  if (['createUser', 'updateUser', 'deleteUser', 'listUsers'].includes(action) && currentUser.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Only a super admin can manage users.' });
  if (['createUser', 'updateUser', 'deleteUser', 'listUsers'].includes(action) && !configuredCode) return res.status(503).json({ success: false, message: 'Configure the server-side Apps Script access code before managing users.' });
  let upstream;
  try {
    upstream = new URL((env.SHEET_API_URL || env.VITE_SHEET_API_URL || '').trim());
    if (upstream.protocol !== 'https:' || upstream.hostname !== 'script.google.com' || !/^\/macros\/s\/[^/]+\/exec\/?$/.test(upstream.pathname)) throw new Error();
  } catch {
    return res.status(503).json({ success: false, message: 'The production data source is not configured correctly.' });
  }
  upstream.search = '';
  upstream.searchParams.set('action', prepareRecords ? 'getInstitutions' : action);
  if (configuredCode && action !== 'login') upstream.searchParams.set('code', configuredCode);
  if (action === 'listUsers') upstream.searchParams.set('actorEmail', currentUser.email);
  // Forward every record-filter parameter to Apps Script. Filtering must happen
  // upstream of pagination, otherwise a 20-row page can shrink to only the few
  // matching rows it happened to contain.
  for (const key of prepareRecords ? [] : ['page', 'pageSize', 'query', 'institutionType', 'region']) {
    const value = input.searchParams.get(key);
    if (value) upstream.searchParams.set(key, value);
  }
  if (prepareRecords) {
    upstream.searchParams.set('page', '1');
    upstream.searchParams.set('pageSize', '20');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), action === 'login' ? 20000 : 55000);
  try {
    if (['login', 'createUser', 'updateUser', 'deleteUser'].includes(action)) {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 4096) return res.status(413).json({ success: false, message: 'Request too large.' });
      }
      const credentials = JSON.parse(body);
      const upstreamBody = action === 'login'
        ? { code: configuredCode, email: credentials.email, password: credentials.password }
        : { code: configuredCode, action, actorEmail: currentUser.email,
            targetEmail: credentials.targetEmail, email: credentials.email, password: credentials.password,
            name: credentials.name, office: credentials.office, role: credentials.role };
      const response = await fetch(upstream, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(upstreamBody),
        redirect: 'follow', signal: controller.signal, cache: 'no-store'
      });
      if (!response.ok) throw new Error(`Google returned HTTP ${response.status}`);
      const payload = await response.json();
      if (action === 'login' && payload.success && payload.user) setSession(res, payload.user, secret, secure);
      return res.status(payload.success ? 200 : action === 'login' ? 401 : 400).json(payload);
    }
    const cacheable = prepareRecords || ['getDashboardData', 'getInstitutions', 'getSurveyResponses'].includes(action);
    if (action === 'clearDashboardCache') invalidateData();
    const payload = await readGoogleData(upstream, controller.signal, cacheable);
    if (prepareRecords) return res.status(payload.success ? 200 : 502).json({ success: Boolean(payload.success) });
    if (action === 'clearDashboardCache' && payload.success) invalidateData();
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(error.name === 'AbortError' ? 504 : 502).json({
      success: false,
      message: error.name === 'AbortError'
        ? action === 'login' ? 'Sign-in took too long. Please try again.' : 'Google took too long to respond. Please retry.'
        : 'Unable to read the Google data response. Please retry.'
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGoogle(upstream, signal, canRetry) {
  // Retry a failed temporary redirect from the stable deployment URL. The
  // shared signal caps ALL attempts at 55 seconds, including response parsing.
  for (let attempt = 0; attempt < (canRetry ? 3 : 1); attempt++) {
    signal.throwIfAborted();
    upstream.searchParams.set('_t', `${Date.now()}-${Math.random()}`);
    let response;
    const attemptController = new AbortController();
    const onParentAbort = () => attemptController.abort();
    signal.addEventListener('abort', onParentAbort, { once: true });
    // A stalled connection should not consume the entire request budget.
    const attemptTimer = setTimeout(() => attemptController.abort(), canRetry ? 17000 : 55000);
    try {
      response = await fetch(upstream, { signal: attemptController.signal, redirect: 'follow', cache: 'no-store' });
      // Keep both deadlines active while reading the body, not only headers.
      const body = await response.arrayBuffer();
      response = new Response(body, { status: response.status, headers: response.headers });
    } catch (error) {
      response = undefined;
      if (signal.aborted || !canRetry || attempt === 2) throw error;
    } finally {
      clearTimeout(attemptTimer);
      signal.removeEventListener('abort', onParentAbort);
    }
    if (response && (!canRetry || ![404, 429, 500, 502, 503, 504].includes(response.status) || attempt === 2)) return response;
    await response?.body?.cancel();
    await new Promise((resolve, reject) => {
      const onAbort = () => { clearTimeout(timer); reject(signal.reason); };
      const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, 500 * (attempt + 1));
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) { signal.removeEventListener('abort', onAbort); onAbort(); }
    });
  }
}
