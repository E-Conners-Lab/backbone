# Recorded results

What was checked, how, and what happened. A failed or unrun check stays here. A ticked task in `tasks.md` is not evidence; these rows are. Times are UTC. Environment: macOS (Darwin 25.6.0, arm64), Node 26.3.1, the pinned tools in `package.json`.

## Phase 2 checkpoint: the simulation, no graphics (2026-11-10T15:57Z)

Command: `npm test` (Vitest 5.1.0). **84 tests in 12 files, all pass.**

| Check | Result | Evidence |
| --- | --- | --- |
| Cases 1–6 and 8, routing (SC-001) | Pass | `tests/unit/spf.test.ts`, expected values from `tests/fixtures/ospf-cases.json`, typed from the spec |
| Case 7, the per-hop split (SC-001) | Pass | `tests/unit/forwarding.test.ts`: of 1,000 packets, A–T carries 500, C–T and D–T 250 each |
| Case 9, overload (SC-001) | Pass | `tests/unit/linkq.test.ts`: 60 offered = 40 served + 8 queued + 12 dropped, 2 drops in each of seconds 5 to 10 |
| Cases 10, 11, 12 (SC-001, SC-003) | Pass | `tests/unit/world.test.ts` |
| Oracle comparison (SC-002) | Pass | `tests/unit/oracle.test.ts`: 320 seeded random graphs, every pair; the graphs include ties and unreachable pairs |
| Hop-by-hop loop-freedom | Pass | `tests/unit/forwarding.test.ts`: every hop moves strictly closer, on 320 graphs, with one route kept and with all kept |
| Worked interaction on T1 (AC3, AC4) | Pass | `tests/unit/world.test.ts`: A→C rides A–B–C only; after A–C = 19, new A→C and A→E packets ride A–C |
| Drop meter rule (FR-010) | Pass | `tests/unit/world.test.ts`: size 100, 3 s delay, 1 per second, restart on a drop, run ends at the step it fills |
| Link removal (AC24, AC25) in the simulation | Pass | `tests/unit/world.test.ts` |
| Traffic independent of the network (FR-006) | Pass | Two worlds, same seed, different networks: same packets created and same generator state at every step |
| Determinism and replay (SC-003, C3) | Pass | Hash equal at every step across two plays and across a replay from the command log, on three seeds |
| Purity of `src/sim` (C5) | Pass | `tests/unit/purity.test.ts`: no import from outside, none of 12 forbidden globals |
| Content and trial region (C6) | Pass | `tests/unit/content.test.ts`: the unchanged simulation runs on `tests/fixtures/region-trial.json` |
| Hand trace (C6) | Pass | `docs/verification/hand-trace.md`, checked by `tests/unit/handtrace.test.ts` |
| Authored colors and text contrast (FR-032a, FR-037) | Pass | `tests/unit/palette.test.ts` |
| Briefing, F1–F8, S1–S11, meter numbers, default cost match the spec | Pass | `tests/unit/content.test.ts` reads `spec.md` |
| Dependency audit (SEC-26) | Pass | `npm audit`: 0 vulnerabilities, 45 packages |

### Tests written before the code

| Code | First run of its tests | After the code |
| --- | --- | --- |
| `src/sim/spf.ts` | Failed: module missing | 15 of 15 pass |
| `src/sim/forwarding.ts`, `src/sim/linkq.ts` | Failed: modules missing | 23 of 25 pass; the 2 failures were wrong assertions in the tests (below) |
| `src/sim/world.ts` | Failed: module missing | 60 of 60 pass on the first run |

### Mutation checks (do the tests bite?)

| Change made to the code, then undone | Tests that failed |
| --- | --- |
| Equal-cost branch of `spf.ts` disabled | 5 of 15 |
| Arrivals before service in `step` | 1 |
| Drop meter drains one step late | 1 |
| Removal does not return fiber | 2 |
| Cost 65536 allowed | 1 |
| Emission only when a route exists | 2 |
| A cut keeps the packets on the link | 1 |
| Routes not recomputed after a cost change | 2 |
| A cut link can be removed | 1 |
| The run does not end at a full meter | 1 |

### Things that went wrong and what was done

- **Two of my own test assertions were wrong, not the code.** In the case 9 test I had added "the queue first reaches 8 at exactly 4 s"; it first touches 8 at 3.7 s and is full at the end of every half second from 4 s on. The spec's numbers (40, 8, 12) passed unchanged. The assertion now checks what the spec says: 8 queued at 4 s, no drop in the first 4 seconds, 2 drops in each second after. The utilization test had an arithmetic slip (3 of 8 served is 0.375, not 0.4 to 0.5). No expected value from the spec was changed.
- **Two expected values removed from the fixture.** I had typed two routes for case 8 and a next hop for case 5 that the spec does not state. They were removed; case 8 now compares "all other routes unchanged" against the uncut topology.
- **Order check.** Arrivals before service gives 40 served, 7 queued, 13 dropped. Service first gives the spec's 40, 8, 12.

### Tuning

No value changed. See `docs/verification/tuning.md`: median scripted run 6:53 on eight seeds, queue drops the largest cause in 8 of 8.

## Stories 1 to 5 in the fallback renderer (2026-11-10T16:33Z)

Commands: `npm test` (105 unit tests, all pass) and `npm run test:e2e` (Playwright 1.65.0, Chromium headless, against `dist/` served as plain files on port 8791). **End-to-end: 48 pass, 4 skipped by design, 0 fail.** The four skips are touch checked only at phone size, and mouse, keyboard-only and resize checked only at desktop size. The WebGL renderer does not exist yet at this point; every check here ran in the Canvas 2D renderer.

| Check | Desktop 1920×1080 | Phone 844×390 | Test |
| --- | --- | --- | --- |
| AC1 briefing, then the map with the first sites | Pass | Pass | `us1-shape` |
| AC2 drag lays a link, fiber spent, traffic flows | Pass (mouse) | Pass (touch) | `us1-shape` |
| AC4 a cost change moves the pulses, through the UI | Pass | Pass | `us1-shape` |
| AC5 three refusals, nothing spent, a message each | Pass | Pass | `us1-shape` |
| AC24 removal returns fiber in full; its packets are drops | Pass | Pass | `us1-shape` |
| AC25 a cut link cannot be removed | Pass | Pass | `us1-shape` |
| AC6 congestion: icon, and utilization as a number in the inspector | Pass | Pass | `us2-operate` |
| AC7 the meter rises by exactly the drops, step by step to game over | Pass | Pass | `us2-operate` |
| AC8 upgrade: one tier up, cost unchanged | Pass | Pass | `us2-operate` |
| AC9 cut: icon, spark and ripple drawn, routes changed, nothing on the link | Pass | Pass | `us2-operate` |
| AC10 dark site and its no-route drops | Pass | Pass | `us2-operate` |
| AC11 game over: score, time, seed, time-lapse replaying to the same score | Pass | Pass | `us2-operate` |
| AC12 Space and the pause control | Pass | Pass (button) | `us3-pause` |
| AC13 every link readable on the map and in the table while paused | Pass | Pass | `us3-pause` |
| AC14 three changes pending, applied together in one step | Pass | Pass | `us3-pause` |
| AC26 a router's table in force, without pending changes | Pass | Pass | `us3-pause` |
| C3 a full run with every decision made while the clock is stopped | Pass | Pass | `us3-pause` |
| AC15 touch: drag, tap, pinch, two-finger pan | Not run here | Pass | `us4-access` |
| AC16 mouse, wheel, Space, number keys | Pass | Not run here | `us4-access` |
| AC17 keyboard only, focus visible throughout | Pass | Not run here | `us4-access` |
| AC19 reduced motion: no sweep, no trails; every item still drawn | Pass | Pass | `us4-access` |
| AC18 census of screenshots (below) | Pass | Pass | `us4-access` |
| FR-029 every control named; FR-037 smallest text | Pass (16.7 px) | Pass (11 px) | `us4-access` |
| Resize and rotation during a run | Pass | Not run here | `us4-access` |
| AC21 typed, random and refused seeds | Pass | Pass | `us5-endless` |
| AC22 same seed and inputs, same score, twice; replay lands on the same score | Pass | Pass | `us5-endless` |
| AC23 best scores stored, shown, kept after reload; damaged entries dropped | Pass | Pass | `us5-endless` |
| Storage refused: the game plays and says scores are not kept | Pass | Pass | `us5-endless` |
| FR-028 About the model, from the welcome screen and during a run | Pass | Pass | `us5-endless` |

AC3 is checked on topology T1 in the simulation (`tests/unit/world.test.ts`). AC20 needs the WebGL renderer and is checked in Phase 8.

### Color census, fallback renderer (FR-032b)

Full-page screenshots decoded in Node by `tests/e2e/census.ts`. Share of strongly colored pixels in each band:

| Moment | Desktop green | Desktop red | Phone green | Phone red |
| --- | --- | --- | --- | --- |
| Early run | 0 of 79,969 | 0 | 0 of 32,576 | 0 |
| Fiber cut (spark and ripple on screen) | 0 of 96,193 | 0 | 0 of 37,372 | 0 |
| Congested | 0 of 142,833 | 0 | 0 of 47,154 | 0 |
| Paused with the inspector | 0 of 168,525 | 0 | 0 of 48,363 | 0 |
| Game over | 0 of 106,159 | 0 | 0 of 28,164 | 0 |

The first measurement was not zero: at the congested moment 25 green-band and 13 red-band pixels of 144,085 on desktop (0.017% and 0.009%), and 12 and 8 on the phone. Causes, found by listing the pixels: cyan (site rings, capacity rails, the brightened color of busy links) blending with an amber link at their edges lands in the green band; and old magenta sparks left on screen by the test's fast-forward lay over an amber link. Fixes: nothing cyan touches a link any more (site rings and rails are ice white, a loaded link brightens toward white), cut links have no halo, the ripple is white, and effects end with simulated time as well as real time. The census decoder is itself checked: a pure green page reads 100% green, a pure red page 100% red, and the palette's own colors read 0.

### Problems found by these checks and fixed

- **Wrong game under test.** The first end-to-end run failed all 12 tests because port 8765 was already serving the hand-built v1 from the main checkout and Playwright reused that server. The tests now use port 8791 and refuse to reuse a server.
- **Touch ghost click.** On the phone, tapping a link pressed "Upgrade" in the panel that opened under the finger. The panel now opens on the browser's click, not before it.
- **Panning on the tilted map.** A drag moved the map by a centre-scaled amount, so the point under the pointer slid away. A drag now pins the grabbed map point under the pointer; a unit test checks it.
- **A warning icon hidden behind a site label.** Icons are now drawn last and off the line.
- **Test mistakes, not game faults:** reading the screen one frame early (3 places), counting live regions as controls, expecting on-screen distances to stay fixed during a pan on a tilted map, and two loops that waited for a reward on a run that had already ended (one hung for 3 minutes). No expected value from the spec was changed.

### Deviation from the approved mock

Site rings are ice white, not the mock's cyan, because cyan next to an amber link blends into the green band (C4). Cyan remains for focus outlines on page controls and the scanning sweep.

## Phase 8: the WebGL renderer and the four effects (2026-11-10T17:16Z)

Commands: `npm test` (**107 unit tests in 15 files, all pass**) and `npm run test:e2e` (**64 pass, 4 skipped by design, 0 fail**, on two consecutive full runs). Skipped by design: touch checked only at phone size; mouse, keyboard-only and resize checked only at desktop size.

| Check | Desktop 1920×1080 | Phone 844×390 | Test |
| --- | --- | --- | --- |
| The WebGL2 renderer is used when the browser has it | Pass | Pass | `renderers` |
| AC20 with WebGL unavailable the game falls back by itself and plays to game over | Pass | Pass | `renderers` |
| AC20 both renderers show the same information: same links, states, costs, tiers, sites and pulses at the same step, and each reports drawing all of it | Pass | Pass | `renderers` |
| FR-035 a WebGL context lost in the middle of a run is survived in the fallback | Pass | Pass | `renderers` |
| FR-036 pulses with trails; links thicker and brighter with load; cut spark and ripple; bloom | Pass by test for trails, load scaling and the two cut effects; bloom judged by eye in screenshots | Same | `viewmodel` unit tests, `us2-operate`, `us4-access` |
| FR-038, SC-009 hero and card image | Pass | n/a | `tools/make-card.mjs`: 1600×900 (16:9), 51,902 bytes, a frame of seed `autocon` at step 6,601 in the WebGL renderer |
| SC-006 a whole run with the network cut; no request to another host; no reference to another host in the build | Pass | Pass | `offline` |
| All checks of stories 1 to 5 again, now with WebGL as the default renderer | Pass | Pass | `us1` to `us5` |

### Color census in both renderers (FR-032b)

Pixels in the green band and in the red band, of the strongly colored pixels in a full-page screenshot.

| Moment | Desktop WebGL | Desktop fallback | Phone WebGL | Phone fallback |
| --- | --- | --- | --- | --- |
| Early run | 0 and 0 of 104,196 | 0 and 0 of 88,555 | 0 and 0 of 38,141 | 0 and 0 of 34,153 |
| Fiber cut (spark and ripple on screen) | 0 and 0 of 188,640 | 0 and 0 of 108,021 | 0 and 0 of 49,328 | 0 and 0 of 39,544 |
| Congested | 0 and 0 of 228,954 | 0 and 0 of 151,593 | 0 and 0 of 55,957 | 0 and 0 of 50,890 |
| Paused with the inspector | 0 and 0 of 225,084 | 0 and 0 of 180,843 | 0 and 0 of 56,971 | 0 and 0 of 52,137 |
| Game over | 0 and 0 of 177,815 | 0 and 0 of 114,295 | 0 and 0 of 33,112 | 0 and 0 of 29,345 |

Zero is the result of these five moments on one seed, not a proof for every frame. The bloom's light is pulled most of the way toward white before it is blurred, so that it lightens a line of another color without shifting its hue.

### Frame time (recorded, not a pass or a fail)

Read from the page over 240 frames at a congested moment (44 to 46 pulses, 19 links), in headless Chromium on the build machine. The browser's WebGL there runs in software: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device…))`.

| Renderer and size | Main-thread work per frame | Frame to frame |
| --- | --- | --- |
| WebGL, 1920×1080 | 0.32 ms mean, 9.6 ms worst | 27.4 ms mean: 36 frames a second |
| Fallback, 1920×1080 | 0.34 ms mean, 0.5 ms worst | 16.7 ms mean: 60 frames a second |
| WebGL, 844×390 | 0.23 ms mean, 0.4 ms worst | 16.7 ms mean: 60 frames a second |
| Fallback, 844×390 | 0.32 ms mean, 0.5 ms worst | 16.7 ms mean: 60 frames a second |

The spec's target is 60 frames a second on a mid-range phone (SC-012). **That was not run.** The 36 frames a second above is software rendering of a full-size screen and says little about a real graphics chip either way.

### Compared with the approved mock

Same language: a dark tilted map, blue links that brighten with load, amber striped congestion with a warning icon, a magenta broken link with a cut icon, a NEW tag, white pulses. After a first comparison the tilt, link width, site labels and bloom were strengthened. Still different from the mock: site rings are white, not cyan (cyan beside amber blends into the green band); the HUD is a top bar and a bottom bar, not floating panels; there is no reward countdown and no cut countdown on the map (the inspector shows a cut's repair time); the glow is weaker; there is no sound control, since v1 has no sound.

## Routing against a real OSPF implementation (2026-11-10T17:16Z)

`python3 tools/frr_check.py`, one attempt. FRR 10.7.1 (`quay.io/frrouting/frr:10.7.1`, native arm64) in Docker, one network per link, point-to-point interfaces, hello 1 s and dead 4 s. **Pass: 21 of 21 compared routes match on cost and next hops.** Before any comparison the script required every adjacency to be Full (12 of 12 neighbor entries on T1, 14 of 14 on T2) and every router ID to be the configured one. Full output: `docs/verification/frr-check.json`.

| Case | Compared with FRR | Result |
| --- | --- | --- |
| 1, 2 | A→C cost 20 via {B, D}; A→E cost 25 via {B, D} | Match |
| 3 | A–C set to 20: A→C via {B, C, D} | Match |
| 4 | A–C set to 19: A→C cost 19 via C; A→E cost 24 via C | Match |
| 5 | B–C shut down: A→C 20 via D; B→C 30 via A; B→E 35 | Match |
| 7 | T2: S→T cost 3 via {A, B}; B→T via {C, D}; A, C, D→T direct | Match |
| 8 | C–E shut down: no route between E and any other router | Match |
| 6 | The tie-break with one route kept | Not compared: it is the game's own rule (S7); RFC 2328 does not define it |

This is a control-plane check: it reads FRR's routing table. It sends no traffic, so the per-packet split of S4 is not something FRR is asked about.

## Every acceptance criterion and success criterion (SC-004)

Each row names the automated check that produced the result. "Pass" means the check passed on the final run recorded at the end of this file.

| Criterion | Result | Produced by |
| --- | --- | --- |
| AC1 briefing, then the map with the first sites | Pass | `tests/e2e/us1-shape.spec.ts`, both sizes |
| AC2 drag lays a link, fiber is spent, traffic flows | Pass | `us1-shape`, mouse and touch |
| AC3 on T1, A→C uses A–B–C and A–D–C only, never A–C | Pass | `tests/unit/world.test.ts`: one route kept (A–B–C only) and all tied routes kept (both, half each) |
| AC4 with A–C at 19 every A→C pulse uses A–C | Pass | `tests/unit/world.test.ts` on T1; and through the UI on the game's map in `us1-shape` |
| AC5 too little fiber, a self-link, a duplicate: nothing spent, a message | Pass | `us1-shape`; `tests/unit/world.test.ts` |
| AC6 congested link: amber, thicker, pattern, icon; utilization as a number | Pass | `us2-operate` (icon drawn, inspector row); thickness in `tests/unit/viewmodel.test.ts`; amber and pattern seen in screenshots |
| AC7 the meter rises by exactly the drops | Pass | `us2-operate`, step by step from the first cut to game over; `tests/unit/world.test.ts` |
| AC8 upgrade: one tier up, cost unchanged | Pass | `us2-operate`; `tests/unit/world.test.ts` |
| AC9 cut: magenta snapped state with icon, ripple, new paths from the next step | Pass | `us2-operate` (look, icon, spark and ripple drawn, routes changed, link empty); `tests/unit/world.test.ts` |
| AC10 a site with no path is dark, with an icon; its traffic is no-route drops | Pass | `us2-operate`; `tests/unit/world.test.ts` (case 8) |
| AC11 full meter: run ends; delivered, time, time-lapse | Pass | `us2-operate` |
| AC12 Space or the pause control, at any time | Pass | `tests/e2e/us3-pause.spec.ts` |
| AC13 paused: every link readable on the map and in the table | Pass | `us3-pause` |
| AC14 pending changes shown, applied together on resume | Pass | `us3-pause`; `tests/unit/viewmodel.test.ts` |
| AC15 phone: drag, tap, pinch, two-finger pan | Pass | `tests/e2e/us4-access.spec.ts`, phone size, touch events |
| AC16 desktop: mouse, wheel, Space, number keys | Pass | `us4-access`, desktop size |
| AC17 keyboard only, visible focus throughout | Pass | `us4-access`, desktop size |
| AC18 no green, no red; second cues | Pass | `tests/unit/palette.test.ts`; census in `us4-access` and `renderers`: 0 pixels in either band |
| AC19 reduced motion: no sweeps, parallax or trails; information remains | Pass | `us4-access`; `tests/unit/viewmodel.test.ts` |
| AC20 without WebGL: a 2D renderer with the same information | Pass | `tests/e2e/renderers.spec.ts` |
| AC21 typed or random seed; the seed is shown | Pass | `tests/e2e/us5-endless.spec.ts` |
| AC22 same seed and inputs, same final score | Pass | `us5-endless`; `tests/unit/world.test.ts` (case 12); `tests/unit/replay.test.ts` |
| AC23 best scores stored on the device and shown | Pass | `us5-endless`; `tests/unit/scores.test.ts` |
| AC24 removing an up link: fiber back, upgrades forfeited, packets dropped | Pass | `us1-shape`; `tests/unit/world.test.ts` |
| AC25 a cut link cannot be removed | Pass | `us1-shape`; `tests/unit/world.test.ts` |
| AC26 a router's table in force in the inspector | Pass | `us3-pause` |

| Success criterion | Result | Produced by |
| --- | --- | --- |
| SC-001 the twelve cases as tests with values from the spec | Pass | `npm test` |
| SC-002 brute-force oracle on at least 300 random networks | Pass | 320 graphs, `tests/unit/oracle.test.ts` |
| SC-003 identical state at every step, identical score | Pass | `tests/unit/world.test.ts`, `tests/unit/replay.test.ts`, `us5-endless` |
| SC-004 every AC has a recorded result | Pass | The table above |
| SC-005 a seeded run to game over at both sizes, with videos saved | Pass (the scripted player, not a person) | `tools/record-run.mjs`; "Videos" below |
| SC-006 plays with no network connection, served as plain files | Pass | `tests/e2e/offline.spec.ts` |
| SC-007 no authored color in the bands; rendered share as a number | Pass | 0 authored; 0 rendered pixels at five moments, both renderers, both sizes |
| SC-008 keyboard alone, touch at phone size, reduced motion, fallback renderer | Pass | `us4-access`, `renderers` |
| SC-009 card image 16:9 and under 1 MB | Pass | 1600×900, 51,902 bytes |
| SC-010 README another engineer can follow from a fresh copy | Pass for the README's commands, run by the build agent. Not followed by another engineer. | "Fresh copy" below |
| SC-011 a tester explains a bad cost change from the screen alone | **Not run** | Needs a person |
| SC-012 60 frames a second on a mid-range phone | **Not run** | Needs a person and a phone |
| SC-013 a person's run lasts 5 to 10 minutes | **Not run** | Needs a person. The scripted player's runs last 6:15 to 7:14. |

Not covered by any check: browsers other than Chromium, screen readers, a real phone, and a person playing at all.

## Code review (T068, 2026-11-10T17:27Z)

`/code-review` at level high over `src`, `tools` and `tests`, run by a forked reviewer: a second session of the same model that had not written the code, not a person. It returned ten findings. All ten were judged real and all ten were fixed. Two of the fixes were themselves faulted by the second review below, and corrected.

| # | Finding | Fix | Check that fails without the fix |
| --- | --- | --- | --- |
| 1 | `Camera.toScreen` had no guard where the tilted map meets the eye. Zoomed far in, a point far south got a negative or infinite scale: links drawn mirrored, and a negative radius that throws in the Canvas 2D renderer and stops the frame loop. | Points are held at 75% of the way to the eye, which is always far below the view; the same guard at the horizon for `toMap`. **Corrected** by the second review: holding the point bent any line that crossed the limit. Lines are now cut at the limit (finding 4 below). | `tests/unit/camera.test.ts` (confirmed by taking the fix out) |
| 2 | While a reward waited, the map stayed usable. Changes were announced as done but only applied with the choice; two links could both be accepted against one budget; three presses of "+" moved a cost by one. | Time standing still is one state for commands, by pause or by reward: changes are checked against the projected world, shown as pending, and applied in the step that starts time again, before the choice. The dialog says so and no longer claims to be modal. | `tests/unit/game.test.ts` (confirmed); `tests/e2e/us2-operate.spec.ts` FR-016 at both sizes |
| 3 | A command sent in the instant before a pause was not in the pending projection, so link IDs given while paused could differ from those given on resume, and a pending cost could land on the wrong link. | On pause, commands not yet applied join the pending changes. | `tests/unit/game.test.ts` (confirmed) |
| 4 | `tools/frr_check.py` exited 1, which means "a case differs", for failures that are no verdict: Docker missing, output that is not JSON, a missing field. | Each becomes "no valid verdict" and exit 2; anything unexpected at the top level does too. | Run with Docker off the PATH: prints no valid verdict, exits 2 |
| 5 | The same tool waited only for the expected cost before reading next hops. Where a change keeps the cost and moves the next hops (case 3), it could read before FRR had recomputed and fail a correct model. | It waits for everything it then compares. | Rerun: pass, 21 of 21, output identical to the first run |
| 6 | The link panel overwrote the place focus should return to when a tool key re-aimed the open panel, so closing it dropped focus to the page. | The place is recorded only when the panel opens. **Corrected** by the second review: that was too broad (finding 1 below). | `tests/e2e/us4-access.spec.ts` AC17 (confirmed) |
| 7 | The camera measured the HUD's height before the HUD was filled, so on a narrow view the framing could still put a site under it. | The HUD is filled first. | `us4-access` FR-030: all sites between the bars at both sizes |
| 8 | The link-length rule existed in four places, and the scripted player had its own copy of `findLink`. | One exported `linkLength`; the copies are gone. | Existing tests |
| 9 | The full-queue colour cue assumed a queue of 8, and the video tool assumed 20 steps a second. | Both read the tuning. | Existing tests; the video tool's printed time |
| 10 | Three capture tools started a file server on a random port and waited 700 ms. On a busy port the browser would load whatever was listening there, so the hero art or a video could show the wrong page. | `tools/serve-dist.mjs`: a free port from the system, wait for the answer, and the answer must equal this build's `dist/index.html`. | Used for the screenshots and the videos recorded after it |

What this review is not: a person's review, a security audit, or a review of the specification documents.

## Second code review, of the fixes (2026-11-10T18:07Z)

The owner's rule is to review after a significant change. `/code-review` at level high was run again, by a new forked reviewer on the same model, over the sixteen files the first round's fixes had touched. It returned ten more findings. Three were reproduced by the reviewer with a probe against the game's state. Nine are fixed; one is left and recorded.

| # | Finding | What was done | Check that fails without the fix |
| --- | --- | --- | --- |
| 1 | The first round's focus fix was too broad: with the link panel open, aiming it at another link from the map or another inspector row sent focus back to the first place. | Fixed. The return place is kept only when focus is inside the panel itself. | `tests/e2e/us4-access.spec.ts` AC17 (confirmed) |
| 2 | Between resume and the step that applies the pending changes (up to 50 ms), the changes were in neither the world nor the plan: a pending link's options closed, the HUD budget jumped back, the dashed link vanished for a few frames. This existed before the first round. | Fixed. Pending changes stay pending, and the planned world stays the one to read, until the step that applies them has run. | `tests/unit/game.test.ts`; `tests/e2e/us3-pause.spec.ts` "stay open across resume" at both sizes (both confirmed) |
| 3 | The same gap after a reward choice: a change made before the next frame was checked against a state without the changes just released, the fault the first round fixed for pause. | Fixed with 2: the reward choice is held with the other changes and applied by the same step. A second press of the reward button is refused at once. | `tests/unit/game.test.ts` (confirmed) |
| 4 | Holding a far-south point at the camera's limit, the first round's fix, bent every line that crossed the limit: zoomed in, a link running off the bottom of the view pointed up to 15 degrees wrong, with its pulses and its hit area. | Fixed. A link or a coastline ring that crosses the limit is cut at the limit in map coordinates, so the part in view is exact. Packets on such a link are placed from their map position. A far end's large scale no longer thickens the part in view. Links wholly in view are drawn exactly as before. | `tests/unit/viewmodel.test.ts`, four checks (each confirmed); `tests/unit/camera.test.ts` |
| 5 | Through the test hook only: a paused game stepped across a reward could never continue. | Fixed. Time does not move while paused, by the test hook either. One end-to-end helper that had stepped a paused game was rewritten to reach the step first and pause in the same call. | `tests/unit/game.test.ts` (confirmed) |
| 6 | The capture tools' readiness check had no timeout of its own. | Fixed: 2 s for each try, inside the 15 s deadline. | Read; not tested against a port that accepts and stays silent |
| 7 | A capture tool whose server failed to start left its temporary folder behind. | Fixed: the server starts first and everything after is inside the cleanup. | Both tools run with `python3` off the PATH: exit 1 with the reason, no folder left |
| 8 | `tools/frr_check.py` turned a fault in the tool itself into a one-line "no valid verdict" with no trace. | Fixed: still exit 2, with the traceback on stderr. | Rerun: pass, 21 of 21, output identical to the first two runs |
| 9 | The map is framed for the HUD's height as measured once. The height can change without a resize: when the typeface arrives after an automatic start, or when a value grows to "… after pending" on a narrow view. | Partly fixed: the map is framed again when a typeface finishes loading, unless the player has moved it. **Left:** the map is not re-framed when the HUD grows during play, because moving the map under the player's hand while they plan is worse than a taller bar. Not checked in a browser at a width where the HUD wraps. | None |
| 10 | The "N changes pending" wording was built in four places, and three comments still said pending changes exist only while paused. | Fixed: one helper in each of the two files, comments corrected. | Existing end-to-end tests read the exact sentences |

After this round: `npm test` 121 of 121; `npm run test:e2e` 74 pass, 4 skipped by design; `npm run verify:dist` passes at commit `7401e30`.

## Videos (T062, SC-005; recorded 2026-11-10T17:47Z and 17:49Z from the final build)

`npm run record` plays the scripted player on seed `stage-1` in the built game, with the WebGL renderer, from the start to game over and through the time-lapse, at 4 times real speed. The speed is a multiple of the same fixed step, so it is the same run.

| | 844×390 (touch device profile) | 1920×1080 |
| --- | --- | --- |
| File | `run-stage-1-844x390.mp4` | `run-stage-1-1920x1080.mp4` |
| Size, length | 1,952,961 bytes, 114 s, H.264 | 5,241,329 bytes, 115 s, H.264 |
| SHA-256 | `e5998bfe8f3184a41dc7b46c354f663d39f777025528166840a216997497b6cf` | `0c00443de2380c6dd99a647d4f694c21595346e7a1326107dc04c73392b655d8` |
| Delivered | 7,302 | 7,302 |
| Time survived | 6:51 (8,239 steps) | 6:51 (8,239 steps) |
| Dropped: full queue, cut, no route | 108, 14, 0 | 108, 14, 0 |
| Commands in the log | 28 | 28 |
| Score reached by the time-lapse | 7,302 | 7,302 |
| Page errors | none | none |

**Second, independent check.** The same seed played by the same scripted player in Node, with no browser and no renderer (`node tools/run-ts.mjs tools/bot-runs.ts stage-1`): 6:51, 7,302 delivered, drops 108, 14 and 0. All three runs agree.

**Looked at.** One frame from late in the phone video (6:19) and two from the desktop video (3:59 and the last second) were opened and read: the HUD numbers match the table, all twelve sites sit between the HUD and the control bar, congested links are amber and dashed with a warning icon, and the game-over card shows the same score, time, seed and drop counts.

**Result: SC-005 pass** for the scripted player. It is not a person's run.

Two things seen in the frames and left as they are: on the game-over screen the result card covers the western sites while the time-lapse plays behind it, and a cost label can sit partly under a site's name where a link leaves the site at a shallow angle.

The first recording, from build `68c4588`, gave the same numbers. It showed a site under the control bar at phone size, which led to the framing fix; both videos were then recorded again and the first pair was replaced.

## Fresh copy (T069, SC-010; 2026-11-10T17:54Z)

The branch was cloned into an empty folder (`git clone --branch speckit-rebuild --single-branch`), at commit `69aa8d4`, and the README's commands were run there in order. Nothing was copied in from the working folder; Playwright's Chromium was already in the machine's cache.

| Step | Result |
| --- | --- |
| The clone is clean and has no `node_modules` | Pass |
| `python3 -m http.server 8791 --bind 127.0.0.1 --directory dist`, before anything is installed | Pass: the page served equals the clone's `dist/index.html`, and the script, the stylesheet and the hero image it names answer 200 |
| `npm ci` | Pass: 45 packages |
| `npm test` | Pass: 113 of 113 |
| `npm run build` | Pass |
| `npm run verify:dist` | Pass: `dist/` matches a fresh build, 13 files, and the build left `dist/` unchanged in the clone |
| `npm run test:e2e` | Pass: 72 pass, 4 skipped by design, 0 fail. This includes a whole run played with the network cut. |
| No tracked file changed by any of the above | Pass |

What this does and does not show: the commands in the README work from a fresh copy on the build machine (macOS, Node 26.3.1). They were run by the build agent, not followed by another engineer, and not on another machine or operating system. `npm run record` and `python3 tools/frr_check.py` were not run in the clone; they were run in the working folder.

## Final run (2026-11-10)

The code and the build output were last changed in commit `24ea96b`. Commits after it change records only.

| Check | Where | Result |
| --- | --- | --- |
| `npm test` | Working folder at `24ea96b`; clone of `69aa8d4` | 113 of 113 pass, 16 files, both times |
| `npm run test:e2e` | Working folder at `24ea96b`; clone of `69aa8d4` | 72 pass, 4 skipped by design, 0 fail, both times |
| `npm run verify:dist` | Working folder at `24ea96b`; clone of `69aa8d4` | `dist/` matches a fresh build, 13 files, both times |
| `python3 tools/frr_check.py` | Working folder, with the tool as changed by the review | Pass, 21 of 21; lab removed |
| `npm run record` | Working folder, final build | Both videos: 7,302 delivered in 6:51 |
| `npm audit`; gitleaks over the working tree | Working folder, 2026-11-10 (before the review fixes, which added no dependency) | 0 vulnerabilities; no leaks |

The four skipped end-to-end tests are each run at the other screen size: touch gestures (AC15) run at phone size only; mouse and wheel (AC16), keyboard-only play (AC17) and the resize test run at desktop size only.

**Failed:** nothing in the final run.

**Not verified** (needs a person or equipment the build did not have): SC-011, SC-012 and SC-013; a person playing the rebuilt game at all; browsers other than Chromium; screen readers; a real phone; frame rate on real graphics hardware; the README followed by another engineer.
