import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import handler from '../api/sheet.js';

const env = { NODE_ENV: 'production', SESSION_SECRET: 's'.repeat(48), SHEET_API_ACCESS_CODE: 'c'.repeat(48), SHEET_API_URL: 'https://script.google.com/macros/s/security/exec' };
function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; return this; } };
}
test('production rejects weak, missing, or reused secrets before contacting Google', async () => {
  for (const config of [{ ...env, SESSION_SECRET: '' }, { ...env, SESSION_SECRET: 'weak' }, { ...env, SHEET_API_ACCESS_CODE: '' }, { ...env, SESSION_SECRET: env.SHEET_API_ACCESS_CODE }]) {
    const res = response();
    await handler({ url: '/api/sheet?action=session', method: 'GET' }, res, config);
    assert.equal(res.code, 503);
  }
});
test('cross-site and sibling-site requests cannot log in, log out, or clear caches', async () => {
  for (const action of ['login', 'logout', 'clearDashboardCache']) {
    for (const headers of [{ 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' }, { origin: 'https://evil.example', host: 'dashboard.example' }]) {
      const res = response();
      await handler({ url: `/api/sheet?action=${action}`, method: action === 'clearDashboardCache' ? 'GET' : 'POST', headers }, res, env);
      assert.equal(res.code, 403);
    }
  }
});
test('production POST requires browser origin evidence and rejects form bodies', async () => {
  const missing = response();
  await handler({ url: '/api/sheet?action=logout', method: 'POST' }, missing, env);
  assert.equal(missing.code, 403);
  const form = response();
  await handler({ url: '/api/sheet?action=login', method: 'POST', headers: { 'sec-fetch-site': 'same-origin', 'content-type': 'text/plain' } }, form, env);
  assert.equal(form.code, 415);
  const good = response();
  await handler({ url: '/api/sheet?action=logout', method: 'POST', headers: { origin: 'https://dashboard.example', host: 'dashboard.example' } }, good, env);
  assert.equal(good.code, 200);
  assert.match(good.headers['Set-Cookie'], /HttpOnly.*Secure/);
});
test('tampered sessions cannot access records and record filters are bounded', async () => {
  const forged = response();
  await handler({ url: '/api/sheet?action=getInstitutions', method: 'GET', headers: { cookie: 'childcare_session=e30.fake' } }, forged, env);
  assert.equal(forged.code, 401);
  const oversized = response();
  await handler({ url: '/api/sheet?action=getInstitutions&pageSize=999999', method: 'GET' }, oversized, env);
  assert.equal(oversized.code, 400);
});
test('Apps Script fails closed and rejects inherited action names and spreadsheet formulas', () => {
  const context = vm.createContext({ CONFIG: { API_ACCESS_CODE: '' } });
  vm.runInContext(readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), context);
  assert.throws(() => context.validateRequest_('getInstitutions', {}), /Configure API_ACCESS_CODE/);
  assert.throws(() => context.validateRequest_('constructor', {}), /Unknown action/);
  assert.equal(context.safeCellText_(' \t=IMPORTXML("evil")'), "' \t=IMPORTXML(\"evil\")");
});
