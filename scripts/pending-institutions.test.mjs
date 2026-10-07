import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function setup() {
  const headers = ['SUC/LUC', 'Region', 'Institution', 'Campus', 'Timestamp', 'Name of Institution', 'Name of Institution Campus', 'Address of Campus'];
  const cells = ['', '', '', '', '2026-10-07', 'Submitted University', 'Submitted campus', 'Original address'];
  let writes = 0;
  const sheet = { getLastColumn: () => headers.length, getLastRow: () => 2,
    getRange(row, col, height, width) { return {
      getValues: () => [row === 1 ? headers : cells.slice(col - 1, col - 1 + width)],
      setValues: values => { writes++; cells.splice(col - 1, width, ...values[0]); }
    }; }
  };
  const context = vm.createContext({
    Utilities: { computeDigest: (_, value) => value, base64EncodeWebSafe: value => value, DigestAlgorithm: { SHA_256: 'sha' }, getUuid: () => 'revision' },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { flush() {} }, PropertiesService: { getScriptProperties: () => ({ setProperty() {} }) },
    getResponseSheet_: () => sheet, normalizeCellForJson_: value => value, safeCellText_: value => value,
  });
  vm.runInContext(readFileSync('apps-script/PendingInstitutions.gs', 'utf8'), context);
  const row = Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
  const params = { rowNumber: 2, identity: context.responseIdentity_(row, headers), institutionType: 'SUC', region: 'Region 1', institution: 'Verified University', campus: 'Main Campus' };
  return { context, params, cells, writes: () => writes };
}

test('completion writes only the selected response directory fields', () => {
  const { context, params, cells, writes } = setup();
  assert.equal(context.completeInstitution_(params).success, true);
  assert.deepEqual(cells, ['SUC', 'Region 1', 'Verified University', 'Main Campus', '2026-10-07', 'Submitted University', 'Submitted campus', 'Original address']);
  assert.equal(writes(), 1);
  assert.throws(() => context.completeInstitution_(params), /already been completed/);
  assert.equal(writes(), 1);
});

test('changed response or missing fields cannot write to the sheet', () => {
  const { context, params, cells, writes } = setup();
  assert.throws(() => context.completeInstitution_({ ...params, campus: ' ' }), /four required/);
  cells[5] = 'Different response';
  assert.throws(() => context.completeInstitution_(params), /moved or changed/);
  assert.equal(writes(), 0);
});
