import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeParticipation } from '../src/utils/regionalParticipation.js';

const facility = 'Do you currently have a childcare facility or center on your campus that students use?';
const program = 'Do you currently have a documented childcare program for students?';
const rows = [
  { Institution: 'Alpha', Region: 'Region 1', 'SUC/LUC': 'SUC', [facility]: 'Yes', [program]: 'Planned' },
  { Institution: ' alpha ', Region: 'region 1', 'SUC/LUC': 'SUC', [facility]: ' YES ', [program]: 'No' },
  { Institution: 'Beta', Region: 'Region 2', 'SUC/LUC': 'LUC', [facility]: 'Yes', [program]: 'Yes' },
  { Institution: 'Beta', Region: 'Region 2', 'SUC/LUC': 'LUC', [facility]: 'Yes' },
  { Institution: '', Region: '', 'SUC/LUC': 'SUC', [facility]: 'Yes' },
];

test('counts distinct named regions and preserves tied institution leaders', () => {
  const summary = summarizeParticipation(rows);
  assert.equal(summary.facilities.regions.length, 2);
  assert.deepEqual(summary.facilities.leaders.map(item => [item.name, item.count]), [['Alpha', 2], ['Beta', 2]]);
  assert.equal(summary.programs.regions.length, 1);
  assert.equal(summary.programs.leaders[0].name, 'Beta');
});

test('respects type and region filters and excludes planned answers', () => {
  const summary = summarizeParticipation(rows, 'SUC', 'REGION 1');
  assert.equal(summary.facilities.regions.length, 1);
  assert.equal(summary.facilities.leaders[0].count, 2);
  assert.deepEqual(summary.programs.leaders, []);
  assert.deepEqual(summarizeParticipation([], '', '').facilities.regions, []);
});
