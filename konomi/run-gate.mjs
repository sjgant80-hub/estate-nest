// run-gate.mjs — proof-of-play for the nest pipeline. Mutation-gates nest.mjs (the sign/place/wire/
// traverse logic) and fuzzes every function — no malformed repo may crash the nesting. fall-remember
// and sha256 are the vendored, already-gated organs, reused not re-mutated.
import { runMutations, fuzz } from './witness.mjs';
import * as nest from '../kernel/nest.mjs';

const TEST = ['node', '--test', 'test/nest.test.mjs'];
let clean = true;

console.log('── mutation gate (kernel/nest.mjs) ─────');
const r = runMutations('kernel/nest.mjs', { testCmd: TEST });
if (r.baselineFailed) { console.log('  BASELINE RED —', r.reason); clean = false; }
else {
  const ig = r.ignored.length ? ` (+${r.ignored.length} baselined)` : '';
  console.log(`  kernel/nest.mjs: ${r.killed}/${r.total} killed  score=${r.score}${ig}  ${r.clean ? 'CLEAN' : 'THEATRE'}`);
  for (const s of r.survived) console.log(`     SURVIVED L${s.line}  ${s.mutation}  | ${s.snippet}`);
  clean = clean && r.clean;
}

console.log('\n── fuzz gate (no malformed repo may crash the nesting) ──');
const n = nest.nest([{ name: 'x', desc: 'a thing' }]);
for (const [name, fn] of Object.entries({
  'whatItDoes': (x) => nest.whatItDoes(x),
  'foldSign':   (x) => nest.foldSign(x),
  'nest':       (x) => nest.nest(x),
  'records':    (x) => nest.records(x),
  'kinEdges':   (x) => nest.kinEdges(x),
  'whatUses':   (x) => nest.whatUses(x, x),
  'chamberOf':  (x) => nest.chamberOf(x, x),
  'inChamber':  (x) => nest.inChamber(x, x),
  'kinOf':      (x) => nest.kinOf(x, x),
})) {
  const f = await fuzz(fn);
  console.log(`  ${name}: ${f.neverThrows ? 'never throws — OK' : 'THREW on ' + f.throwsOn.map((t) => t.input).join(', ')}`);
  clean = clean && f.neverThrows;
}

console.log(clean ? '\n=== ALL CLEAN ===' : '\n=== SURVIVORS / THROWS REMAIN ===');
process.exit(clean ? 0 : 1);
