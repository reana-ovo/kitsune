import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG, resolveWorkflow, runMaintenance } from '../skills/kitsune-mode/scripts/maintenance.mjs';
import { canonicalRoot, commitGraph, encode, loadGraph, readText, recoverTransaction, safePath, validateConfig, withStore } from '../skills/kitsune-mode/scripts/maintenance-store.mjs';
import { EVENTS, buildHookSettings, handleHook } from '../skills/kitsune-mode/scripts/claude-maintenance.mjs';
import { sha256 } from '../skills/kitsune-mode/scripts/startup.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sample = path.join(root, 'examples/personal-workflow');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kitsune-maintenance-'));
let checks = 0, sequence = 0;
const now = Date.parse('2026-11-10T12:00:00.000Z');
function check(value, message) { assert.ok(value, message); checks++; }
function equal(actual, expected, message) { assert.deepEqual(actual, expected, message); checks++; }
function rejects(fn, pattern, message) { assert.throws(fn, pattern, message); checks++; }
function profile() {
  const destination = path.join(temp, `profile ${++sequence}`);
  fs.cpSync(sample, destination, { recursive: true });
  fs.writeFileSync(path.join(destination, 'maintenance.json'), encode(DEFAULT_CONFIG));
  fs.mkdirSync(path.join(destination, 'methods'), { recursive: true });
  fs.writeFileSync(path.join(destination, 'methods/fixture.md'), '# Fixture\n\nFirst method.\n' + 'Stable context.\n'.repeat(30) + '\nSecond method.\n');
  return destination;
}
function run(directory, request, time = now, extra = {}) { return runMaintenance(directory, request, { now: time, ...extra }); }
function issue(directory, key = 'issue-main', time = now) { return run(directory, { op: 'put', type: 'issue', record: { id: key, title: key, expected: 'Honor the agreed task contract.', scope: 'The current task and its applicable conditions.' } }, time); }
function occurrence(directory, key, issueIds, time = now) { return run(directory, { op: 'put', type: 'occurrence', record: { id: key, issueIds, eventKey: key, summary: 'Observed deviation, not an inferred preference.', source: { sessionId: 'fixture', turnId: key } } }, time); }
function propose(directory, key, before = 'First method.', after = 'Improved first method.', extra = {}) {
  const file = path.join(directory, 'methods/fixture.md');
  return run(directory, { op: 'propose', attempt: { id: key, issueIds: ['issue-main'], causeIds: [], reviewId: key, strategy: 'Address the observed method mismatch.', expected: 'The target behavior improves without changing other obligations.', dependsOn: [], changes: [{ path: 'methods/fixture.md', baseSha256: sha256(fs.readFileSync(file)), edits: [{ before, after }] }], ...extra } });
}
function configure(directory, values) { fs.writeFileSync(path.join(directory, 'maintenance.json'), encode({ ...DEFAULT_CONFIG, ...values })); }

try {
  const fresh = profile();
  equal(run(fresh, { op: 'status' }).counts.issues, 0, 'Fresh profile has no invented issues');
  check(!fs.existsSync(path.join(fresh, '.maintenance')), 'Read-only status creates no files');
  equal(run(fresh, { op: 'initialize' }), { initialized: false }, 'Repeated initialization is a no-op');
  rejects(() => run(fresh, { op: 'initialize', config: { ...DEFAULT_CONFIG, maxIssues: 5 } }), /differs/, 'Initialization does not replace existing settings');
  fs.unlinkSync(path.join(fresh, 'maintenance.json'));
  equal(run(fresh, { op: 'status' }), { enabled: false, configured: false }, 'Missing config is not silently enabled');
  rejects(() => issue(fresh), /not enabled/, 'Mutations require enabled configuration');
  equal(run(fresh, { op: 'initialize' }), { initialized: true }, 'Explicit initialization creates configuration');
  configure(fresh, { enabled: false });
  rejects(() => issue(fresh), /not enabled/, 'Disabled configuration is respected');
  check(!fs.existsSync(path.join(fresh, '.maintenance')), 'Disabled mutation has no storage side effects');
  for (const values of [{ maxIssues: -1 }, { maxIssues: 1.5 }, { minIdleDays: -1 }, { enabled: 'yes' }, { surprise: true }]) rejects(() => validateConfig({ ...DEFAULT_CONFIG, ...values }), /Invalid|must|Unknown/, 'Invalid settings rejected');

  const data = profile();
  issue(data, 'issue-a'); issue(data, 'issue-b');
  occurrence(data, 'occ-shared', ['issue-a', 'issue-b']);
  run(data, { op: 'put', type: 'cause', record: { id: 'cause-a', issueIds: ['issue-a', 'issue-b'], summary: 'First candidate mechanism.', supports: ['occ-shared'] } });
  run(data, { op: 'put', type: 'cause', record: { id: 'cause-b', issueIds: ['issue-a'], summary: 'Independent second candidate.', contradicts: ['occ-shared'] } });
  equal(run(data, { op: 'inspect', id: 'issue-a' }).related.causes.length, 2, 'One problem retains multiple hypotheses');
  equal(run(data, { op: 'inspect', id: 'issue-b' }).related.causes.length, 1, 'One cause belongs to multiple problems');
  const graphBeforeQuery = encode(loadGraph(data));
  run(data, { op: 'status' }, now + 10000); run(data, { op: 'inspect', id: 'issue-a' }, now + 10000);
  equal(encode(loadGraph(data)), graphBeforeQuery, 'Queries do not refresh issue timestamps');
  equal(issue(data, 'issue-a', now + 5000).changed, false, 'Identical metadata is not a substantive update');
  const existingOccurrence = run(data, { op: 'get', kind: 'occurrences', id: 'occ-shared' });
  const duplicate = run(data, { op: 'put', type: 'occurrence', record: { ...existingOccurrence, id: 'occ-duplicate' } });
  equal(duplicate.id, 'occ-shared', 'Duplicate event reuses one occurrence');
  equal(loadGraph(data).issues['issue-a'].updatedAt, new Date(now).toISOString(), 'Duplicate event does not refresh age');
  rejects(() => run(data, { op: 'put', type: 'occurrence', record: { ...existingOccurrence, id: 'occ-other', summary: 'A different observation under the same event key.' } }), /already recorded/, 'Conflicting duplicate event is not silently merged');
  rejects(() => run(data, { op: 'put', type: 'cause', record: { id: 'cause-invalid', issueIds: ['issue-a'], summary: 'Missing evidence.', supports: ['occ-missing'] } }), /Missing/, 'Dangling evidence references are rejected');
  check(!loadGraph(data).causes['cause-invalid'], 'Rejected graph edit was not written');

  run(data, { op: 'merge', id: 'merge-ab', targetId: 'issue-a', sourceIds: ['issue-b'], reason: 'Equivalent scope and behavior established.' });
  equal(loadGraph(data).issues['issue-b'].aliasOf, 'issue-a', 'Merge retains source identity');
  equal(loadGraph(data).occurrences['occ-shared'].issueIds, ['issue-a'], 'Merge deduplicates classifications');
  run(data, { op: 'undo-merge', id: 'merge-ab' });
  equal(loadGraph(data).occurrences['occ-shared'].issueIds, ['issue-a', 'issue-b'], 'Undo merge restores classifications');
  equal(loadGraph(data).issues['issue-b'].aliasOf, undefined, 'Undo merge restores independent issue');
  issue(data, 'issue-split');
  run(data, { op: 'relink', kind: 'occurrences', id: 'occ-shared', issueIds: ['issue-b', 'issue-split'] });
  equal(loadGraph(data).occurrences['occ-shared'].issueIds, ['issue-b', 'issue-split'], 'Split can reassign selected evidence without merging causes');

  const repair = profile(); issue(repair);
  const original = fs.readFileSync(path.join(repair, 'methods/fixture.md'), 'utf8');
  propose(repair, 'attempt-first');
  equal(fs.readFileSync(path.join(repair, 'methods/fixture.md'), 'utf8'), original, 'Proposal does not activate content');
  run(repair, { op: 'apply', id: 'attempt-first' });
  check(fs.readFileSync(path.join(repair, 'methods/fixture.md'), 'utf8').includes('Improved first method.'), 'Apply updates the authoritative workflow file');
  equal(run(repair, { op: 'apply', id: 'attempt-first' }).changed, false, 'Repeated apply is idempotent');
  fs.appendFileSync(path.join(repair, 'methods/fixture.md'), '\nIndependent manual addition.\n');
  run(repair, { op: 'rollback', id: 'attempt-first', reason: 'Observed regression in the relevant case.' });
  equal(fs.readFileSync(path.join(repair, 'methods/fixture.md'), 'utf8'), original + '\nIndependent manual addition.\n', 'Rollback preserves unrelated edits in the same file');
  equal(run(repair, { op: 'rollback', id: 'attempt-first', reason: 'Repeated request.' }).changed, false, 'Repeated rollback is idempotent');
  propose(repair, 'attempt-second', 'First method.', 'Alternative method.', { reviewId: 'attempt-first' });
  rejects(() => run(repair, { op: 'apply', id: 'attempt-second' }), /already applied/, 'A review cannot endlessly apply and revert repairs');

  const deps = profile(); issue(deps);
  propose(deps, 'attempt-parent'); run(deps, { op: 'apply', id: 'attempt-parent' });
  propose(deps, 'attempt-child', 'Second method.', 'Adjusted second method.', { dependsOn: ['attempt-parent'] });
  run(deps, { op: 'apply', id: 'attempt-child' });
  rejects(() => run(deps, { op: 'rollback', id: 'attempt-parent', reason: 'Try to revert parent.' }), /depends/, 'Dependency blocks unsafe parent rollback');
  run(deps, { op: 'rollback', id: 'attempt-child', reason: 'Undo dependent repair first.' });
  run(deps, { op: 'rollback', id: 'attempt-parent', reason: 'Dependency is now inactive.' });
  equal(fs.readFileSync(path.join(deps, 'methods/fixture.md'), 'utf8'), original, 'Dependency-ordered rollback restores targeted changes');

  const independent = profile(); issue(independent);
  propose(independent, 'attempt-a'); run(independent, { op: 'apply', id: 'attempt-a' });
  propose(independent, 'attempt-b', 'Second method.', 'Independent improved second method.'); run(independent, { op: 'apply', id: 'attempt-b' });
  run(independent, { op: 'rollback', id: 'attempt-a', reason: 'First repair regressed.' });
  check(fs.readFileSync(path.join(independent, 'methods/fixture.md'), 'utf8').includes('Independent improved second method.'), 'Independent later repair survives rollback');
  check(fs.readFileSync(path.join(independent, 'methods/fixture.md'), 'utf8').includes('First method.'), 'Original target restored');

  const conflict = profile(); issue(conflict); propose(conflict, 'attempt-stale');
  fs.appendFileSync(path.join(conflict, 'methods/fixture.md'), 'Concurrent edit.');
  rejects(() => run(conflict, { op: 'apply', id: 'attempt-stale' }), /baseline changed/, 'Changed baseline is not overwritten');
  propose(conflict, 'attempt-fresh'); run(conflict, { op: 'apply', id: 'attempt-fresh' });
  fs.writeFileSync(path.join(conflict, 'methods/fixture.md'), 'User replaced the entire method.');
  rejects(() => run(conflict, { op: 'rollback', id: 'attempt-fresh', reason: 'Regression.' }), /match exactly once/, 'Rollback does not restore over a conflicting later rewrite');
  equal(fs.readFileSync(path.join(conflict, 'methods/fixture.md'), 'utf8'), 'User replaced the entire method.', 'Conflicting content is preserved');

  const checksProfile = profile(); issue(checksProfile); propose(checksProfile, 'attempt-failed');
  const failedCheck = { id: 'check-regression', issueIds: ['issue-main'], attemptId: 'attempt-failed', kind: 'behavior', outcome: 'fail', summary: 'A required unaffected behavior regressed in the fixture.' };
  run(checksProfile, { op: 'put', type: 'check', record: failedCheck });
  rejects(() => run(checksProfile, { op: 'apply', id: 'attempt-failed' }), /Failed candidate/, 'Failed candidate is not activated');
  rejects(() => run(checksProfile, { op: 'put', type: 'check', record: { ...failedCheck, outcome: 'pass' } }), /immutable/, 'Failed evidence cannot be rewritten into a pass');
  run(checksProfile, { op: 'reject', id: 'attempt-failed', reason: 'Regression evidence.' });
  equal(loadGraph(checksProfile).attempts['attempt-failed'].status, 'rejected', 'Failed strategy stays recorded');

  const created = profile(); issue(created);
  run(created, { op: 'propose', attempt: { id: 'attempt-create', issueIds: ['issue-main'], reviewId: 'create-review', strategy: 'Move detail into a discoverable method.', expected: 'Method exists.', changes: [{ path: 'methods/new.md', baseSha256: null, create: '# New method\n\nConcrete steps.\n' }] } });
  run(created, { op: 'apply', id: 'attempt-create' });
  run(created, { op: 'rollback', id: 'attempt-create', reason: 'Candidate rejected after checking.' });
  check(!fs.existsSync(path.join(created, 'methods/new.md')), 'Rollback of an unchanged created file removes only that file');
  for (const badPath of ['../outside.md', '/outside.md', 'methods/../../outside.md', 'methods\\outside.md', 'maintenance.md', 'maintenance.json', '.maintenance/config.json']) {
    rejects(() => run(created, { op: 'propose', attempt: { id: 'attempt-bad', issueIds: ['issue-main'], reviewId: 'bad-review', strategy: 'Bad path.', expected: 'Must fail.', changes: [{ path: badPath, baseSha256: null, create: 'Not allowed.' }] } }), /cannot modify/, 'Automatic repair target boundary');
  }
  for (const key of ['../evil', '__proto__', 'constructor', 'CON']) rejects(() => issue(created, key), /identifier/, 'Unsafe record IDs rejected');
  rejects(() => safePath(created, '../outside'), /escapes/, 'Storage traversal rejected');
  const outside = path.join(temp, 'outside'); fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(created, 'methods/linked'), 'junction');
  rejects(() => run(created, { op: 'propose', attempt: { id: 'attempt-link', issueIds: ['issue-main'], reviewId: 'link-review', strategy: 'Must not traverse a link.', expected: 'No write.', changes: [{ path: 'methods/linked/new.md', baseSha256: null, create: 'No.' }] } }), /links/, 'Linked repair destination rejected');
  check(!fs.existsSync(path.join(outside, 'new.md')), 'Outside folder remains untouched');

  const retention = profile();
  const old = now - 40 * 86400000;
  issue(retention, 'issue-old', old); issue(retention, 'issue-shared', old + 1); issue(retention, 'issue-recent', now);
  occurrence(retention, 'occ-old', ['issue-old'], old);
  occurrence(retention, 'occ-shared', ['issue-old', 'issue-recent'], old);
  run(retention, { op: 'put', type: 'cause', record: { id: 'cause-retained', issueIds: ['issue-recent'], summary: 'Uses old evidence as support.', supports: ['occ-old'] } }, old);
  configure(retention, { maxIssues: 1, minIdleDays: 30 });
  const recentAge = loadGraph(retention).issues['issue-recent'].updatedAt;
  const prune = run(retention, { op: 'prune' });
  equal(prune.removed, ['issue-old', 'issue-shared'], 'Eligible oldest problems deleted first');
  equal(prune.remaining, 1, 'Capacity restored when enough records are eligible');
  equal(loadGraph(retention).occurrences['occ-shared'].issueIds, ['issue-recent'], 'Shared occurrence retains its live problem');
  check(loadGraph(retention).occurrences['occ-old'], 'Indirectly shared evidence is retained');
  equal(loadGraph(retention).issues['issue-recent'].updatedAt, recentAge, 'GC does not rejuvenate retained problems');
  check(!fs.existsSync(path.join(retention, '.maintenance/issues/issue-old')), 'No hidden cold archive remains');
  configure(retention, { maxIssues: 0, minIdleDays: 30 });
  equal(run(retention, { op: 'prune' }).excess, 1, 'Recent records may exceed capacity');
  configure(retention, { maxIssues: 0, minIdleDays: null });
  run(retention, { op: 'prune' });
  equal(Object.keys(loadGraph(retention).occurrences).length, 0, 'Orphaned evidence is removed once no retained problem reaches it');
  equal(Object.keys(loadGraph(retention).causes).length, 0, 'Orphaned causes are removed');

  const activePrune = profile(); issue(activePrune); propose(activePrune, 'attempt-prune'); run(activePrune, { op: 'apply', id: 'attempt-prune' });
  const appliedContent = fs.readFileSync(path.join(activePrune, 'methods/fixture.md'), 'utf8');
  configure(activePrune, { maxIssues: 0, minIdleDays: null }); run(activePrune, { op: 'prune' });
  equal(fs.readFileSync(path.join(activePrune, 'methods/fixture.md'), 'utf8'), appliedContent, 'Deleting repair history does not undo active workflow content');
  equal(Object.keys(loadGraph(activePrune).attempts).length, 0, 'Exclusive repair history is actually deleted');

  const transaction = profile(); issue(transaction); propose(transaction, 'attempt-interrupted');
  rejects(() => run(transaction, { op: 'apply', id: 'attempt-interrupted' }, now, { afterWrite: index => { if (index === 0) throw new Error('simulated write failure'); } }), /simulated/, 'Write failure surfaced');
  equal(fs.readFileSync(path.join(transaction, 'methods/fixture.md'), 'utf8'), original, 'Failed multi-file transaction restores written content');
  equal(loadGraph(transaction).attempts['attempt-interrupted'].status, 'proposed', 'Partial transaction is not marked successful');
  check(!fs.existsSync(path.join(transaction, '.maintenance/transaction.json')), 'Recovered journal is removed');
  const actualRoot = canonicalRoot(transaction);
  const journal = { version: 1, actions: [{ path: 'methods/fixture.md', before: original, after: 'Interrupted content.' }] };
  fs.writeFileSync(path.join(transaction, '.maintenance/transaction.json'), encode(journal));
  fs.writeFileSync(path.join(transaction, 'methods/fixture.md'), 'Interrupted content.');
  check(recoverTransaction(actualRoot), 'Interrupted-process journal recovered');
  equal(fs.readFileSync(path.join(transaction, 'methods/fixture.md'), 'utf8'), original, 'Recovery restores only the captured baseline');
  fs.writeFileSync(path.join(transaction, '.maintenance/transaction.json'), encode(journal));
  fs.writeFileSync(path.join(transaction, 'methods/fixture.md'), 'An unrelated later edit.');
  rejects(() => recoverTransaction(actualRoot), /conflicts/, 'Recovery refuses to overwrite unrelated edits');
  equal(fs.readFileSync(path.join(transaction, 'methods/fixture.md'), 'utf8'), 'An unrelated later edit.', 'Recovery conflict preserves bytes');
  fs.unlinkSync(path.join(transaction, '.maintenance/transaction.json'));
  withStore(transaction, () => rejects(() => issue(transaction, 'issue-busy'), /busy/, 'Concurrent writer is excluded'));
  fs.writeFileSync(path.join(transaction, '.maintenance/lock.json'), encode({ pid: 2147483647, token: 'dead-fixture' }));
  issue(transaction, 'issue-after-crash');
  check(loadGraph(transaction).issues['issue-after-crash'], 'Dead process lock can be recovered');

  const hooks = profile();
  const input = { session_id: 'session-fixture', permission_mode: 'auto', hook_event_name: 'UserPromptSubmit', prompt_id: 'prompt-a', prompt: 'Do a normal task.' };
  for (const variant of [{ permission_mode: 'plan' }, { agent_id: 'child' }, { is_interrupt: true }, { permission_mode: undefined }]) equal(handleHook(hooks, { ...input, ...variant }, { now }), {}, 'Read-only/interrupted/subagent hook skipped');
  check(!fs.existsSync(path.join(hooks, '.maintenance')), 'Skipped hooks create no state');
  const start = handleHook(hooks, { hook_event_name: 'SessionStart', session_id: 'session-fixture' }, { now });
  check(start.hookSpecificOutput.additionalContext.includes('internal'), 'Session startup supplies the internal entry');
  check(!fs.existsSync(path.join(hooks, '.maintenance')), 'SessionStart does not write while permission mode is unknown');
  const output = handleHook(hooks, input, { now });
  check(output.hookSpecificOutput.additionalContext.includes('finish-review'), 'Prompt event starts a real review protocol');
  check(!Object.hasOwn(output, 'systemMessage') && !Object.hasOwn(output, 'decision'), 'No user-facing hook message or prompt blocking');
  const session = Object.values(loadGraph(hooks).sessions)[0];
  equal(handleHook(hooks, input, { now }).hookSpecificOutput.additionalContext, output.hookSpecificOutput.additionalContext, 'Duplicate prompt ID reuses the review');
  equal(handleHook(hooks, { ...input, hook_event_name: 'PostToolUse', tool_use_id: 'tool-success' }, { now }), {}, 'Successful tools generate no maintenance chatter');
  const failure = handleHook(hooks, { ...input, hook_event_name: 'PostToolUseFailure', tool_use_id: 'tool-failed', tool_input: { secret: 'do-not-store' }, error: 'private-error-text' }, { now });
  check(failure.hookSpecificOutput.additionalContext.includes('not automatically'), 'Failure signal does not manufacture a diagnosis');
  const storedSession = encode(Object.values(loadGraph(hooks).sessions)[0]);
  check(!storedSession.includes('do-not-store') && !storedSession.includes('private-error-text') && !storedSession.includes('Do a normal task.'), 'Hook state excludes prompt and tool payloads');
  equal(handleHook(hooks, { ...input, hook_event_name: 'Stop', background_tasks: [{ id: 'bg', status: 'running' }] }, { now }), {}, 'Stop does not resume while background work is pending');
  const stop = handleHook(hooks, { ...input, hook_event_name: 'Stop', stop_hook_active: false }, { now });
  check(stop.hookSpecificOutput.additionalContext.includes('only continuation'), 'One continuation can repair a missed review');
  equal(handleHook(hooks, { ...input, hook_event_name: 'Stop', stop_hook_active: false }, { now }), {}, 'Stop continuation is bounded even if host flag resets');
  equal(handleHook(hooks, { ...input, hook_event_name: 'Stop', stop_hook_active: true }, { now }), {}, 'Host stop recursion guard respected');
  run(hooks, { op: 'finish-review', sessionId: input.session_id, reviewId: session.reviewId });
  equal(Object.values(loadGraph(hooks).sessions)[0].pending, false, 'Review can finish with no manufactured problem');
  equal(Object.keys(loadGraph(hooks).issues).length, 0, 'Ordinary task did not create a permanent rule or issue');
  handleHook(hooks, { ...input, prompt_id: 'prompt-b' }, { now: now + 1 });
  rejects(() => run(hooks, { op: 'finish-review', sessionId: input.session_id, reviewId: session.reviewId }), /Stale review/, 'Old acknowledgement cannot finish a newer prompt');
  const hookConfig = buildHookSettings(path.join(root, 'skills/kitsune-mode/scripts/claude-maintenance.mjs'), hooks);
  equal(Object.keys(hookConfig), EVENTS, 'Every supported event is registered');
  check(hookConfig.Stop[0].hooks[0].args.includes(hooks), 'Exec arguments preserve paths with spaces');
  check(!JSON.stringify(hookConfig).includes('systemMessage'), 'Configuration does not add maintenance status messages');

  const cli = path.join(root, 'skills/kitsune-mode/scripts/maintenance.mjs');
  const response = spawnSync(process.execPath, [cli, '--workflow', hooks, '--request', '-'], { input: JSON.stringify({ op: 'status' }), encoding: 'utf8' });
  equal(response.status, 0, response.stderr);
  check(JSON.parse(response.stdout).enabled, 'CLI accepts JSON stdin');
  const adapter = path.join(root, 'skills/kitsune-mode/scripts/claude-maintenance.mjs');
  const adapterResponse = spawnSync(process.execPath, [adapter, '--workflow', hooks], { input: JSON.stringify({ ...input, hook_event_name: 'PostToolUse', tool_use_id: 'cli-hook-proof' }), encoding: 'utf8' });
  equal(adapterResponse.status, 0, adapterResponse.stderr);
  equal(adapterResponse.stdout, '', 'Quiet successful hook has no stdout');
  equal(Object.values(loadGraph(hooks).sessions)[0].lastToolUseId, 'cli-hook-proof', 'Pipe test verifies actual persistent side effect');
  configure(hooks, { enabled: false });
  equal(handleHook(hooks, input, { now }), {}, 'Disable switch makes hooks inert');

  const chains = profile();
  for (const key of ['issue-a', 'issue-b', 'issue-c']) issue(chains, key);
  occurrence(chains, 'occ-chain', ['issue-a']);
  run(chains, { op: 'merge', id: 'merge-first', targetId: 'issue-b', sourceIds: ['issue-a'], reason: 'First confirmed equivalence.' });
  run(chains, { op: 'merge', id: 'merge-next', targetId: 'issue-c', sourceIds: ['issue-b'], reason: 'Second confirmed equivalence.' });
  equal(loadGraph(chains).issues['issue-a'].aliasOf, 'issue-c', 'Repeated merge flattens prior aliases');
  rejects(() => run(chains, { op: 'undo-merge', id: 'merge-first' }), /later classification|alias changed/, 'Earlier merge cannot overwrite subsequent classification');
  run(chains, { op: 'undo-merge', id: 'merge-next' });
  equal(loadGraph(chains).issues['issue-a'].aliasOf, 'issue-b', 'Undo restores prior alias relation');
  run(chains, { op: 'undo-merge', id: 'merge-first' });
  equal(loadGraph(chains).occurrences['occ-chain'].issueIds, ['issue-a'], 'Ordered merge recovery restores original evidence links');
  equal(run(chains, { op: 'relink', kind: 'occurrences', id: 'occ-chain', issueIds: ['issue-a'] }, now + 10000).changed, false, 'Identical relink does not refresh recency');

  issue(activePrune);
  propose(activePrune, 'attempt-after-prune', 'Improved first method.', 'Another method.', { reviewId: 'attempt-prune' });
  rejects(() => run(activePrune, { op: 'apply', id: 'attempt-after-prune' }), /already applied/, 'Pruning issue history cannot reset the current repair budget');

  const boundary = profile();
  issue(boundary, 'issue-clock');
  run(boundary, { op: 'put', type: 'issue', record: { ...run(boundary, { op: 'get', kind: 'issues', id: 'issue-clock' }), title: 'A meaningful correction during clock reversal.' } }, now - 10000);
  equal(loadGraph(boundary).issues['issue-clock'].updatedAt, new Date(now).toISOString(), 'Direct issue edits also preserve monotonic recency');
  configure(boundary, { maxIssues: 0, minIdleDays: null }); run(boundary, { op: 'prune' });
  issue(boundary, 'issue-at-boundary', now - 30 * 86400000);
  issue(boundary, 'issue-before-boundary', now - 30 * 86400000 + 1);
  configure(boundary, { maxIssues: 0, minIdleDays: 30 });
  equal(run(boundary, { op: 'prune' }).removed, ['issue-at-boundary'], 'Age threshold is inclusive and uses meaningful update time');
  configure(boundary, { maxIssues: 0, minIdleDays: 0 });
  equal(run(boundary, { op: 'prune' }).remaining, 0, 'Zero-day threshold permits immediate cleanup over capacity');

  const unicode = profile(); issue(unicode);
  const unicodeFile = path.join(unicode, 'methods/fixture.md');
  const unicodeOriginal = '﻿# 示例\r\n\r\n原有方法。\r\n';
  fs.writeFileSync(unicodeFile, unicodeOriginal);
  propose(unicode, 'attempt-unicode', '原有方法。', '修正方法。');
  run(unicode, { op: 'apply', id: 'attempt-unicode' });
  equal(fs.readFileSync(unicodeFile, 'utf8'), unicodeOriginal.replace('原有方法。', '修正方法。'), 'BOM, Unicode and CRLF survive a targeted edit');
  run(unicode, { op: 'rollback', id: 'attempt-unicode', reason: 'Fixture recovery.' });
  equal(fs.readFileSync(unicodeFile, 'utf8'), unicodeOriginal, 'Recovery preserves original encoding bytes');
  fs.writeFileSync(unicodeFile, Buffer.from([0xc0, 0xaf]));
  rejects(() => readText(unicode, 'methods/fixture.md'), /encoded data/, 'Invalid UTF-8 is not silently rewritten');
  fs.writeFileSync(unicodeFile, 'a'.repeat(2 * 1024 * 1024 + 1));
  rejects(() => readText(unicode, 'methods/fixture.md'), /bounded/, 'Oversized active content is rejected');

  const removedFile = profile(); issue(removedFile);
  const removeRequest = { op: 'propose', attempt: { id: 'attempt-remove', issueIds: ['issue-main'], reviewId: 'remove-review', strategy: 'Retire an obsolete method.', expected: 'No obsolete method remains.', changes: [{ path: 'methods/fixture.md', baseSha256: sha256(original), remove: true }] } };
  run(removedFile, removeRequest); run(removedFile, { op: 'apply', id: 'attempt-remove' });
  check(!fs.existsSync(path.join(removedFile, 'methods/fixture.md')), 'Explicit retirement deletes the approved method');
  fs.writeFileSync(path.join(removedFile, 'methods/fixture.md'), 'New replacement from another task.');
  rejects(() => run(removedFile, { op: 'rollback', id: 'attempt-remove', reason: 'Recovery request.' }), /conflicts/, 'Retirement rollback preserves later replacement file');
  fs.unlinkSync(path.join(removedFile, 'methods/fixture.md'));
  run(removedFile, { op: 'rollback', id: 'attempt-remove', reason: 'No conflicting replacement remains.' });
  equal(fs.readFileSync(path.join(removedFile, 'methods/fixture.md'), 'utf8'), original, 'Retired file can be restored when the baseline is still absent');

  const multi = profile(); issue(multi);
  const prefFile = path.join(multi, 'preferences.md');
  const pref = fs.readFileSync(prefFile, 'utf8');
  propose(multi, 'attempt-multi', 'unused', 'unused', { changes: [
    { path: 'methods/fixture.md', baseSha256: sha256(original), edits: [{ before: 'First method.', after: 'First changed.' }, { before: 'Second method.', after: 'Second changed.' }] },
    { path: 'preferences.md', baseSha256: sha256(pref), edits: [{ before: pref, after: pref + '\nFixture addition.\n' }] },
  ] });
  rejects(() => run(multi, { op: 'apply', id: 'attempt-multi' }, now, { afterWrite: index => { if (index === 1) throw new Error('second file failure'); } }), /second file failure/, 'Second-file failure reaches the caller');
  equal(fs.readFileSync(prefFile, 'utf8'), pref, 'Second file restored after partial multi-file write');
  equal(fs.readFileSync(path.join(multi, 'methods/fixture.md'), 'utf8'), original, 'First file also restored after partial multi-file write');
  run(multi, { op: 'apply', id: 'attempt-multi' });
  fs.appendFileSync(path.join(multi, 'methods/fixture.md'), '\nUnrelated addition beyond the edit contexts.\n');
  run(multi, { op: 'rollback', id: 'attempt-multi', reason: 'Multiple hunk recovery.' });
  equal(fs.readFileSync(path.join(multi, 'methods/fixture.md'), 'utf8'), original + '\nUnrelated addition beyond the edit contexts.\n', 'Reverse-order inverse edits preserve independent text');

  const crash = profile(); issue(crash); propose(crash, 'attempt-crash');
  const runtimeUrl = new URL('../skills/kitsune-mode/scripts/maintenance.mjs', import.meta.url).href;
  const crashed = spawnSync(process.execPath, ['--input-type=module', '-e', `import { runMaintenance } from ${JSON.stringify(runtimeUrl)}; runMaintenance(process.argv[1], {op:'apply',id:'attempt-crash'}, {afterWrite: index => { if(index === 0) process.exit(73); }});`, crash], { encoding: 'utf8' });
  equal(crashed.status, 73, 'A real child process exited between transaction writes');
  check(fs.existsSync(path.join(crash, '.maintenance/transaction.json')), 'Process exit leaves recovery journal');
  rejects(() => run(crash, { op: 'status' }), /Pending transaction/, 'Read-only lookup does not perform hidden recovery writes');
  run(crash, { op: 'prune' });
  equal(fs.readFileSync(path.join(crash, 'methods/fixture.md'), 'utf8'), original, 'Next writable operation recovers process interruption');
  equal(loadGraph(crash).attempts['attempt-crash'].status, 'proposed', 'Crashed apply never becomes successful');
  const orphanTemp = path.join(crash, '.maintenance/issues/issue-main/record.json.tmp-00000000-0000-0000-0000-000000000000');
  fs.writeFileSync(orphanTemp, 'unfinished temporary bytes');
  run(crash, { op: 'prune' });
  check(!fs.existsSync(orphanTemp), 'Owned interrupted atomic-write temporary is reclaimed');
  const unknown = path.join(crash, '.maintenance/issues/issue-main/unrelated.txt');
  fs.writeFileSync(unknown, 'User content, not an owned runtime record.');
  rejects(() => run(crash, { op: 'prune' }), /Unexpected file/, 'Unexpected workspace content is not silently discarded');
  equal(fs.readFileSync(unknown, 'utf8'), 'User content, not an owned runtime record.', 'Unknown workspace content preserved');

  const sharedDependency = profile(); issue(sharedDependency, 'issue-main', old); issue(sharedDependency, 'issue-other');
  propose(sharedDependency, 'attempt-shared-parent'); run(sharedDependency, { op: 'apply', id: 'attempt-shared-parent' });
  propose(sharedDependency, 'attempt-shared-child', 'Second method.', 'Shared second method.', { issueIds: ['issue-other'], dependsOn: ['attempt-shared-parent'] });
  run(sharedDependency, { op: 'apply', id: 'attempt-shared-child' });
  configure(sharedDependency, { maxIssues: 1, minIdleDays: null });
  run(sharedDependency, { op: 'prune' });
  check(loadGraph(sharedDependency).attempts['attempt-shared-parent'], 'Dependency history survives removal of its original problem');
  rejects(() => run(sharedDependency, { op: 'rollback', id: 'attempt-shared-parent', reason: 'Must still be guarded.' }), /depends/, 'Retained dependency guard survives pruning');

  const malformed = profile(); issue(malformed);
  fs.writeFileSync(path.join(malformed, '.maintenance/issues/issue-main/record.json'), '{broken');
  rejects(() => run(malformed, { op: 'status' }), /JSON|property name/, 'Malformed evidence is not silently discarded');
  const badCore = profile(); fs.writeFileSync(path.join(badCore, 'skills.md'), '{{unresolved}}');
  const unknownMode = spawnSync(process.execPath, [adapter, '--workflow', badCore], { input: JSON.stringify({ hook_event_name: 'SessionStart', session_id: 'unknown-mode' }), encoding: 'utf8' });
  equal(unknownMode.status, 0, 'Unknown-mode hook failure does not block the task');
  check(!fs.existsSync(path.join(badCore, '.maintenance')), 'Unknown permissions cannot write a diagnostic');
  const knownMode = spawnSync(process.execPath, [adapter, '--workflow', badCore], { input: JSON.stringify({ ...input, hook_event_name: 'PostToolUse' }), encoding: 'utf8' });
  equal(knownMode.stdout, '', 'Recoverable hook failure does not print a maintenance report');
  check(fs.existsSync(path.join(badCore, '.maintenance/health.json')), 'Writable hook failure leaves one local diagnostic');

  const bindingSkill = path.join(temp, 'installed-mode'); fs.mkdirSync(path.join(bindingSkill, 'local'), { recursive: true });
  equal(resolveWorkflow(undefined, bindingSkill, temp), path.join(temp, '.kitsune/workflow'), 'Default location follows the actual home');
  fs.writeFileSync(path.join(bindingSkill, 'local/workflow.json'), encode({ version: 1, workflowRoot: hooks }));
  equal(resolveWorkflow(undefined, bindingSkill, temp), hooks, 'Existing binding wins over default');
  equal(resolveWorkflow(data, bindingSkill, temp), data, 'Explicit path wins over binding');
  fs.writeFileSync(path.join(bindingSkill, 'local/workflow.json'), 'invalid');
  rejects(() => resolveWorkflow(undefined, bindingSkill, temp), /JSON|Unexpected/, 'Invalid binding never falls back');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
console.log(`Passed ${checks} maintenance, transaction, retention, and hook fixture checks.`);
console.log('Only isolated temporary profiles were used. No live user settings, installations, network, or model evaluations were accessed.');
