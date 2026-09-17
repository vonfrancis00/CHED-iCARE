// Keep Google's ContentService redirects on the server, outside the browser.
export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed.' });
  const input = new URL(req.url, 'https://local.invalid');
  const action = input.searchParams.get('action');
  if (!['getDashboardData', 'getInstitutions', 'getSurveyResponses', 'clearDashboardCache'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Unknown action.' });
  }
  const configuredCode = (env.SHEET_API_ACCESS_CODE || env.VITE_SHEET_API_ACCESS_CODE || '').trim();
  if (configuredCode && input.searchParams.get('code') !== configuredCode) {
    return res.status(401).json({ success: false, message: 'Unauthorized request.' });
  }
  let upstream;
  try {
    upstream = new URL((env.SHEET_API_URL || env.VITE_SHEET_API_URL || '').trim());
    if (upstream.protocol !== 'https:' || upstream.hostname !== 'script.google.com' || !/^\/macros\/s\/[^/]+\/exec\/?$/.test(upstream.pathname)) throw new Error();
  } catch {
    return res.status(503).json({ success: false, message: 'The production data source is not configured correctly.' });
  }
  upstream.search = '';
  upstream.searchParams.set('action', action);
  if (configuredCode) upstream.searchParams.set('code', configuredCode);
  for (const key of ['page', 'pageSize', 'query']) {
    const value = input.searchParams.get(key);
    if (value) upstream.searchParams.set(key, value);
  }
  upstream.searchParams.set('_t', `${Date.now()}-${Math.random()}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const response = await fetchGoogle(upstream, controller.signal, action !== 'clearDashboardCache');
    if (!response.ok) {
      return res.status(502).json({ success: false, message: `Google's data service returned HTTP ${response.status}. Please retry.` });
    }
    const payload = await response.json();
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(error.name === 'AbortError' ? 504 : 502).json({
      success: false,
      message: error.name === 'AbortError' ? 'Google took too long to respond. Please retry.' : 'Unable to read the Google data response. Please retry.'
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
