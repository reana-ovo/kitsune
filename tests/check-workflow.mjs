import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, writeFileSync, rmSync, cpSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { CORE_FILES, START, END, sha256, readBinding, readCore, renderBlock, replaceManagedBlock, previewStartup } from '../skills/kitsune-mode/scripts/startup.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(file, 'utf8');
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
function equal(actual, expected, message) { assert.deepEqual(actual, expected, message); checks++; }
function throws(fn, pattern, message) { assert.throws(fn, pattern, message); checks++; }
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    assert.ok(!entry.isSymbolicLink(), `Unexpected source symlink: ${target}`);
    return entry.isDirectory() ? files(target) : [target];
  });
}
function withoutCode(text) { return text.replace(/^(`{3,}|~{3,}).*\n[\s\S]*?^\1\s*$/gm, ''); }
function checkLinks(file) {
  const text = withoutCode(read(file));
  for (const match of text.matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)) {
    const link = match[1];
    if (/^[a-z]+:/i.test(link)) continue;
    const [relative, fragment] = link.split('#');
    const target = relative ? path.resolve(path.dirname(file), decodeURIComponent(relative)) : file;
    check(existsSync(target), `Broken link in ${path.relative(root, file)}: ${link}`);
    if (!fragment || path.extname(target) !== '.md') continue;
    const headings = [...withoutCode(read(target)).matchAll(/^#{1,6} (.+)$/gm)].map(heading => heading[1]
      .toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-'));
    check(headings.includes(fragment), `Broken fragment: ${link}`);
  }
}

const active = ['AGENTS.md', 'README.md', 'README-cn.md', 'INSTALL.md', 'docs', 'skills', 'examples', 'tests'].flatMap(name => {
  const target = path.join(root, name);
  return path.extname(name) ? [target] : files(target);
});
for (const file of active) {
  if (path.extname(file) === '.md') checkLinks(file);
}
for (const file of active.filter(file => file.endsWith('.md'))) {
  check(!/C:[/\\](?:Develop[/\\]kitsune|Users[/\\]reana)/i.test(read(file)), `Personal path in ${file}`);
}
for (const obsolete of ['docs/rfc', 'docs/adr', 'docs/development-process.md', 'skills/automate-me', 'skills/bro', 'skills/unslop', 'skills/kitsune-mode/playbooks']) {
  check(!existsSync(path.join(root, obsolete)), `Legacy active path remains: ${obsolete}`);
}
check(read(path.join(root, 'AGENTS.md')).includes('does not require RFCs or ADRs'), 'Old repository gate not removed');

const installGuide = read(path.join(root, 'INSTALL.md'));
for (const [file, counterpart] of [['README.md', 'README-cn.md'], ['README-cn.md', 'README.md']]) {
  const text = read(path.join(root, file));
  check(text.includes('](INSTALL.md)'), `${file} lacks the installation entry`);
  check(text.includes(`](${counterpart})`), `${file} lacks a link to ${counterpart}`);
}
for (const section of ['Installation only', 'Find the host and destination', 'Inspect before writing', 'Install the two directories', 'Verify and hand back']) {
  check(installGuide.includes(`## ${section}`), `Installation procedure lacks section: ${section}`);
}
for (const name of ['kitsune-mode', 'kitsune-setup']) {
  check(installGuide.includes(`](skills/${name}/SKILL.md)`), `Installation entry does not link ${name}`);
}
check(installGuide.includes('local/workflow.json') && installGuide.includes('local/integrations.json'), 'Installation guide omits local-data preservation');
check(existsSync(path.join(root, 'docs/first-run.md')), 'Missing first-run experiment guide');

for (const [name, manual] of [['kitsune-setup', true], ['kitsune-mode', false]]) {
  const text = read(path.join(root, 'skills', name, 'SKILL.md'));
  const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  check(header, `${name}: missing frontmatter`);
  check(header[1].includes(`name: ${name}`), `${name}: incorrect name`);
  const description = header[1].match(/^description: (.+)$/m)?.[1];
  check(description && description.length <= 100, `${name}: description must be brief`);
  equal(/^disable-model-invocation: true$/m.test(header[1]), manual, `${name}: invocation policy`);
  check(text.split('\n').length < 100, `${name}: move detailed procedures into support files`);
}
check(read(path.join(root, 'skills/kitsune-setup/agents/openai.yaml')).includes('allow_implicit_invocation: false'), 'Missing optional Codex manual policy');
check(!existsSync(path.join(root, 'skills/kitsune-mode/agents/openai.yaml')), 'Daily entry must not opt out of automatic invocation');
check(!existsSync(path.join(root, 'skills/kitsune-mode/local')), 'A private binding was included in reusable source');
for (const file of ['skills/kitsune-mode/SKILL.md', 'skills/kitsune-setup/references/generation.md']) {
  check(read(path.join(root, file)).includes('~/.kitsune/workflow/'), `Default personal directory missing: ${file}`);
}

const templateRoot = path.join(root, 'skills/kitsune-setup/assets/personal-workflow');
const sampleRoot = path.join(root, 'examples/personal-workflow');
for (const name of [...CORE_FILES, 'maintenance.md', 'authoring.md', 'examples.md', 'evidence.md']) {
  check(existsSync(path.join(templateRoot, name)), `Missing template: ${name}`);
  check(existsSync(path.join(sampleRoot, name)), `Missing example file: ${name}`);
}
const placeholders = new Set(files(templateRoot).flatMap(file => [...read(file).matchAll(/\{\{([a-z_]+)\}\}/g)].map(match => match[1])));
equal([...placeholders].sort(), [
  'workflow_scope', 'reply_language', 'method_index', 'confirmed_preferences', 'selected_skill_inventory',
  'runtime_examples', 'evidence_records', 'coverage_and_deferrals', 'method_name', 'applicability',
  'inputs_and_result', 'method_steps', 'verification_and_stop_conditions',
].sort(), 'Template field contract changed');
for (const file of files(sampleRoot)) check(!/\{\{[a-z_]+\}\}/i.test(read(file)), `Unresolved sample template: ${file}`);
for (const name of ['maintenance.md', 'authoring.md']) {
  equal(read(path.join(sampleRoot, name)), read(path.join(templateRoot, name)), `Sample diverged from shared guide: ${name}`);
}
const maintenanceGuide = read(path.join(templateRoot, 'maintenance.md'));
for (const section of ['Diagnose before changing guidance', 'Choose the smallest change', 'Plan before-and-after checks', 'Accept, revise, or roll back']) {
  check(maintenanceGuide.includes(`## ${section}`), `Maintenance guide lacks section: ${section}`);
}
const authoringGuide = read(path.join(templateRoot, 'authoring.md'));
check(authoringGuide.includes('](maintenance.md#choose-the-smallest-change)'), 'Authoring does not reference maintenance change selection');
check(authoringGuide.includes('](maintenance.md#plan-before-and-after-checks)'), 'Authoring does not reference comparison checks');
check(read(path.join(sampleRoot, 'README.md')).includes('maintenance.md'), 'Startup core lacks maintenance entry');
check(read(path.join(sampleRoot, 'preferences.md')).includes('Reply language: Simplified Chinese'), 'Sample reply language missing');
check(read(path.join(sampleRoot, 'preferences.md')).includes('保留余地'), 'Original user terminology lost from sample');
const overlapSection = text => text.split('## Apply overlapping requirements\n')[1]?.split('\n## ')[0];
const templateOverlap = overlapSection(read(path.join(templateRoot, 'README.md')));
check(templateOverlap?.trim(), 'Template startup core lacks overlap handling');
equal(overlapSection(read(path.join(sampleRoot, 'README.md'))), templateOverlap, 'Example overlap policy diverged from the generated core');
check(read(path.join(templateRoot, 'authoring.md')).includes('## Scope, exceptions, and local precedence'), 'Authoring guide lacks scoped precedence guidance');
check(read(path.join(root, 'skills/kitsune-setup/references/interview.md')).includes('## Investigate relevant overlaps'), 'Interview lacks targeted overlap questions');
check(read(path.join(root, 'skills/kitsune-setup/references/generation.md')).includes('## Generate scoped requirements and relationships'), 'Generation does not include confirmed relationships');
throws(() => readCore(templateRoot), /Unresolved template/, 'Raw templates must not become startup content');

const archiveRoot = path.join(root, 'archive');
const hasLocalArchive = existsSync(archiveRoot);
if (hasLocalArchive) {
  checkLinks(path.join(archiveRoot, 'README.md'));
  const manifest = JSON.parse(read(path.join(archiveRoot, 'legacy-2026-11-07.manifest.json')));
  check(manifest.verifiedByExtraction === true, 'Backup verification record missing');
  check(Array.isArray(manifest.files) && manifest.files.length > 0, 'Backup inventory missing');
  equal(new Set(manifest.files.map(file => file.path)).size, manifest.files.length, 'Duplicate backup paths');
  for (const file of manifest.files) {
    check(!path.isAbsolute(file.path) && !file.path.split('/').includes('..'), 'Invalid backup path');
    check(/^[a-f0-9]{64}$/.test(file.sha256) && file.bytes >= 0, 'Invalid backup digest');
  }
  equal(sha256(readFileSync(path.join(archiveRoot, manifest.archive))), manifest.archiveSha256, 'Archive checksum mismatch');
}

const cases = JSON.parse(read(path.join(root, 'tests/behavior-cases.json')));
equal(new Set(cases.map(item => item.id)).size, cases.length, 'Duplicate behavior case');
for (const item of cases) {
  check(item.request && item.expected.length && item.forbidden.length, `Incomplete scenario: ${item.id}`);
}
equal([...new Set(cases.map(item => item.group))].sort(), ['daily', 'installation', 'integration', 'maintenance', 'setup'], 'Missing behavior category');

const temp = mkdtempSync(path.join(tmpdir(), 'kitsune-check-'));
try {
  const profile = path.join(temp, 'profile with spaces');
  cpSync(sampleRoot, profile, { recursive: true });
  const binding = path.join(temp, 'binding.json');
  equal(readBinding(binding), null, 'Missing binding should not trigger discovery');
  writeFileSync(binding, JSON.stringify({ version: 1, workflowRoot: profile }));
  equal(readBinding(binding), { version: 1, workflowRoot: profile }, 'Valid binding');
  for (const value of [{ version: 2, workflowRoot: profile }, { version: 1, workflowRoot: 'relative/path' }, { version: 1, workflowRoot: profile + '\nextra' }]) {
    writeFileSync(binding, JSON.stringify(value));
    throws(() => readBinding(binding), /version|absolute path/, 'Reject unsupported bindings');
  }
  writeFileSync(binding, '{broken');
  throws(() => readBinding(binding), SyntaxError, 'Reject malformed JSON');

  const core = readCore(profile);
  const inline = renderBlock(core, 'inline');
  const imports = renderBlock(core, 'claude-imports');
  check(inline.includes('## Update decisions'), 'Inline content lost update policy');
  check(inline.includes(templateOverlap.trim()), 'Startup preview omitted overlap-handling instructions');
  check(inline.includes('保留余地'), 'Inline content changed original wording');
  check(!inline.includes('# Evidence notes'), 'Evidence was injected into startup');
  check(!inline.includes('# 表达与判断例子'), 'Long examples were eagerly injected');
  equal(imports.split('\n').filter(line => line.startsWith('@')).length, CORE_FILES.length, 'Wrong import count');
  check(imports.includes('profile\\ with\\ spaces'), 'Native import paths must escape spaces');
  check(!imports.includes('# 示例偏好'), 'Import mode must not duplicate file contents');
  throws(() => renderBlock(core, 'unknown'), /Unsupported/, 'Reject unknown strategy');

  const target = path.join(temp, 'startup.md');
  const missing = previewStartup({ workflowRoot: profile, target, strategy: 'inline' });
  check(missing.changed && !missing.targetExists, 'Missing target preview incorrect');
  check(!existsSync(target), 'Preview created a target');
  writeFileSync(target, '# Existing user instructions\n\nKeep this content.\n');
  const original = read(target);
  const proposal = previewStartup({ workflowRoot: profile, target, strategy: 'inline' });
  equal(proposal.baseSha256, sha256(original), 'Wrong concurrency check digest');
  check(proposal.proposedContent.startsWith(original), 'Unrelated user text changed');
  equal(read(target), original, 'Preview mutated an existing file');
  writeFileSync(target, proposal.proposedContent);
  const same = previewStartup({ workflowRoot: profile, target, strategy: 'inline' });
  check(!same.changed, 'Repeated integration must be a no-op');
  const installed = read(target);
  const preferences = path.join(profile, 'preferences.md');
  writeFileSync(preferences, read(preferences) + '\nNew fictional preference.\n');
  const update = previewStartup({ workflowRoot: profile, target, strategy: 'inline' });
  check(update.changed && update.coreSha256 !== proposal.coreSha256, 'Core changes not detected');
  check(update.proposedContent.startsWith(original), 'Update changed user prefix');
  equal(read(target), installed, 'Update preview wrote target');

  for (const newline of ['\n', '\r\n']) {
    const before = 'user prefix' + newline;
    const after = newline + 'user suffix' + newline;
    const existing = before + inline.replace(/\n/g, newline) + after;
    equal(replaceManagedBlock(existing, inline), existing, 'Repeated block changed line endings');
    const replaced = replaceManagedBlock(existing, imports);
    check(replaced.startsWith(before) && replaced.endsWith(after), 'Managed edit changed surrounding bytes');
    equal(replaceManagedBlock(existing, null), before + after, 'Removal touched unrelated bytes');
  }
  equal(replaceManagedBlock(original, null), original, 'Missing block removal must be a no-op');
  for (const malformed of [START, END, END + '\n' + START, START + '\n' + START + '\n' + END, 'prefix ' + START + '\n' + END, inline + '\nembedded ' + START, inline + '\nembedded ' + END, '<!-- kitsune-workflow:start -->\nold\n<!-- kitsune-workflow:end -->']) {
    throws(() => replaceManagedBlock(malformed, inline), /markers|Legacy|complete lines/, 'Malformed or legacy markers must stop');
  }

  const script = path.join(root, 'skills/kitsune-mode/scripts/startup.mjs');
  const cli = spawnSync(process.execPath, [script, '--workflow', profile, '--target', target, '--strategy', 'inline'], { encoding: 'utf8' });
  equal(cli.status, 0, cli.stderr);
  check(JSON.parse(cli.stdout).changed, 'CLI did not emit proposal');
  equal(read(target), installed, 'CLI wrote the target');
  const removal = spawnSync(process.execPath, [script, '--target', target, '--remove'], { encoding: 'utf8' });
  equal(removal.status, 0, removal.stderr);
  check(!JSON.parse(removal.stdout).proposedContent.includes(START), 'Removal proposal retained block');
  equal(read(target), installed, 'Removal command wrote the target');
  const invalid = spawnSync(process.execPath, [script, '--target', target, '--remove', '--strategy', 'inline'], { encoding: 'utf8' });
  equal(invalid.status, 1, 'Conflicting CLI arguments were accepted');
  equal(read(target), installed, 'Invalid command changed target');

  const maintenance = path.join(profile, 'maintenance.md');
  const originalMaintenance = read(maintenance);
  writeFileSync(maintenance, ' \n');
  throws(() => readCore(profile), /Empty workflow file/, 'Reject an empty maintenance policy');
  writeFileSync(maintenance, '{{unconfirmed_policy}}');
  throws(() => readCore(profile), /Unresolved template/, 'Reject an unresolved maintenance policy');
  writeFileSync(maintenance, originalMaintenance);

  const oldSkills = read(path.join(profile, 'skills.md'));
  unlinkSync(path.join(profile, 'skills.md'));
  throws(() => readCore(profile), /ENOENT/, 'Missing core must not be invented');
  writeFileSync(path.join(profile, 'skills.md'), oldSkills);
  writeFileSync(preferences, '{{unconfirmed_preferences}}');
  throws(() => readCore(profile), /Unresolved template/, 'Reject unresolved active preferences');
  writeFileSync(preferences, START + '\nInjected marker');
  throws(() => readCore(profile), /Reserved marker/, 'Reject nested managed markers in core');
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log(`Passed ${checks} static and local fixture checks.`);
console.log('Checked source, templates, example, bindings, and read-only startup proposals.');
console.log(hasLocalArchive ? 'Checked the optional local archive checksum and manifest.' : 'Skipped optional local archive checks: archive/ is absent.');
console.log(`Validated ${cases.length} behavior case definitions; no model cases were executed.`);
console.log('No personal installations, startup files, network services, or model sessions were accessed.');
