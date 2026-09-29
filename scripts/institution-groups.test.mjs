import test from 'node:test';
import assert from 'node:assert/strict';
import { groupCampuses, groupInstitutions } from '../src/utils/institutionGroups.js';

test('campuses group within each institution and preserve repeated responses', () => {
  const rows = [
    { Institution: 'A', Campus: 'Main', rowNumber: 2 },
    { Institution: 'A', Campus: ' MAIN ', rowNumber: 3 },
    { Institution: 'A', Campus: 'West', rowNumber: 4 },
    { Institution: 'B', Campus: 'Main', rowNumber: 5 }
  ];
  const institutions = groupInstitutions(rows);
  const campuses = groupCampuses(institutions[0].rows);
  assert.equal(campuses.length, 2);
  assert.deepEqual(campuses[0].rows, rows.slice(0, 2));
  assert.deepEqual(groupCampuses(institutions[1].rows)[0].rows, [rows[3]]);
});

test('campuses use only the Campus column and keep unspecified campuses separate', () => {
  const groups = groupCampuses([
    { Campus: 'New', 'Name of Institution Campus': 'Old' },
    { Campus: ' ', 'Name of Institution Campus': 'Legacy' },
    { rowNumber: 4 }, { rowNumber: 5 }
  ]);
  assert.deepEqual(groups.map(group => group.name), ['New', 'Campus not specified', 'Campus not specified', 'Campus not specified']);
  assert.deepEqual(groupCampuses([]), []);
});

test('Institution grouping uses the selected column independently of institution names', () => {
  const rows = [
    { rowNumber: 2, Institution: 'Example Institution', 'Name of Institution': 'Campus A' },
    { rowNumber: 3, Institution: ' EXAMPLE Institution ', 'Name of Institution': 'Campus B' },
    { rowNumber: 4, Institution: 'Other Institution', 'Name of Institution': 'Campus A' }
  ];
  const groups = groupInstitutions(rows, 'Institution');
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].rows, rows.slice(0, 2));
  assert.deepEqual(groupInstitutions(rows), groups);
});

test('groups repeated institutions across response pages and preserves every response', () => {
  const rows = Array.from({ length: 105 }, (_, index) => ({
    rowNumber: index + 2,
    Institution: index % 2 ? ' Example   University ' : 'example university',
    Campus: `Campus ${index}`
  }));
  const groups = groupInstitutions(rows);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].rows, rows);
});

test('keeps distinct institutions and unnamed responses separate', () => {
  const groups = groupInstitutions([
    { rowNumber: 2, Institution: 'University A' },
    { rowNumber: 3, Institution: 'University B' },
    { rowNumber: 4 }, { rowNumber: 5 }
  ]);
  assert.equal(groups.length, 4);
  assert.deepEqual(groupInstitutions([]), []);
});
