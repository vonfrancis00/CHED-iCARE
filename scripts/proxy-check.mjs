import assert from 'node:assert/strict';
import handler from '../api/sheet.js';
process.env.SHEET_API_URL = 'https://script.google.com/macros/s/test/exec';
process.env.SHEET_API_ACCESS_CODE = 'test';
let calls = 0;
globalThis.fetch = async url => {
  calls++;
  assert.equal(url.hostname, 'script.google.com');
  return { ok: true, json: async () => ({ success: true, data: [{ rowNumber: 2 }] }) };
};
async function run(url) {
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method: 'GET', url }, res);
  return res;
}
assert.equal((await run('/api/sheet?action=getSurveyResponses&code=test')).body.data.length, 1);
assert.equal((await run('/api/sheet?action=getSurveyResponses')).code, 401);
assert.equal((await run('/api/sheet?action=other&code=test')).code, 400);
assert.equal(calls, 1);
let recoveryCalls = 0;
const requestedUrls = [];
globalThis.fetch = async url => {
  requestedUrls.push(url.toString());
  recoveryCalls++;
  return recoveryCalls === 1 ? { ok: false, status: 404 } : { ok: true, status: 200, json: async () => ({ success: true, data: [] }) };
};
assert.equal((await run('/api/sheet?action=getSurveyResponses&code=test')).code, 200);
assert.equal(recoveryCalls, 2);
assert.notEqual(requestedUrls[0], requestedUrls[1], 'Recovery needs a fresh Google redirect');
globalThis.fetch = async () => ({ ok: false, status: 404 });
assert.equal((await run('/api/sheet?action=getSurveyResponses&code=test')).code, 502);
globalThis.fetch = async () => { throw Object.assign(new Error(), { name: 'AbortError' }); };
assert.equal((await run('/api/sheet?action=getSurveyResponses&code=test')).code, 504);
console.log('Proxy checks passed: success, authorization, action validation, upstream failure and timeout.');
