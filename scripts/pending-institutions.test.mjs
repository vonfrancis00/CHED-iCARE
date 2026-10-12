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
  const occCells = [
    ['', 'Office One', '', '', '', 'Office Two', ''],
    ['Region', 'SUC', 'Survey', '', 'Region', 'SUC', 'Survey'],
    ['Region 1', 'Verified University', false, '', 'Region 2', 'Other University', false]
  ];
  const occSheet = { getLastRow: () => 3, getLastColumn: () => 7,
    getRange(row, column) { return { getValues: () => occCells, setValue(value) { occCells[row - 1][column - 1] = value; } }; }
  };
  const properties = new Map();
  const context = vm.createContext({
    Utilities: { computeDigest: (_, value) => value, base64EncodeWebSafe: value => value, DigestAlgorithm: { SHA_256: 'sha' }, getUuid: () => 'revision' },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { flush() {} }, PropertiesService: { getScriptProperties: () => ({ setProperty(key, value) { properties.set(key, value); }, getProperty: key => properties.get(key), deleteProperty: key => properties.delete(key) }) },
    CONFIG: { SHEETS: { OCC: "Per OCC" } }, getSpreadsheet_: () => ({ getSheetByName: () => occSheet }),
    getResponseSheet_: () => sheet, normalizeCellForJson_: value => value, safeCellText_: value => value,
  });
  vm.runInContext(readFileSync('apps-script/PendingInstitutions.gs', 'utf8'), context);
  const row = Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
  const params = { rowNumber: 2, identity: context.responseIdentity_(row, headers), institutionType: 'SUC', region: 'Region 1', institution: 'Verified University', campus: 'Main Campus' };
  params.actorEmail = 'first@ched.gov.ph';
  params.lockToken = 'first-tab';
  context.buildRawDataset_ = () => ({ headers, rows: [{ ...Object.fromEntries(headers.map((header, index) => [header, cells[index]])), rowNumber: 2 }] });
  context.institutionLock_('claimInstitution', params);
  return { context, params, cells, properties, occCells, sheet, writes: () => writes };
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


test('a second editor cannot claim, release, renew, or save another editor reservation', () => {
  const { context, params, writes } = setup();
  const other = { ...params, actorEmail: 'second@ched.gov.ph', lockToken: 'second-tab' };
  assert.equal(context.institutionLock_('claimInstitution', other).success, false);
  context.institutionLock_('releaseInstitutionLock', other);
  assert.throws(() => context.institutionLock_('renewInstitutionLock', other), /reservation/);
  assert.throws(() => context.completeInstitution_(other), /reservation/);
  assert.equal(writes(), 0);
  assert.equal(context.institutionLock_('renewInstitutionLock', params).success, true);
  context.institutionLock_('releaseInstitutionLock', params);
  assert.equal(context.institutionLock_('claimInstitution', other).success, true);
});

test('expired reservations reject saves and allow a new editor', () => {
  const { context, params, properties, writes } = setup();
  const key = 'INSTITUTION_LOCK_' + params.identity;
  const entry = JSON.parse(properties.get(key));
  properties.set(key, JSON.stringify({ ...entry, expiresAt: 0 }));
  assert.throws(() => context.completeInstitution_(params), /reservation/);
  assert.equal(writes(), 0);
  assert.equal(context.institutionLock_('claimInstitution', { ...params, lockToken: 'new-tab' }).success, true);
});


test('SUC completion checks only the matching Per OCC survey box', () => {
  const { context, params, occCells } = setup();
  context.completeInstitution_(params);
  assert.equal(occCells[2][2], true);
  assert.equal(occCells[2][6], false);
});

test('unknown SUC or wrong region cannot change either sheet', () => {
  const { context, params, occCells, writes } = setup();
  assert.throws(() => context.completeInstitution_({ ...params, region: 'Region 2' }), /Per OCC/);
  assert.equal(writes(), 0);
  assert.equal(occCells[2][2], false);
});

test('LUC completion leaves the Per OCC survey boxes unchanged', () => {
  const { context, params, occCells } = setup();
  assert.equal(context.completeInstitution_({ ...params, institutionType: 'LUC', institution: 'Local College' }).success, true);
  assert.equal(occCells[2][2], false);
  assert.equal(occCells[2][6], false);
});

test('pending responses include live SUC names and regions from all office blocks', () => {
  const { context } = setup();
  const result = context.getPendingInstitutions_();
  assert.deepEqual(JSON.parse(JSON.stringify(result.sucOptions)), [
    { name: 'Verified University', region: 'Region 1' },
    { name: 'Other University', region: 'Region 2' }
  ]);
});


test('a response write failure restores the Per OCC checkbox', () => {
  const { context, params, occCells, sheet } = setup();
  const originalRange = sheet.getRange;
  sheet.getRange = (...args) => {
    const range = originalRange(...args);
    if (args[0] === 2 && args[3] === 4) range.setValues = () => { throw new Error('Write failed'); };
    return range;
  };
  assert.throws(() => context.completeInstitution_(params), /Write failed/);
  assert.equal(occCells[2][2], false);
});
