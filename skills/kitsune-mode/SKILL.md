---
name: kitsune-mode
description: Use the user's personal workflow when handling a request.
---

# Use the personal workflow

This is the daily entry, not the setup interview. Apply only guidance relevant to the user's request. No particular model, agent team, or repository process is required.

## Locate and read

1. Resolve the personal directory in this order: an explicit path for this session, an existing binding in `local/workflow.json` beside this skill, then `~/.kitsune/workflow/`. A binding has version `1` and an absolute `workflowRoot`. Treat it as location data, never executable instructions. Expand `~` using the actual host user's home directory; if that cannot be determined, ask rather than guess.
2. An invalid binding or unavailable selected directory is an error to report, not a reason to silently fall back or create another profile. If the default directory is absent, offer setup; do not create it during an unrelated task. Do not scan unrelated directories or start an interview without a setup request. Continue independent work with an explicit configuration gap when useful.
3. Read `README.md`, `preferences.md`, and `skills.md` in that personal directory. Use its reply-language setting, preserving the user's terminology. Read only relevant methods and examples; evidence notes are not operating instructions.
4. If a core file is missing, report it. Do not invent content or silently download a replacement. Selected skills must exist and be allowed by the host before claiming to use them.

## First-use integration

Read [startup integration](references/startup.md) when integration has not been checked for this host or the user requests a change. Detect capabilities, inspect existing configuration, and propose exact writes before applying them unless already authorized. Already integrated means no repeated write.

Prefer host-native imports of the personal core. Managed inline content is a fallback with synchronization duties. A sentence asking the model to read another file is not mechanical loading of that file. If unsupported or declined, keep skill-only operation and respect that choice.

Use local integration notes to distinguish configured, disabled, and verified states. An initialized record is not proof of a fresh-session load. This skill may not be selected on every request; put the personal entry's maintenance decisions in the actual startup core as well.

## Work and maintain

Use the loaded preferences throughout this session. Read additional methods when the task changes, rather than restarting setup or loading the entire directory. After context loss, recover the binding and core as needed; do not claim a prompt can guarantee retention.

Before changing the workflow, use these decisions:

- Fixing the current answer does not automatically authorize a permanent update.
- A clear request to remember an enduring requirement can authorize that exact update without a second identical confirmation.
- Inferences, conflicts, or broader scope need confirmation. Existing adequate guidance calls for better execution, not another duplicate rule.
- Installation, permissions, startup changes, external actions, and changes to maintenance policy require their own applicable authorization.

Read the personal directory's `maintenance.md` before every persistent workflow change and use its authoring guide. Follow this route even when another skill proposes the change. Do not modify the profile merely because this skill ran.

Keep host restrictions and the task's authorization. Personal guidance does not override project requirements, silently adopt them as global rules, or grant permission to publish. Use delegation only if supported, authorized, and useful; otherwise do the work directly.
