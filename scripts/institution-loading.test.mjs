import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function setup(getInstitutions, stored = null) {
  const writes = [];
  const context = vm.createContext({
    getInstitutions,
    peekInstitutionPage: () => null,
    getSheetDataRevision: () => 0,
    window: { localStorage: {
      getItem: () => JSON.stringify(stored),
      setItem: (key, value) => writes.push(JSON.parse(value))
    } }
  });
  const source = readFileSync(new URL('../src/hooks/useInstitutionGroups.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace('import.meta.env.VITE_SHEET_API_URL', '"test"')
    .replace('export function', 'function');
  vm.runInContext(source, context);
  return { context, writes };
}

test('first 50 records are published and cached before the background request finishes', async () => {
  let release;
  const firstRows = Array.from({ length: 50 }, (_, rowNumber) => ({ rowNumber, Institution: '' }));
  const { context, writes } = setup(async ({ page }) => {
    if (page === 1) return { total: 51, data: firstRows };
    return new Promise(resolve => { release = () => resolve({ data: [{ Institution: 'Example University' }] }); });
  });
  const published = [];
  const job = context.loadGroups('test', { pageSize: 50 }, 0, entry => published.push(entry), false);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(published.length, 1);
  assert.equal(published[0].data.data.length, 50);
  assert.equal(published[0].complete, false);
  assert.equal(writes.length, 1);
  release();
  await job.promise;
  assert.equal(published.length, 2);
  assert.equal(published[1].data.data.length, 51);
  assert.equal(published[1].complete, true);
  assert.equal(writes.length, 2);
});

test('initial load restores older snapshots immediately while refresh runs', () => {
  for (const entry of [
    { complete: true, savedAt: Date.now() - 600000, data: { data: [{}] } }
  ]) {
    const { context } = setup(null, entry);
    assert.equal(context.readEntry('test').complete, true);
  }
  const { context } = setup(null, { complete: false, savedAt: Date.now(), data: { data: [{ Institution: 'Example University' }] } });
  assert.equal(context.readEntry('test').data.data[0].Institution, 'Example University');
});

test('background pages do not replace a complete saved directory with partial records', async () => {
  const stored = { complete: true, savedAt: Date.now() - 600000, data: { data: [{ Institution: 'Saved University' }] } };
  const { context } = setup(async ({ page }) => ({ total: 2, pageSize: 1, data: [{ Institution: `New ${page}` }] }), stored);
  const published = [];
  await context.loadGroups('test', { pageSize: 1 }, 0, entry => published.push(entry), false).promise;
  assert.equal(published.length, 1);
  assert.equal(published[0].complete, true);
  assert.equal(published[0].data.data.length, 2);
});

test('cold directory load uses small pages and shares the in-flight read', async () => {
  const rows = Array.from({ length: 114 }, (_, index) => ({ rowNumber: index + 2, Institution: `University ${index}` }));
  const calls = [];
  const { context, writes } = setup(async params => {
    calls.push(params);
    return { total: rows.length, pageSize: params.pageSize, data: rows.slice((params.page - 1) * params.pageSize, params.page * params.pageSize) };
  });
  const published = [];
  const job = context.loadGroups('test', { query: '', institutionType: 'SUC', region: 'region 1' }, 0, entry => published.push(entry), false);
  const shared = context.loadGroups('test', {}, 0, () => {}, false);
  assert.equal(job, shared);
  await job.promise;
  assert.equal(calls.length, 3);
  assert.equal(calls[0].pageSize, 50);
  assert.equal(calls[0].institutionType, 'SUC');
  assert.equal(calls[0].region, 'region 1');
  assert.equal(published[0].data.data.length, 50);
  assert.equal(published[0].complete, false);
  assert.deepEqual(Array.from(published[2].data.data), rows);
  assert.equal(published[2].complete, true);
  assert.equal(writes.length, 3);
});

test('older services with a smaller page limit preserve all responses in order', async () => {
  const rows = Array.from({ length: 114 }, (_, index) => ({ rowNumber: index + 2, Institution: `University ${index}` }));
  const calls = [];
  const { context } = setup(async params => {
    calls.push(params);
    const pageSize = Math.min(50, params.pageSize);
    return { total: rows.length, pageSize, data: rows.slice((params.page - 1) * pageSize, params.page * pageSize) };
  });
  const published = [];
  await context.loadGroups('test', { pageSize: 5000 }, 0, entry => published.push(entry), true).promise;
  assert.deepEqual(calls.map(call => call.pageSize), [5000, 50, 50]);
  assert.ok(calls.every(call => call._force));
  assert.equal(published.length, 3);
  assert.deepEqual(Array.from(published[2].data.data), rows);
});

test('background page concurrency is bounded and out-of-order responses retain row order', async () => {
  const releases = new Map();
  let active = 0, peak = 0;
  const { context } = setup(async ({ page }) => {
    if (page === 1) return { total: 7, pageSize: 1, data: [{ rowNumber: 1 }] };
    active++;
    peak = Math.max(peak, active);
    await new Promise(resolve => releases.set(page, resolve));
    active--;
    return { data: [{ rowNumber: page }] };
  });
  const published = [];
  const job = context.loadGroups('parallel', { pageSize: 1 }, 0, entry => published.push(entry), false);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual([...releases.keys()], [2, 3, 4]);
  releases.get(4)(); releases.get(3)(); releases.get(2)();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(peak, 3);
  releases.get(7)(); releases.get(6)(); releases.get(5)();
  await job.promise;
  assert.deepEqual(Array.from(published.at(-1).data.data, row => row.rowNumber), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(published.at(-1).complete, true);
});

test('revisiting either record view reuses completed data beyond five minutes', async () => {
  let calls = 0;
  const { context } = setup(async () => {
    calls++;
    return { total: 1, data: [{ Institution: 'Cached University' }] };
  });
  await context.loadGroups('shared-view', { pageSize: 50 }, 0, () => {}, false).promise;
  context.readEntry('shared-view').savedAt = Date.now() - 3600000;
  let restored;
  await context.loadGroups('shared-view', { pageSize: 50 }, 0, entry => { restored = entry; }, false).promise;
  assert.equal(calls, 1);
  assert.equal(restored.data.data[0].Institution, 'Cached University');
  await context.loadGroups('shared-view', { pageSize: 50 }, 0, () => {}, true).promise;
  assert.equal(calls, 2, 'Explicit refresh still requests records');
  await context.loadGroups('shared-view', { pageSize: 50 }, 1, () => {}, false).promise;
  assert.equal(calls, 3, 'A data revision invalidates the completed snapshot');
});

test('prefetched first 50 responses are immediately available to both views', () => {
  const { context } = setup(null);
  const first = { total: 120, data: Array.from({ length: 50 }, (_, rowNumber) => ({ rowNumber })) };
  let calls = 0;
  context.peekInstitutionPage = params => {
    calls++;
    assert.equal(params.page, 1);
    assert.equal(params.pageSize, 50);
    return first;
  };
  const entry = context.readEntry('prefetched', { pageSize: 50 });
  assert.equal(entry.data, first);
  assert.equal(entry.complete, false);
  assert.equal(context.readEntry('prefetched', { pageSize: 50 }), entry);
  assert.equal(calls, 1);
});
