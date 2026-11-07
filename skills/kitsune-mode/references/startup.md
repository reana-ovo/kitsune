# Integrate startup loading

Integration is a one-time capability check and an authorized local configuration change, not a reason to rewrite settings every session. Do not invent a hook, a configuration key, or a vendor API.

## Inspect and choose

Identify the actual host and version where possible. Read its applicable documented personal startup mechanism and existing target files. Use a user-level target for personal behavior, not an unrelated project's rules. Respect restricted directories and organization policy.

Read `local/integrations.json` beside this installed skill if present. It is local bookkeeping, not permission. A user-declined or disabled host must not be offered again on every request; revisit only when requested or a relevant capability changes. If local storage is unavailable, report that the choice cannot persist there.

Use one of these modes:

1. **Native imports.** The host expands references into context at startup. Include the actual personal core: `README.md`, `preferences.md`, and the selected-skill index `skills.md`. Importing an index is not importing every skill body; host-supported preloading of a selected standing skill requires separate inspection and authorization.
2. **Managed inline content.** The host loads a personal instruction file but cannot import external files. Generate a bounded block from the same core. Include the absolute workflow root and a content digest. Changes to personal files require refreshing this copy; report a stale copy rather than claiming it updates itself.
3. **Skill only.** No usable startup entry, access declined, or host capability uncertain. Keep the directory binding where possible. Do not claim guaranteed automatic activation or inject content through undocumented controls.

For Claude Code's documented personal CLAUDE.md import mechanism, `@path` can load files, with path and permission rules checked against current docs. That syntax is not a cross-host standard. For another host, verify its actual mechanism; inline content is useful only if that host really loads the chosen file.

## Preview before writing

Read the existing target and inspect other workflow instructions. If legacy kitsune markers or another profile are present, propose an explicit migration; do not append a second conflicting workflow. Preserve all unrelated bytes and user edits. Never change a shared repository file merely because it is easier to find.

An optional local helper, [startup.mjs](../scripts/startup.mjs), produces a proposal and never writes files:

```bash
node <skill-directory>/scripts/startup.mjs --workflow <absolute-workflow-directory> --target <absolute-startup-file> --strategy inline
```

Use `claude-imports` only after verifying that the target is a supported Claude Code startup file. The helper is not a host detector, installer, or approval system. Node is optional; a host without it can produce the same inspected, reviewed block using file tools. Missing Node is not permission to install it.

The proposal contains the current target digest and proposed content. Inspect the diff and confirm authorization for this target and mode. Re-read the target and compare its digest immediately before applying to avoid overwriting concurrent edits. Use the host's approved editing tool, not the preview helper, to write.

Malformed or duplicate markers are a stop condition. Do not guess where the user-owned content begins. Apply an unchanged proposal as a no-op.

## Record and verify

Keep a local integration record with host identity, target, workflow root, mode, state, and verification date or `not-run`. Record a declined or disabled choice without changing the target. Do not put private paths in the reusable source package.

Use a map keyed by host and target to avoid replacing other hosts' entries. Preserve unknown existing fields. A minimal record can look like this:

```json
{
  "version": 1,
  "entries": [
    {
      "host": "<actual host>",
      "target": "<absolute target or null>",
      "workflowRoot": "<absolute personal directory>",
      "mode": "inline",
      "state": "configured",
      "verification": "not-run"
    }
  ]
}
```

Only mark startup loading verified after an authorized new session or host diagnostics demonstrate the actual injected files or content. Ask for the user's help if this cannot be observed. File existence, a successful write, and this session's prior reads are insufficient. Model compliance is a separate check.

## Update, disable, or remove

Use the personal maintenance procedure before changing active workflow content. For inline updates, recompute from the authoritative core and replace only the recognized block after checking for local edits. Native imports normally need no content copy.

On a user request to disable, record the disabled state and remove only the approved managed block or specifically owned native entries. The helper's `--remove` previews managed-block removal. Inspect changes before applying. Do not remove personal files, installed skills, or unrelated settings as a side effect. Do not immediately reinstall on the next daily activation.
