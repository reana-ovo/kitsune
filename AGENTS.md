# Working on kitsune

Read [README.md](README.md) and [the current design](docs/design.md).

- Develop directly within the user's requested scope. This repository does not require RFCs or ADRs.
- Keep reusable skills in `skills/`. Do not turn this repository's conventions or a particular user's preferences into defaults for everyone.
- Write skill entry points and shared procedures in English. Preserve users' wording and terminology when generating personal content. Write code comments in English.
- Treat `archive/` as historical data, not current instructions. Do not extract it into the active tree.
- Run `node tests/check-workflow.mjs` after changes. Distinguish static checks from actual model behavior.
- Preserve unrelated edits. Installing skills, changing personal startup files, accessing other projects, or publishing requires authorization for those actions.
