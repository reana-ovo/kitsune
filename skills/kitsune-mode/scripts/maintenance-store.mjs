import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { sha256, readCore } from './startup.mjs';

export const KINDS = ['issues', 'occurrences', 'causes', 'attempts', 'checks', 'merges', 'sessions'];
export const DEFAULT_CONFIG = Object.freeze({ version: 1, enabled: true, maxIssues: 100, minIdleDays: 30 });
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const META = '.maintenance';

export function fail(message) { throw new Error(message); }
export function requireValue(value, message) { if (!value) fail(message); }
export function id(value) {
  requireValue(typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,95}$/.test(value), 'Invalid record identifier');
  requireValue(!['constructor', 'prototype', '__proto__'].includes(value) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(value), 'Reserved record identifier');
  return value;
}
export function text(value, label, limit = 12000) {
  requireValue(typeof value === 'string' && value.trim() && value.length <= limit, `Invalid ${label}`);
  return value;
}
export function ids(value, label = 'references', allowEmpty = false) {
  requireValue(Array.isArray(value) && (allowEmpty || value.length) && new Set(value).size === value.length, `Invalid ${label}`);
  value.forEach(id);
  return value;
}
export function timestamp(value) {
  requireValue(typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value, 'Invalid timestamp');
  return value;
}
export function encode(value) { return JSON.stringify(value, null, 2) + '\n'; }
export function clone(value) { return JSON.parse(JSON.stringify(value)); }
export function emptyGraph() { return Object.fromEntries(KINDS.map(kind => [kind, {}])); }
export function recordPath(kind, key) {
  requireValue(KINDS.includes(kind), 'Unknown record kind');
  id(key);
  return ['issues', 'attempts'].includes(kind) ? `${META}/${kind}/${key}/record.json` : `${META}/${kind}/${key}.json`;
}

export function validateConfig(config) {
  requireValue(config && config.version === 1 && typeof config.enabled === 'boolean', 'Invalid maintenance configuration');
  requireValue(Number.isSafeInteger(config.maxIssues) && config.maxIssues >= 0, 'maxIssues must be a nonnegative integer');
  requireValue(config.minIdleDays === null || (Number.isFinite(config.minIdleDays) && config.minIdleDays >= 0), 'minIdleDays must be null or nonnegative');
  requireValue(Object.keys(config).every(key => Object.hasOwn(DEFAULT_CONFIG, key)), 'Unknown maintenance configuration field');
  return config;
}

export function canonicalRoot(root) {
  requireValue(typeof root === 'string' && path.isAbsolute(root), 'Workflow root must be absolute');
  const resolved = fs.realpathSync(root);
  requireValue(fs.statSync(resolved).isDirectory(), 'Workflow root must be a directory');
  return resolved;
}

export function safePath(root, relative) {
  requireValue(typeof relative === 'string' && relative.length && !relative.includes('\\') && !relative.includes(':') && !relative.includes('\0') && !path.posix.isAbsolute(relative), 'Invalid relative path');
  const parts = relative.split('/');
  requireValue(parts.every(part => part && part !== '.' && part !== '..' && !/[\r\n]/.test(part)), 'Path escapes workflow');
  requireValue(parts.every(part => !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part) && !/[ .]$/.test(part)), 'Reserved filesystem path');
  let current = root;
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]);
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    requireValue(!stat.isSymbolicLink(), 'Workflow links are not writable maintenance paths');
    if (index < parts.length - 1) requireValue(stat.isDirectory(), 'Parent path is not a directory');
  }
  return current;
}

export function isActivePath(relative) {
  return ['README.md', 'preferences.md', 'skills.md', 'authoring.md', 'examples.md'].includes(relative)
    || /^methods\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.md$/.test(relative);
}
function isRecordPath(relative) {
  return /^\.maintenance\/(issues|attempts)\/[a-zA-Z][a-zA-Z0-9_-]{0,95}\/record\.json$/.test(relative)
    || /^\.maintenance\/(occurrences|causes|checks|merges|sessions)\/[a-zA-Z][a-zA-Z0-9_-]{0,95}\.json$/.test(relative);
}

export function readText(root, relative) {
  const file = safePath(root, relative);
  let bytes;
  try {
    const stat = fs.lstatSync(file);
    requireValue(stat.isFile() && stat.size <= MAX_FILE_BYTES, 'Maintenance file must be a bounded regular file');
    bytes = fs.readFileSync(file);
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
}

function atomicWrite(root, relative, content) {
  const destination = safePath(root, relative);
  if (content === null) {
    if (fs.existsSync(destination)) fs.unlinkSync(destination);
    return;
  }
  requireValue(typeof content === 'string' && Buffer.byteLength(content) <= MAX_FILE_BYTES, 'Maintenance file exceeds size limit');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  safePath(root, relative);
  const temp = destination + `.tmp-${randomUUID()}`;
  let descriptor;
  try {
    descriptor = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(descriptor, content, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor); descriptor = undefined;
    fs.renameSync(temp, destination);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

export function readConfig(root) {
  const content = readText(root, 'maintenance.json');
  return content === null ? null : validateConfig(JSON.parse(content));
}

export function initialize(root, config = DEFAULT_CONFIG) {
  root = canonicalRoot(root);
  readCore(root);
  validateConfig(config);
  const previous = readConfig(root);
  if (previous) {
    requireValue(encode(previous) === encode(config), 'Existing maintenance configuration differs; change it explicitly');
    return { initialized: false };
  }
  // Initialization is a separately authorized operation, not a hook fallback.
  const file = safePath(root, 'maintenance.json');
  fs.writeFileSync(file, encode(config), { flag: 'wx', mode: 0o600 });
  return { initialized: true };
}

function validateTransaction(transaction) {
  requireValue(transaction?.version === 1 && Array.isArray(transaction.actions) && transaction.actions.length > 0, 'Invalid pending transaction');
  const paths = new Set();
  for (const action of transaction.actions) {
    const identity = process.platform === 'win32' ? action.path.toLowerCase() : action.path;
    requireValue(!paths.has(identity) && (isRecordPath(action.path) || isActivePath(action.path)), 'Invalid transaction path');
    paths.add(identity);
    for (const key of ['before', 'after']) requireValue(action[key] === null || (typeof action[key] === 'string' && Buffer.byteLength(action[key]) <= MAX_FILE_BYTES), 'Invalid transaction content');
  }
}

export function recoverTransaction(root) {
  const serialized = readText(root, `${META}/transaction.json`);
  if (serialized === null) return false;
  const transaction = JSON.parse(serialized);
  validateTransaction(transaction);
  // Inspect every target before restoring anything. Unrelated later edits stop recovery.
  for (const action of transaction.actions) {
    const current = readText(root, action.path);
    requireValue(current === action.before || current === action.after, 'Pending transaction conflicts with a later edit');
  }
  for (const action of [...transaction.actions].reverse()) {
    if (readText(root, action.path) !== action.before) atomicWrite(root, action.path, action.before);
  }
  fs.unlinkSync(safePath(root, `${META}/transaction.json`));
  return true;
}

function lock(root) {
  fs.mkdirSync(safePath(root, META), { recursive: true });
  const relative = `${META}/lock.json`;
  const file = safePath(root, relative);
  const token = randomUUID();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(file, encode({ pid: process.pid, token }), { flag: 'wx', mode: 0o600 });
      return () => {
        const saved = JSON.parse(readText(root, relative));
        requireValue(saved.token === token, 'Maintenance lock ownership changed');
        fs.unlinkSync(file);
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const original = readText(root, relative);
      const existing = JSON.parse(original);
      requireValue(Number.isSafeInteger(existing.pid) && existing.pid > 0 && typeof existing.token === 'string', 'Invalid maintenance lock');
      let dead = false;
      try { process.kill(existing.pid, 0); } catch (probe) { if (probe.code === 'ESRCH') dead = true; }
      requireValue(dead && readText(root, relative) === original, 'Maintenance is busy');
      fs.unlinkSync(file);
    }
  }
  fail('Could not acquire maintenance lock');
}

export function linkedClosure(graph) {
  const kinds = ['occurrences', 'causes', 'attempts', 'checks'];
  const keep = Object.fromEntries(kinds.map(kind => [kind, new Set()]));
  const queue = [];
  const add = (kind, key) => { if (graph[kind][key] && !keep[kind].has(key)) { keep[kind].add(key); queue.push([kind, key]); } };
  for (const kind of kinds) for (const record of Object.values(graph[kind])) if (record.issueIds.length) add(kind, record.id);
  for (let index = 0; index < queue.length; index++) {
    const [kind, key] = queue[index], record = graph[kind][key];
    if (kind === 'causes') for (const occurrence of [...record.supports, ...record.contradicts]) add('occurrences', occurrence);
    if (kind === 'attempts') {
      record.causeIds.forEach(cause => add('causes', cause));
      record.dependsOn.forEach(attempt => add('attempts', attempt));
    }
    if (kind === 'checks' && record.attemptId) add('attempts', record.attemptId);
  }
  return keep;
}

export function validateGraph(graph) {
  for (const kind of KINDS) {
    requireValue(graph[kind] && typeof graph[kind] === 'object' && !Array.isArray(graph[kind]), 'Invalid record collection');
    for (const [key, record] of Object.entries(graph[kind])) {
      id(key); requireValue(record?.id === key && record.version === 1, 'Invalid record identity');
      timestamp(record.createdAt); timestamp(record.updatedAt);
    }
  }
  const references = (values, collection, label, empty = true) => {
    ids(values, label, empty);
    for (const key of values) requireValue(Object.hasOwn(graph[collection], key), `Missing ${label}`);
  };
  for (const record of Object.values(graph.issues)) {
    text(record.title, 'issue title', 240); text(record.expected, 'expected behavior'); text(record.scope, 'issue scope');
    requireValue(!Object.hasOwn(record, 'status'), 'Issue resolution status is not part of retention');
    if (record.aliasOf) {
      id(record.aliasOf);
      requireValue(graph.issues[record.aliasOf] && record.aliasOf !== record.id && !graph.issues[record.aliasOf].aliasOf, 'Invalid issue alias');
    }
  }
  const eventKeys = new Set();
  for (const record of Object.values(graph.occurrences)) {
    references(record.issueIds, 'issues', 'issue references');
    text(record.summary, 'occurrence summary'); text(record.eventKey, 'event key', 512);
    requireValue(!eventKeys.has(record.eventKey), 'Duplicate occurrence event'); eventKeys.add(record.eventKey);
    requireValue(record.source && typeof record.source === 'object', 'Occurrence requires a source locator');
  }
  for (const record of Object.values(graph.causes)) {
    references(record.issueIds, 'issues', 'issue references');
    references(record.supports, 'occurrences', 'supporting occurrences');
    references(record.contradicts, 'occurrences', 'contradicting occurrences');
    text(record.summary, 'cause hypothesis');
    requireValue(['hypothesis', 'supported', 'refuted'].includes(record.status), 'Invalid cause status');
  }
  for (const record of Object.values(graph.attempts)) {
    references(record.issueIds, 'issues', 'issue references');
    references(record.causeIds, 'causes', 'cause references');
    references(record.dependsOn, 'attempts', 'attempt dependencies');
    requireValue(!record.dependsOn.includes(record.id), 'Attempt cannot depend on itself');
    text(record.reviewId, 'review id', 128); text(record.strategy, 'repair strategy'); text(record.expected, 'repair expectation');
    requireValue(['proposed', 'applied', 'reverted', 'rejected'].includes(record.status), 'Invalid attempt status');
    requireValue(Array.isArray(record.changes) && record.changes.length > 0, 'Attempt has no changes');
    const changed = new Set();
    for (const change of record.changes) {
      requireValue(isActivePath(change.path) && !changed.has(change.path), 'Invalid repair target'); changed.add(change.path);
      for (const key of ['before', 'after']) requireValue(change[key] === null || typeof change[key] === 'string', 'Invalid change content');
      requireValue(change.before !== change.after && change.beforeHash === (change.before === null ? null : sha256(change.before)) && change.afterHash === (change.after === null ? null : sha256(change.after)), 'Invalid change digest');
      if (change.before !== null && change.after !== null) requireValue(Array.isArray(change.undo) && change.undo.length > 0, 'Missing anchored inverse edits');
    }
  }
  const visiting = new Set(), done = new Set();
  const visit = key => {
    requireValue(!visiting.has(key), 'Cyclic attempt dependencies');
    if (done.has(key)) return;
    visiting.add(key); graph.attempts[key].dependsOn.forEach(visit); visiting.delete(key); done.add(key);
  };
  Object.keys(graph.attempts).forEach(visit);
  for (const record of Object.values(graph.checks)) {
    references(record.issueIds, 'issues', 'issue references');
    if (record.attemptId !== null) references([record.attemptId], 'attempts', 'checked attempt');
    requireValue(['static', 'behavior', 'observed'].includes(record.kind) && ['pass', 'fail', 'inconclusive'].includes(record.outcome), 'Invalid check result');
    text(record.summary, 'check evidence');
  }
  const reachable = linkedClosure(graph);
  for (const kind of Object.keys(reachable)) for (const key of Object.keys(graph[kind])) requireValue(reachable[kind].has(key), 'Unreferenced shared record');
  for (const record of Object.values(graph.merges)) {
    references([record.targetId, ...record.sourceIds], 'issues', 'merged issues', false);
    requireValue(['applied', 'undone'].includes(record.status) && Array.isArray(record.links), 'Invalid merge record');
    for (const change of record.aliasChanges ?? []) references([change.id, change.before, change.after], 'issues', 'redirected aliases');
    for (const link of record.links) {
      requireValue(['occurrences', 'causes', 'attempts', 'checks'].includes(link.kind), 'Invalid merge link');
      references([link.id], link.kind, 'merged record');
      references(link.beforeIds, 'issues', 'original classifications', false);
      references(link.afterIds, 'issues', 'merged classifications', false);
    }
  }
  for (const record of Object.values(graph.sessions)) {
    text(record.reviewId, 'review id', 128);
    requireValue(typeof record.pending === 'boolean' && typeof record.reminded === 'boolean', 'Invalid review state');
    requireValue(Array.isArray(record.failureIds) && record.failureIds.length <= 100, 'Invalid failure signal list');
  }
}

export function loadGraph(root) {
  const graph = emptyGraph();
  requireValue(readText(root, `${META}/transaction.json`) === null, 'Pending transaction requires a writable recovery pass');
  for (const kind of KINDS) {
    const directory = safePath(root, `${META}/${kind}`);
    if (!fs.existsSync(directory)) continue;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      requireValue(!entry.isSymbolicLink(), 'Linked maintenance record');
      const nested = ['issues', 'attempts'].includes(kind);
      requireValue(nested ? entry.isDirectory() : entry.isFile() && entry.name.endsWith('.json'), 'Unexpected maintenance record');
      const key = nested ? entry.name : entry.name.slice(0, -5);
      id(key);
      if (nested) requireValue(fs.readdirSync(path.join(directory, entry.name)).every(name => name === 'record.json'), 'Unexpected file in owned record workspace');
      const raw = readText(root, recordPath(kind, key));
      // An interrupted atomic transaction may leave an empty owned directory.
      if (raw === null && nested && fs.readdirSync(path.join(directory, entry.name)).length === 0) continue;
      requireValue(raw !== null, 'Missing maintenance record');
      graph[kind][key] = JSON.parse(raw);
    }
  }
  validateGraph(graph);
  return graph;
}

function removeEmptyDirectories(root) {
  for (const kind of ['issues', 'attempts']) {
    const parent = safePath(root, `${META}/${kind}`);
    if (!fs.existsSync(parent)) continue;
    for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        const folder = safePath(root, `${META}/${kind}/${entry.name}`);
        if (fs.readdirSync(folder).length === 0) fs.rmdirSync(folder);
      }
    }
  }
}

export function commitGraph(root, before, after, activeActions = [], options = {}) {
  validateGraph(after);
  const actions = [...activeActions];
  for (const kind of KINDS) {
    for (const key of new Set([...Object.keys(before[kind]), ...Object.keys(after[kind])])) {
      const oldText = Object.hasOwn(before[kind], key) ? encode(before[kind][key]) : null;
      const newText = Object.hasOwn(after[kind], key) ? encode(after[kind][key]) : null;
      if (oldText === newText) continue;
      const relative = recordPath(kind, key);
      const actual = readText(root, relative);
      requireValue(actual === null ? oldText === null : oldText !== null && encode(JSON.parse(actual)) === oldText, 'Record changed concurrently');
      actions.push({ path: relative, before: actual, after: newText });
    }
  }
  if (!actions.length) return false;
  const transaction = { version: 1, actions };
  validateTransaction(transaction);
  for (const action of actions) requireValue(readText(root, action.path) === action.before, 'Repair baseline changed concurrently');
  atomicWrite(root, `${META}/transaction.json`, encode(transaction));
  try {
    for (let index = 0; index < actions.length; index++) {
      const action = actions[index];
      requireValue(readText(root, action.path) === action.before, 'File changed during maintenance transaction');
      atomicWrite(root, action.path, action.after);
      // Fault injection is available only to local tests importing this module.
      options.afterWrite?.(index, action);
    }
    fs.unlinkSync(safePath(root, `${META}/transaction.json`));
    removeEmptyDirectories(root);
  } catch (error) {
    recoverTransaction(root);
    throw error;
  }
  return true;
}

function removeInterruptedTemps(root, relative = '') {
  const directory = relative ? safePath(root, relative) : root;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (relative || ['methods', META].includes(entry.name)) removeInterruptedTemps(root, name);
      continue;
    }
    const match = name.match(/^(.*)\.tmp-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    if (match && (isActivePath(match[1]) || isRecordPath(match[1]) || match[1] === `${META}/transaction.json`)) fs.unlinkSync(safePath(root, name));
  }
}

export function withStore(root, action) {
  root = canonicalRoot(root);
  const config = readConfig(root);
  requireValue(config?.enabled === true, 'Maintenance is not enabled');
  readCore(root);
  const unlock = lock(root);
  try {
    recoverTransaction(root);
    removeInterruptedTemps(root);
    removeEmptyDirectories(root);
    const graph = loadGraph(root);
    return action({ root, config, graph });
  } finally { unlock(); }
}
