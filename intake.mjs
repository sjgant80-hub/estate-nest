#!/usr/bin/env node
// intake.mjs — the INTAKE HOOK, run. Keeps the nest's L0 archive (estate.json) current so new
// builds land PLACED, not dropped. Two modes:
//
//   node intake.mjs sync                 · re-sync the archive with the current sjgant80-hub repos
//                                          (via `gh`) — intakes new + changed, reports what's gone.
//   node intake.mjs add <name> "<desc>"  · intake ONE build directly (the hand feeding the body).
//
// L0 is append-only and immutable; the nest (L1) re-derives from it in the browser. This never
// curates — it only adds/updates the archive. Re-runnable: a better signature tomorrow re-nests.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { intakeOne, syncArchive, diffArchive } from './kernel/intake.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ESTATE = join(__dirname, 'estate.json');
const today = new Date().toISOString().slice(0, 10);

function load() { try { return JSON.parse(readFileSync(ESTATE, 'utf8')); } catch { return { generated: today, org: 'sjgant80-hub', nodes: [] }; } }
function save(arc) {
  arc.generated = today;
  arc.total = arc.nodes.length;
  arc.withDesc = arc.nodes.filter((n) => n.desc).length;
  arc.spiral = arc.nodes.filter((n) => n.live).length;
  const cut = Date.parse(today) - 11 * 864e5;                 // ~11-day frontier window
  arc.frontier = arc.nodes.filter((n) => Date.parse(n.pushed || '2000-01-01') >= cut).length;
  writeFileSync(ESTATE, JSON.stringify(arc));
}

function fetchCurrent() {
  // --limit high enough to fetch the WHOLE org (it exceeds 1000 — the old 1000 cap truncated it and
  // made the nest incomplete). isFork filter is the tightened fork gate — forks never enter the nest.
  const raw = JSON.parse(execSync(
    'gh repo list sjgant80-hub --limit 4000 --source --json name,description,primaryLanguage,repositoryTopics,pushedAt,homepageUrl,isFork',
    { encoding: 'utf8', maxBuffer: 1 << 27 },
  ));
  return raw.filter((r) => r.isFork !== true).map((r) => ({
    name: r.name,
    desc: (r.description || '').trim(),
    lang: r.primaryLanguage ? r.primaryLanguage.name : '',
    topics: (r.repositoryTopics || []).map((t) => t.name || t),
    live: !!(r.homepageUrl && /github\.io|sjgant80/.test(r.homepageUrl)),
    url: r.homepageUrl || null,
    pushed: r.pushedAt.slice(0, 10),
  }));
}

const cmd = process.argv[2];
const arc = load();

if (cmd === 'sync') {
  let current;
  try { current = fetchCurrent(); }
  catch (e) {
    console.error('sync: could not list repos (needs `gh` + a token with repo-list scope):', String(e.message || e).slice(0, 140));
    console.error('add an ESTATE_PAT secret for full coverage. no-op this run.');
    process.exit(0);   // stay green — the scheduled Action just tries again next time
  }
  const res = syncArchive(arc, current);               // MIRROR to the current fork-free estate (prunes what left)
  save(res.archive);
  console.log(`sync: ${res.archive.nodes.length} repos (fork-free) · +${res.added.length} added · ~${res.updated.length} updated · −${res.pruned.length} pruned · ${res.unchanged.length} unchanged`);
  if (res.added.length) console.log('  added:', res.added.slice(0, 20).join(', ') + (res.added.length > 20 ? ' …' : ''));
  if (res.pruned.length) console.log('  pruned (forks / gone):', res.pruned.slice(0, 20).join(', ') + (res.pruned.length > 20 ? ' …' : ''));
  console.log('the nest (placement + edges) re-derives from this in the browser — nothing to rebuild.');
} else if (cmd === 'add') {
  const name = process.argv[3];
  const desc = process.argv[4] || '';
  if (!name) { console.error('usage: node intake.mjs add <name> "<description>" [--live <url>]'); process.exit(2); }
  const liveIdx = process.argv.indexOf('--live');
  const repo = { name, desc, live: liveIdx !== -1, url: liveIdx !== -1 ? process.argv[liveIdx + 1] : null, pushed: today };
  const res = intakeOne(arc, repo);
  save(res.archive);
  console.log(`${res.action}: ${name} — placed into the nest (${res.archive.nodes.length} repos total).`);
} else {
  console.error('the intake hook:\n  node intake.mjs sync                 re-sync the nest with the current estate\n  node intake.mjs add <name> "<desc>"  intake one build (the hand feeding the body)');
  process.exit(2);
}
