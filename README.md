# Kitsune

[English](README.md) | [简体中文](README-cn.md)

**Give your AI agent a personal way of working.**

You may find yourself repeating the same requests: check maintenance before recommending a library, lead with a recommendation when comparing options, or update the documentation alongside an implementation. Some preferences apply everywhere; others depend on the task. Appending them all to one global prompt can leave you with duplicate, conflicting, or outdated instructions.

Kitsune uses an interview to turn those preferences into personal files you can review and maintain. Your agent then reads the relevant guidance during daily work. You define your working preferences, each project keeps its development rules, and the host controls tools and permissions.

## How it works

Kitsune consists of two skills:

| Skill | Purpose |
|---|---|
| `kitsune-setup` | Understand your work, discuss preferences and trade-offs, and create or update your personal workflow. You invoke it explicitly. |
| `kitsune-mode` | Apply the workflow to daily requests, select relevant methods and skills, and handle authorized startup integration and maintenance. |

They use your existing agent rather than running a separate service. No particular model or multi-agent team is required. Your workflow is stored in ordinary Markdown files that you can read, edit, and reuse across compatible tools.

For example, you might say:

> When comparing technologies, recommend one first and explain its maintenance and compatibility. Keep routine status updates brief, but retain the steps I need when I ask to learn how something works.

Setup helps clarify the scope, exceptions, and observable behavior behind those requests instead of turning every sentence into an unconditional command. This is an example, not a preference imposed on every user.

## Quick start

### 1. Install the two skills

Get a local copy of this repository, then send your agent:

```text
Read this repository's INSTALL.md and install kitsune-mode and kitsune-setup for the agent I am using.
```

If the session is outside the repository, supply the actual path to `INSTALL.md`. The agent follows the [installation procedure](INSTALL.md) to identify its supported skill location, inspect existing content, and install both complete skills.

The default destination is the current host's personal skill directory. You can request a central location instead, such as `~/.cc-switch/skills/`. Installation does not generate preferences, start an interview, or rewrite global startup instructions.

### 2. Configure your workflow

In Claude Code with slash-command skill support, enter:

```text
/kitsune-setup
```

On other hosts, use their supported manual skill invocation mechanism.

Provide a reference work directory and reading boundaries. If you have no shareable directory, use task descriptions or selected excerpts instead. The agent explores your work scenarios, discusses preferences and trade-offs, checks for omissions, and presents the proposed content and optional skills for review.

Once confirmed, personal files are saved to `~/.kitsune/workflow/` by default. An explicitly supplied path or existing binding takes precedence. A reference project's rules do not automatically become your cross-project personal preferences.

### 3. Use it in daily work

Ask your agent to use `kitsune-mode` for subsequent requests. Hosts that support automatic skill selection may choose it themselves, or you can invoke it manually. Installing files alone does not guarantee invocation on every request.

On first use, the daily skill checks for supported startup loading and integrates it with the appropriate authorization. It prefers native imports where available, can use a managed copy of the core instructions otherwise, and falls back to skill activation when no supported startup mechanism is available.

See the [usage guide](docs/usage.md) for details, or the [first-run experiment](docs/first-run.md) to walk through the process without an existing configuration.

## What you get

```text
~/.kitsune/workflow/
├── README.md          # Entry point, loading, and maintenance decisions
├── preferences.md     # Confirmed preferences and their scope
├── skills.md          # Selected skills, purposes, and availability
├── maintenance.md     # Diagnosis, updates, checks, and recovery
├── authoring.md       # Guidance for expressing requirements accurately
├── methods/           # Task-specific methods, when needed
├── examples.md        # Judgment and wording examples, when needed
└── evidence.md        # Sources and unconfirmed items, when needed
```

`methods/`, `examples.md`, and `evidence.md` are created only when useful. Setup should not invent content to fill a template. History and evidence are not loaded as daily operating instructions.

Browse the [fictional example profile](examples/personal-workflow/README.md) to see the structure. It is an illustration, not a ready-made configuration of your preferences.

## Improve the workflow without accumulating rules

You can ask to retain a lasting preference or correct only the current task. Kitsune treats those as different requests.

Maintenance starts with diagnosis. A file that was not loaded, a method that was not found, and an existing instruction that was not followed do not all call for a new rule. A justified change can clarify, merge, replace, retire, or move existing content. New guidance is added when something is genuinely missing.

Changes should check the original problem and previously correct behavior they could affect, preserve a recovery path, and synchronize startup copies within authorization. Kitsune does not automatically rewrite your workflow after every task or treat a model's self-assessment as proof of improvement.

## Compatibility and boundaries

- The host must support skills and reading their files. Installation locations, invocation, and startup loading vary by product.
- The installation guide lists common local skill directories for Claude Code and Codex. Other products, including Cowork, need their actual installation and persistent-storage mechanisms checked first.
- Loading instructions into context does not guarantee compliance. Personal files do not replace host permission controls.
- Skill entry points and shared procedures use English. Personal preferences and examples use a language you can review accurately; reply language is configured separately.
- Optional third-party skills are not bundled. Selecting a capability does not authorize its installation, upgrade, or execution.

See the [integration guide](docs/integration.md) for details.

## Contributing

Read [AGENTS.md](AGENTS.md) and the [design notes](docs/design.md) before making changes. The skills are file-based instructions; Node.js is used for local checks and the optional startup-change preview tool.

Run the checks:

```bash
node tests/check-workflow.mjs
```

They cover documentation links, skill structure, template and example consistency, and file-handling behavior in startup previews. They do not replace testing with a real model. See the [testing notes](docs/testing.md) for the verification scope.

When reporting a usage problem, include the host, steps, expected behavior, and actual result. Do not include credentials or unredacted private conversations.

Most detailed guides are currently in Chinese.

[Documentation](docs/README.md) · [Design](docs/design.md) · [References](docs/sources.md)
