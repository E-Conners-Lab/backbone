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
