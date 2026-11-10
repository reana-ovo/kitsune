import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CORE_FILES, START, END, readBinding, sha256 } from './startup.mjs';
import {
  DEFAULT_CONFIG, KINDS, canonicalRoot, clone, commitGraph, encode, fail, id, ids,
  initialize, isActivePath, linkedClosure, loadGraph, readConfig, readText, requireValue, text, withStore,
} from './maintenance-store.mjs';

export { DEFAULT_CONFIG, readConfig } from './maintenance-store.mjs';
const DAY = 86400000;
const LINKED = ['occurrences', 'causes', 'attempts', 'checks'];
const TYPES = { issue: 'issues', occurrence: 'occurrences', cause: 'causes', check: 'checks' };
const unique = values => [...new Set(values)];
const metadata = (key, now) => ({ version: 1, id: key, createdAt: now, updatedAt: now });

export function resolveWorkflow(explicit, skillDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), home = os.homedir()) {
  if (explicit !== undefined) {
    requireValue(path.isAbsolute(explicit), 'Workflow path must be absolute');
    return explicit;
  }
  const binding = readBinding(path.join(skillDirectory, 'local/workflow.json'));
  if (binding) return binding.workflowRoot;
  requireValue(home && path.isAbsolute(home), 'Could not resolve the home directory');
  return path.join(home, '.kitsune/workflow');
}

function touch(graph, issueIds, now) {
  for (const key of unique(issueIds)) {
    requireValue(Object.hasOwn(graph.issues, key), 'Unknown issue');
    graph.issues[key].updatedAt = graph.issues[key].updatedAt > now ? graph.issues[key].updatedAt : now;
  }
}
function samePayload(record, payload) {
  const { version, createdAt, updatedAt, ...stored } = record;
  return encode(stored) === encode(payload);
}
function canonicalIssues(graph, values) {
  ids(values, 'issue references');
  for (const key of values) requireValue(graph.issues[key] && !graph.issues[key].aliasOf, 'Use a current canonical issue identifier');
  return values;
}

function putRecord(graph, request, now) {
  const kind = TYPES[request.type];
  requireValue(kind, 'Unknown record type');
  const input = request.record;
  requireValue(input && typeof input === 'object', 'A record is required');
  id(input.id);
  let payload;
  if (kind === 'issues') {
    payload = { id: input.id, title: text(input.title, 'issue title', 240), expected: text(input.expected, 'expected behavior'), scope: text(input.scope, 'issue scope') };
    requireValue(!graph.issues[input.id]?.aliasOf, 'An alias must be undone before editing its issue');
  } else if (kind === 'occurrences') {
    canonicalIssues(graph, input.issueIds);
    requireValue(input.source && typeof input.source === 'object' && !Array.isArray(input.source), 'A source locator is required');
    requireValue(Object.values(input.source).every(value => typeof value === 'string' && value.length <= 1024), 'Source locators must be short strings');
    payload = { id: input.id, issueIds: input.issueIds, summary: text(input.summary, 'occurrence summary'), eventKey: text(input.eventKey, 'event key', 512), source: input.source };
    const duplicate = Object.values(graph.occurrences).find(record => record.eventKey === input.eventKey && record.id !== input.id);
    if (duplicate) {
      requireValue(samePayload(duplicate, { ...payload, id: duplicate.id }), 'Event already recorded with different content; update its existing record');
      return { id: duplicate.id, changed: false };
    }
  } else if (kind === 'causes') {
    canonicalIssues(graph, input.issueIds);
    payload = { id: input.id, issueIds: input.issueIds, summary: text(input.summary, 'cause hypothesis'), status: input.status ?? 'hypothesis', supports: input.supports ?? [], contradicts: input.contradicts ?? [] };
  } else {
    canonicalIssues(graph, input.issueIds);
    payload = { id: input.id, issueIds: input.issueIds, attemptId: input.attemptId ?? null, kind: input.kind, outcome: input.outcome, summary: text(input.summary, 'check evidence') };
    // A new result is a new observation. Do not overwrite earlier failed evidence.
    if (graph.checks[input.id]) requireValue(samePayload(graph.checks[input.id], payload), 'Check results are immutable; record a new check');
  }
  const existing = graph[kind][input.id];
  if (existing && samePayload(existing, payload)) return { id: input.id, changed: false };
  graph[kind][input.id] = { ...metadata(input.id, now), ...payload, createdAt: existing?.createdAt ?? now, updatedAt: existing?.updatedAt > now ? existing.updatedAt : now };
  if (kind !== 'issues') touch(graph, [...(existing?.issueIds ?? []), ...payload.issueIds], now);
  return { id: input.id, changed: true };
}

function uniqueIndex(content, value) {
  const index = content.indexOf(value);
  requireValue(index >= 0 && content.indexOf(value, index + 1) < 0, 'Edit context must match exactly once');
  return index;
}
function makeChange(root, change) {
  requireValue(isActivePath(change.path), 'Automatic repair cannot modify this path');
  const before = readText(root, change.path);
  const beforeHash = before === null ? null : sha256(before);
  requireValue(Object.hasOwn(change, 'baseSha256') && change.baseSha256 === beforeHash, 'Repair baseline digest does not match');
  let after, undo = [];
  if (change.create !== undefined) {
    requireValue(before === null && typeof change.create === 'string' && change.create.trim(), 'Create requires an absent file and nonempty content');
    after = change.create;
  } else if (change.remove === true) {
    requireValue(before !== null && !CORE_FILES.includes(change.path) && change.path !== 'authoring.md', 'Cannot remove a required workflow file');
    after = null;
  } else {
    requireValue(before !== null && Array.isArray(change.edits) && change.edits.length > 0, 'Existing file requires edits');
    after = before;
    for (const edit of change.edits) {
      text(edit.before, 'before text', 1000000); text(edit.after, 'after text', 1000000);
      requireValue(edit.before !== edit.after, 'Edit must change content');
      const index = uniqueIndex(after, edit.before);
      const prefix = after.slice(Math.max(0, index - 160), index);
      const suffix = after.slice(index + edit.before.length, index + edit.before.length + 160);
      undo.unshift({ before: edit.before, after: edit.after, prefix, suffix });
      after = after.slice(0, index) + edit.after + after.slice(index + edit.before.length);
    }
  }
  if (after !== null) {
    requireValue(after.trim() && !/\{\{[a-z_]+\}\}/i.test(after), 'Active workflow content must be complete');
    requireValue(!after.includes(START) && !after.includes(END), 'Active content cannot contain startup markers');
  }
  return { path: change.path, before, after, beforeHash, afterHash: after === null ? null : sha256(after), undo };
}

function propose(root, graph, request, now) {
  const input = request.attempt;
  requireValue(input && !graph.attempts[id(input.id)], 'Attempt identifier already exists');
  canonicalIssues(graph, input.issueIds);
  requireValue(Array.isArray(input.changes) && input.changes.length > 0, 'A repair requires file changes');
  const record = {
    ...metadata(input.id, now), issueIds: input.issueIds, causeIds: input.causeIds ?? [],
    reviewId: text(input.reviewId, 'review id', 128), strategy: text(input.strategy, 'repair strategy'),
    expected: text(input.expected, 'repair expectation'), dependsOn: input.dependsOn ?? [],
    status: 'proposed', changes: input.changes.map(change => makeChange(root, change)),
  };
  graph.attempts[input.id] = record;
  touch(graph, input.issueIds, now);
  return { id: input.id, changed: true };
}

function applyAttempt(root, graph, request, now, actions) {
  const record = graph.attempts[id(request.id)];
  requireValue(record, 'Unknown attempt');
  if (record.status === 'applied') return { id: record.id, changed: false };
  requireValue(record.status === 'proposed', 'Only a proposed attempt can be applied');
  const receiptId = `review-${sha256(record.reviewId).slice(0, 40)}`;
  requireValue(!graph.sessions[receiptId] && !Object.values(graph.attempts).some(other => other.id !== record.id && other.reviewId === record.reviewId && ['applied', 'reverted'].includes(other.status)), 'This review already applied a repair batch');
  requireValue(record.dependsOn.every(key => graph.attempts[key]?.status === 'applied'), 'Attempt dependency is not active');
  requireValue(!Object.values(graph.checks).some(check => check.attemptId === record.id && check.outcome === 'fail'), 'Failed candidate must be revised as a new attempt');
  for (const change of record.changes) {
    requireValue(readText(root, change.path) === change.before, 'Repair baseline changed; reassess instead of overwriting');
    actions.push({ path: change.path, before: change.before, after: change.after });
  }
  record.status = 'applied'; record.updatedAt = now;
  // A bounded receipt survives issue pruning so it cannot reset this review's budget.
  graph.sessions[receiptId] = { ...metadata(receiptId, now), reviewId: record.reviewId, pending: false, reminded: true, failureIds: [], appliedAttemptId: record.id };
  touch(graph, record.issueIds, now);
  return { id: record.id, changed: true };
}

function rollbackAttempt(root, graph, request, now, actions) {
  const record = graph.attempts[id(request.id)];
  requireValue(record, 'Unknown attempt');
  if (record.status === 'reverted') return { id: record.id, changed: false };
  requireValue(record.status === 'applied', 'Only an applied attempt can be reverted');
  requireValue(!Object.values(graph.attempts).some(other => other.status === 'applied' && other.dependsOn.includes(record.id)), 'An active repair depends on this attempt');
  text(request.reason, 'rollback evidence');
  for (const change of [...record.changes].reverse()) {
    const current = readText(root, change.path);
    let restored = change.before;
    if (current !== change.after) {
      requireValue(current !== null && change.after !== null && change.before !== null, 'Rollback conflicts with a later create or removal');
      restored = current;
      for (const edit of change.undo) {
        const context = edit.prefix + edit.after + edit.suffix;
        const start = uniqueIndex(restored, context) + edit.prefix.length;
        restored = restored.slice(0, start) + edit.before + restored.slice(start + edit.after.length);
      }
    }
    actions.push({ path: change.path, before: current, after: restored });
  }
  record.status = 'reverted'; record.updatedAt = now; record.rollbackReason = request.reason;
  touch(graph, record.issueIds, now);
  return { id: record.id, changed: true };
}

function mergeIssues(graph, request, now) {
  const key = id(request.id), target = id(request.targetId), sources = ids(request.sourceIds, 'merge sources');
  requireValue(!graph.merges[key] && !sources.includes(target), 'Invalid or repeated merge');
  canonicalIssues(graph, [target, ...sources]);
  const links = [];
  for (const kind of LINKED) {
    for (const record of Object.values(graph[kind])) {
      if (!record.issueIds.some(value => sources.includes(value))) continue;
      const beforeIds = [...record.issueIds];
      record.issueIds = unique(record.issueIds.map(value => sources.includes(value) ? target : value));
      links.push({ kind, id: record.id, beforeIds, afterIds: [...record.issueIds] });
    }
  }
  const aliasChanges = Object.values(graph.issues).filter(issue => sources.includes(issue.aliasOf)).map(issue => ({ id: issue.id, before: issue.aliasOf, after: target }));
  for (const change of aliasChanges) graph.issues[change.id].aliasOf = change.after;
  for (const source of sources) graph.issues[source].aliasOf = target;
  graph.merges[key] = { ...metadata(key, now), targetId: target, sourceIds: sources, reason: text(request.reason, 'merge basis'), status: 'applied', links, aliasChanges };
  touch(graph, [target, ...sources], now);
  return { id: key, changed: true };
}
function undoMerge(graph, request, now) {
  const merge = graph.merges[id(request.id)];
  requireValue(merge, 'Unknown merge');
  if (merge.status === 'undone') return { id: merge.id, changed: false };
  for (const link of merge.links) requireValue(graph[link.kind]?.[link.id] && encode(graph[link.kind][link.id].issueIds) === encode(link.afterIds), 'Merge has later classification changes; split explicitly');
  for (const source of merge.sourceIds) requireValue(graph.issues[source]?.aliasOf === merge.targetId, 'Merge alias changed');
  for (const change of merge.aliasChanges ?? []) requireValue(graph.issues[change.id]?.aliasOf === change.after, 'Merge alias changed');
  for (const link of merge.links) graph[link.kind][link.id].issueIds = link.beforeIds;
  for (const source of merge.sourceIds) delete graph.issues[source].aliasOf;
  for (const change of merge.aliasChanges ?? []) graph.issues[change.id].aliasOf = change.before;
  merge.status = 'undone'; merge.updatedAt = now;
  touch(graph, [merge.targetId, ...merge.sourceIds], now);
  return { id: merge.id, changed: true };
}

export function pruneGraph(graph, config, now) {
  const beforeCount = Object.keys(graph.issues).length;
  const eligible = Object.values(graph.issues).filter(record => config.minIdleDays === null || Date.parse(now) - Date.parse(record.updatedAt) >= config.minIdleDays * DAY)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.id.localeCompare(b.id));
  const removed = eligible.slice(0, Math.max(0, beforeCount - config.maxIssues)).map(record => record.id);
  removed.forEach(key => delete graph.issues[key]);
  for (const issue of Object.values(graph.issues)) if (issue.aliasOf && !graph.issues[issue.aliasOf]) delete issue.aliasOf;
  for (const kind of LINKED) for (const record of Object.values(graph[kind])) record.issueIds = record.issueIds.filter(value => graph.issues[value]);
  // Shared evidence and dependency records survive while a retained problem reaches them.
  const reachable = linkedClosure(graph);
  for (const kind of LINKED) for (const key of Object.keys(graph[kind])) if (!reachable[kind].has(key)) delete graph[kind][key];
  for (const [key, record] of Object.entries(graph.merges)) {
    if (!graph.issues[record.targetId] || record.sourceIds.some(value => !graph.issues[value])
      || (record.aliasChanges ?? []).some(change => [change.id, change.before, change.after].some(value => !graph.issues[value]))
      || record.links.some(link => !graph[link.kind]?.[link.id] || [...link.beforeIds, ...link.afterIds].some(value => !graph.issues[value]))) delete graph.merges[key];
  }
  for (const [key, session] of Object.entries(graph.sessions)) {
    if (Date.parse(now) - Date.parse(session.updatedAt) >= 30 * DAY) delete graph.sessions[key];
  }
  return { removed, remaining: Object.keys(graph.issues).length, excess: Math.max(0, Object.keys(graph.issues).length - config.maxIssues) };
}

function sessionRecord(graph, request, now) {
  const key = `session-${sha256(text(request.sessionId, 'session identifier', 512)).slice(0, 40)}`;
  let record = graph.sessions[key];
  if (request.op === 'begin-review') {
    if (record && request.promptId && record.promptId === request.promptId) return { reviewId: record.reviewId, pending: record.pending, changed: false };
    record = { ...metadata(key, now), reviewId: `review-${randomUUID()}`, promptId: request.promptId ?? null, pending: true, reminded: false, failureIds: [], lastEvent: 'UserPromptSubmit' };
    graph.sessions[key] = record;
  } else if (!record) {
    record = { ...metadata(key, now), reviewId: `review-${randomUUID()}`, promptId: null, pending: false, reminded: false, failureIds: [], lastEvent: request.event ?? 'PostToolUse' };
    graph.sessions[key] = record;
  }
  if (request.op === 'signal') {
    if (request.failureId && !record.failureIds.includes(request.failureId)) {
      record.failureIds = [...record.failureIds.slice(-99), request.failureId]; record.pending = true;
    }
    record.lastEvent = text(request.event, 'hook event', 80);
    if (request.toolUseId) record.lastToolUseId = text(request.toolUseId, 'tool use identifier', 512);
  } else if (request.op === 'finish-review') {
    requireValue(request.reviewId === record.reviewId, 'Stale review cannot finish the current turn');
    record.pending = false;
  } else if (request.op === 'remind') {
    const shouldRemind = record.pending && !record.reminded;
    record.reminded = record.reminded || shouldRemind;
    record.updatedAt = now;
    return { reviewId: record.reviewId, remind: shouldRemind };
  }
  record.updatedAt = now;
  return { reviewId: record.reviewId, pending: record.pending, changed: true };
}

function query(root, request) {
  const config = readConfig(root);
  if (!config?.enabled) return { enabled: false, configured: config !== null };
  const graph = loadGraph(root);
  if (request.op === 'get') {
    requireValue(KINDS.includes(request.kind), 'Unknown collection');
    const record = graph[request.kind][id(request.id)];
    requireValue(record, 'Unknown record');
    return record;
  }
  if (request.op === 'inspect') {
    const issue = graph.issues[id(request.id)]; requireValue(issue, 'Unknown issue');
    const key = issue.aliasOf ?? issue.id;
    return { issue, related: Object.fromEntries(LINKED.map(kind => [kind, Object.values(graph[kind]).filter(record => record.issueIds.includes(key)).map(record => {
      if (kind !== 'attempts') return record;
      const { changes, ...summary } = record;
      return { ...summary, paths: changes.map(change => change.path) };
    })])) };
  }
  const issues = Object.values(graph.issues).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const limit = request.limit ?? 20;
  requireValue(Number.isSafeInteger(limit) && limit > 0, 'Invalid query limit');
  const matching = request.query ? issues.filter(issue => `${issue.title} ${issue.expected} ${issue.scope}`.toLowerCase().includes(String(request.query).toLowerCase())) : issues;
  return { enabled: true, config, counts: Object.fromEntries(KINDS.map(kind => [kind, Object.keys(graph[kind]).length])), issues: matching.slice(0, limit), more: matching.length > limit };
}

export function runMaintenance(root, request, options = {}) {
  requireValue(request && typeof request === 'object' && typeof request.op === 'string', 'A maintenance operation is required');
  root = canonicalRoot(root);
  const now = new Date(options.now ?? Date.now()).toISOString();
  if (request.op === 'initialize') return initialize(root, request.config ?? DEFAULT_CONFIG);
  if (['status', 'list', 'get', 'inspect'].includes(request.op)) return query(root, request);
  return withStore(root, ({ config, graph }) => {
    const before = clone(graph), actions = [];
    let result;
    if (request.op === 'put') result = putRecord(graph, request, now);
    else if (request.op === 'propose') result = propose(root, graph, request, now);
    else if (request.op === 'apply') result = applyAttempt(root, graph, request, now, actions);
    else if (request.op === 'rollback') result = rollbackAttempt(root, graph, request, now, actions);
    else if (request.op === 'reject') {
      const attempt = graph.attempts[id(request.id)];
      requireValue(attempt?.status === 'proposed', 'Only a proposed attempt can be rejected');
      attempt.status = 'rejected'; attempt.rejectionReason = text(request.reason, 'rejection evidence'); attempt.updatedAt = now;
      touch(graph, attempt.issueIds, now); result = { id: attempt.id };
    } else if (request.op === 'merge') result = mergeIssues(graph, request, now);
    else if (request.op === 'undo-merge') result = undoMerge(graph, request, now);
    else if (request.op === 'relink') {
      requireValue(LINKED.includes(request.kind), 'Only linked records can be reassigned');
      const record = graph[request.kind][id(request.id)]; requireValue(record, 'Unknown record');
      canonicalIssues(graph, request.issueIds);
      if (encode([...record.issueIds].sort()) === encode([...request.issueIds].sort())) return { id: record.id, changed: false };
      const old = record.issueIds; record.issueIds = request.issueIds; record.updatedAt = now;
      touch(graph, [...old, ...record.issueIds], now); result = { id: record.id };
    } else if (request.op === 'prune') result = pruneGraph(graph, config, now);
    else if (['begin-review', 'signal', 'remind', 'finish-review'].includes(request.op)) {
      result = sessionRecord(graph, request, now);
      if (request.op === 'finish-review') result.retention = pruneGraph(graph, config, now);
    } else fail('Unknown maintenance operation');
    const changed = commitGraph(root, before, graph, actions, options);
    return { ...result, changed };
  });
}

function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Maintenance: --workflow ABSOLUTE_DIR --request FILE_OR_DASH');
    console.log('Read references/maintenance.md before automatic changes. No network or model calls.');
    return;
  }
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = { '--workflow': 'workflow', '--request': 'request' }[args[index]];
    requireValue(key && options[key] === undefined && args[index + 1], 'Invalid maintenance arguments');
    options[key] = args[index + 1];
  }
  requireValue(options.request, 'Supply --request with a JSON file or - for stdin');
  const raw = fs.readFileSync(options.request === '-' ? 0 : options.request, 'utf8');
  requireValue(Buffer.byteLength(raw) <= 2 * 1024 * 1024, 'Request is too large');
  console.log(encode(runMaintenance(resolveWorkflow(options.workflow), JSON.parse(raw))).trimEnd());
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
