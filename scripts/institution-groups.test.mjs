import test from 'node:test';
import assert from 'node:assert/strict';
import { groupInstitutions } from '../src/utils/institutionGroups.js';

test('HEI grouping uses the selected column independently of institution names', () => {
  const rows = [
    { rowNumber: 2, HEI: 'Example HEI', 'Name of Institution': 'Campus A' },
    { rowNumber: 3, HEI: ' EXAMPLE HEI ', 'Name of Institution': 'Campus B' },
    { rowNumber: 4, HEI: 'Other HEI', 'Name of Institution': 'Campus A' }
  ];
  const groups = groupInstitutions(rows, 'HEI');
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].rows, rows.slice(0, 2));
  assert.deepEqual(groupInstitutions(rows), groups);
});

test('groups repeated institutions across response pages and preserves every response', () => {
  const rows = Array.from({ length: 105 }, (_, index) => ({
    rowNumber: index + 2,
    HEI: index % 2 ? ' Example   University ' : 'example university',
    'Name of Institution Campus': `Campus ${index}`
  }));
  const groups = groupInstitutions(rows);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].rows, rows);
});

test('keeps distinct institutions and unnamed responses separate', () => {
  const groups = groupInstitutions([
    { rowNumber: 2, HEI: 'University A' },
    { rowNumber: 3, HEI: 'University B' },
    { rowNumber: 4 }, { rowNumber: 5 }
  ]);
  assert.equal(groups.length, 4);
  assert.deepEqual(groupInstitutions([]), []);
});
