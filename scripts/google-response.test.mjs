import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAppsScript } from '../lib/google-response.js';

test('stalled result delivery retries GET without resending credentials or executing POST again', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), ...options });
    if (calls.length === 1) return new Response(null, { status: 302, headers: { location: 'https://script.googleusercontent.com/macros/echo?result=test' } });
    if (calls.length === 2) return new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
    return Response.json({ success: true });
  };
  try {
    const pending = fetchAppsScript('https://script.google.com/macros/s/test/exec', {
      method: 'POST', body: 'credentials', signal: new AbortController().signal
    });
    for (let i = 0; i < 20 && calls.length < 2; i++) await Promise.resolve();
    assert.equal(calls.length, 2);
    t.mock.timers.tick(10000);
    assert.deepEqual(await (await pending).json(), { success: true });
    assert.deepEqual(calls.map(call => call.method), ['POST', 'GET', 'GET']);
    assert.equal(calls[1].body, undefined);
    assert.equal(calls[2].body, undefined);
  } finally { globalThis.fetch = original; }
});

test('unexpected redirect hosts are rejected without forwarding credentials', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(null, { status: 302, headers: { location: 'https://example.com/' } }); };
  try {
    await assert.rejects(fetchAppsScript('https://script.google.com/macros/s/test/exec', {
      signal: new AbortController().signal
    }), /Unexpected Apps Script redirect/);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test('result delivery can recover after three transient failures without re-executing Apps Script', async () => {
  const original = globalThis.fetch;
  let executions = 0;
  let downloads = 0;
  globalThis.fetch = async url => {
    if (new URL(url).hostname === 'script.google.com') {
      executions++;
      return new Response(null, {status:302, headers:{location:'https://script.googleusercontent.com/macros/echo?result=recovery'}});
    }
    downloads++;
    return downloads < 4 ? new Response('Unavailable', {status:503}) : Response.json({success:true});
  };
  try {
    const result = await fetchAppsScript('https://script.google.com/macros/s/test/exec', {method:'POST', body:'test', signal:AbortSignal.timeout(55000)});
    assert.equal((await result.json()).success, true);
    assert.equal(executions, 1);
    assert.equal(downloads, 4);
  } finally { globalThis.fetch = original; }
});
