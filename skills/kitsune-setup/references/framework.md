# Interview framework

Use this framework to decide what to learn about the user's work. It is not a preset personal workflow, a fixed list of occupations, or a procedure every future task must follow. Reference projects supply evidence and examples; they do not define the full interview scope.

## Six coverage dimensions

| Dimension | What to establish | Useful probes for an important task |
|---|---|---|
| Goal and output | The result, its recipient or caller, and what is outside scope | What will someone use after this task? Which existing behavior or content must remain? |
| Execution method | How to investigate, form an approach, carry out the work, and adapt | What information should the agent establish first? Which comparable work should guide it, and why is that work comparable? What would make it revise its approach? |
| Quality standard | What distinguishes an acceptable result from one the user considers well done | If two results both work, which differences matter? What would still be unsatisfactory after basic checks pass? |
| Verification evidence | How to judge completion and preserve required behavior | Which observable result supports each important claim? What does a successful check not establish? |
| Tradeoffs and exceptions | Conditions that change a choice and obligations that still apply | When would another approach be preferable? Can related requirements coexist instead of overriding each other? |
| Collaboration and delivery | Delegated decisions, decisions needing alignment, and useful communication | What may the agent decide from evidence? Where must it pause for the user? What information belongs in the handoff? |

Adapt the probes to the work. A design review, research brief, spreadsheet cleanup, and code change need different evidence and quality criteria. Do not turn these examples into a mandatory domain list or copy one field's checklist into another.

Use the user's stated work scope to look for gaps across the dimensions. If the supplied sources cover only one area, propose relevant missing task areas as candidates and ask which belong in scope. Do not silently narrow the interview to available files or invent confirmed work habits to fill gaps.

## Make tasks concrete

Labels such as development, research, or documentation help navigation but are not sufficiently specific cases on their own. Identify a starting situation, available inputs, intended output or recipient, and important constraints. The task should support discussion of an actual method and a result whose quality can be assessed.

For example, replace an unmaintained table library in an existing application while preserving its current interactions, or turn conflicting research notes into a decision brief for a reader who has not seen the sources. These are illustrative tasks, not defaults for the user.

Use a real authorized case when available. Otherwise, label a hypothetical case and confirm its relevance. If discussion still produces only statements such as "be thorough" or "write good code," make the task or contrast more concrete. Stop before turning ordinary commands, APIs, or other discoverable implementation details into a preference questionnaire.

## Walk through how the work is done

For an important task, reconstruct a representative successful or unsatisfactory attempt from the user's account or authorized artifacts. Separate what actually happened from what the user wants next time. Do not assume accepted work was ideal or authored by the user.

Investigate answerable facts and established practices yourself. Then draft a plausible method for review instead of asking the user to design every step. For the consequential parts, establish:

- The information needed before choosing an approach, and how to obtain or assess it.
- The sequence or dependencies of the work, including why a non-obvious step matters.
- The basis for judging comparable work, alternatives, or intermediate results.
- Signals that the approach is failing and what should be reconsidered.
- The checks, stopping conditions, and decisions already delegated or still requiring discussion.

"When X happens, do Y" can describe an applicability rule but is not sufficient detail for an important method. For example, "follow existing patterns" needs an account of how to identify a relevant pattern, rather than selecting whatever code happens to look similar.

Concentrate questions on consequential differences, uncertain interpretation, and judgments the user has not delegated. Reuse existing answers. Do not make the user approve basic competence, facts you can verify, or every step of an already authorized approach. A proposed method is not yet a confirmed preference.

## Calibrate quality with contrasts

Use an actual artifact, a before-and-after revision, or clearly labeled hypothetical alternatives. When learning the user's judgment, include alternatives that are both credible and meet the task's basic goal, but differ in method or quality. An obviously broken option versus a correct one reveals little about preferences between acceptable approaches.

Ask which differences matter, why, and under what changed condition the other approach would be appropriate. Explain a recommendation where useful, but do not make the preferred answer inevitable through an unfair comparison. The user may prefer neither or delegate the choice using stated criteria.

Translate terms such as clean, natural, reliable, or concise into observable properties tied to the artifact. A criterion should identify what to inspect and why it matters; verification should explain how to obtain supporting evidence. Do not invent numeric thresholds merely to make the criterion look precise.

Keep the resulting method draft and a relevant quality example or contrast for review. Simple tasks may need only a short requirement. When examples add no useful distinction, record that judgment rather than manufacturing examples to satisfy a quota. Keep some new cases out of runtime examples for later checking.

## Decide what is covered

For each important task, track the six dimensions in compact draft notes. A dimension may be established, explicitly delegated, not applicable, deferred, or open. Record the basis or reason; an unanswered question is not implicit delegation or agreement.

Before marking an important task covered, check that its goal and output, method, quality criteria and comparison basis, verification, and relevant collaboration or tradeoff boundaries are established or explicitly delegated. A justified not-applicable dimension is allowed. Material open or deferred dimensions remain visible; do not label the whole task fully covered because its decision questions were answered.

The reviewable result should explain what the agent will produce, how it will approach the work, and how the user can judge the result. If these remain vague, deepen only the unresolved part or agree to defer it. This is a coverage check, not a claim that every future situation has been anticipated.

Store this analysis in the approved setup draft or evidence notes. Do not load the whole interview framework into the user's everyday core or create one method, skill, or permanent rule for each dimension.
