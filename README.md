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

They use your existing agent rather than running a separate model or service. No particular model or multi-agent team is required. Your guidance stays in ordinary Markdown files; a small Node helper manages private maintenance records, version-checked changes, recovery, and cleanup. A separately enabled Claude command-hook adapter prompts internal review in the current session.

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

Describe the work you want to cover and provide zero, one, or several reference projects, artifacts, or excerpts, with a reading boundary for each. You can add sources during the interview. If you have no shareable material, start with task descriptions.

After a bounded review, the agent checks coverage across goals and outputs, execution methods, quality standards, verification evidence, tradeoffs and exceptions, and collaboration. Reference projects do not define the whole scope. Important scenarios become concrete tasks, with method drafts and output contrasts to discuss what doing the work well means. The agent checks for omissions and presents the proposed content and optional skills for review, without asking you to approve every routine judgment you have already delegated.

Once confirmed, personal files are saved to `~/.kitsune/workflow/` by default. An explicitly supplied path or existing binding takes precedence. Setup includes the maintenance scope, `maintenance.json`, private records, and retention policy in that initial review. A reference project's rules do not automatically become your cross-project personal preferences.

### 3. Use it in daily work

Ask your agent to use `kitsune-mode` for subsequent requests. Hosts that support automatic skill selection may choose it themselves, or you can invoke it manually. Installing files alone does not guarantee invocation on every request.

On first use, the daily skill checks for supported startup loading and integrates it with the appropriate authorization. It prefers native imports where available, can use a managed copy of the core instructions otherwise, and falls back to skill activation when no supported startup mechanism is available. Enabling Claude maintenance hooks is a separate host choice, not an installation side effect; other hosts can use the general maintenance procedure without claiming automatic event support.

See the [usage guide](docs/usage.md) for details, or the [first-run experiment](docs/first-run.md) to walk through the process without an existing configuration.

## What you get

```text
~/.kitsune/workflow/
├── README.md          # Entry point, loading, and maintenance decisions
├── preferences.md     # Confirmed preferences and their scope
├── skills.md          # Selected skills, purposes, and availability
├── maintenance.md     # Execution policy: diagnosis, repair, checks, and recovery
├── maintenance.json   # Iteration and retention configuration
├── authoring.md       # Guidance for expressing requirements accurately
├── methods/           # Task-specific methods, when needed
├── examples.md        # Judgment and wording examples, when needed
├── evidence.md        # Setup sources and pending decisions, when needed
└── .maintenance/      # Private linked problem records, created as needed
```

`methods/`, `examples.md`, and `evidence.md` are created only when useful. Setup should not invent content to fill a template. The startup core stays `README.md`, `preferences.md`, and `skills.md`; history, runtime records, configuration, and detailed maintenance guides are not dumped into it.

Browse the [fictional example profile](examples/personal-workflow/README.md) to see the structure. It is an illustration, not a ready-made configuration of your preferences.

## Improve the workflow without accumulating rules

Once setup and host enabling establish the scope, normal maintenance is autonomous and quiet. The agent can use task failures, corrections, and checks to improve methods within your existing goals, without requiring a “remember this” request or approval and reporting for each attempt. Current-only feedback does not become a universal preference; new goals, unresolved personal choices, and permissions still need your decision.

Maintenance starts with the actual result and a diagnosis. A file that was not loaded, a method that was not found, and an instruction that was not followed do not all call for a new rule. Each review allows at most one evidence-backed repair batch, with checks and version-aware recovery that preserve independent later edits. A recurrence prompts re-diagnosis, not blind rollback of the latest change or repetition of a failed strategy without new evidence.

Problems, occurrences, causes, attempts, and checks are linked rather than forced into one-to-one records. Retention defaults to 100 problems and a 30-day idle threshold; setting `minIdleDays` to `null` disables the age condition. Cleanup runs only over the count limit, oldest meaningful update first, and allows temporary excess when too few records qualify. It does not require a problem to be solved or move data to an unlimited archive.

There is no target rule count or default scan of old conversations. Automatic repair cannot change its execution policy, runtime configuration, budgets, hooks, or permissions. Quiet operation does not hide host audit traces or security prompts, and local tooling does not prove that the model's diagnosis or behavior improved. See the [design](docs/design.md) and [maintenance runtime guide](skills/kitsune-mode/references/maintenance.md).

## Compatibility and boundaries

- The host must support skills and reading their files. Installation locations, invocation, and startup loading vary by product.
- The installation guide lists common local skill directories for Claude Code and Codex. Other products, including Cowork, need their actual installation and persistent-storage mechanisms checked first.
- Loading instructions into context does not guarantee compliance. Personal files do not replace host permission controls.
- Skill entry points and shared procedures use English. Personal preferences and examples use a language you can review accurately; reply language is configured separately.
- Optional third-party skills are not bundled. Selecting a capability does not authorize its installation, upgrade, or execution.

See the [integration guide](docs/integration.md) for details.

## Contributing

Read [AGENTS.md](AGENTS.md) and the [design notes](docs/design.md) before making changes. Skill guidance is file-based; Node.js runs local checks, the optional startup-change preview, and the maintenance helper and Claude adapter.

Run the checks:

```bash
node tests/check-workflow.mjs
```

The checks cover documentation links, skill structure, template/example consistency, and local file-handling contracts. Runtime fixtures and synthetic hook payloads are distinct from real host events and model behavior. See the [testing notes](docs/testing.md) for the commands and verification scope; none of these substitutes for actual behavior evidence.

When reporting a usage problem, include the host, steps, expected behavior, and actual result. Do not include credentials or unredacted private conversations.

Most detailed guides are currently in Chinese.

[Documentation](docs/README.md) · [Design](docs/design.md) · [References](docs/sources.md)
