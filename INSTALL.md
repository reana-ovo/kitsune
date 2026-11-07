# Install Kitsune skills

Use this procedure when the user asks to install Kitsune. Reading this file alone does not authorize installation. Work with the current agent's supported local skill mechanism; do not require a third installer skill.

## Installation only

Install these two complete directories from the repository containing this file:

- [skills/kitsune-mode](skills/kitsune-mode/SKILL.md), the daily entry.
- [skills/kitsune-setup](skills/kitsune-setup/SKILL.md), the user-requested configuration entry.

Include their references, assets, agent metadata, and scripts. Keep the source names and invocation restrictions unchanged. Do not install the repository root, `archive/`, `examples/`, or private installation records as skills.

This procedure does not create `~/.kitsune/workflow/`, run the setup interview, write a workflow binding, change personal startup instructions, install optional skills, or change permissions. Do not execute downloaded installers or modify a skill manager's database. Startup integration belongs to the daily entry after the user has a confirmed personal directory and authorizes that integration.

## Find the host and destination

1. Identify the actual agent product and its local filesystem environment from available session information. Install for the current host only unless the user explicitly names more hosts. Do not infer the host from a model name or the presence of a folder alone.
2. Locate the source relative to this `INSTALL.md`. Read both `SKILL.md` files and check that their supporting files exist. If the source is incomplete or inaccessible, report the gap instead of substituting unrelated packages. Node is not required to copy and use the skills.
3. Inspect the host's documented skill catalog or known discovery locations for these two names. Prefer an existing authorized installation location when updating. Respect a location the user explicitly supplies, and verify how the host will discover it. Do not scan the whole home directory, conversations, credentials, or account databases to choose a path.
4. When there is no existing or explicit destination, use the current host's documented personal skill directory. Resolve the actual home and any supported configuration-root override, rather than hard-coding a username.

Common local defaults, checked against the linked documentation:

| Host | Personal skill discovery directory | Reference |
|---|---|---|
| Claude Code | `~/.claude/skills/` | [Claude Code skills](https://code.claude.com/docs/en/skills) |
| Codex | `~/.agents/skills/` | [Codex skills](https://learn.chatgpt.com/docs/build-skills) |

These are host-specific defaults, not a cross-agent directory standard. For a custom configuration root, remote environment, different product, or version with different behavior, verify its actual discovery mechanism. Ask a focused question if the host or destination remains unknown; do not create copies in several guessed locations.

A user may choose a central store such as `~/.cc-switch/skills/`. It is not a universal discovery directory. If the host supports linked skill directories, install the two directories there and create the necessary discovery links. A Windows directory junction may be used where supported. Inspect existing links and their targets before changing them. If linking is unavailable, explain that limitation and agree on a supported destination instead of silently maintaining multiple copies.

## Inspect before writing

List the resolved source, installation directories, and any discovery links that will change. Reuse an explicit installation authorization for that scope; do not ask the user to approve the same fresh copy twice. Get the missing authorization before replacing local changes or changing other hosts.

For each existing destination:

- Compare its complete reusable file set with the source, including extra old files. Identical content requires no replacement.
- Treat `local/workflow.json`, `local/integrations.json`, and other local-only files as user data, not obsolete package files. Preserve them on an authorized update; do not copy them into the reusable source.
- Stop for unreadable targets, unexpected links, or unexplained local modifications. Present the difference and proposed replacement, with a recoverable backup, before changing it.
- Do not merge a legacy playbook tree into the new package. An authorized replacement should leave the approved source file set plus explicitly preserved local data.

If existing startup instructions or an installation record refer to an old workflow, report that migration is still needed. Installing the new package does not authorize rewriting those instructions. Do not claim a conflict-free migration while a known old startup entry remains active.

## Install the two directories

Copy the approved source directories with the host's permitted file tools. Where the user chose a central store, create only the approved discovery links to that installed copy. If the approved operation is already satisfied, make no changes.

Preserve unrelated skills and configuration. Do not write `CLAUDE.md`, `AGENTS.md`, settings, permissions, the personal workflow directory, or interview answers as an installation side effect. Do not work around a denied write through another tool.

## Verify and hand back

- Compare the installed reusable files with the source, using file lists and content or hashes. Check that support paths resolve and that no old package files survived an approved replacement.
- Verify every new discovery link resolves to the intended installed directory and that its `SKILL.md` can be read.
- Keep `kitsune-setup` manual-only: retain `disable-model-invocation: true` and its optional Codex `allow_implicit_invocation: false` metadata. Do not disable automatic invocation for `kitsune-mode`.
- Report file installation, host discovery, and a fresh-session invocation as separate outcomes. A readable file does not prove the host registered it. A manual-only skill may be absent from the model's automatic skill catalog.
- If the host has not detected the installation, use its documented reload behavior or ask the user to open a new session. Do not fabricate a successful invocation or start a paid test session on their behalf.

Finish with the resolved paths, actual checks, any remaining migration issue, and the host-supported way for the user to invoke `kitsune-setup`. Do not begin the interview merely because installation finished. The [usage guide](docs/usage.md) describes configuration; the [first-run experiment](docs/first-run.md) separates a clean installation test from existing personal configuration.
