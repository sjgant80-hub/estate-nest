// intake.mjs — the INTAKE HOOK: new work lands PLACED, not dropped.
//
// The nest was a re-run over a snapshot. This makes it a LIVING intake: a build fed here is
// appended to the immutable L0 archive, and the nest (L1) re-derives from it — signed, placed,
// wired, automatically. "CC is the hand; si-didy+wisp is the body that keeps what the hand makes."
//
// The discipline (same as the chat off-ramp): L0 is APPEND-ONLY and never curated at ingest;
// L1 is derived and re-runnable. So intake only ever adds/updates the archive — placement,
// edges, and the whole nest are re-computed by nest.mjs. Nothing is lost; a better signature
// extractor tomorrow re-nests the same archive into a better body.
import { whatItDoes } from './nest.mjs';

// normalize a repo to the archive node shape (total).
export function cleanRepo(r) {
  if (!r || typeof r !== 'object') return null;
  const name = S(r.name);
  if (!name) return null;
  return {
    name,
    desc: S(r.desc),
    lang: S(r.lang),
    topics: Array.isArray(r.topics) ? r.topics.map(S).filter(Boolean) : [],
    live: !!r.live,
    url: r.url || null,
    pushed: S(r.pushed),
  };
}

// a working copy of the archive — never mutate the caller's object (L0 stays immutable to the caller).
// Reads only known fields, each guarded, so a hostile archive (toxic getters) can't crash intake.
export function normArchive(archive) {
  const out = { nodes: [] };
  if (!archive || typeof archive !== 'object') return out;
  try { if (Array.isArray(archive.nodes)) out.nodes = archive.nodes.slice(); } catch { /* toxic */ }
  for (const k of ['generated', 'org', 'total', 'withDesc', 'spiral', 'frontier']) {
    try { const v = archive[k]; if (v !== undefined) out[k] = v; } catch { /* toxic getter */ }
  }
  return out;
}

// intake ONE repo: append if new, update-in-place if its content changed, no-op if identical.
// Deduped by name; a repo whose signature already exists still collapses in the nest (nest.mjs).
export function intakeOne(archive, repo) {
  const arc = normArchive(archive);
  const node = cleanRepo(repo);
  if (!node) return { archive: arc, action: 'skip', name: null };
  const i = arc.nodes.findIndex((n) => n && n.name === node.name);
  if (i === -1) { arc.nodes.push(node); return { archive: arc, action: 'added', name: node.name }; }
  const changed = whatItDoes(arc.nodes[i]) !== whatItDoes(node);
  arc.nodes[i] = node;
  return { archive: arc, action: changed ? 'updated' : 'unchanged', name: node.name };
}

// intake a BATCH (the sync): returns the new archive + a tally of what happened.
export function intakeMany(archive, repos) {
  let arc = normArchive(archive);
  const tally = { added: [], updated: [], unchanged: [], skipped: 0 };
  for (const r of (Array.isArray(repos) ? repos : [])) {
    const res = intakeOne(arc, r);
    arc = res.archive;
    if (res.action === 'added') tally.added.push(res.name);
    else if (res.action === 'updated') tally.updated.push(res.name);
    else if (res.action === 'unchanged') tally.unchanged.push(res.name);
    else tally.skipped++;
  }
  return { archive: arc, ...tally };
}

// MIRROR the archive to the current clean (fork-filtered) list: add new, update changed, keep
// unchanged, and PRUNE anything no longer present (a fork that slipped in, or a deleted/renamed repo).
// The estate's OWN repos ARE the ground truth for a code-nest — unlike chat history, a repo can leave,
// so the archive tracks the live estate exactly (fork-free) rather than only ever growing.
export function syncArchive(archive, current) {
  const base = normArchive(archive);
  const oldByName = new Map(base.nodes.filter((n) => n && n.name).map((n) => [n.name, n]));
  const cur = (Array.isArray(current) ? current : []).map(cleanRepo).filter(Boolean);
  const now = new Set(cur.map((r) => r.name));
  const added = [], updated = [], unchanged = [];
  const nodes = cur.map((r) => {
    if (!oldByName.has(r.name)) { added.push(r.name); return r; }
    (whatItDoes(oldByName.get(r.name)) !== whatItDoes(r) ? updated : unchanged).push(r.name);
    return r;                                          // always take the fresh version
  });
  const pruned = base.nodes.filter((n) => n && n.name && !now.has(n.name)).map((n) => n.name);
  const out = normArchive(archive);
  out.nodes = nodes;                                   // = exactly the current fork-free set
  return { archive: out, added, updated, unchanged, pruned };
}

// the SYNC PLAN: diff the archive against the CURRENT repo list — what is new, changed, or gone.
export function diffArchive(archive, current) {
  const arc = normArchive(archive);
  const cur = (Array.isArray(current) ? current : []).map(cleanRepo).filter(Boolean);
  const have = new Map(arc.nodes.filter((n) => n && n.name).map((n) => [n.name, n]));
  const now = new Set(cur.map((r) => r.name));
  return {
    added: cur.filter((r) => !have.has(r.name)).map((r) => r.name),
    changed: cur.filter((r) => have.has(r.name) && whatItDoes(have.get(r.name)) !== whatItDoes(r)).map((r) => r.name),
    gone: arc.nodes.filter((n) => n && n.name && !now.has(n.name)).map((n) => n.name),
  };
}

function S(x) { try { return typeof x === 'string' ? x : (x == null ? '' : String(x)); } catch { return ''; } }
