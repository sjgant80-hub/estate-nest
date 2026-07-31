// run-gate.mjs — proof-of-play for the nest pipeline. Mutation-gates nest.mjs (the sign/place/wire/
// traverse logic) and fuzzes every function — no malformed repo may crash the nesting. fall-remember
// and sha256 are the vendored, already-gated organs, reused not re-mutated.
import { runMutations, fuzz } from './witness.mjs';
import * as nest from '../kernel/nest.mjs';
import * as intake from '../kernel/intake.mjs';

const TEST = ['node', '--test', 'test/nest.test.mjs', 'test/intake.test.mjs'];
let clean = true;

for (const src of ['kernel/nest.mjs', 'kernel/intake.mjs']) {
  console.log(`── mutation gate (${src}) ─────`);
  const r = runMutations(src, { testCmd: TEST });
  if (r.baselineFailed) { console.log('  BASELINE RED —', r.reason); clean = false; continue; }
  const ig = r.ignored.length ? ` (+${r.ignored.length} baselined)` : '';
  console.log(`  ${src}: ${r.killed}/${r.total} killed  score=${r.score}${ig}  ${r.clean ? 'CLEAN' : 'THEATRE'}`);
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
  'cleanRepo':  (x) => intake.cleanRepo(x),
  'normArchive': (x) => intake.normArchive(x),
  'intakeOne':  (x) => intake.intakeOne(x, x),
  'intakeMany': (x) => intake.intakeMany(x, x),
  'diffArchive': (x) => intake.diffArchive(x, x),
})) {
  const f = await fuzz(fn);
  console.log(`  ${name}: ${f.neverThrows ? 'never throws — OK' : 'THREW on ' + f.throwsOn.map((t) => t.input).join(', ')}`);
  clean = clean && f.neverThrows;
}

console.log(clean ? '\n=== ALL CLEAN ===' : '\n=== SURVIVORS / THROWS REMAIN ===');
process.exit(clean ? 0 : 1);
