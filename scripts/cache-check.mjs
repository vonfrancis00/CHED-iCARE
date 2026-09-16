import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const entries = new Map();
let acquisitions = 0;
let releases = 0;
let generation = 0;
const cache = {
  get: key => entries.get(key) ?? null,
  getAll: keys => Object.fromEntries(keys.filter(key => entries.has(key)).map(key => [key, entries.get(key)])),
  put(key, value) {
    assert.ok(Buffer.byteLength(value) < 100000, 'Cache value exceeds service limit');
    entries.set(key, value);
  },
  putAll(parts) { Object.entries(parts).forEach(([key, value]) => this.put(key, value)); },
  remove: key => entries.delete(key)
};
const context = vm.createContext({
  console, CONFIG: { CACHE_SECONDS: 300 },
  CacheService: { getScriptCache: () => cache },
  Utilities: { getUuid: () => String(++generation) },
  LockService: { getScriptLock: () => ({ tryLock: () => { acquisitions++; return true; }, releaseLock: () => { releases++; } }) }
});
vm.runInContext(readFileSync('apps-script/Utils.gs', 'utf8'), context);
const dataset = { rows: Array.from({ length: 2000 }, (_, index) => ({ index, value: 'Survey response 日本語 😀'.repeat(10) })) };
const result = context.getOrBuildCache_('dashboard', () => context.getOrBuildCache_('dataset', () => dataset));
assert.equal(result, dataset);
assert.equal(acquisitions, 1, 'Nested builds must acquire only one lock');
assert.equal(releases, 1);
assert.equal(JSON.stringify(context.getOrBuildCache_('dataset', () => { throw Error('Unexpected rebuild'); })), JSON.stringify(dataset));
const manifest = JSON.parse(entries.get('dataset'));
entries.delete(`dataset:${manifest.generation}:0`);
assert.equal(context.readCache_(cache, 'dataset'), null, 'Partial eviction must become a cache miss');
context.removeCaches_(['dashboard']);
assert.equal(context.readCache_(cache, 'dashboard'), null);
assert.throws(() => context.getOrBuildCache_('failure', () => { throw Error('Build failed'); }));
assert.equal(releases, 2, 'Failed builders must release the lock');
console.log('Cache checks passed: large Unicode payloads, nested locking, eviction, invalidation and error cleanup.');
