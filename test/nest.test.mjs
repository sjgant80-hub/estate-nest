import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  whatItDoes, foldSign, nest, records, kinEdges, whatUses, chamberOf, inChamber, kinOf, graphOf,
} from '../kernel/nest.mjs';

const REPOS = [
  { name: 'alpha', desc: 'a proof-of-work toll that gates content', topics: ['pow'], lang: 'JavaScript', live: true, url: 'u1' },
  { name: 'beta', desc: 'a proof-of-work toll that gates content', topics: ['pow'], lang: 'JavaScript' }, // SAME content as alpha → dup
  { name: 'gamma', desc: 'a legal-process navigator for everyone', topics: [], lang: 'JavaScript' },
  { name: 'delta', desc: 'the dodeca memory organ, fold-native', topics: ['memory'], lang: 'JavaScript' },
  { name: 'noname' }, // no description → signs by name
];

test('whatItDoes normalizes desc + topics + language into the content text', () => {
  assert.equal(whatItDoes(REPOS[0]), 'a proof of work toll that gates content pow javascript');
  assert.equal(whatItDoes({ name: 'x' }), '');       // no content
  assert.equal(whatItDoes(null), '');                // total
});

test('foldSign: identity by CONTENT — same thing → same signature (duplicates collapse)', () => {
  assert.equal(foldSign(REPOS[0]), foldSign(REPOS[1])); // alpha & beta do the same thing → same id
  assert.notEqual(foldSign(REPOS[0]), foldSign(REPOS[2]));
  assert.equal(foldSign(REPOS[0]).length, 12);         // 12-hex content id
  assert.notEqual(foldSign({ name: 'a' }), foldSign({ name: 'b' })); // no-desc → signs by name → distinct
  assert.equal(typeof foldSign(null), 'string');       // total
});

test('nest places every repo into a dodeca chamber; distribution sums to size', () => {
  const n = nest(REPOS);
  assert.equal(n.size, 5);
  assert.equal(n.placed.length, 5);
  assert.equal(n.distribution.length, 12);
  assert.equal(n.distribution.reduce((a, b) => a + b, 0), n.size);
  assert.ok(n.placed.every((p) => p.chamber >= 0 && p.chamber < 12));
  assert.equal(records(n).length, n.size);
  assert.equal(nest(null).size, 0);                    // total
  assert.equal(nest('nope').size, 0);
});

test('duplicates are revealed: alpha & beta share a signature', () => {
  const n = nest(REPOS);
  assert.equal(n.duplicates.length, 1);
  assert.deepEqual(n.duplicates[0].repos.sort(), ['alpha', 'beta']);
  assert.equal(n.bySig[foldSign(REPOS[0])].length, 2);
});

test('traverse: whatUses walks explicit dep edges backward', () => {
  const edges = [
    { from: 'gamma', to: 'delta', type: 'uses' },
    { from: 'alpha', to: 'delta', type: 'extends' },
    { from: 'gamma', to: 'alpha', type: 'kin' },       // kin is not a "uses" edge
  ];
  assert.deepEqual(whatUses(edges, 'delta').sort(), ['alpha', 'gamma']);
  assert.deepEqual(whatUses(edges, 'alpha'), []);       // only a kin edge points at alpha
  assert.deepEqual(whatUses(null, 'x'), []);            // total
});

test('traverse: chamberOf / inChamber / kin read the placed structure', () => {
  const n = nest(REPOS);
  const c = chamberOf(n, 'delta');
  assert.ok(c >= 0);
  assert.ok(inChamber(n, c).includes('delta'));
  assert.equal(chamberOf(n, 'nonexistent'), -1);
  assert.ok(Array.isArray(kinOf(n, 'alpha', 2)));       // cosine neighbours by what-it-does
  assert.deepEqual(kinOf(n, 'nonexistent'), []);        // total
  assert.deepEqual(kinOf(null, 'x'), []);
});

test('graphOf: the weak edges become a TYPED graph (the-kg wire) — chambers contain, kin, typed deps', () => {
  const n = nest(REPOS);
  const deps = [
    { from: 'gamma', to: 'delta', type: 'uses' },
    { from: 'alpha', to: 'delta', type: 'extends' },
  ];
  const g = graphOf(n, deps);
  // every placed repo is a node, plus its chamber; the chamber CONTAINS it (directed)
  const cDelta = chamberOf(n, 'delta');
  assert.ok(g.hasEdge('chamber-' + cDelta, 'contains', 'delta'));           // chamber → repo
  assert.ok(!g.hasEdge('delta', 'contains', 'chamber-' + cDelta));          // contains is directed, not symmetric
  assert.equal(g.query({ nodeType: 'repo' }).nodes.length, n.size);         // one repo node per placed repo
  // the chamber node's meta.url is carried through
  assert.equal(g.nodes.get('alpha').meta.url, 'u1');                        // alpha's url kept (|| not &&)
  assert.equal(g.nodes.get('gamma').meta.url, null);                       // no url → null
  // dep edges are TYPED: uses → reuses, extends → depends
  assert.ok(g.hasEdge('gamma', 'reuses', 'delta'));                        // uses → reuses
  assert.ok(g.hasEdge('alpha', 'depends', 'delta'));                       // extends → depends
  assert.ok(!g.hasEdge('gamma', 'depends', 'delta'));                      // the mapping is exact
  // kin edges (cosine) are carried in as 'kin' (symmetric)
  assert.ok(g.query({ edgeType: 'kin' }).edges.length >= 1);
  // type-aware traversal: walk 'contains' from a chamber → reaches its members, cycle-safe
  const reach = g.traverse('chamber-' + cDelta, { edgeTypes: ['contains'] });
  assert.ok(reach.visited.has('delta'));
  assert.ok(!reach.visited.has('gamma') || chamberOf(n, 'gamma') === cDelta); // only same-chamber members reached via contains
  // totals — never throws on garbage, empty graph out
  assert.equal(graphOf(null).stats().nodes, 0);                            // null nested → empty (&& guard)
  assert.equal(graphOf('nope').stats().nodes, 0);
  assert.doesNotThrow(() => graphOf(n, null));                             // null deps guarded (Array.isArray)
  assert.doesNotThrow(() => graphOf(n, [null, { from: 'x' }]));            // malformed dep skipped (!e || !from || !to)
  // kill the guard mutations (|| not &&): a malformed placed/dep entry is SKIPPED, never processed or thrown
  assert.doesNotThrow(() => graphOf({ placed: [null] }, []));              // null placed entry → no throw (first || on L103)
  assert.equal(graphOf({ placed: [{ chamber: 1 }] }, []).query({ nodeType: 'repo' }).nodes.length, 0);   // name-less placed → NOT a node (second ||)
  assert.equal(graphOf(n, [{ from: 'gamma', type: 'uses' }]).query({ edgeType: 'reuses' }).edges.length, 0);   // dep missing `to` → no edge (|| on L109)
  assert.equal(graphOf(n, [{ to: 'delta', type: 'uses' }]).query({ edgeType: 'reuses' }).edges.length, 0);     // dep missing `from` → no edge (|| on L109)
});

test('kinEdges reads the semantic wiring from cosine nearness (total)', () => {
  const n = nest(REPOS);
  const e = kinEdges(n, 1);
  assert.ok(Array.isArray(e));
  assert.ok(e.every((x) => x.type === 'kin' && x.from && x.to && x.from !== x.to));
  assert.deepEqual(kinEdges(null), []);                 // total
});

test('guards, k-defaults, and traverse-edge edges (kill the defensive mutations)', () => {
  assert.equal(nest([null, { name: 'x', desc: 'a real thing here now' }]).size, 1);   // null repo skipped (|| not &&)
  assert.equal(nest([{ name: 'solo' }]).size, 1);                                     // no-desc → placed by name (|| not &&)
  assert.equal(nest([{ name: 'y', desc: 'placed by its own words', url: 'U9' }]).placed[0].url, 'U9'); // url kept (|| not &&)
  assert.equal(nest([{ name: 'q', desc: 'some real placeable words' }]).placed[0].url, null);          // no url → null, not undefined (|| not &&)
  assert.equal(records(nest([{ name: 'r2', desc: 'a repo with a url', url: 'U7' }]))[0].meta.url, 'U7'); // the STORED record's meta.url is kept too (|| not &&)
  assert.equal(typeof nest([{ name: 'z', desc: 123 }]).placed[0].desc, 'string');     // desc coerced to string (S === path)
  assert.equal(chamberOf(null, 'x'), -1);                                             // null nested is safe (&& not ||)
  assert.equal(inChamber(null, 0).length, 0);                                         // null nested is safe (&& not ||)
  const n = nest(REPOS);
  assert.ok(kinEdges(n, 1).length >= 1);                                              // real kin edges exist (corners ||, k+1)
  assert.ok(kinEdges(n, 1).length <= n.size);                                         // ≤ 1 kin edge per repo at k=1 (>= break)
  assert.ok(kinEdges(n, 0).length >= 1);                                              // k=0 → default 1 (> not >=)
  assert.equal(kinEdges(n, 1.5).length, kinEdges(n, 1).length);                       // non-integer k → 1 (&& not ||)
  assert.equal(kinOf(n, 'alpha', 3).length, 3);                                       // the 3 nearest of the 4 others (k+1, cap, defaults)
  assert.equal(kinOf(n, 'alpha', 0).length, 3);                                       // k=0 → default 3 (> not >=)
  assert.equal(kinOf(n, 'alpha', 1.5).length, 3);                                     // non-integer k → default 3 (&& not ||)
  assert.ok(kinOf(n, 'alpha', 1).length <= 1);                                        // the cap holds (>= break)
  assert.ok(!kinOf(n, 'alpha', 5).includes('alpha'));                                 // never returns itself (!== not ===)
});
