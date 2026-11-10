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
