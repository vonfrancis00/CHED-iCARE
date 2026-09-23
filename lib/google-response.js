// Apps Script executes at script.google.com, then serves the completed result
// from script.googleusercontent.com. Retry only that GET when delivery stalls.
export async function fetchAppsScript(url, options) {
  const response = await fetch(url, { ...options, redirect: 'manual' });
  if (![302, 303].includes(response.status)) return response;
  const location = new URL(response.headers.get('location'), url);
  if (location.protocol !== 'https:' || location.hostname !== 'script.googleusercontent.com' || location.username || location.password) {
    await response.body?.cancel();
    throw new Error('Unexpected Apps Script redirect');
  }
  await response.body?.cancel();
  // Spend the remaining request budget retrieving the already-completed result.
  // A stalled delivery must not rerun the spreadsheet operation.
  const attempts = 5;
  for (let attempt = 0; attempt < attempts; attempt++) {
    options.signal.throwIfAborted();
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal.addEventListener('abort', abort, { once: true });
    if (options.signal.aborted) abort();
    const timer = setTimeout(abort, 10000);
    try {
      const result = await fetch(location, {
        method: 'GET', redirect: 'error', cache: 'no-store', signal: controller.signal
      });
      const body = await result.arrayBuffer();
      if (attempt < attempts - 1 && [429, 500, 502, 503, 504].includes(result.status)) continue;
      return new Response(body, { status: result.status, headers: result.headers });
    } catch (error) {
      if (options.signal.aborted || attempt === attempts - 1) throw error;
    } finally {
      clearTimeout(timer);
      options.signal.removeEventListener('abort', abort);
    }
  }
}
