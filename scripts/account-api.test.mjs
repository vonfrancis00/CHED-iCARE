import test from 'node:test';
import assert from 'node:assert/strict';
import { accountFetch } from '../src/services/accountApi.js';

test('account reads stop waiting after the deadline, including stalled response bodies', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, { signal }) => ({ ok: true, status: 200,
    text: () => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })) });
  try {
    const pending = accountFetch('/api/sheet?action=listUsers');
    await Promise.resolve();
    const rejected = assert.rejects(pending, /took too long/);
    t.mock.timers.tick(60000);
    await rejected;
  } finally { globalThis.fetch = original; }
});

test('account mutations are never retried and invalid host responses become useful errors', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('<html>Gateway timeout</html>', {status:504}); };
  try {
    await assert.rejects(accountFetch('/api/sheet?action=createUser', {method:'POST'}), /invalid response/);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});
