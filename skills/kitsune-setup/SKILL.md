---
name: kitsune-setup
description: Build or update a personal agent workflow from real work.
disable-model-invocation: true
---

# Configure a personal workflow

Use only when the user asks to establish or update their personal workflow. Do not start an interview during an unrelated task. The manual-invocation field is host-specific; this scope applies even where the host ignores that field.

The result is a user-owned directory of ordinary files, not a new agent runtime or a repository procedure. Use English for shared execution steps. Write personal preferences and examples in the user's preferred language, preserving their terminology. Confirm the desired reply language independently.

## Begin with the user's work

1. Read [the interview procedure](references/interview.md), [the coverage framework](references/framework.md), and [the evidence policy](references/evidence.md).
2. For an update, locate the existing personal directory using [generation's location rule](references/generation.md): explicit path, existing binding, then `~/.kitsune/workflow/`. Read its `README.md` and `maintenance.md` before proposing changes. Do not create a parallel profile.
3. For initial setup, briefly establish the work scope and accept zero, one, or several reference sources. Record each source's purpose, reading boundary, and exclusions before detailed preference questions. Accept task descriptions or selected samples without a project. Sources can be added later; access to one does not authorize the others or unrelated history.
4. Inspect bounded samples, then use the framework to propose concrete tasks and identify coverage gaps beyond the projects. For important tasks, develop a method draft and quality criteria using a walkthrough and relevant examples or contrasts. Resolve only real open decisions, respect delegated judgments, and finish by explicitly checking for omitted tasks, sources, and method or quality gaps.

## Turn evidence into a proposal

5. Use [the authoring guide](assets/personal-workflow/authoring.md). Separate confirmed preferences, candidate inferences, one-task restrictions, and repository requirements. Do not copy repository requirements into personal defaults.
6. Use [skill selection](references/skills.md). A preference does not need a skill. Recommend a small relevant set, including the option to add none. Do not install, execute third-party scripts, or change invocation restrictions merely to inspect a candidate.
7. Present the proposed behavior, important methods and quality criteria, reviewed examples or contrasts, evidence and remaining uncertainty, selected skills, files, and any installation or binding changes. Reuse explicit approval of the same scope; do not self-approve inferred preferences or agent-proposed methods.

## Generate and check

8. Follow [generation](references/generation.md) using [the personal directory templates](assets/personal-workflow/README.md). Preserve unrelated edits. All subsequent persistent changes use the generated `maintenance.md` and its authoring guide.
9. Bind an installed `kitsune-mode` only when that write is in scope. The daily entry owns first-use startup integration; setup must not perform a second competing integration. Missing host capabilities are limitations, not permission to improvise settings.
10. Check paths, active content, examples, and selected skill availability. Offer a scoped behavior test with its cost and effects before running it. Do not report static checks as model compliance or current-context reads as fresh-session startup evidence.

Keep a resumable coverage and decision note in the user-approved draft location. On resume, verify existing files and decisions, then continue unresolved items. Do not reread all history or repeat the full interview.
