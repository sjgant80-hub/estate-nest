import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanRepo, normArchive, intakeOne, intakeMany, syncArchive, diffArchive } from '../kernel/intake.mjs';

const A0 = { generated: '2026-07-31', nodes: [
  { name: 'alpha', desc: 'a toll that gates content', lang: 'JavaScript', topics: [], live: true, url: 'u' },
  { name: 'beta', desc: 'a legal navigator', lang: 'JavaScript', topics: [] },
] };

test('cleanRepo normalizes a repo; junk and no-name → null', () => {
  const c = cleanRepo({ name: 'x', desc: 'does a thing', lang: 'Go', topics: ['a', ''], live: 1, url: 'U', pushed: '2026-07-31' });
  assert.deepEqual(c, { name: 'x', desc: 'does a thing', lang: 'Go', topics: ['a'], live: true, url: 'U', pushed: '2026-07-31' });
  assert.equal(typeof cleanRepo({ name: 'x', desc: 5 }).desc, 'string');   // number desc coerced to string (S === path)
  assert.equal(cleanRepo(null), null);
  assert.equal(cleanRepo({ desc: 'no name' }), null);
  assert.equal(cleanRepo('nope'), null);
});

test('intakeOne: adds a new repo, updates a changed one, no-ops an identical one', () => {
  const r1 = intakeOne(A0, { name: 'gamma', desc: 'a brand new organ' });
  assert.equal(r1.action, 'added');
  assert.equal(r1.archive.nodes.length, 3);
  assert.equal(A0.nodes.length, 2, 'L0 stays immutable to the caller');   // input untouched

  const r2 = intakeOne(A0, { name: 'alpha', desc: 'a toll that gates content NOW WITH MORE' });
  assert.equal(r2.action, 'updated');                                     // content changed → re-signed
  assert.equal(r2.archive.nodes.length, 2);                               // in place, not appended

  const r3 = intakeOne(A0, { name: 'alpha', desc: 'a toll that gates content', lang: 'JavaScript', live: true, url: 'u' });
  assert.equal(r3.action, 'unchanged');                                   // identical what-it-does → no-op

  assert.equal(intakeOne(A0, null).action, 'skip');                       // total
  assert.equal(intakeOne(A0, { desc: 'no name' }).action, 'skip');
  assert.equal(intakeOne(null, { name: 'z', desc: 'd' }).archive.nodes.length, 1); // total on null archive
});

test('intakeMany: batch tally of added / updated / unchanged', () => {
  const res = intakeMany(A0, [
    { name: 'gamma', desc: 'new one' },                                   // added
    { name: 'alpha', desc: 'a toll that gates content' },                // unchanged-ish (desc same, no lang → whatItDoes differs? has lang in A0)
    { name: 'delta', desc: 'another new one' },                          // added
    null,                                                                // skipped
  ]);
  assert.ok(res.added.includes('gamma') && res.added.includes('delta'));
  assert.ok(res.updated.includes('alpha'));                              // alpha's content changed → tallied as updated (=== not !==)
  assert.equal(res.skipped, 1);
  assert.equal(res.archive.nodes.length, 4);                             // 2 original + 2 added
  assert.equal(A0.nodes.length, 2);                                      // input untouched
  assert.equal(intakeMany(A0, null).archive.nodes.length, 2);           // total
});

test('syncArchive mirrors the archive to the current clean list — prunes what left', () => {
  const cur = [
    { name: 'alpha', desc: 'a toll that gates content', lang: 'JavaScript' }, // unchanged
    { name: 'gamma', desc: 'a brand new organ' },                            // added
    // 'beta' is absent from current → must be pruned (e.g. a fork now filtered out, or deleted)
  ];
  const res = syncArchive(A0, cur);
  assert.deepEqual(res.archive.nodes.map((n) => n.name).sort(), ['alpha', 'gamma']); // = exactly the current set
  assert.deepEqual(res.added, ['gamma']);
  assert.deepEqual(res.pruned, ['beta']);                                    // beta left → pruned, not kept forever
  assert.ok(res.unchanged.includes('alpha'));
  assert.equal(A0.nodes.length, 2);                                          // input archive untouched
  assert.deepEqual(syncArchive(A0, []).archive.nodes, []);                   // empty current → everything pruned
  assert.deepEqual(syncArchive({ nodes: [null, { name: 'x', desc: 'd' }] }, [{ name: 'x', desc: 'd' }]).pruned, []); // a null node in the archive is skipped, not fatal (&& not ||)
  assert.equal(syncArchive(null, null).archive.nodes.length, 0);            // total
});

test('diffArchive: the sync plan — added, changed, gone', () => {
  const current = [
    { name: 'alpha', desc: 'a toll that gates content', lang: 'JavaScript' }, // unchanged
    { name: 'beta', desc: 'a legal navigator REWRITTEN', lang: 'JavaScript' }, // changed
    { name: 'epsilon', desc: 'appeared since the snapshot' },                  // added
    // 'gamma' from... none; A0 has alpha,beta — so nothing gone except if a name vanished
  ];
  const d = diffArchive(A0, current);
  assert.deepEqual(d.added, ['epsilon']);
  assert.deepEqual(d.changed, ['beta']);
  assert.deepEqual(d.gone, []);                                           // alpha & beta both still present
  // a repo removed from current shows as gone
  const d2 = diffArchive(A0, [{ name: 'alpha', desc: 'a toll that gates content', lang: 'JavaScript' }]);
  assert.deepEqual(d2.gone, ['beta']);
  assert.deepEqual(diffArchive(null, null), { added: [], changed: [], gone: [] }); // total
  assert.deepEqual(diffArchive({ nodes: [null, { name: 'beta', desc: 'x' }] }, []).gone, ['beta']); // a null node is filtered, not fatal (&& not ||)
});

test('normArchive gives a working copy that never aliases the input nodes array', () => {
  const a = normArchive(A0);
  a.nodes.push({ name: 'scratch' });
  assert.equal(A0.nodes.length, 2);                                       // original untouched
  assert.equal(normArchive(A0).generated, '2026-07-31');                 // carries the known meta fields (!== undefined path)
  assert.equal(normArchive(null).nodes.length, 0);                       // total
  assert.equal(normArchive('nope').nodes.length, 0);
});
