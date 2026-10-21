import test from 'node:test';
import assert from 'node:assert/strict';
import { filterOfficeResponses, matchesInstitutionSearch } from '../src/utils/institutionNames.js';

const register = 'Dr. Emilio B. Espinosa, Sr. Memorial State College of Agriculture and Technology';
const response = 'Dr. Emilio B. Espinosa Sr., Memorial State College of Agriculture and Technology';

test('office responses tolerate punctuation, case and spacing differences without including other schools', () => {
  const rows = [{ Institution: response }, { Institution: response, Campus: 'Other campus' }, { Institution: 'Other State College' }, { Institution: '' }];
  assert.deepEqual(filterOfficeResponses(rows, [{ name: register }]), rows.slice(0, 2));
  assert.deepEqual(filterOfficeResponses(rows, [register.toUpperCase().replaceAll(' ', '\u00a0')]), rows.slice(0, 2));
  assert.deepEqual(filterOfficeResponses(rows, ['Dr. Emilio']), []);
  assert.deepEqual(filterOfficeResponses(rows, []), []);
});

test('search finds the screenshot spelling and partial names despite punctuation differences', () => {
  assert.equal(matchesInstitutionSearch(response, register), true);
  assert.equal(matchesInstitutionSearch(response, 'Dr Emilio B Espinosa Sr'), true);
  assert.equal(matchesInstitutionSearch(response, 'Other College'), false);
});
