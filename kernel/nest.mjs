// nest.mjs — the OFFRAMP pipeline pointed INWARD: nest the estate into the dodeca memory.
// The organ (fall-remember) was built and run beside a flat pile. This runs the estate THROUGH it.
//
//   Pass 1 · SIGN  — identity by CONTENT (what a repo DOES), not name/path. Duplicates collapse.
//   Pass 2 · PLACE — golden-angle into one of the 12 dodeca chambers (fall-remember's LSH routing).
//   Pass 3 · WIRE  — typed edges: explicit deps (uses/extends) read in, kin (semantic) read by cosine.
//   Then TRAVERSE  — "what uses X?", "what's in chamber N?", "what's kin to Y?" — walk to know.
//
// Same thousand repos. Flat pile → nested body. Nothing added, nothing rebuilt — PLACED.
import FallRemember from './fall-remember.mjs';
import { sha256 } from './sha256.mjs';

// what a repo DOES — the text its identity + placement are computed from (desc + topics + language).
export function whatItDoes(repo) {
  if (!repo || typeof repo !== 'object') return '';
  const parts = [S(repo.desc), (Array.isArray(repo.topics) ? repo.topics.join(' ') : ''), S(repo.lang)];
  return parts.join(' ').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Pass 1 · the fold-signature: a 12-hex content id. Two repos that do the same thing get the SAME id.
export function foldSign(repo) {
  const text = whatItDoes(repo) || S(repo && repo.name);
  return sha256('sig:' + text).slice(0, 12);
}

// Pass 1 + 2 · NEST: sign every repo, place it into the dodeca. Returns the memory, the placed
// records, the signature→repos map (where duplicates reveal themselves), and the chamber fill.
export function nest(repos) {
  const fr = new FallRemember();
  const bySig = {};
  const placed = [];
  for (const r of (Array.isArray(repos) ? repos : [])) {
    if (!r || !r.name) continue;
    const sig = foldSign(r);
    (bySig[sig] = bySig[sig] || []).push(r.name);
    const rec = fr.store({ text: whatItDoes(r) || S(r.name), sig, meta: { name: r.name, sig, live: !!r.live, url: r.url || null, lang: S(r.lang), desc: S(r.desc) } });
    if (rec) placed.push({ name: r.name, sig, chamber: rec.chamber, live: !!r.live, url: r.url || null, desc: S(r.desc) });
  }
  const duplicates = Object.keys(bySig).filter((s) => bySig[s].length > 1).map((s) => ({ sig: s, repos: bySig[s] }));
  return { memory: fr, placed, bySig, duplicates, distribution: fr.distribution(), size: fr.size };
}

// every placed record (across the 12 chambers)
export function records(nested) {
  const ch = nested && nested.memory && Array.isArray(nested.memory.chambers) ? nested.memory.chambers : [];
  const out = [];
  for (const c of ch) if (Array.isArray(c)) for (const r of c) out.push(r);
  return out;
}

// Pass 3 · KIN edges — the semantic wiring, READ (not invented) from cosine nearness. Each repo's
// top-k nearest-by-what-it-does neighbours become 'kin' edges (the synapses already latent in content).
export function kinEdges(nested, k = 1) {
  const recs = records(nested);
  const kk = Number.isInteger(k) && k > 0 ? k : 1;
  const edges = [];
  for (const rec of recs) {
    if (!rec || !rec.meta) continue;
    let cube;
    try { cube = nested.memory.retrieve(rec.text, { k: kk + 1 }); } catch { cube = { corners: [] }; }
    let n = 0;
    for (const c of (cube.corners || [])) {
      if (n >= kk) break;
      if (c && c.meta && c.meta.name !== rec.meta.name) { edges.push({ from: rec.meta.name, to: c.meta.name, type: 'kin' }); n++; }
    }
  }
  return edges;
}

// ── TRAVERSE — the payoff: answer "what do I have" by walking, not guessing ──
// what uses/extends X (explicit dep edges point child→parent; whatUses walks them backward)
export function whatUses(edges, name) {
  const arr = Array.isArray(edges) ? edges : [];
  return arr.filter((e) => e && e.to === name && (e.type === 'uses' || e.type === 'extends')).map((e) => e.from);
}
export function chamberOf(nested, name) {
  const p = nested && Array.isArray(nested.placed) ? nested.placed.find((x) => x.name === name) : null;
  return p ? p.chamber : -1;
}
export function inChamber(nested, c) {
  return (nested && Array.isArray(nested.placed) ? nested.placed : []).filter((p) => p.chamber === c).map((p) => p.name);
}
export function kinOf(nested, name, k = 3) {
  const recs = records(nested);
  const rec = recs.find((r) => r && r.meta && r.meta.name === name);
  if (!rec) return [];
  const kk = Number.isInteger(k) && k > 0 ? k : 3;
  let cube;
  try { cube = nested.memory.retrieve(rec.text, { k: kk + 1 }); } catch { return []; }
  const out = [];
  for (const c of (cube.corners || [])) { if (out.length >= kk) break; if (c && c.meta && c.meta.name !== name) out.push(c.meta.name); }
  return out;
}

function S(x) { try { return typeof x === 'string' ? x : (x == null ? '' : String(x)); } catch { return ''; } }
