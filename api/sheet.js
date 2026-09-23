import { createHmac, timingSafeEqual } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { fetchAppsScript } from '../lib/google-response.js';

async function readLoginResponse(sendPost, signal) {
  // Credential verification only reads the register. Retry once from the
  // deployment URL, including failed redirects and unreadable response bodies.
  // Both attempts share the caller's existing 55-second deadline.
  for (let attempt = 0; attempt < 2; attempt++) {
    signal.throwIfAborted();
    let response;
    try {
      response = await sendPost();
      if (!response.ok) throw new Error(`Google returned HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload || typeof payload.success !== 'boolean' || (payload.success && !payload.user)) {
        throw new Error('Invalid login response');
      }
      if (attempt === 0 && !payload.success && payload.message === 'Unauthorized request.') {
        await delay(500, undefined, { signal });
        continue;
      }
      return payload;
    } catch (error) {
      const temporary = !response || response.ok || [404, 429, 500, 502, 503, 504].includes(response.status);
      if (attempt > 0 || signal.aborted || !temporary) throw error;
      await response?.body?.cancel().catch(() => {});
      await delay(500, undefined, { signal });
    }
  }
}

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
  const shareable = cacheable || ['listUsers', 'listAccountRequests'].includes(upstream.searchParams.get('action'));
  if (shareable && dataRequests.has(key)) return dataRequests.get(key);
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
  if (shareable) dataRequests.set(key, pending);
  try {
    return await pending;
  } finally {
    if (dataRequests.get(key) === pending) dataRequests.delete(key);
  }
}

function session(req, secret) {
  const token = (req.headers?.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('childcare_session='))?.slice(18);
  if (!token || !secret) return null;
  const [data, signature] = token.split('.');
  if (!data || !signature) return null;
  const expected = createHmac('sha256', secret).update(data).digest('hex');
  if (!/^[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
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
  const startedAt = performance.now();
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
  if (!['prepareRecords', 'login', 'submitAccountRequest', 'createUser', 'updateUser', 'deleteUser', 'approveAccountRequest', 'listUsers', 'listAccountRequests', 'listRequestOffices', 'getDashboardData', 'getInstitutions', 'getSurveyResponses', 'clearDashboardCache'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Unknown action.' });
  }
  if (['login', 'submitAccountRequest', 'createUser', 'updateUser', 'deleteUser', 'approveAccountRequest'].includes(action) ? req.method !== 'POST' : req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed.' });
  const currentUser = session(req, secret);
  if (!['login', 'submitAccountRequest', 'listRequestOffices'].includes(action) && !prepareRecords && !currentUser) return res.status(401).json({ success: false, message: 'Please sign in.' });
  if (['createUser', 'updateUser', 'deleteUser', 'approveAccountRequest', 'listUsers', 'listAccountRequests'].includes(action) && currentUser.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Only a super admin can manage users.' });
  if (['createUser', 'updateUser', 'deleteUser', 'approveAccountRequest', 'listUsers', 'listAccountRequests'].includes(action) && !configuredCode) return res.status(503).json({ success: false, message: 'Configure the server-side Apps Script access code before managing users.' });
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
  if (['listUsers', 'listAccountRequests'].includes(action)) upstream.searchParams.set('actorEmail', currentUser.email);
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
  // A cold authentication request needs the full upstream budget too.
  const timer = setTimeout(() => controller.abort(), action === 'submitAccountRequest' ? 40000 : 55000);
  let upstreamStartedAt;
  function recordLoginTiming() {
    if (!['login', 'submitAccountRequest'].includes(action)) return;
    const now = performance.now();
    const timings = [`total;dur=${(now - startedAt).toFixed(1)}`];
    if (upstreamStartedAt !== undefined) {
      timings.push(`request;dur=${(upstreamStartedAt - startedAt).toFixed(1)}`);
      timings.push(`google;dur=${(now - upstreamStartedAt).toFixed(1)}`);
    }
    res.setHeader('Server-Timing', timings.join(', '));
  }
  try {
    if (['login', 'submitAccountRequest', 'createUser', 'updateUser', 'deleteUser', 'approveAccountRequest'].includes(action)) {
      // Vercel parses JSON bodies; Vite supplies the raw IncomingMessage.
      let body = req.body;
      if (body === undefined) {
        body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 4096) return res.status(413).json({ success: false, message: 'Request too large.' });
        }
      }
      if (Buffer.isBuffer(body)) body = body.toString('utf8');
      if (Buffer.byteLength(typeof body === 'string' ? body : JSON.stringify(body)) > 4096) return res.status(413).json({ success: false, message: 'Request too large.' });
      let credentials;
      try {
        credentials = typeof body === 'string' ? JSON.parse(body) : body;
        if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) throw new Error();
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid JSON request body.' });
      }
      if (action === 'submitAccountRequest') {
        credentials.name = String(credentials.name || '').trim();
        credentials.email = String(credentials.email || '').trim().toLowerCase();
        credentials.office = String(credentials.office || '').trim();
        if (!credentials.name || !credentials.office || !/^[^\s@]+@ched\.gov\.ph$/.test(credentials.email)) {
          return res.status(400).json({ success: false, message: 'Enter your name, a valid @ched.gov.ph email, and office.' });
        }
      }
      const upstreamBody = action === 'login' || action === 'submitAccountRequest'
        ? { code: configuredCode, action, email: credentials.email, password: credentials.password }
        : { code: configuredCode, action, actorEmail: currentUser.email,
            targetEmail: credentials.targetEmail, email: credentials.email, password: credentials.password,
            name: credentials.name, office: credentials.office, role: credentials.role, requestRow: credentials.requestRow };
      if (action === 'submitAccountRequest') Object.assign(upstreamBody, { action, name: credentials.name, office: credentials.office });
      upstreamStartedAt = performance.now();
      const sendPost = () => fetchAppsScript(upstream, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(upstreamBody),
        redirect: 'follow', signal: controller.signal, cache: 'no-store'
      });
      let response;
      let payload;
      let uncertainWrite = false;
      try {
        if (action === 'login') {
          payload = await readLoginResponse(sendPost, controller.signal);
        } else {
          response = await sendPost();
          if (!response.ok) throw new Error(`Google returned HTTP ${response.status}`);
          payload = await response.json();
        }
      } catch (error) {
        if (action !== 'submitAccountRequest') throw error;
        uncertainWrite = true;
        payload = { success: false, message: 'Your request could not yet be confirmed. Please try again shortly.' };
      }
      // A write may have committed even if its response was lost. Read back the
      // matching request; never repeat the write or assume a timeout is success.
      if (action === 'submitAccountRequest' && uncertainWrite) {
        const verification = new AbortController();
        const verificationTimer = setTimeout(() => verification.abort(), 15000);
        try {
          const verificationUrl = new URL(upstream);
          verificationUrl.search = '';
          const checked = await fetchAppsScript(verificationUrl, {
            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ ...upstreamBody, action: 'checkAccountRequest' }),
            redirect: 'follow', signal: verification.signal, cache: 'no-store'
          });
          if (checked.ok) {
            const confirmed = await checked.json();
            if (confirmed.success === true) payload = confirmed;
          }
        } catch { /* Preserve the original failure if verification is unavailable. */ }
        finally { clearTimeout(verificationTimer); }
      }
      recordLoginTiming();
      if (action === 'login' && payload.success === false && payload.message === 'Unauthorized request.') {
        return res.status(503).json({ success: false, message: 'The sign-in service rejected the server access code. Please ask the administrator to check the Apps Script deployment and access-code configuration.' });
      }
      if (action === 'login' && payload.success && payload.user) setSession(res, payload.user, secret, secure);
      if (['createUser', 'updateUser', 'deleteUser', 'approveAccountRequest', 'submitAccountRequest'].includes(action)) {
        // A following directory refresh must not join a read started before this write.
        dataRequests.clear();
      }
      return res.status(payload.success ? 200 : action === 'login' ? 401 : 400).json(payload);
    }
    const cacheable = prepareRecords || ['listRequestOffices', 'getDashboardData', 'getInstitutions', 'getSurveyResponses'].includes(action);
    if (action === 'clearDashboardCache') invalidateData();
    const payload = await readGoogleData(upstream, controller.signal, cacheable);
    if (prepareRecords) return res.status(payload.success ? 200 : 502).json({ success: Boolean(payload.success) });
    if (action === 'clearDashboardCache' && payload.success) invalidateData();
    return res.status(200).json(payload);
  } catch (error) {
    recordLoginTiming();
    return res.status(error.name === 'AbortError' ? 504 : 502).json({
      success: false,
      message: error.name === 'AbortError'
        ? action === 'login' ? 'Sign-in took too long. Please try again.' : action === 'submitAccountRequest' ? 'We could not confirm your request in time. It may already have been received. Wait a moment before retrying; duplicate requests will not be added.' : 'Google took too long to respond. Please retry.'
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
    // Cold Sheets reads can exceed 17 seconds. Let the shared deadline bound
    // the read instead of repeatedly cancelling otherwise healthy executions.
    try {
      response = await fetchAppsScript(upstream, { signal: attemptController.signal, cache: 'no-store' });
      // Keep both deadlines active while reading the body, not only headers.
      const body = await response.arrayBuffer();
      response = new Response(body, { status: response.status, headers: response.headers });
    } catch (error) {
      response = undefined;
      if (signal.aborted || !canRetry || attempt === 2) throw error;
    } finally {
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
