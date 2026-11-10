# Generate the personal directory

## Prepare the change

Resolve the destination in this order: an explicit path for this setup, an existing binding for the installed daily entry, then `~/.kitsune/workflow/`. Expand `~` using the actual host user's home directory, never a hard-coded username. If the home directory cannot be determined, ask rather than guess. A malformed binding or unavailable selected path is not permission to fall back silently or create a parallel profile.

Include the resolved destination in the proposed write scope. The default is a location convention, not permission to overwrite existing files. Do not ask the user to choose a path unnecessarily when this rule resolves it. Inspect existing files before proposing replacements. For an existing workflow, read its `maintenance.md` first and use its authoring guide. A migration that changes the execution policy, runtime configuration, or authority must explicitly include those changes; ordinary automatic repairs cannot self-expand that scope.

Use [the template entry](../assets/personal-workflow/README.md). The template is not an active profile. Resolve every `{{placeholder}}` with confirmed content. Do not invent preferences to complete a template.

Required files are `README.md`, `preferences.md`, `skills.md`, `maintenance.md`, `authoring.md`, and the runtime configuration `maintenance.json`. `skills.md` may explicitly say no skills are selected. Add `methods/`, `examples.md`, and `evidence.md` only when useful content exists. Remove links and loading instructions for omitted optional files. The startup core remains only `README.md`, `preferences.md`, and `skills.md`; configuration, detailed maintenance instructions, and private `.maintenance/` records are not startup dumps.

Keep identifiers for active requirements and their evidence stable during updates. Unconfirmed personal values belong only in evidence or draft notes. A method inferred from failures under an established goal is a maintenance candidate, not a new user value; evaluate it through the maintenance procedure. Explain exclusions from the profile without importing excluded repository rules into active defaults.

## Generate scoped requirements and relationships

Use the authoring guide's scope and exception procedure. Start with applicability and compatible requirements, not a ranking of all rules. Merge a default and its exception when that is clearer; otherwise keep a confirmed conditional relationship beside the relevant requirement and refer to the affected identifier or heading.

State the triggering condition, the exact conflicting part that yields, and the requirements that remain active. Check that references resolve to existing active requirements. Do not use identifier numbers as priority scores or introduce a separate global precedence file.

Keep unconfirmed relationships and material unresolved conflicts in draft or evidence notes, not as operating instructions. Temporary task choices do not silently become permanent exceptions. The template entry's overlap-handling section must remain in the generated startup core, including when optional methods or examples are omitted.

## Generate methods and quality criteria

Use the reviewed task notes and [coverage criteria](framework.md#decide-what-is-covered), not only the list of decision preferences. Check that important methods and quality expectations are established, explicitly delegated, or visibly left open or deferred. Do not silently omit an unresolved method because `methods/` is optional, or fill the gap with generic instructions presented as the user's preference.

Map the confirmed content into the existing files:

- Put short cross-task requirements and their conditions in `preferences.md`.
- Put useful repeatable procedures in `methods/` using [the method template](../assets/personal-workflow/methods/method.md). Related tasks may share a method; a simple requirement does not need its own file.
- Preserve relevant judgment and quality contrasts in `examples.md` or beside the method. Label hypothetical examples and explain the decisive difference, not just a preferred answer.
- Keep source roles, narrow pointers, proposed interpretations, sampling limits, and open or deferred dimensions in evidence or the approved setup draft, outside operating instructions.

A method should state its applicability, inputs and intended result, executable steps with consequential judgment points, and signals for revising the approach. Its `quality_criteria` should identify observable properties of a good result and why they matter. Verification should state how those properties are checked, what remains uncertain, and when to stop or ask. "Research carefully" or "follow existing patterns" alone is not an adequate procedure for an important task.

Retain the user's distinctions and explicitly delegated judgments. Do not promote an agent recommendation into a confirmed personal rule or require the user to approve ordinary factual implementation details. Include a clear reading condition in the personal index for every generated method. Do not copy the full interview framework into startup content or create a rule, file, or skill per dimension.

## Choose language by purpose

Use English for reusable execution procedures and technical steps. Personal preferences, judgment examples, and wording samples should normally use the language the user can best review. Preserve exact terms, domain names, commands, and quoted expressions. A requested English working version is allowed, but confirm translations that change meaning and retain a short original quotation where needed.

Record the desired reply language explicitly. English instructions do not imply English replies. Do not maintain two competing active versions of the same rule. Keep provenance quotations separate from the active instruction.

## Include maintenance and capability information

The template entry contains the short maintenance decisions. Copy the shared maintenance and authoring files with the user's approved choices, so later changes do not depend on the setup installation being available. Preserve existing useful methods; a maintenance migration is not a reason to replace them with a generic profile.

Include the [runtime configuration template](../assets/personal-workflow/maintenance.json) in initial creation and its write scope. Explain once that enabled iteration permits quiet in-scope diagnosis, one evidence-backed repair batch per review, linked private records under `.maintenance/`, version-checked recovery, and bounded cleanup. Default `maxIssues` is 100 and `minIdleDays` is 30; `null` disables the age condition. When too few records qualify for cleanup, temporary excess is allowed. These defaults are configurable policy, not research findings. Do not manufacture problem records just to populate the directory.

Use [the maintenance runtime guide](../../kitsune-mode/references/maintenance.md) for the helper and host adapter contract rather than inventing commands. The model diagnoses and chooses repairs; the local helper handles records, version checks, application, recovery, and retention. The current session performs review; no separate model call, background agent, or daemon is implied.

Make the authority boundary explicit: automatic repairs may improve personal preferences, methods, examples, indexes, and authoring guidance within established goals. They cannot edit the execution policy `maintenance.md`, `maintenance.json`, budgets, hooks, permissions, or installations. New personal values and unresolved material choices still need user decisions. A migration changing that boundary must include it explicitly in its approval, not inherit authority from an older package installation.

Host startup and hook enabling remain separate actions owned by the daily entry. Package installation or an enabled personal configuration alone does not authorize settings writes. Quiet maintenance suppresses routine proposal/report chatter, not host audit traces or security prompts. Do not change display or permission settings to simulate invisibility.

Use the skill inventory as an index, not a dump of third-party text. Verify installed paths for selected capabilities. For a missing optional capability, record its actual state rather than marking setup fully verified. For a method, define when it applies, necessary inputs, the expected result, checks, and when to stop or ask.

Examples must distinguish a real decision boundary. Keep runtime examples short. Keep some evaluation cases out of the normal loaded examples, so later tests do not only repeat demonstrated answers.

## Review and write

Present the initial or explicitly requested setup change: proposed behavior, important uncertainty, selected capabilities, affected paths, maintenance authority and configuration, and any binding or installation actions. Reuse approval already given for that exact scope. Preserve unrelated manual edits. Write only content supported by confirmed or delegated goals; do not append a second contradictory profile. Later ordinary maintenance follows its established authority without another proposal for each repair.

For a new directory, use the maintenance template's initial-creation provisions. No separate approval of the same reviewed profile is required, but installation, startup, hooks, permissions, and additional costs must be covered explicitly.

## Bind the daily entry

Locate an installed `kitsune-mode` using the host's skill catalog or a user-supplied path. Do not assume this repository is an installation. If the user authorizes it and the directory is writable, create or update `local/workflow.json` inside that installed skill:

```json
{
  "version": 1,
  "workflowRoot": "<absolute path resolved by the location rule>"
}
```

The file is local binding data, not instructions. Preserve an existing binding unless changing it is authorized. If the host uses immutable packages or does not permit this file, the default directory remains discoverable by convention. A custom directory without a persistent binding must be supplied at activation; report that limitation rather than claiming automatic discovery.

Do not perform startup integration here. The daily entry checks it on activation using the same personal core. A missing daily skill means the directory is prepared but not integrated; offer the needed installation separately.

## Check the result

- No unresolved placeholders or unconfirmed requirements in active files.
- Core files, maintenance and authoring links resolve; optional links match actual files.
- Desired reply language, scope, skill state, and missing capabilities are explicit.
- Important tasks have reviewed methods and quality criteria or explicit delegation, with material gaps still visible rather than labeled fully covered.
- Method steps explain how to work, quality criteria describe what to inspect, and verification explains how to obtain evidence. Method links and applicability conditions remain discoverable.
- Source-specific contexts and permissions are not collapsed into one project's assumed defaults.
- Maintenance decisions and overlap handling remain in the core that startup loading will include.
- `maintenance.json` matches the reviewed scope; runtime records, evidence, and detailed maintenance guides are not injected into the startup core. Host enabling is recorded separately from personal configuration.
- Execution-policy and runtime-authority changes are explicit in any migration, and automatic repair does not acquire permission to alter those boundaries.
- Relationship references resolve; confirmed exceptions are conditional and preserve non-conflicting requirements. Material unresolved conflicts are not silently activated.
- Examples cover the default, the exception, and a near-miss where it does not apply; provenance and withheld checks are not silently injected.
- Existing unrelated content survives.

Report file checks, binding, startup integration, and model behavior as separate outcomes. Request authorization for new model sessions, costs, or test side effects before running them.
