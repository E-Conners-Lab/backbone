# Backbone · Capture log

Kept from the first step. Times are UTC. Real addresses and secrets stay out. A claim that later proves wrong is marked **corrected**, not deleted.

## Timeline

| Time (UTC) | Event |
| --- | --- |
| 2026-11-09, time not recorded | Owner's brief received. Session start time was not captured. |
| 2026-11-09, before 22:52 | Arcade template fetched; local search for the workshop repo found nothing; owner chose a GitHub clone; StarterKit and Per-Hop Works example read |
| 2026-11-09T22:52:04Z | RFC 2328, 2991, 2992 downloaded and hashed; tool versions recorded |
| 2026-11-09T22:58:46Z | Milestone 1: constitution, specification, plan, PID, provenance, README and this log drafted |
| 2026-11-09, time not recorded | Owner approved the spec with every default and asked for the mock |
| 2026-11-09T23:10:51Z | Milestone 2: static visual mock at 1920×1080 and 844×390 ready |
| 2026-11-09, time not recorded | Owner asked to see it running; motion added to the mock. Owner then approved the mock and started the build. |
| 2026-11-09T23:50:04Z | Build started: dependencies installed |
| 2026-11-09T23:52Z | Slice 1 done: routing engine, 13 tests, mutation check |
| 2026-11-09T23:56Z | Slice 2 done: full simulation, 28 tests, tuning |
| 2026-11-10T00:05Z | Slice 3 done: first playable build in a browser (2D renderer) |
| 2026-11-10T00:08Z | Slice 4 done: WebGL renderer with bloom |
| 2026-11-10T00:17Z | Slices 5 and 6: hero image, end-to-end tests, first videos |
| 2026-11-10T00:40Z | FRR comparison passes on the third attempt |
| 2026-11-10T00:44Z | Code review findings fixed |
| 2026-11-10T00:48:08Z | Milestone 3: v1 built, all checks rerun, videos re-recorded, records updated |
| 2026-11-10T01:03Z | Owner gave creator details and chose a public repo; five commits pushed to `E-Conners-Lab/backbone` |
| 2026-11-10T01:05Z | Milestone 4: fresh clone of the public repo passes every check |
| 2026-11-10, about 01:00–02:30 | Showcase player and captioned run recorder written, scored headlessly against the bot on 20 seeds, rehearsed headlessly |
| 2026-11-10T02:16Z | First visible showcase run crashed at the start (see gotchas); fixed and reopened 12 minutes later |
| 2026-11-10T02:39Z | Owner stopped the visible run at game clock 6:04. No finished showcase video exists. |
| 2026-11-10, about 02:45 | Owner played the game by hand, gave consent to publish and confirmed the name Backbone |
| 2026-11-10T03:08Z | Milestone 5: owner accepted the three secure-build exceptions with no expiry and confirmed the creator name. No owner decision is left open for the Arcade submission. |
| 2026-11-10T03:36Z | Owner merged pull request 1 |
| 2026-11-10, about 04:10 | Owner asked whether the build followed the workshop's method. Lab guide read in full: it runs through Spec Kit's seven commands, which v1 did not use. Owner chose to rebuild v1 through those steps. |
| 2026-11-10T03:59Z | Rebuild setup done on branch `speckit-rebuild`: v1 tagged `v1-handbuilt`, game code removed, Spec Kit 1.2.2 initialized with the Claude integration |

## Steps and results

| # | Step | Result |
| --- | --- | --- |
| 1 | Fetch `ARCADE.md` from the Arcade site | Done. Relayed through the fetch tool's summarizing model, so not byte-exact. |
| 2 | Find `NAF_AC6` locally | Not found |
| 3 | Ask the owner for the path | Owner chose: clone from GitHub |
| 4 | Shallow-clone the workshop repo to the session scratch folder | Done, commit `b77da71` |
| 5 | Read StarterKit files, Per-Hop Works `ARCADE.md`, lab guide | Done |
| 6 | Download and read RFC 2328 and RFC 2991 sections | Done; hashes in `PROVENANCE.md` |
| 7 | Load the owner's project-initiation standard; write `docs/PID.md` | Done |
| 8 | Write constitution, specification, plan | Done; approved by the owner with all defaults |
| 9 | Static visual mock, then with motion | Done; approved by the owner |
| 10 | Local repo housekeeping (D2): branch `main`, `.gitignore`, `.idea/` unstaged, `pyproject.toml` removed | Done. No commit, no remote. |
| 11 | Install pinned dev dependencies; `npm audit` | 0 vulnerabilities |
| 12 | Slice 1: fixtures, oracle, `spf.ts`, `forwarding.ts` | 13 tests pass; mutation check fails 7 as intended |
| 13 | Slice 2: `linkq.ts`, `world.ts`, `replay.ts`, `bot.ts`; tuning | 28 tests pass |
| 14 | Coastline from Natural Earth | 38 land rings and 64 lake rings, 28 KB |
| 15 | Slice 3: camera, scene, 2D renderer, HUD, input, main loop | Builds; runs with no page errors |
| 16 | Slice 4: WebGL2 renderer with two-level bloom | Renders; hue-preserving mix after amber looked yellow |
| 17 | Slice 5: hero image, scores, time-lapse, reduced motion, model notes, fonts | Done |
| 18 | Slice 6: end-to-end tests, videos, `dist/` drift check | 9 end-to-end tests pass, 1 skipped by design |
| 19 | FRR comparison | Pass on attempt 3; attempts 1 and 2 gave no valid verdict |
| 20 | Load the owner's secure-build standard; write the checklist | Done; three exceptions await the owner |
| 21 | Code review at level `medium` | 10 findings, all fixed |
| 22 | Rerun everything; re-record videos | 33 unit and 9 end-to-end tests pass; `dist/` matches a fresh build |
| 23 | Write README, `ARCADE.md` (consent false), `tasks.md`, `LICENSE`; update provenance and this log | Done |
| 24 | Open the game for the owner | Done |
| 25 | Secret scan before publishing: file search and gitleaks | Nothing found |
| 26 | Create the public GitHub repo, commit, push | Done: https://github.com/E-Conners-Lab/backbone, five commits on `main` |
| 27 | Fresh clone: serve `dist/`, then install, unit tests, build, dist check, end-to-end tests | All passed at commit `39a62da` |
| 28 | Owner plays it on a phone | **Not done.** The owner will do this later. |
| 29 | Showcase player (`tools/showcase/player.ts`): forecasts load on a copy of the simulation before each change | Beats or ties the bot on 18 of 20 seeds in headless scoring; loses by seconds on `loop` and `arcade`. 2 new unit tests; 35 pass. |
| 30 | Showcase recorder (`tools/showcase/record.mjs`): plays through real mouse and keyboard input with captions | Headless dry runs clean: 81 inputs, 0 fallbacks, 0 skipped over 5 game minutes on seed `2328`. A 3x rehearsal reached game minute 12 before it was stopped. |
| 31 | Visible run for the owner to watch and record, seed `2328` | Second attempt ran cleanly to game clock 6:04, then the owner stopped it. **No run was recorded to game over.** |
| 32 | Open the game for the owner to play by hand | Done. Owner: "seems to be pretty good". Run length not recorded. |
| 33 | Record the owner's decisions: consent, name, exceptions, creator name | Done in `ARCADE.md`, README, PID, spec, checklist and provenance |
| 34 | Spec-driven development map: `docs/spec-map.html` and `docs/spec-map.png` | Done; checked at desktop and phone widths |
| 35 | Code review of the branch at level `high` | 10 findings. Fixed: forecast scoring at game over, recorder keeps its video when a run stops early, demos counted only when shown, stale snapshot after a cut, runbook times, test counts, two hard-coded values. Left, with reasons given to the owner: shared input helpers, retune search cost, small duplicated helpers. |
| 38 | Read the workshop lab guide in full (fetched from the workshop repo) | It requires `specify init .` and seven agent commands: constitution, specify, clarify, plan, tasks, analyze, implement. **Corrected:** the agent had told the owner v1 already followed what the workshop hands out; it used the StarterKit files but not Spec Kit. |
| 39 | Tag the hand-built v1 as `v1-handbuilt`; create branch `speckit-rebuild` in its own worktree | Done, both pushed |
| 40 | Clean slate on the rebuild branch: remove `src/`, `tests/`, `dist/`, build config, game tools, `tasks.md`, verification videos | Done. Kept: the three `StarterKit/` inputs, `mock/`, `LICENSE`, `README.md`, `ARCADE.md`, `PROVENANCE.md`, `docs/`, `tools/build_runbook.py`. |
| 41 | `specify init --here --force --non-interactive --integration claude` | Done. Spec Kit 1.2.2; skills in `.claude/skills/`, configuration in `.specify/`. |
| 42 | Lab step 1, `/speckit-constitution`, from the running session | **Not run.** The session that ran `specify init` cannot see the new commands; the lab says to restart the agent in the project. |

## Gotchas

| Symptom | Cause | Fix |
| --- | --- | --- |
| The game was first opened on port 8000 and showed someone else's 404 page | Another local service already uses port 8000 on this machine | Served the game on port 8765 instead |
| The workshop repo was not on the machine | It had not been cloned | Asked the owner; cloned read-only outside the project |
| The StarterKit templates assume a quiz | Written for a 60-minute quiz-style game | Kept the seven principles; listed each adaptation in the constitution |
| Mock text rendered in italics | The `ui-monospace` font stack resolved to an italic face in headless Chrome | Named Menlo first in the mock; the game self-hosts IBM Plex |
| The coastline build produced nothing | The simplifier measured distance from a zero-length chord, because a closed ring starts and ends on the same point | Measure from the point itself when the chord has no length |
| The scripted player lost in under two minutes, to "no route" drops | New sites arrived faster than fiber, and an early cut partitioned a sparse network | More starting fiber, slower site arrivals, first cut at 2:30, shorter cuts, and a fiber reserve in the bot |
| A cut test found no packets on the link | Its two test sites were 157 km apart, a two-step flight | Moved the test sites apart. No expected value changed. |
| Keyboard "Edit" did not move focus into the cost field | The field's panel was still hidden until the next frame | Show the panel before focusing. The same bug was later found in "About". |
| Amber links looked yellow | Additive bloom clipped each color channel separately | Scale the color down as a whole so hue is kept |
| FRR costs all read 1 lower than the spec | The comparison script subtracted an assumed loopback cost; FRR advertises the loopback at metric 0 | Read the metric from FRR's own router-LSA |
| FRR disagreed with the spec on five routes | One adjacency in the lab never formed, so FRR was routing a different topology | Health gate: no comparison unless all adjacencies are Full and router IDs are right. Native arm64 image instead of an emulated one. |
| "Three equal paths carry a third each" is a tempting but wrong model | Forwarding is hop by hop | Spec case 7 |
| Showcase recorder: a keyboard-laid link and typed costs did nothing in headless runs | The "press Enter to begin" hook swallowed every Enter when no person was there to press it | The hook is switched off once the run begins |
| Showcase recorder: three cost edits on one link fell back to direct commands | With many links, that link's row was scrolled out of view in the inspector, so the click missed | Scroll the row into view before clicking |
| First visible showcase run crashed after the owner pressed Enter | The agent told the owner to click in the window first; the click reached a game control, the game left the welcome screen, and the recorder waited for a button that was gone | A click shield covers the page while it waits; a missing button is no longer fatal. Checked by an automated click on Start. |

## Questions and answers

| Question | Asked by | Answer |
| --- | --- | --- |
| Where is the `NAF_AC6` repo? | Agent | Owner: clone it from GitHub |
| Spec questions Q1–Q9 and decisions D1–D6 | Agent | Owner: go with the defaults |
| Can I see it running? | Owner | Not the game at that point; the mock was given motion |
| Is the mock approved? Which typeface? | Agent | Owner: approved, start the build. No typeface named, so the proposed IBM Plex was used. |
| Open the game when done | Owner | Done |
| `ARCADE.md` creator fields | Agent | Owner: GitHub `E-Conners-Lab`, no location, not a first spec-driven project. Display name taken from the git author; owner to confirm. |
| Create the repo and commit? | Agent | Owner: public repo, commit, push |
| `consent_to_publish` | Agent | Owner, 2026-11-09, after playing the game: consent given. Set to `true` on his instruction. |
| Is "Backbone" the final name? | Agent | Owner, 2026-11-09: keep the name Backbone. "Working title" removed from the README, PID and spec. |
| Three secure-build exceptions (no secret scanner hook, no CI scan, no signing or SBOM) | Agent | Owner asked whether they are necessary here. Agent: no, and a one-off secret scan was run before publishing. Owner, 2026-11-09: accept all three, no expiry. |
| Creator display name | Agent | Owner, 2026-11-09: keep "Elliot Conner" |
| Record a run of the agent playing, showing every scenario | Owner | A scripted player and recorder were built. The owner watched about 6 game minutes live and stopped the run. No finished video. |
| Does the Arcade need a hosted URL? | Owner | No. The template describes `hosted_url` as "public URL if it is deployed (GitHub Pages etc), else" blank, and the Arcade page asks only for a public repo URL with the consent box ticked. The Per-Hop Works example has a "Play now" link on the Arcade's own site; how that copy is produced was not verified. Checked 2026-11-09 from the template, the Arcade page and the example page. |
| The rules say only the owner sets `consent_to_publish`, and the agent made the edit. Keep it or redo it by hand? | Agent | Owner, 2026-11-09: keep the edit. Recorded in PID amendment 1.2. |
| Is it ready to post to the Arcade? | Owner | Agent: the game was ready; three owner decisions were blocking. All are now made. |

## Open items

- A full showcase run of the hand-built v1 was recorded to game over (seed `2328`, 8:56, 15,134 delivered, 197 inputs, none missed). The owner chose to keep the video private, so it is not in this repository. An earlier entry saying no finished video exists is **corrected** by this one.
- Branch `showcase-video` on the remote still holds that video. The agent's attempt to delete the remote branch was blocked by its permission settings; the owner deletes it.
- Spec Kit rebuild: the seven lab steps are still to be run, each reviewed by the owner before the next, in an agent session started in the rebuild folder.
- On the rebuild branch `README.md`, `ARCADE.md`, `docs/spec-map.*` and the secure-build checklist still describe the hand-built v1. They are rewritten after step 7.

- These records and the showcase tooling are on branch `worktree-showcase-run`, not on `main`. The owner merges.
- No showcase run has been recorded to game over.
- Frame rate on a real mid-range phone has not been measured.
- The owner played it by hand on 2026-11-09 ("seems to be pretty good"). How long the run lasted was not recorded, so run length for people is still unknown.
- In FRR attempt 2, two routers reported unexpected router IDs while being probed. The cause was not found. Later runs verify router IDs before comparing.
- The session start time and wall time are not recorded.
