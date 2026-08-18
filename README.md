# estate-nest

**Live: https://sjgant80-hub.github.io/estate-nest/**

The estate — ~1,600 repositories — nested into one walkable memory. Every repo is signed by its
content, placed by golden angle, and wired to its relatives with typed edges, so "what do I have?"
becomes a graph you traverse instead of a list you scroll.

This is the off-ramp pipeline pointed inward: the same content-addressed intake that turns a dead
chat export into live memory, aimed at the estate itself.

## Run it

```bash
npm test               # the suite
node intake.mjs        # rebuild the nest from estate.json
node server.mjs        # serve the walkable memory locally
node konomi/run-gate.mjs   # the mutation gate over the kernel
```

The page (`index.html`) is generated from the same kernel the gate runs — what you walk is what was
proven. Works offline once loaded.

## What is in the kernel

| file | job |
|---|---|
| `kernel/intake.mjs` | content-addressed intake: sign, dedupe, place |
| `kernel/kg.mjs` | the typed-edge graph: nodes, edges, cycle-safe traversal |
| `kernel/nest.mjs` | golden-angle placement into the dodeca memory |
| `kernel/fall-remember.mjs` | the memory organ the nest stores into |
| `kernel/sha256.mjs` | the content signature |

Part of the AI Native Solutions estate · powered by fall·os · Konomi Architecture
