import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import handler from '../api/sheet.js';

test('a lost write response is successful only when read-back confirms the saved request', async () => {
  const originalFetch = globalThis.fetch;
  const actions = [];
  let saved = true;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    actions.push(body.action);
    return Response.json(body.action === 'checkAccountRequest'
      ? { success: saved, message: saved ? 'Request saved.' : 'Not confirmed.' }
      : { success: false, message: 'Unknown action.' });
  };
  async function submit() {
    const req = {
      url: '/api/sheet?action=submitAccountRequest', method: 'POST', headers: {},
      async *[Symbol.asyncIterator]() { yield JSON.stringify({ name: 'Applicant', email: 'new@ched.gov.ph', office: 'Office' }); }
    };
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(payload) { return { code: this.code, payload }; } };
    return handler(req, res, { SESSION_SECRET: 'test', SHEET_API_URL: 'https://script.google.com/macros/s/test/exec' });
  }
  try {
    assert.equal((await submit()).code, 200);
    assert.deepEqual(actions, ['submitAccountRequest', 'checkAccountRequest']);
    saved = false;
    const rejected = await submit();
    assert.equal(rejected.code, 400);
    assert.equal(rejected.payload.success, false);
  } finally { globalThis.fetch = originalFetch; }
});

test('account requests read only emails, commit once, and reject duplicate submissions', () => {
  const users = [['Name', 'Email', 'Password'], ['Existing', 'existing@ched.gov.ph', 'private']];
  const requests = [['Name', 'CHED Email', 'Office', 'Requested At']];
  let opens = 0;
  let locked = false;
  let commits = 0;
  const reads = [];
  function sheet(rows, isUsers = false) {
    return {
      getLastRow: () => rows.length,
      getLastColumn: () => rows[0].length,
      getRange(row, column, count, width) {
        if (isUsers) reads.push([row, column, count, width]);
        return {
          getDisplayValues: () => rows.slice(row - 1, row - 1 + count).map(values => values.slice(column - 1, column - 1 + width)),
          createTextFinder(value) {
            const match = rows.slice(row - 1, row - 1 + count).findIndex(values => String(values[column - 1]).trim().toLowerCase() === String(value).toLowerCase());
            return { matchCase() { return this; }, matchEntireCell() { return this; }, findNext: () => match < 0 ? null : { getRow: () => row + match } };
          }
        };
      },
      appendRow(row) { assert.equal(locked, true); rows.push(row); }
    };
  }
  const context = vm.createContext({
    CONFIG: { SPREADSHEET_ID: 'test', SHEETS: { USERS: 'Users', ACCOUNT_REQUESTS: 'Requests' } },
    SpreadsheetApp: {
      openById() { opens++; return { getSheetByName: name => name === 'Users' ? sheet(users, true) : sheet(requests) }; },
      flush() { assert.equal(locked, true); commits++; }
    },
    LockService: { getScriptLock: () => ({ tryLock() { locked = true; return true; }, releaseLock() { locked = false; } }) }
  });
  vm.runInContext(readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), context);
  context.jsonResponse = payload => payload;
  const params = { name: 'Applicant', email: ' NEW@ched.gov.ph ', office: 'Office' };
  assert.equal(context.submitAccountRequest_(params).success, true);
  assert.equal(opens, 1);
  assert.equal(context.checkAccountRequest_(params).success, true);
  assert.equal(context.checkAccountRequest_({ ...params, office: 'Wrong office' }).success, false);
  assert.equal(commits, 1);
  assert.equal(locked, false);
  assert.deepEqual(reads, [[1, 1, 1, 3], [2, 2, 1, 1]]);
  assert.equal(context.submitAccountRequest_(params).success, false);
  assert.equal(requests.length, 2);
  assert.equal(commits, 1);
  assert.equal(context.submitAccountRequest_({ ...params, email: 'existing@ched.gov.ph' }).success, false);
  assert.equal(context.submitAccountRequest_({ ...params, email: 'invalid' }).success, false);
  assert.equal(requests.length, 2);
  assert.equal(locked, false);
});
