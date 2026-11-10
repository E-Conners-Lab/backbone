# Backbone · Tasks

Generated from the slices in `StarterKit/PLAN.md` and the acceptance criteria in `StarterKit/SPEC.md`.
Status is what was actually done and checked on 2026-11-09. Evidence is in the README's verification table.

| # | Task | Serves | Status |
| --- | --- | --- | --- |
| **0 · Approval gates** | | | |
| 0.1 | Owner approves constitution, specification and plan | C7 | Done |
| 0.2 | Static visual mock at phone and desktop sizes; owner approves | Plan slice 0 | Done |
| **1 · Prove the routing** | | | |
| 1.1 | Copy spec cases 1–12 into `tests/fixtures/ospf-cases.json` | C1 | Done |
| 1.2 | Brute-force path-enumeration oracle, sharing no code with the engine | C1 | Done |
| 1.3 | `spf.ts`: shortest-path tree and equal-cost next hops per router | F1–F6, cases 1–8, 10 | Done |
| 1.4 | `forwarding.ts`: per-router, per-destination next-hop rotation | R2, F5, case 7 | Done |
| 1.5 | Mutation check: break the equal-cost rule and confirm the tests fail | C1 | Done |
| **2 · Prove the run** | | | |
| 2.1 | `linkq.ts`: per-direction queue, service and tail drop | R4, case 9 | Done |
| 2.2 | `world.ts`: sites, traffic, forwarding, drops, meter, cuts, rewards, score, commands | R1–R13, cases 8, 10, 11 | Done |
| 2.3 | `replay.ts` and world hash | R13, R14, case 12 | Done |
| 2.4 | `bot.ts`: scripted player | Tests, video | Done |
| 2.5 | Purity test for `src/sim` | C5 | Done |
| 2.6 | Tune constants on eight seeds | Run length | Done for the scripted player; human run length not measured |
| **3 · One playable run** | | | |
| 3.1 | Region data and Natural Earth coastline | C6 | Done |
| 3.2 | Camera with tilt, zoom, pan and inverse; tests | AC15, AC16 | Done |
| 3.3 | Shared scene (shape list, labels, hit areas) | C1 | Done |
| 3.4 | Canvas 2D backdrop, fallback renderer and label overlay | AC20 | Done |
| 3.5 | Game controller: fixed step, pause, pending queue, command log | AC12–AC14 | Done |
| 3.6 | HUD, link options, inspector, reward choice, welcome, game over | AC1, AC6–AC11, AC13 | Done |
| 3.7 | Pointer, touch and keyboard input | AC15–AC17 | Done |
| **4 · The four effects** | | | |
| 4.1 | WebGL2 renderer: instanced shapes and two-level bloom | Must-have effects | Done |
| 4.2 | Pulses with trails; load-scaled link width and brightness | Must-have effects | Done |
| 4.3 | Cut spark and reconvergence ripple | Must-have effects, AC9 | Done |
| 4.4 | Frame time on a real mid-range phone | 60 fps target | **Not run.** Needs the owner's phone. |
| **5 · Around the run** | | | |
| 5.1 | Hero art rendered by the game; card image under 1 MB | Arcade | Done |
| 5.2 | Local high scores; time-lapse replay | AC23, R14 | Done |
| 5.3 | Reduced-motion setting; model-notes panel | AC19, C1 | Done |
| 5.4 | Self-hosted IBM Plex typefaces | Plan | Done |
| **6 · Package** | | | |
| 6.1 | End-to-end tests at 1920×1080 and 844×390 | Release evidence | Done |
| 6.2 | Seeded-run videos at both sizes | Final verification | Done |
| 6.3 | `dist/` build and drift check | D1 | Done |
| 6.4 | FRR comparison of the spec cases | D4 | Done: 13 of 13 routes match on the third attempt |
| 6.5 | README, `ARCADE.md` (consent left false), provenance, build book | C7 | Done |
| 6.6 | Code review of the build | Owner's standing rule | Done: 10 findings, all fixed |
| 6.7 | Create the GitHub repo, commit, push | D2 | Done: https://github.com/E-Conners-Lab/backbone, public, five commits on `main` |

Later releases (v1.1 to v1.4) are listed in the specification and have no tasks yet.
