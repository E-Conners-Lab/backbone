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
| 2026-11-10T04:18Z | Milestone 8: lab step 1 done in a new agent session. `/speckit-constitution` wrote the Spec Kit constitution, version 1.0.0, with conflicts flagged. Waiting for the owner's review. |
| 2026-11-10, about 15:05 | Owner's go-ahead: finish the rebuild without step-by-step review, commit as you go, take the agent's recommendations for K1–K5. Pushing was not mentioned, so nothing is pushed. |
| 2026-11-10T15:11Z | Lab step 1 committed; constitution amended to version 1.1.0 with the owner's decisions K1 and K2; the rebuild's part of `PROVENANCE.md` started (K5) |
| 2026-11-10T15:19Z | Lab step 2 done: `/speckit-specify` wrote `specs/001-backbone-first-playable/spec.md` |
| 2026-11-10T15:22Z | Lab step 3 done: `/speckit-clarify`, five questions, all answered by the build agent for the owner's later review |
| 2026-11-10T15:30Z | Lab step 4 done: `/speckit-plan` wrote the plan, research notes, data model, three contracts and the quickstart |
| 2026-11-10T15:33Z | Lab step 5 done: `/speckit-tasks` wrote 69 tasks |
| 2026-11-10T15:39Z | Lab step 6 done: `/speckit-analyze` run twice, with the fixes between |
| 2026-11-10T15:57Z | Lab step 7 under way. Phase 2 checkpoint: the simulation is proven with no graphics, 84 unit tests pass |
| 2026-11-10T16:17Z | User Story 1 playable in a browser and checked at phone and desktop sizes |
| 2026-11-10T16:33Z | Stories 2 to 5 built and checked in the fallback renderer: 105 unit and 48 end-to-end tests pass; color census zero at both sizes |
| 2026-11-10T17:06Z | The four effects are in: WebGL renderer with trails, load-scaled links, cut spark and ripple, bloom. FRR comparison passed. Hero art captured. |

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
| 43 | Lab step 1, `/speckit-constitution`, in a new agent session started in the rebuild folder (Claude Code 2.1.322, `claude-fable-5-2`). Read first: the three `StarterKit/` files, the Spec Kit templates, the PID, this log and `PROVENANCE.md`. | Done; **waiting** for the owner's review. `.specify/memory/constitution.md`, version 1.0.0, holds all seven principles and their evidence in the Spec Kit structure. The only wording changes are the six listed in the file. Not committed. |
| 44 | Independent check that nothing was weakened: a script compares every line and table cell of `StarterKit/CONSTITUTION.md` with the new file | Pass: 50 of 50 source pieces present, 7 principles, 7 Evidence lines, no placeholder left. A copy with two clauses deleted fails the check, as it should. |
| 45 | Flag conflicts instead of weakening a principle | Principle text kept as written in every case. Five conflicts wait for the owner (K1–K5 in the open items). Five Spec Kit defaults are held to the stricter reading in the constitution's Governance section. Six places where the input spec or plan is looser than the constitution are carried to lab steps 2–5 (L1–L5, L7 in the open items). |
| 46 | Commit lab step 1, with Spec Kit's review comment removed from the constitution first | Done: commit `431cba3` on `speckit-rebuild`. Nothing pushed. |
| 47 | Apply the owner's decisions K1 and K2 to the constitution | Done: version 1.1.0. C2 names "add or remove a link" and "choose a reward", and says the learning sequence is the order of the campaign's regions. The carry-over check passes with those two changes declared. |
| 48 | Fetch the workshop lab guide at commit `b77da71` for the exact prompts of lab steps 2–7 | Done; hashes in `PROVENANCE.md` |
| 49 | Start the rebuild's part of `PROVENANCE.md` (K5) | Done |
| 50 | Lab step 2, `/speckit-specify`, with the lab's prompt plus one sentence naming K1, K3, L1 and L2 | Done. `specs/001-backbone-first-playable/spec.md`: five stories, AC1–AC23 kept and AC24–AC25 added for link removal (K1), both model tables and cases 1–12 carried (L2), the drop meter rule stated exactly with its three numbers (L1), green and red defined by hue bands (K3). No clarification markers. Spec Kit created no branch, so work stays on `speckit-rebuild`. |
| 51 | Independent check that the spec preserves the approved input | Pass: 246 pieces compared with `StarterKit/SPEC.md`. First run failed on three acceptance criteria whose rewording had dropped words (AC14, AC15, AC22); their wording was restored and the check passes. Five table cells differ on purpose and are declared in the check. |
| 52 | Lab step 3, `/speckit-clarify`. The owner was away, so the agent answered its own five questions from the approved decisions and marked each answer as its own. | Done. Recorded in the spec's Clarifications section: the inspector also shows a selected router's table (new AC26, from LO1's evidence line); router IDs follow the order of appearance and are shown in the inspector; a link serves before it accepts arrivals in a step (the only order that gives case 9 its hand-worked 40, 8 and 12); verification covers Chromium only; v1 reward offers are the same two choices every time (K6). Checklist still 16 of 16. Preservation check passes with two more declared cells. |
| 53 | Lab step 4, `/speckit-plan`, with the lab's prompt | Done. `plan.md`, `research.md`, `data-model.md`, `contracts/` (simulation, content, controls) and `quickstart.md` in the feature folder. Constitution Check passes with no violation. Ten contradictions between the input plan, the spec, the constitution and this machine are resolved in a table (P1–P10), among them tuning constants moved to a data file (L4) and a purity test that also covers globals (L3). Toolchain checked: Node 26.3.1, npm 11.16.0, Docker running, ffmpeg and cwebp present; package versions read from the npm registry. |
| 54 | Lab step 5, `/speckit-tasks`, with the lab's prompt | Done. `specs/001-backbone-first-playable/tasks.md`: 69 tasks in nine phases. Setup (6), the simulation with no graphics (21, tests written first), five story phases (27), the four effects (4), packaging and evidence (11). Tests are required tasks, not optional ones. A script confirmed the numbering, the format, a path in every task and that every acceptance criterion AC1–AC26 is named by a task. |
| 55 | Lab step 6, `/speckit-analyze`, first pass | 15 findings: 1 critical (the color rule let a share of green or red above zero stand as a known limit without going to the owner), 2 high (the text review left out the README; the no-WebGL check was scheduled before the WebGL renderer existed), 6 medium, 5 low, 1 open decision (K6). Listed in `docs/verification/analysis.md`. |
| 56 | Fix the findings in the spec, plan and tasks, then rerun the analysis | Done. Second pass: every requirement (40), success criterion (13), acceptance criterion (26), rule (14) and principle (7) is named by a task; 70 tasks; no critical or high finding left. The owner did not review the fixes; each is listed in the analysis file. |
| 57 | Lab step 7, `/speckit-implement`, Phase 1: pinned build tools installed, `npm audit` | Done. 45 packages, 0 vulnerabilities (SEC-26, SEC-27). Chromium for Playwright downloaded. |
| 58 | Phase 2, routing: fixtures typed from the spec, failing tests, then `spf.ts` and `forwarding.ts` | 15 then 25 tests pass. Mutation check: with the equal-cost branch disabled 5 tests fail, as they should. |
| 59 | Phase 2, the run: `linkq.ts`, content data and loader, map data from Natural Earth, `world.ts`, `replay.ts`, `bot.ts` | 84 unit tests pass. Nine deliberate mutations of the rules were each caught. Tuning needed no change: median scripted run 6:53 on eight seeds. Recorded in `docs/verification/results.md`. |
| 60 | Hand trace of one packet from the region file (C6 evidence) | Done: `docs/verification/hand-trace.md`. The engine agrees with every number, including the 28 steps the packet takes. |
| 61 | Phase 3, User Story 1: camera, shared view model, fallback renderer, label layer, HUD, input, link options, reward choice, screens, wiring | Done. 104 unit tests pass (**corrected**: this row first said 109, a miscount by the agent). End-to-end: 12 of 12 pass (AC1, AC2, AC4, AC5, AC24, AC25 at 1920×1080 by mouse and at 844×390 by touch). Two real problems were found on the way; see gotchas. |
| 62 | Phases 4 to 7, User Stories 2 to 5: load states and second cues, spark and ripple, game over and time-lapse, pause with pending changes, inspector with router tables, touch gestures, keyboard play, reduced motion, layouts, seeds, best scores, About the model | Done. 105 unit tests pass. End-to-end 48 pass, 4 skipped by design (touch only at phone size; mouse, keyboard and resize only at desktop size). Table in `docs/verification/results.md`. |
| 63 | Color census of screenshots in the fallback renderer (FR-032b) | 0 green-band and 0 red-band pixels at five moments, at both sizes. The first measurement was 25 green and 13 red of 144,085 on desktop; the causes were found and removed. |
| 64 | Phase 8: WebGL2 renderer drawing the same scene as the fallback, with bloom; automatic fallback when WebGL is missing or lost mid-run; hero art from a frame of the game | Done. Both renderers report the same scene for the same step (AC20). Color census: 0 green-band and 0 red-band pixels in both renderers, at both sizes, at five moments. `public/hero.webp` is 1600×900, 52 KB, seed `autocon` at step 6,601. |
| 65 | Compare with the approved mock; measure frame time | The look was strengthened toward the mock (more tilt, thicker and brighter links, larger site labels, stronger bloom). It is still plainer than the mock, and site rings are white, not cyan. Frame time in headless Chromium, where WebGL runs in software (SwiftShader): 36 frames a second at 1920×1080 with WebGL; 60 with the fallback and at phone size; main-thread work under 1 ms a frame. The phone measurement was **not run**. |
| 66 | FRR comparison in Docker (`tools/frr_check.py`), one attempt | Pass. FRR 10.7.1, native arm64. 12 of 12 and 14 of 14 neighbor entries Full and router IDs verified before comparing. 21 of 21 compared routes match on cost and next hops: cases 1 to 5, 7 and 8, including after cost changes and link shutdowns. Case 6's tie-break is the game's own rule (S7) and is not compared. Containers and networks removed. Result in `docs/verification/frr-check.json`. |
| 67 | Review of all shipped explanatory text against the spec and RFC 2328 (C1 evidence) | Done: `docs/verification/text-review.md`. RFC 2328 and RFC 2991 downloaded again; their hashes equal the ones recorded for the hand-built v1; the cited sections of RFC 2328 were read in this session. Every faithful note agrees. One reviewer, the agent that wrote the text. |
| 68 | Security checks for the secure-build checklist | No markup sink (`innerHTML` and the like) in `src/`; no reference to another host in the build; no floating version; `npm audit` 0 vulnerabilities; gitleaks over the working tree: no leaks found. Checklist rewritten for the rebuilt code. |

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
| Spec Kit's templates are looser than the constitution: tests are optional by default, and a plan may justify a constitution violation in its Complexity Tracking table | They are general-purpose defaults | The constitution's Governance section says the Evidence checks are required work and that a Complexity Tracking entry waives nothing |
| The review comment Spec Kit puts at the top of the constitution is meant to be deleted before the file is committed, which would hide the flagged conflicts | Spec Kit treats that comment as scratch | The flags are copied into this log's open items |
| The constitution command says to write only the constitution file, while the owner's rules say to log every step | The command guards against starting feature work early | This log and the runbook were updated; `PROVENANCE.md` was left alone and flagged as K5 |
| First visible showcase run crashed after the owner pressed Enter | The agent told the owner to click in the window first; the click reached a game control, the game left the welcome screen, and the recorder waited for a button that was gone | A click shield covers the page while it waits; a missing button is no longer fatal. Checked by an automated click on Start. |
| Rewriting acceptance criteria into Spec Kit's Given/When/Then form quietly dropped words from three of them | The form invites rephrasing | A script compares each criterion's words with the input; the three were restored to the input's wording |
| The case 9 test failed although the spec's numbers were right | An extra assertion of the agent's own said the queue first reaches 8 at exactly 4 s; it first touches 8 at 3.7 s | The assertion was corrected to what the spec says. No expected value from the spec was changed. |
| Two expected values in the routing fixture were not from the spec | The agent typed two routes for case 8 and one next hop for case 5 that the spec does not state | Removed. Case 8 compares "all other routes unchanged" with the uncut topology instead. |
| The first end-to-end run failed all 12 tests: the page had no test hook | Port 8765 was already serving the hand-built v1 from the main checkout (a server left running since Mon Nov 9, 7:51 PM), and Playwright was set to reuse a running server. The tests were running against the wrong game. | The tests now start their own server on port 8791 and refuse to reuse one. The old server was left alone: it is the owner's. |
| On a phone, tapping a link also pressed a button in the options panel that opened under the finger (an unwanted upgrade) | After a touch the browser sends a click at the same spot; the panel had opened by then, so the click landed on it | The panel now opens on that click, not before it. Found by the phone end-to-end test for AC24. |
| The first color census was not zero: a few dozen pixels in the green and red bands at a congested moment | Cyan site rings, rails and busy links blended with amber links at their edges (green band); stale magenta sparks from the test's fast-forward lay over an amber link (red band) | Nothing cyan touches a link now, cut links have no halo, the ripple is white, and effects end with simulated time. Site rings are white, a deviation from the mock's cyan. |
| Dragging the map made the point under the pointer slide away | The pan used the scale at the centre of the tilted map | A drag now pins the grabbed map point under the pointer |
| An end-to-end test hung for three minutes | Its loop waited for a reward on a run that had already ended because the test left a site unlinked | Every waiting loop in the tests is bounded, and that test links all three sites |
| An end-to-end check passed alone but timed out one run in three inside the suite | The test read "reward pending" and then clicked a reward button the game had already dismissed; the click waited for a button that never came back | The reward button is pressed only while its dialog is on screen, and every click now fails after 15 seconds with its reason |
| Two end-to-end checks compared the screen with numbers read a moment earlier and sometimes failed | The game kept running between the two reads | Those checks stop the clock first |
| The first hero frame was half covered by the inspector | The capture paused the game, and pausing opens the inspector at desktop width | The capture no longer pauses |

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
| Conflicts K1–K5 between the constitution and the approved spec or the state of the repository | Agent | Owner, 2026-11-10: take the agent's recommendations. K1: amend C2 to name link removal and reward choice, and give removal an acceptance criterion. K2: the learning sequence is the campaign's order. K3: hue bands in the spec, no authored color inside them, the rendered-frame figure reported as a number. K4: the owner re-confirms consent after playing the rebuilt game; the agent leaves the field alone. K5: a rebuild part in `PROVENANCE.md`. |
| If I give permission to finish the project overnight, can you, or will I need to approve things during the night? | Owner | Agent: the six remaining lab steps and the build can run unattended only if the session does not stop for permission prompts, which the agent cannot see. Waiting for the owner in any case: `consent_to_publish`, the merge to `main`, and the checks that need a person. Needed before starting: the go-ahead, whether the agent may commit and push on this branch, and answers or defaults for K1–K5. Permission not yet given; step 2 not started. Owner, 2026-11-10: "go, commit as you go, take your recommendations". |
| Clarify 1: does the pause inspector show the lowest-cost path, as LO1's evidence assumes, or only the links? | Agent (clarify step) | Agent, for the owner's review: both. Selecting a site lists that router's table in force, without pending changes. New AC26. |
| Clarify 2: how does a site get its router ID, and where can the player see it? | Agent (clarify step) | Agent, for the owner's review: in order of appearance, from 1, shown beside the site code in the pause inspector. No approved decision covered it. |
| Clarify 3: in one simulation step, does a link serve before or after it accepts arrivals? | Agent (clarify step) | Agent, for the owner's review: it serves first. Worked by hand, only that order gives case 9 exactly 40 served, 8 queued, 12 dropped; the other order gives 40, 7 and 13. |
| Clarify 4: in which browsers must v1 be verified? | Agent (clarify step) | Agent, for the owner's review: Chromium only, as in the hand-built v1; other browsers are listed as not verified. |
| Clarify 5: does a v1 reward offer vary with the seed? | Agent (clarify step) | Agent, for the owner's review: no, every offer is the same two choices. See K6. |
| What contrast and text size make "high contrast and large type" checkable? (analysis finding B1) | Agent (analysis step) | Agent, for the owner's review: text contrast at least 4.5 to 1; no text under 16 CSS pixels at 1920×1080 or 11 at 844×390, following the approved mock's base unit. |

## Open items

- Site rings are ice white, not the cyan of the approved mock, because cyan beside an amber link blends into the green band. For the owner to see when reviewing the look.
- Port 8765 on this machine still serves the hand-built v1 from the main checkout (process started Mon Nov 9, 7:51 PM EST). The agent did not stop it. The owner can stop it when it is no longer wanted.
- **K6, owner decides.** The approved input spec says the seed decides the reward offers (R10, Q2, the Mode row). The approved plan's tuning table gives one offer, "+3,000 km of fiber or +1 upgrade", and v1 has only two rewards. The agent's clarification follows the plan: every v1 offer holds the same two choices. If the owner wants offers that differ by seed in v1, the spec and tasks need a rule for what varies.
- A full showcase run of the hand-built v1 was recorded to game over (seed `2328`, 8:56, 15,134 delivered, 197 inputs, none missed). The owner chose to keep the video private, so it is not in this repository. An earlier entry saying no finished video exists is **corrected** by this one.
- Branch `showcase-video` on the remote held that video. The agent's attempt to delete the remote branch was blocked by its permission settings. **Resolved:** the owner deleted the remote branch on 2026-11-09.
- Spec Kit rebuild: lab step 1 (constitution) is done. Steps 2 to 7 run without a review between them, by the owner's go-ahead of 2026-11-10; the owner reviews the whole rebuild afterwards.
- **K1, owner decides.** C2 names four player actions: add a link, change a cost, upgrade capacity, and later equal-cost sharing. The approved input spec also allows removing a link (Q5, two amendments, `removeLink` in the plan) and choosing a reward (R10, AC17). Link removal is missing from the spec's v1 Tools row and has no acceptance criterion. Amend C2 to name them, or cut link removal from v1. **Resolved** 2026-11-10: the owner chose to amend C2 (constitution 1.1.0); the spec gives removal an acceptance criterion.
- **K2, owner decides.** C2's learning sequence puts equal-cost sharing before surviving failures. v1 ships fiber cuts and defers sharing to v1.2, and endless mode has every tool from the start. The order exists only in the v1.3 campaign, and no Evidence line tests it. **Resolved** 2026-11-10: the owner chose to state that the sequence is the campaign's order (constitution 1.1.0).
- **K3, owner decides.** C4 says "No green and no red anywhere" but green and red are not defined. The hand-built v1 defined hue bands only in test code (green 75–165°, red under 25° or over 340°, skipping greys and near-blacks) and passed rendered frames at "under 1% of strongly colored pixels". A tolerance is not in the principle. **Resolved** 2026-11-10: the owner chose hue bands in the spec, no authored color inside them, and the rendered-frame figure reported as a number.
- **K4, owner decides.** C7 says the owner sets `consent_to_publish`, never the agent. `ARCADE.md` holds `true`, typed by the agent on the owner's instruction (PID amendment 1.2). That consent followed play of the hand-built v1. Whether it covers the rebuilt game is the owner's call; the agent does not touch the field. **Decided** 2026-11-10: the owner re-confirms after playing the rebuilt game. Still waiting on that.
- **K5, owner decides.** C7 says `PROVENANCE.md` is kept from the first session. On this branch it stops at 2026-11-10T01:06Z: nothing on the showcase session, the rebuild decision, `specify init` or lab step 1, and it still says Spec Kit is "installed, not used". How the rebuild's provenance is laid out (a new part of the same file, or a new file) is the owner's call. **Resolved** 2026-11-10: the owner chose a new part of the same file; it was started the same day.
- **L1, lab steps 2–3.** C3 says the drop meter's rules are stated exactly in the spec. The input spec's R7 says "drains slowly"; the exact numbers exist only in the plan's tuning table. **Resolved** 2026-11-10: the spec's FR-010 states the rule and its three numbers.
- **L2, lab step 2.** C1 needs the two model tables, an RFC section for every faithful claim and the hand-worked cases in the spec. Spec Kit's spec template has no slot for them. **Resolved** 2026-11-10: the spec carries them in added sections.
- **L3, lab step 4.** C5's evidence covers the DOM, renderer, clock and `Math.random`. The input plan's purity check covers imports from DOM, render and ui only. **Resolved** 2026-11-10: the Spec Kit plan's purity test also scans for the clock, `Math.random` and other globals (plan P2).
- **L4, lab step 4.** C6 says tuning constants live in data files. The input plan's as-built note puts them in `src/sim/world.ts`, and tag `v1-handbuilt` confirms it (`DEFAULT_TUNING`). **Resolved** 2026-11-10: the Spec Kit plan puts every tunable in `src/content/tuning.json` and the simulation has no built-in values (plan P1).
- **L5, lab step 5.** C7 says routing correctness and the core loop are fixed before any visual effect. Spec Kit's tasks template groups tasks by user story, and the first story includes the pulses. **Resolved** 2026-11-10: the simulation with all twelve cases is the Foundational phase that blocks every story, and the four effects are a phase of their own after the stories.
- **L7, lab step 7.** C7's evidence needs seeded-run videos at phone and desktop sizes saved in the repo. They were removed in the clean slate and must be recorded again. The owner's choice to keep the showcase video private is read as covering that video only.
- Four phrases in the constitution are kept as the owner wrote them though they cannot be tested as worded: the C2 learning sequence, "Built in a few days", "reviewed and tested like any other contribution" and "a README another engineer can follow". The C2 evidence needs a person as tester and stays "not run" until someone does it.
- On the rebuild branch `README.md`, `ARCADE.md`, `docs/spec-map.*` and the secure-build checklist still describe the hand-built v1. They are rewritten after step 7.

- These records and the showcase tooling are on branch `worktree-showcase-run`, not on `main`. The owner merges.
- No showcase run has been recorded to game over.
- Frame rate on a real mid-range phone has not been measured.
- The owner played it by hand on 2026-11-09 ("seems to be pretty good"). How long the run lasted was not recorded, so run length for people is still unknown.
- In FRR attempt 2, two routers reported unexpected router IDs while being probed. The cause was not found. Later runs verify router IDs before comparing.
- The session start time and wall time are not recorded.
