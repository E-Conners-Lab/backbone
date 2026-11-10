# Secure Build Checklist

**Project:** Backbone
**Reviewer:** Claude Code (build agent), for the owner's review
**Date:** 2026-11-09

Backbone is a static browser game. It has no backend, no accounts, no network calls, no secrets and no user data. Most of the standard does not apply; the rows below say which rules do and what was done.

| Rule | Applies? | Status |
| --- | --- | --- |
| SEC-01–05 (identity, sessions, authorization) | No: nothing to sign in to | Not applicable |
| SEC-06 (no secrets in the repo) | Yes | No secret exists in the project. No pre-commit secret scanner is installed: **open**, see exceptions. |
| SEC-07–10 (secret storage, rotation, logging, responses) | No: no secrets | Not applicable |
| SEC-11, SEC-12 (schema validation, allowlists) | Yes, for the three inputs the game accepts | URL switches are checked against fixed patterns and ranges in `src/main.ts`. The seed must match `^[A-Za-z0-9-]{1,24}$`. Saved scores read from browser storage are validated field by field in `src/ui/scores.ts`. Every player action is a command validated by `applyCommand` in `src/sim/world.ts`. |
| SEC-13 (parameterized queries) | No: no database | Not applicable |
| SEC-14 (encode at the sink) | Yes | All dynamic text is written with `textContent`. The code contains no `innerHTML`. |
| SEC-15 (uploads) | No | Not applicable |
| SEC-16–20 (transport and storage encryption) | No data is sent or stored beyond scores on the device | Not applicable. Whoever hosts the game should serve it over HTTPS. |
| SEC-21–25 (logging, audit, alerts) | No | Not applicable |
| SEC-26 (dependency scanning) | Yes | `npm audit` run on 2026-11-09: 0 vulnerabilities. Not in CI: there is no CI. **Open.** |
| SEC-27 (pinned versions, lockfile) | Yes | Every dependency is an exact version in `package.json`; `package-lock.json` is present. All are build-time only; the shipped game has no runtime dependency. |
| SEC-28, SEC-29 (signing, SBOM) | Low value for a static demo | Not done. See exceptions. |
| SEC-30–33 (containers, network, images) | No containers ship | Not applicable. `tools/frr_check.py` runs FRR containers with `--privileged` on the developer's machine only, for a lab check, and removes them. |

## Documented Exceptions

These need the owner's acceptance; the agent cannot accept risk on the owner's behalf.

**The owner asked on 2026-11-09 whether these are necessary for this project.** The agent's answer: no. The game ships no secrets, no backend and no runtime dependencies, so the three rules protect very little here. The one cheap step worth doing was a secret scan before the code went public, and that was done: gitleaks 8.30.1 found no leaks before the first push. A CI workflow that runs the tests and `npm audit` on each push would be a reasonable later addition if the repo gets contributors. Signing and an SBOM are not worth it for a static workshop example.

| Rule ID | Reason | Risk Accepted By | Expiry |
| --- | --- | --- | --- |
| SEC-06 | No pre-commit secret scanner hook. A one-off gitleaks scan was run before the first push and found nothing. | pending owner | — |
| SEC-26 | No CI, so dependency scanning is manual (`npm audit`). | pending owner | — |
| SEC-28, SEC-29 | No artifact signing or SBOM for a static workshop example. `package-lock.json` lists every build dependency. | pending owner | — |
