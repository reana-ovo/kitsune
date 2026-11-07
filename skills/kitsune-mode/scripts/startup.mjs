import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const CORE_FILES = ['README.md', 'preferences.md', 'skills.md'];
export const START = '<!-- kitsune:start -->';
export const END = '<!-- kitsune:end -->';
export const sha256 = value => createHash('sha256').update(value).digest('hex');

function absolutePath(value, label) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || /[\r\n\t]/.test(value)) {
    throw new Error(`${label} must be an absolute path without line breaks or tabs`);
  }
  return path.resolve(value);
}

export function readBinding(file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  const binding = JSON.parse(text);
  if (binding?.version !== 1) throw new Error('Unsupported workflow binding version');
  return { version: 1, workflowRoot: absolutePath(binding.workflowRoot, 'workflowRoot') };
}

export function readCore(directory) {
  const root = absolutePath(directory, 'workflow directory');
  if (!statSync(root).isDirectory()) throw new Error('Workflow root is not a directory');
  for (const required of ['maintenance.md', 'authoring.md']) {
    const file = path.join(root, required);
    if (!statSync(file).isFile()) throw new Error(`Missing workflow file: ${required}`);
    const content = readFileSync(file, 'utf8');
    if (!content.trim()) throw new Error(`Empty workflow file: ${required}`);
    if (/\{\{[a-z_]+\}\}/i.test(content)) throw new Error(`Unresolved template in ${required}`);
  }
  const files = CORE_FILES.map(name => {
    const content = readFileSync(path.join(root, name), 'utf8');
    if (!content.trim()) throw new Error(`Empty core file: ${name}`);
    if (/\{\{[a-z_]+\}\}/i.test(content)) throw new Error(`Unresolved template in ${name}`);
    if (content.includes(START) || content.includes(END)) throw new Error(`Reserved marker in ${name}`);
    return { name, content };
  });
  return { root, files, digest: sha256(JSON.stringify({ root, files })) };
}

export function renderBlock(core, strategy) {
  if (!['inline', 'claude-imports'].includes(strategy)) throw new Error('Unsupported startup strategy');
  const root = core.root.split(path.sep).join('/');
  if (/[`"<>]/.test(root)) throw new Error('Workflow path cannot be represented safely in this startup format');
  const lines = [
    START,
    '# Personal workflow',
    `Workflow root: ${root}`,
    `Core SHA-256: ${core.digest}`,
    'Resolve personal-workflow links against this root, not the current project.',
    'English procedural text does not set the reply language.',
    'Before persistent workflow changes, read maintenance.md at this root.',
    '',
  ];
  for (const file of core.files) {
    if (strategy === 'claude-imports') {
      lines.push(`@${root}/${file.name}`.replaceAll(' ', '\\ '));
    } else {
      lines.push(`## Source: ${file.name}`, '', file.content.trimEnd(), '');
    }
  }
  lines.push(END);
  return lines.join('\n');
}

export function replaceManagedBlock(existing, block) {
  if (existing.includes('<!-- kitsune-workflow:')) {
    throw new Error('Legacy workflow block found; inspect and authorize migration first');
  }
  const starts = [...existing.matchAll(/^<!-- kitsune:start -->\r?$/gm)];
  const ends = [...existing.matchAll(/^<!-- kitsune:end -->\r?$/gm)];
  if (starts.length > 1 || ends.length > 1 || starts.length !== ends.length) {
    throw new Error('Duplicate or incomplete managed markers');
  }
  if (existing.split(START).length - 1 !== starts.length || existing.split(END).length - 1 !== ends.length) {
    throw new Error('Managed markers must occupy complete lines');
  }
  const newline = existing.includes('\r\n') ? '\r\n' : '\n';
  const rendered = block === null ? '' : block.replace(/\r?\n/g, newline);
  if (starts.length) {
    const start = starts[0].index;
    const end = ends[0].index;
    if (end < start) throw new Error('Managed markers are out of order');
    // Keep the end marker's CR as part of the original surrounding newline.
    return existing.slice(0, start) + rendered + existing.slice(end + END.length);
  }
  if (block === null) return existing;
  const separator = !existing ? '' : existing.endsWith('\n') ? newline : newline + newline;
  return existing + separator + rendered + newline;
}

export function previewStartup({ workflowRoot, target, strategy, remove = false }) {
  target = absolutePath(target, 'startup target');
  let existing = '', targetExists = true;
  try {
    existing = readFileSync(target, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    targetExists = false;
  }
  const core = remove ? null : readCore(workflowRoot);
  const block = core ? renderBlock(core, strategy) : null;
  const proposedContent = replaceManagedBlock(existing, block);
  return {
    target,
    targetExists,
    strategy: remove ? 'remove' : strategy,
    workflowRoot: core?.root ?? null,
    baseSha256: sha256(existing),
    coreSha256: core?.digest ?? null,
    changed: proposedContent !== existing,
    proposedContent,
  };
}

function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Preview only: --workflow ABSOLUTE_DIR --target ABSOLUTE_FILE --strategy inline|claude-imports');
    console.log('Removal preview: --target ABSOLUTE_FILE --remove');
    return;
  }
  const options = {};
  const keys = { '--workflow': 'workflowRoot', '--target': 'target', '--strategy': 'strategy' };
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--remove' && !options.remove) { options.remove = true; continue; }
    const key = keys[flag];
    if (!key || options[key] !== undefined || !args[index + 1] || args[index + 1].startsWith('--')) {
      throw new Error(`Invalid or duplicate argument: ${flag}`);
    }
    options[key] = args[++index];
  }
  if (!options.target || (!options.remove && (!options.workflowRoot || !options.strategy))) {
    throw new Error('Supply --target and either --remove or --workflow plus --strategy');
  }
  if (options.remove && (options.workflowRoot || options.strategy)) throw new Error('--remove accepts only --target');
  console.log(JSON.stringify(previewStartup(options), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
