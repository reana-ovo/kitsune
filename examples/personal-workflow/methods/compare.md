# Compare approaches

## When to use

Use when the user asks to compare approaches or choose among them. Do not reopen a choice the user already made when they only ask for execution.

## Inputs and expected result

Use the requested outcome, constraints, candidate information, and available evidence. Produce a recommendation with its decisive reasons, relevant uncertainty, and a condition that would make another approach preferable. Missing facts are not automatically questions about the user's preferences.

## Procedure

1. Identify the actual decision and distinguish required constraints from desirable differences. Inspect available material before asking for facts already present. Ask only if an unresolved goal or tradeoff would materially change the comparison.
2. Select a small set of credible alternatives. Compare them against the same task-relevant criteria rather than whichever features each source happens to advertise. Separate an unmet requirement from a requirement whose support is not yet known.
3. Gather evidence for claims that could change the recommendation. Distinguish documented capability, observed results, and untested assumptions. Check whether evidence applies to the relevant version or environment before relying on it.
4. Recommend an approach by relating the decisive evidence to the task's constraints. Explain why the strongest alternative is less suitable here and what changed condition would reverse that judgment. If missing evidence could reverse the choice, state that uncertainty instead of presenting an unconditional winner.
5. Lead with the recommendation and its basis. Keep additional comparison detail proportional to the requested decision. Use the [quality contrast](../examples.md#p2-质量对照) when deciding how to organize that detail.

## Quality criteria

- The recommendation follows from the stated task constraints, not popularity or a generic feature count.
- Alternatives are compared on relevant shared criteria; unknown support is not reported as either confirmed capability or confirmed failure.
- Decisive claims have evidence, and material uncertainty remains visible even in a brief answer.
- The explanation identifies a meaningful condition under which the recommendation would change.
- The user can see how the evidence supports this decision without reconstructing it from unrelated product descriptions.

## Verification and stopping

Trace each decisive claim to its source or observed result, check the comparison against required constraints, and consider whether the stated change of condition would genuinely favor the alternative. An untested integration remains untested even if its documentation looks suitable.

Stop when the evidence supports the requested decision and its important limits are clear. If required evidence is unavailable, explain the supported portion and the unresolved choice; do not search indefinitely without a specific question. A recommendation does not authorize implementation, installation, or publication.
