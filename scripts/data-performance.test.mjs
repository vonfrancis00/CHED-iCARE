import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import handler from '../api/sheet.js';

test('compact datasets round-trip and a refresh cannot reuse an old dataset', () => {
  const entries = new Map();
  const cache = {
    get: key => entries.get(key),
    put: (key, value) => entries.set(key, value)
  };
  const context = vm.createContext({
    CONFIG: { CACHE_SECONDS: 300 }, console,
    CacheService: { getScriptCache: () => cache },
    LockService: { getScriptLock() { throw new Error('Reads must not lock account writes'); } }
  });
  vm.runInContext(readFileSync(new URL('../apps-script/Utils.gs', import.meta.url), 'utf8'), context);
  let revision = '1';
  let builds = 0;
  context.getResponseCacheRevision_ = () => revision;
  context.buildRawDataset_ = () => {
    builds++;
    return { headers: ['Institution', 'Answer'], cachedAt: 'now', rows: [
      { rowNumber: 4, Institution: 'Niño', Answer: false },
      { rowNumber: 7, Institution: '', Answer: 0 }
    ] };
  };
  const first = context.getRawDataset_();
  assert.equal(first.rows[0].Institution, 'Niño');
  assert.equal(first.rows[0].Answer, false);
  assert.equal(first.rows[1].rowNumber, 7);
  assert.equal(first.rows[1].Answer, 0);
  assert.equal(JSON.stringify(context.getRawDataset_()), JSON.stringify(first));
  assert.equal(builds, 1);
  revision = '2';
  context.getRawDataset_();
  assert.equal(builds, 2);
});

test('authenticated reads share requests; refresh invalidates old results; errors are not cached', async () => {
  const env = { SESSION_SECRET: 'test-secret', SHEET_API_URL: 'https://script.google.com/macros/s/test/exec' };
  const data = Buffer.from(JSON.stringify({ user: { email: 'test@example.com', role: 'admin' }, expires: Date.now() + 60000 })).toString('base64url');
  const cookie = `childcare_session=${data}.${createHmac('sha256', env.SESSION_SECRET).update(data).digest('hex')}`;
  async function request(action, authenticated = true) {
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(payload) { return { code: this.code, payload }; } };
    return handler({ url: `/api/sheet?action=${action}`, method: 'GET', headers: { cookie: authenticated ? cookie : '' } }, res, env);
  }
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let release;
  let pause = false;
  let fail = false;
  globalThis.fetch = async () => {
    const version = ++calls;
    if (pause) { pause = false; await new Promise(resolve => { release = resolve; }); }
    return new Response(JSON.stringify({ success: !fail, version }));
  };
  try {
    assert.equal((await request('getDashboardData', false)).code, 401);
    assert.equal(calls, 0);
    pause = true;
    const first = request('getDashboardData');
    const second = request('getDashboardData');
    release();
    assert.deepEqual(await first, await second);
    await request('getDashboardData');
    assert.equal(calls, 1);
    await request('clearDashboardCache');
    pause = true;
    const old = request('getDashboardData');
    await request('clearDashboardCache');
    release();
    await old;
    const fresh = await request('getDashboardData');
    assert.equal(fresh.payload.version, 5);
    fail = true;
    await request('getInstitutions&page=2');
    await request('getInstitutions&page=2');
    assert.equal(calls, 7);
  } finally { globalThis.fetch = originalFetch; }
});

test('Apps Script caches round-trip small, Unicode and chunked data; missing chunks rebuild', () => {
  const entries = new Map();
  let reads = 0;
  const cache = {
    get(key) { reads++; return entries.get(key); },
    getAll(keys) { reads++; return Object.fromEntries(keys.filter(key => entries.has(key)).map(key => [key, entries.get(key)])); },
    put(key, value) { assert.ok(Buffer.byteLength(value) < 100000); entries.set(key, value); },
    putAll(parts) { Object.entries(parts).forEach(([key, value]) => this.put(key, value)); }
  };
  const context = vm.createContext({ CONFIG: { CACHE_SECONDS: 300 }, Utilities: { getUuid: () => 'generation' }, console });
  vm.runInContext(readFileSync(new URL('../apps-script/Utils.gs', import.meta.url), 'utf8'), context);
  for (const value of [{ name: 'Niño 🌏' }, { rows: 'a'.repeat(200000) }]) {
    context.putCache_(cache, 'key', value);
    const before = reads;
    assert.equal(JSON.stringify(context.readCache_(cache, 'key')), JSON.stringify(value));
    assert.equal(reads - before, value.name ? 1 : 2);
  }
  entries.delete('key:generation:1');
  assert.equal(context.readCache_(cache, 'key'), null);
});

test('Apps Script filters before pagination and retains totals', () => {
  const context = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../apps-script/Utils.gs', import.meta.url), 'utf8'), context);
  vm.runInContext(readFileSync(new URL('../apps-script/Dashboard.gs', import.meta.url), 'utf8'), context);
  context.getRawDataset_ = () => ({ headers: [], rows: [
    { 'HEI': 'Alpha', 'SUC/LUC': 'SUC', Region: 'I' },
    { 'HEI': 'Beta', 'SUC/LUC': 'LUC', Region: 'II' },
    { 'HEI': 'Gamma', 'SUC/LUC': 'SUC', Region: 'I' }
  ] });
  const result = context.buildInstitutionsPage_(2, 1, '', 'SUC', 'i');
  assert.equal(result.total, 2);
  assert.equal(result.institutionCount, 3);
  assert.equal(result.data[0]['HEI'], 'Alpha');
});
