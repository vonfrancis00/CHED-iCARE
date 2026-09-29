import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function setup(getInstitutions, stored = null) {
  const writes = [];
  const context = vm.createContext({
    getInstitutions,
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

test('first load waits for all pages before publishing or caching institution groups', async () => {
  let release;
  const firstRows = Array.from({ length: 50 }, (_, rowNumber) => ({ rowNumber, Institution: '' }));
  const { context, writes } = setup(async ({ page }) => {
    if (page === 1) return { total: 51, data: firstRows };
    return new Promise(resolve => { release = () => resolve({ data: [{ Institution: 'Example University' }] }); });
  });
  const published = [];
  const job = context.loadGroups('test', {}, 0, entry => published.push(entry), false);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(published.length, 0);
  assert.equal(writes.length, 0);
  release();
  await job.promise;
  assert.equal(published.length, 1);
  assert.equal(published[0].data.data.length, 51);
  assert.equal(published[0].complete, true);
  assert.equal(writes.length, 1);
});

test('initial load ignores incomplete and expired stored snapshots', () => {
  for (const entry of [
    { complete: false, savedAt: Date.now(), data: { data: [{}] } },
    { complete: true, savedAt: Date.now() - 600000, data: { data: [{}] } }
  ]) {
    const { context } = setup(null, entry);
    assert.equal(context.readEntry('test'), null);
  }
  const { context } = setup(null, { complete: true, savedAt: Date.now(), data: { data: [{ Institution: 'Example University' }] } });
  assert.equal(context.readEntry('test').data.data[0].Institution, 'Example University');
});
