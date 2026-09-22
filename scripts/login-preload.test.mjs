import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import handler from '../api/sheet.js';

test('login preparation shares the first-page fetch without exposing records', async () => {
  const env = {
    SESSION_SECRET: 'preload-test-secret',
    SHEET_API_ACCESS_CODE: 'server-only-code',
    SHEET_API_URL: 'https://script.google.com/macros/s/preload-test/exec'
  };
  const token = Buffer.from(JSON.stringify({ user: { email: 'test@example.com' }, expires: Date.now() + 600000 })).toString('base64url');
  const cookie = `childcare_session=${token}.${createHmac('sha256', env.SESSION_SECRET).update(token).digest('hex')}`;
  async function request(query, authenticated = false) {
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(payload) { return { code: this.code, payload }; } };
    return handler({ url: `/api/sheet?${query}`, method: 'GET', headers: { cookie: authenticated ? cookie : '' } }, res, env);
  }
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const records = { success: true, data: [{ name: 'Private institution' }], total: 1 };
  let calls = 0;
  let release;
  globalThis.fetch = async url => {
    calls++;
    assert.equal(url.searchParams.get('action'), 'getInstitutions');
    assert.equal(url.searchParams.get('page'), '1');
    assert.equal(url.searchParams.get('pageSize'), '20');
    assert.equal(url.searchParams.get('query'), null);
    assert.equal(url.searchParams.get('code'), 'server-only-code');
    await new Promise(resolve => { release = resolve; });
    return Response.json(records);
  };
  try {
    const warming = request('action=prepareRecords&page=99&pageSize=1000&query=private&code=wrong');
    const duplicate = request('action=prepareRecords');
    const signedIn = request('action=getInstitutions&page=1&pageSize=20', true);
    assert.equal(calls, 1, 'Warm-up and authenticated navigation share an in-flight fetch');
    release();
    assert.deepEqual(await warming, { code: 200, payload: { success: true } });
    assert.deepEqual(await duplicate, { code: 200, payload: { success: true } });
    assert.deepEqual((await signedIn).payload, records);
    assert.equal((await request('action=getInstitutions&page=1&pageSize=20')).code, 401);
    const later = originalNow() + 60000;
    Date.now = () => later;
    assert.deepEqual((await request('action=getInstitutions&page=1&pageSize=20', true)).payload, records);
    assert.equal(calls, 1, 'Prepared records remain cached while the user completes login');
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});
