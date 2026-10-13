import test from 'node:test';
import assert from 'node:assert/strict';
import { tableSummary } from './table.mjs';

const text = (seg) => seg.map((s) => (typeof s === 'string' ? s : s.em)).join('');
const m = (t, k) => ({ t, k });

test('a table finds what it shares and who went their own way', () => {
  const players = [
    { name: 'Mom', kept: [m('Game night', 'company'), m('A slow coffee', 'delight'), m('A random museum', 'novelty')] },
    { name: 'Dad', kept: [m('Game night', 'company'), m('A random museum', 'novelty')] },
    { name: 'Lila', kept: [m('Game night', 'company'), m('A tide pool', 'novelty')] },
    { name: 'Grandpa', kept: [m('The symphony', 'taste'), m('Game night', 'company')] },
  ];
  const s = tableSummary(players);
  assert.equal(s.shared[0].t, 'Game night');
  assert.deepEqual(s.shared[0].who, ['Mom', 'Dad', 'Lila', 'Grandpa']);
  assert.equal(text(s.lines[0]), 'All four of you grabbed game night.');
  assert.match(text(s.lines[1]), /Nobody kept a single setting moment/);
  assert.deepEqual(s.everyone, ['company']);
  assert.equal(s.solos.find((x) => x.name === 'Grandpa').t, 'The symphony');
  assert.equal(s.solos.find((x) => x.name === 'Mom').t, 'A slow coffee');
  assert.equal(s.menu[0].t, 'Game night');
  assert.equal(text(s.ask), 'Ask Grandpa about the symphony.');
});

test('with nothing in common, the menu falls back to the most shared why', () => {
  const s = tableSummary([
    { name: 'A', kept: [m('Practice guitar', 'skill')] },
    { name: 'B', kept: [m('Run your best mile', 'skill'), m('Sleeping in', 'delight')] },
  ]);
  assert.equal(s.shared.length, 0);
  assert.equal(text(s.lines[0]), 'Everyone kept a skill moment.');
  assert.deepEqual(s.menu.map((x) => x.t), ['Practice guitar', 'Run your best mile']);
  assert.equal(text(tableSummary([{ name: 'A', kept: [m('x', 'taste')] }, { name: 'B', kept: [m('y', 'setting')] }]).lines[0]), 'No two skies alike tonight.');
});
