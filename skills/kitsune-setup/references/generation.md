# Generate the personal directory

## Prepare the change

Resolve the destination in this order: an explicit path for this setup, an existing binding for the installed daily entry, then `~/.kitsune/workflow/`. Expand `~` using the actual host user's home directory, never a hard-coded username. If the home directory cannot be determined, ask rather than guess. A malformed binding or unavailable selected path is not permission to fall back silently or create a parallel profile.

Include the resolved destination in the proposed write scope. The default is a location convention, not permission to overwrite existing files. Do not ask the user to choose a path unnecessarily when this rule resolves it. Inspect existing files before proposing replacements. For an existing workflow, read its `maintenance.md` first and use its authoring guide. Keep the current version unless the user authorizes changing that guide.

Use [the template entry](../assets/personal-workflow/README.md). The template is not an active profile. Resolve every `{{placeholder}}` with confirmed content. Do not invent preferences to complete a template.

Required files are `README.md`, `preferences.md`, `skills.md`, `maintenance.md`, and `authoring.md`. `skills.md` may explicitly say no skills are selected. Add `methods/`, `examples.md`, and `evidence.md` only when useful content exists. Remove links and loading instructions for omitted optional files.

Keep identifiers for active requirements and their evidence stable during updates. Pending inferences belong only in evidence or draft notes. Explain exclusions from the profile without importing excluded repository rules into active defaults.

## Generate scoped requirements and relationships

Use the authoring guide's scope and exception procedure. Start with applicability and compatible requirements, not a ranking of all rules. Merge a default and its exception when that is clearer; otherwise keep a confirmed conditional relationship beside the relevant requirement and refer to the affected identifier or heading.

State the triggering condition, the exact conflicting part that yields, and the requirements that remain active. Check that references resolve to existing active requirements. Do not use identifier numbers as priority scores or introduce a separate global precedence file.

Keep unconfirmed relationships and material unresolved conflicts in draft or evidence notes, not as operating instructions. Temporary task choices do not silently become permanent exceptions. The template entry's overlap-handling section must remain in the generated startup core, including when optional methods or examples are omitted.

## Choose language by purpose

Use English for reusable execution procedures and technical steps. Personal preferences, judgment examples, and wording samples should normally use the language the user can best review. Preserve exact terms, domain names, commands, and quoted expressions. A requested English working version is allowed, but confirm translations that change meaning and retain a short original quotation where needed.

Record the desired reply language explicitly. English instructions do not imply English replies. Do not maintain two competing active versions of the same rule. Keep provenance quotations separate from the active instruction.

## Include maintenance and capability information

The template entry contains the short update decisions. Copy the shared maintenance and authoring files with the user's approved choices, so later updates do not depend on the setup installation being available.

Use the skill inventory as an index, not a dump of third-party text. Verify installed paths for selected capabilities. For a missing optional capability, record its actual state rather than marking setup fully verified. For a method, define when it applies, necessary inputs, the expected result, checks, and when to stop or ask.

Examples must distinguish a real decision boundary. Keep runtime examples short. Keep some evaluation cases out of the normal loaded examples, so later tests do not only repeat demonstrated answers.

## Review and write

Present the proposed behavior, important uncertainty, selected capabilities, affected paths, and any binding or installation actions. Reuse approval already given for that exact scope. Preserve unrelated manual edits. Write only the approved active content; do not append a second contradictory profile.

For a new directory, use the maintenance template's initial-creation provisions. No separate approval of the same confirmed profile is required, but installation and startup writes must be covered explicitly.

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
- Maintenance decisions and overlap handling remain in the core that startup loading will include.
- Relationship references resolve; confirmed exceptions are conditional and preserve non-conflicting requirements. Material unresolved conflicts are not silently activated.
- Examples cover the default, the exception, and a near-miss where it does not apply; provenance and withheld checks are not silently injected.
- Existing unrelated content survives.

Report file checks, binding, startup integration, and model behavior as separate outcomes. Request authorization for new model sessions, costs, or test side effects before running them.
