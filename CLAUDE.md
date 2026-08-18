# Working on estate-nest

Read SPEC.md first. The rules that matter here:

- **The kernel is the product.** index.html is generated from kernel/*; never edit the page directly.
- **estate.json is a generated snapshot** — regenerate it from the estate index, never hand-edit.
- **Every kernel change goes through the gate**: `npm test` then `node konomi/run-gate.mjs`. A green
  suite alone is not done — the mutation gate is the bar (see the estate's konomify standard).
- Content addresses are the identity. Anything that makes two different contents share an address,
  or one content produce two, is the worst class of bug this repo can have.
