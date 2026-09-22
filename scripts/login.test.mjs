import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Readable } from 'node:stream';
import handler from '../api/sheet.js';

test('a cold login can finish after 30 seconds without resubmitting', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    await new Promise((resolve, reject) => {
      setTimeout(resolve, 30000);
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })), { once: true });
    });
    return Response.json({ success: true, user: { email: 'test@example.com' } });
  };
  const req = {
    url: '/api/sheet?action=login', method: 'POST', headers: {},
    async *[Symbol.asyncIterator]() { yield JSON.stringify({ email: 'test@example.com', password: 'test-password' }); }
  };
  const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; return this; } };
  try {
    const pending = handler(req, res, { SESSION_SECRET: 'test-secret', SHEET_API_URL: 'https://script.google.com/macros/s/test/exec' });
    // Let request-body parsing reach the upstream call before advancing time.
    for (let i = 0; i < 10 && calls === 0; i++) await Promise.resolve();
    assert.equal(calls, 1);
    t.mock.timers.tick(30000);
    const result = await pending;
    assert.equal(result.code, 200);
    assert.ok(result.headers['Set-Cookie']);
    assert.match(result.headers['Server-Timing'], /request;dur=[\d.]+, google;dur=[\d.]+/);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('login reads account details only for matching emails and respects password changes', () => {
  const rows = [
    ['Name', 'Email', 'Office', 'Password', 'Role'],
    ['Other', 'other@example.com', 'Office', 'other-password', 'admin'],
    ['Test', ' TEST@example.com ', 'Office', 'correct-password', 'super_admin']
  ];
  const reads = [];
  const sheet = {
    getLastRow: () => rows.length,
    getLastColumn: () => rows[0].length,
    getRange(row, column, count, width) {
      reads.push([row, column, count, width]);
      return { getDisplayValues: () => rows.slice(row - 1, row - 1 + count).map(value => value.slice(column - 1, column - 1 + width)) };
    }
  };
  const context = vm.createContext({
    CONFIG: { SPREADSHEET_ID: 'test', SHEETS: { USERS: 'Users' } },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }) }
  });
  vm.runInContext(readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), context);
  assert.equal(context.findLoginUser_('test@example.com', 'correct-password').name, 'Test');
  assert.deepEqual(reads, [[1, 1, 1, 5], [2, 2, 2, 1], [3, 1, 1, 5]]);
  rows[2][3] = 'new-password';
  assert.equal(context.findLoginUser_('test@example.com', 'correct-password'), null);
  assert.equal(context.findLoginUser_('test@example.com', 'new-password').role, 'super_admin');
  reads.length = 0;
  assert.equal(context.findLoginUser_('missing@example.com', 'anything'), null);
  assert.equal(reads.length, 2);
});

test('login issues a session only for successful upstream authentication', async () => {
  const originalFetch = globalThis.fetch;
  const env = { SESSION_SECRET: 'test-secret', SHEET_API_URL: 'https://script.google.com/macros/s/test/exec' };
  let response;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response; };
  async function login() {
    const req = Readable.from([JSON.stringify({ email: 'test@example.com', password: 'test-password' })]);
    Object.assign(req, { url: '/api/sheet?action=login', method: 'POST', headers: {} });
    const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; return this; } };
    return handler(req, res, env);
  }
  try {
    response = Response.json({ success: true, user: { email: 'test@example.com' } });
    assert.ok((await login()).headers['Set-Cookie']);
    response = Response.json({ success: false, message: 'Invalid email or password.' });
    const rejected = await login();
    assert.equal(rejected.code, 401);
    assert.equal(rejected.headers['Set-Cookie'], undefined);
    response = Response.json({ success: true, user: { email: 'test@example.com' } }, { status: 503 });
    const failed = await login();
    assert.equal(failed.code, 502);
    assert.equal(failed.headers['Set-Cookie'], undefined);
    assert.equal(calls, 3, 'Credentials are neither cached nor automatically retried');
  } finally { globalThis.fetch = originalFetch; }
});
