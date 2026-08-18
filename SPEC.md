# estate-nest — design notes

## What it is

"What do I have?" across ~1,600 repositories cannot be answered by a list — lists get scrolled, not
known. The nest answers it with a memory: every repo signed by content, placed by golden angle so
neighbours stay distinct at any count, and wired to its relatives with TYPED edges (fork-of,
companion-of, gated-by, supersedes), so the answer to "what do I have" is a walk, not a search.

## The decisions

**Content is the identity.** A repo's node is addressed by the sha of what it contains, not by its
name — renames and forks stop being new things, and duplicates reveal themselves by landing on the
same address. This is how the nest exposed the ×221 duplicate wrapper repos.

**Placement is golden-angle, not clustered.** Sequential placement clumps; hashing scatters
relatives. The golden angle keeps every addition maximally separated for any n — the same rule the
estate uses everywhere something must not clump.

**Edges carry types, and traversal is cycle-safe.** An untyped edge answers nothing; "connected to"
is not knowledge. The graph kernel (kernel/kg.mjs) refuses cycles at walk time rather than trusting
the data to be acyclic.

**The gate runs the same kernel the page ships.** konomi/run-gate.mjs mutates the kernel under the
real suite; index.html inlines that kernel. What you walk is what was proven.

## What it does not claim

The nest reads estate.json, a generated snapshot — it is as current as the last regeneration, and
says so on the page rather than pretending to be live.
