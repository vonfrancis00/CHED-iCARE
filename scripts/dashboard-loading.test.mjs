import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function setup() {
  let reads = 0, clears = 0, writes = 0;
  const context = vm.createContext({
    getDashboardData: async () => { reads++; return { count: reads }; },
    clearDashboardCache: async () => { clears++; },
    window: { localStorage: { getItem: () => null, setItem: () => { writes++; } } }
  });
  const source = readFileSync(new URL('../src/hooks/useDashboard.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export function', 'function');
  vm.runInContext(source, context);
  return { context, counts: () => ({ reads, clears, writes }) };
}

test('dashboard consumers share reads and route/focus refreshes reuse fresh results', async () => {
  const { context, counts } = setup();
  await Promise.all([context.loadDashboard('{}', { automatic: true }), context.loadDashboard('{}', { automatic: true })]);
  await context.loadDashboard('{}', { automatic: true });
  assert.deepEqual(counts(), { reads: 1, clears: 0, writes: 1 });
  context.publish('{}', { updatedAt: 0 });
  await context.loadDashboard('{}', { automatic: true });
  assert.deepEqual(counts(), { reads: 2, clears: 0, writes: 2 });
  await context.loadDashboard('{}', { force: true });
  assert.deepEqual(counts(), { reads: 3, clears: 1, writes: 3 });
});

test('dashboard failures retain saved data and allow a retry', async () => {
  const { context } = setup();
  await context.loadDashboard('{}');
  context.getDashboardData = async () => { throw new Error('Offline'); };
  await context.loadDashboard('{}');
  assert.equal(context.getEntry('{}').data.count, 1);
  assert.equal(context.getEntry('{}').error, 'Offline');
  assert.equal(context.getEntry('{}').refreshing, false);
  context.getDashboardData = async () => ({ count: 2 });
  await context.loadDashboard('{}');
  assert.equal(context.getEntry('{}').data.count, 2);
  assert.equal(context.getEntry('{}').error, '');
});
