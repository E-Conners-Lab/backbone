# Backbone · Provenance

Kept from the first session. It records only what happened. Anything not recorded is written as `unknown`.
Times are UTC. No tokens or costs are estimated anywhere in this file.

## Build environment

| Item | Value | How it was established |
| --- | --- | --- |
| Model | `claude-fable-5-2` | Model ID reported to the agent by the harness in this session |
| Harness | Claude Code | Session environment |
| Harness version | 2.1.321 | `claude --version`, 2026-11-09 |
| Helper models | WebFetch's built-in summarizing model (ID not exposed); reviewer agents started by the `code-review` skill (model IDs not reported to the build agent) | Tool descriptions and the skill's result |
| Sub-agents | One forked `code-review` run at level `medium` over `src`, `tools`, `tests` | Skill result: 12 tool uses, about 4.5 minutes |
| OS | macOS, Darwin 25.6.0, arm64 | Session environment |
| Session start | unknown | The first timestamp captured was 2026-11-09T22:52:04Z, after the first fetches |
| Last recorded step | 2026-11-10T01:06Z | `date -u` after the fresh-clone check |
| Wall time | unknown | Start not recorded; the session included waits for the owner |
| Human prompts | 6, plus 2 sets of multiple-choice answers | Counted from the session: the brief; "approved, go with the defaults"; "can I see it running?"; "approved, start the build"; "open the game when you're done"; the creator details for `ARCADE.md` |
| Token usage / cost | unknown | Not measured by the agent |

## Build tools and versions

Read from `package.json` and from each tool's own version output, not from memory.

| Tool | Version | Use |
| --- | --- | --- |
| Node / npm | v26.3.1 / 11.16.0 | Build and tests |
| TypeScript | 7.0.2 | Type checking |
| Vite | 8.3.7 | Dev server and build |
| Vitest | 5.1.0 | Unit tests |
| vite-node | 6.0.0 (fetched by `npx`, not in `package.json`) | Ran `tools/bot-runs.ts` for tuning |
| @playwright/test | 1.65.0, with Chromium headless shell 158.0.8127.18 | End-to-end tests, screenshots, hero image capture, videos |
| @fontsource/ibm-plex-sans, @fontsource/ibm-plex-mono | 5.3.0 | IBM Plex font files (SIL OFL 1.1), bundled into `dist/` |
| @types/node | 26.6.6 | Types for the tools and tests |
| Google Chrome | 157.0.8103.39, headless | Screenshots of the static mock only |
| Docker | 29.9.1 | FRR lab |
| FRR | `quay.io/frrouting/frr:10.7.1`, digest `sha256:e995beaa50fdc9edb35eadcfefa29b7f062cc06f2b812613789b68fa541554d2`, arm64 | Reference OSPF implementation |
| FRR (first two attempts) | `frrouting/frr:latest`, digest `sha256:990e83490108b686fd6df3b1cafa6bdbb2714acb00eedb9a89693946f46f45ce`, FRR 8.4, amd64 under emulation | See verification steps 14 and 15 |
| ffmpeg / cwebp | 8.0.1 / 1.6.0 | Video conversion to MP4; hero image to WebP |
| ruff | version not recorded | Lint and format of `tools/frr_check.py` |
| GitHub Spec Kit CLI | 1.2.2 installed, **not used** | `specify version` |
| Other | `git`, `gh` (one read-only call), `curl`, `find`, `mdfind`, `shasum`, `sips`, `python3` | Fetching, hashing, text edits |

## MCP servers

Connected to the session (tool names visible to the agent). **None was called at any point in the build.**

claude-in-chrome · MCP_DOCKER (browser automation tools) · claude.ai Claude Docs · claude.ai Gmail, Google Calendar, Google Drive (authentication stubs) · ide · pycharm · itential-docs · nautobot-ashburn · nautobot-charlotte · netbox_mcp

## Documents and sources read

| Source | How it was obtained | Identifier |
| --- | --- | --- |
| Arcade submission template, `https://automateyournetwork.com/arcade/ARCADE.md` | WebFetch (relayed through the tool's summarizing model, so not byte-exact) | fetched 2026-11-09 |
| `automateyournetwork/NAF_AC6` (public GitHub repo) | `git clone --depth 1` into the session scratch folder, outside this repo. The owner chose this after the agent found no local copy. | commit `b77da71d7c810dbdd678ff09856d9097c7da05ee` (2026-11-08) |
| ↳ `WORKSHOP/LAB/StarterKit/` `README.md`, `CONSTITUTION.md`, `SPEC.md`, `PLAN.md` | read in full | same commit |
| ↳ `WORKSHOP/LAB/StarterKit/ARCADE.md` | first 20 lines read and its field markers checked against the fetched template; used as the reference for `ARCADE.md` | same commit |
| ↳ `WORKSHOP/LAB/Examples/PerHopWorks/ARCADE.md`, `WORKSHOP/LAB/README.md` | read in full | same commit |
| ↳ `LICENSE` (Apache-2.0) | copied to this repo's `LICENSE` | same commit |
| Natural Earth 1:50m land, `ne_50m_land.geojson` | `curl` from the `nvkelso/natural-earth-vector` GitHub repo, `master` branch | SHA-256 `e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b` |
| Natural Earth 1:50m lakes, `ne_50m_lakes.geojson` | same | SHA-256 `d350b75978b26fe839b797c2c529b2fb8f47fb3983c03f4964e36d5df9378a52` |
| quay.io tag list for `frrouting/frr` | `curl` to the public registry API | 2026-11-10 |

## Standards (RFCs)

Downloaded as plain text from `https://www.rfc-editor.org/rfc/rfcNNNN.txt` with `curl` on 2026-11-09 and read locally. No RFC MCP server was used.

| RFC | SHA-256 of the downloaded text | Sections read | Used for |
| --- | --- | --- | --- |
| 2328, OSPF Version 2 | `981690e297fbba9e8ef655802552b5529cb17f1ffe790ad2d55706cc522ff50c` | 16.1 (through step 4), 16.1.1 (opening), 16.8, 13.2 (router-LSA / network-LSA case), 9.2 `InterfaceDown`, A.4.2 (router-LSA link fields), C.3 (interface output cost, HelloInterval, RouterDeadInterval), Appendix B `LSInfinity` | Shortest path by cost, equal-cost next hops, the back-link check, recalculation after a change, the legal cost range |
| 2991, Multipath Issues in Unicast and Multicast Next-Hop Selection | `7ed2e5951b4a31294333563c2829d7ba04b2e2d9e56362653bbd9d9311ad1e7f` | 1, 2, 3, start of 4 | Why real routers keep a flow on one path; grounds the "per-packet sharing is a simplification" statement |
| 2992, Analysis of an Equal-Cost Multi-Path Algorithm | `f83257fe427dc29e498c5d1c03b285d757c2ce0750aaa5c62892b0babfa68010` | **downloaded, not read** | Not relied on |

## Skills, plugins and hooks

| Item | Status |
| --- | --- |
| Skill `project-initiation-standard` (owner's PIS-01–30) | Loaded; produced `docs/PID.md` |
| Skill `secure-build-standard` (owner's SEC-01–33) | Loaded when dependencies were added; produced `docs/secure-build-checklist.md` |
| Skill `code-review` | Run once at level `medium`; 10 findings, all fixed |
| Owner's Claude Code hooks | The ruff hook was seen to reformat `tools/frr_check.py` after a write. The others are configured per the owner's instructions; whether each fired was not observed. |

## AI-generated assets

| Asset | Made by |
| --- | --- |
| All source code, markup, styles, tests and tools | The build agent (`claude-fable-5-2`) |
| Hero art and Arcade card image, `public/hero.webp` (1600×900, 76,456 bytes) | A frame of the game's own WebGL renderer: seed `2328`, scripted player, simulated time 5:40, HUD hidden. Captured with Playwright by `tools/make-card.mjs`, converted with `cwebp -q 84`. **No image generator was used.** |
| Static mock (`mock/`) | Hand-written SVG and CSS by the build agent; its coastline is a rough sketch, not map data |
| Coastline in the game | Natural Earth data, simplified by `tools/build-coast.mjs` |
| Audio, 3D models | None |

## Verification steps run

| # | When (UTC) | Step | Result |
| --- | --- | --- | --- |
| 1 | 2026-11-09 | Searched the home folder for `NAF_AC6`, `PerHopWorks`, `StarterKit` | Not found locally; owner chose a GitHub clone |
| 2 | 2026-11-09 | `gh api repos/automateyournetwork/NAF_AC6` | Public, Apache-2.0, default branch `main` |
| 3 | 2026-11-09T22:52Z | Downloaded RFC 2328, 2991, 2992; HTTP 200; hashes recorded | Pass |
| 4 | 2026-11-09 | Read the RFC 2328 sections above against every "faithful" claim in the spec | Each claim cites a section that was read |
| 5 | 2026-11-09T23:10Z | Rendered the static mock in headless Chrome at 1920×1080 and 844×390; viewed both | Rendered after three layout rounds |
| 6 | 2026-11-09T23:10Z | Hue scan of every hex color in `mock/` | No green or red |
| 7 | 2026-11-09 | Added decorative motion to the mock; compared two headless frames | Frames differ; frame rate not measured |
| 8 | 2026-11-09T23:50Z | `npm install` with exact versions; `npm audit` | 0 vulnerabilities |
| 9 | 2026-11-09T23:52Z | Routing tests: spec cases 1–8 and 10, the brute-force oracle on 300 seeded graphs, hop-by-hop loop-freedom | 13 passed on the first run |
| 10 | 2026-11-09T23:52Z | Mutation check: disabled the equal-cost branch in `spf.ts` | 7 of 13 tests failed, as they should; restored, 13 passed |
| 11 | 2026-11-09T23:55Z | Simulation tests: overload (case 9), score (11), determinism and replay (12), drops, meter, cuts, dark sites, rewards, command validation, purity | 1 failed first: the cut test's two sites were so close that no packet was in flight. The test fixture was moved apart; no expected value changed. Then all passed. |
| 12 | 2026-11-09 | Scripted player on eight seeds (`tools/bot-runs.ts`), three tuning rounds | Runs went from 1:32–3:57 to 2:50–6:26, most ending by congestion |
| 13 | 2026-11-10T00:05Z | First build; headless screenshots of the welcome screen and a bot run at both sizes; viewed | No page errors. Fixed: NEW tag over the site label, idle sites on the welcome screen, a focus ring around the map. |
| 14 | 2026-11-10 | FRR comparison, attempt 1: FRR 8.4 (amd64, emulated) | **No valid verdict.** Every next-hop set matched the spec, but every cost read 1 low: the script wrongly subtracted a loopback cost. FRR's own router-LSA showed it advertises the loopback at metric 0. Script corrected to read the value from FRR. |
| 15 | 2026-11-10 | FRR comparison, attempt 2: same image | **No valid verdict.** One adjacency (D–C) never formed, so FRR was routing a different topology. While probing, two routers also reported router IDs that did not match the lab's configuration; the cause was not found. Script changed to refuse to compare unless every adjacency is Full and every router ID is as configured. |
| 16 | 2026-11-10T00:40Z | FRR comparison, attempt 3: FRR 10.7.1, native arm64, health gate | **Pass.** 12 of 12 and 14 of 14 neighbour entries Full, router IDs verified, 13 of 13 expected routes match on cost and next hops, including after cost changes (cases 3, 4) and link shutdowns (cases 5, 8) |
| 17 | 2026-11-10T00:47Z | FRR comparison again after the script was changed to read the LSA as JSON | Pass, 13 of 13 |
| 18 | 2026-11-10 | End-to-end tests against `dist/` at 1920×1080 (mouse) and 844×390 (touch) | First run: 8 passed, 1 failed. The keyboard test found a real bug (focus sent to a still-hidden field). Fixed; 9 passed, 1 skipped by design. |
| 19 | 2026-11-10 | Hue count of rendered frames in both renderers, inside the end-to-end tests | Under 1% of strongly colored pixels in a green or red band |
| 20 | 2026-11-10 | Viewed a WebGL frame; amber links looked yellow under bloom | Color mix changed to scale instead of clip; amber viewed again and reads as amber |
| 21 | 2026-11-10 | `code-review` at level `medium` | 10 findings, all confirmed and fixed: stale inspector names after a new seed; a cut cancelled by removing and re-laying the link; no drawing if WebGL setup fails part-way; stale utilization on a cut link (also misleading the bot); `--keep` name collision in the FRR script; double commit of a cost on Enter; focus lost when opening About; a finished run's links drawn on the welcome screen; a missing palette script; regex parsing in the FRR script. Tests were added for the first, second, fourth and sixth. |
| 22 | 2026-11-10T00:46Z | Seeded-run videos recorded with the final build: seed `stage-1`, scripted player, simulation at 4× | Both sizes: 4,281 delivered, 5:04, 132 dropped, no page errors. Identical to the same seed run in Node. Two frames viewed. |
| 23 | 2026-11-10T00:48Z | Final run of everything | `npm test`: 33 passed. `npm run test:e2e`: 9 passed, 1 skipped. `npm run verify:dist`: `dist/` matches a fresh build (14 files). `tsc --noEmit`: clean. |
| 24 | 2026-11-10T01:02Z | Before the first push: searched every file to be committed for machine paths, email addresses and key-like strings; ran gitleaks 8.30.1 over the folder | Nothing found; "no leaks found" |
| 25 | 2026-11-10T01:03Z | Five commits on `main`; `gh repo create E-Conners-Lab/backbone --public --push`; read the repo back with `gh repo view` | Public, default branch `main`, local branch tracking `origin/main` |
| 26 | 2026-11-10T01:05Z | Fresh clone of the public repo at `39a62da` into an empty folder | `dist/` served: page title and all three referenced assets returned 200. From the clone: `npm ci`, 33 unit tests, build, `verify:dist` (14 files match) and 9 end-to-end tests passed. |

**Not verified:** frame rate on a real mid-range phone; play by a person; any browser other than Chromium; screen readers; the portrait phone layout; how long a human run lasts.

## Changes of direction by the owner

| When | What |
| --- | --- |
| 2026-11-09 | Chose "clone from GitHub" for the workshop repo when no local copy was found. |
| 2026-11-09 | Approved the constitution, specification and plan, accepting every default, and asked for the visual mock. |
| 2026-11-09 | Asked "can I see it running?" before approving the mock. The game did not exist, so motion was added to the mock. |
| 2026-11-09 | Approved the mock and told the agent to start the build. |
| 2026-11-10 | Asked for the game to be opened when the build finished. |
| 2026-11-10 | Gave the creator details: GitHub account `E-Conners-Lab`, no location, not a first spec-driven project. Chose a public repo, commit and push. Asked whether the three open secure-build items are necessary for this project; that question is answered in `docs/secure-build-checklist.md` and the exceptions remain his to accept. |

## Decisions the agent made without asking

| Decision | Why |
| --- | --- |
| `creator.name` in `ARCADE.md` set to "Elliot Conner" | Taken from the git author name; the owner gave the GitHub account but did not state a display name. Flagged for him to change. The owner confirmed "Elliot Conner" on 2026-11-09. |
| IBM Plex Sans and Mono as the typeface | Proposed twice as the default if the owner did not object; the owner approved without objecting |
| Removed "mute control" from v1 | The owner accepted sound in v1.1; recorded as a spec amendment |
| A cut link cannot be removed | Closes an exploit found in review; recorded as a spec amendment |
| Balance constants changed from the plan's starting values | The plan called them tunable; final values are in the plan |

---

# Spec Kit rebuild

Everything above this line records the hand-built v1 (tag `v1-handbuilt`) and is left as written.
From here down the file records the rebuild of v1 through Spec Kit on branch `speckit-rebuild`.
The same rules apply: only what happened, `unknown` where something was not recorded, and no
estimated tokens or costs. Times are UTC.

## Recorded late

This file was not updated between 2026-11-10T01:06Z and the start of this part. What happened in
that gap is in `docs/capture-log.md`. The rows below point to it. The session that wrote this part
did not witness any of it.

| What | Where it is recorded |
| --- | --- |
| Showcase player and recorder, the visible run, a code review at level `high` | Capture log steps 29–35 |
| Owner's decisions: consent to publish, the name Backbone, three secure-build exceptions, creator name | Capture log step 33 and its questions table; `docs/PID.md` amendment 1.2 |
| Decision to rebuild through Spec Kit, tag `v1-handbuilt`, the clean slate, `specify init` | Capture log steps 38–42; `docs/PID.md` amendment 1.3; commits `bde1e7e` and `e116913` |

## Rebuild environment

| Item | Value | How it was established |
| --- | --- | --- |
| Model | `claude-fable-5-2` | Model ID reported to the agent by the harness in this session |
| Reasoning effort | `xhigh` | The owner's `/effort` command at the start of the session |
| Harness | Claude Code 2.1.322 | `claude --version`, 2026-11-10T04:14Z |
| GitHub Spec Kit | 1.2.2, Claude integration, commands installed as skills | `.specify/init-options.json` |
| OS | macOS, Darwin 25.6.0, arm64 | Session environment |
| Python | 3.15.0 | `python3 --version`; runs `tools/build_runbook.py` and the constitution check |
| Session start | unknown | The first timestamp captured was 2026-11-10T04:14Z |
| Sessions | One. It waited for the owner from about 04:25Z to about 15:05Z on 2026-11-10. | Timestamps in the capture log |
| Wall time | unknown | Start not recorded; the session includes the wait above |
| Token usage / cost | unknown | Not measured by the agent |
| Helper models and sub-agents | None so far | This session's own tool calls |
| MCP servers | The same servers as listed for v1 are connected. None has been called. | Tool names visible to the agent |

## Human prompts in the rebuild

Counted from the session. The owner's `/model` and `/effort` commands at the start are settings,
not prompts, and are not counted.

| # | When | Prompt |
| --- | --- | --- |
| 1 | 2026-11-10, before 04:14Z | `/speckit-constitution` with the lab's step 1 text |
| 2 | 2026-11-10, about 04:15Z | Asked whether the project could be finished unattended overnight |
| 3 | 2026-11-10, about 15:05Z | "go, commit as you go, take your recommendations" |

## Sources read in the rebuild

| Source | How it was obtained | Identifier |
| --- | --- | --- |
| `StarterKit/CONSTITUTION.md`, `SPEC.md`, `PLAN.md` | Read in full from this repository | Commit `5fd0490` |
| Spec Kit templates in `.specify/templates/` (constitution, spec, plan, tasks) | Read in full | Spec Kit 1.2.2 |
| `docs/PID.md`, `docs/capture-log.md`, this file | Read in full | Commit `5fd0490` |
| Workshop lab guide, `WORKSHOP/LAB/README.md` in `automateyournetwork/NAF_AC6` | `curl` from raw.githubusercontent.com at commit `b77da71d7c810dbdd678ff09856d9097c7da05ee`, into the session scratch folder | SHA-256 `44d7093e93b27203a46860b008d399bdbf73cd9b5813fe79bc037e9af734a810` |
| ↳ `WORKSHOP/LAB/StarterKit/README.md` (the README shape) | Same | SHA-256 `8a08d1ac4a97e090dc23efe097d8135b14b6abfabbfb9d29d16629c4b07c9a98` |
| Tag `v1-handbuilt` (the hand-built source) | Three lookups with `git ls-tree` and `git grep`: where the tuning constants lived, the hue bands in the palette test, and the name of the purity test. **No file was copied.** | Tag `v1-handbuilt` |
| The approved visual mock, `mock/desktop-1920x1080.png` | Viewed, to compare the look; its stylesheet read for the palette and the base type size | Commit `5fd0490` |
| Natural Earth v5.1.2 (`nvkelso/natural-earth-vector`): populated places 1:10m, land 1:50m, lakes 1:50m | `tools/build-map.mjs`, from raw.githubusercontent.com into a cache folder that is not committed | Hashes in step R12 |
| RFC 2328 and RFC 2991 | `curl` from rfc-editor.org into the session scratch folder, for the text review | Same SHA-256 as recorded above for v1 |
| The owner's saved lab note on FRR in Docker on this machine | The agent's memory folder for this project | Used for the image name and the health gate |
| `README.md`, `ARCADE.md`, `docs/spec-map.html` and `docs/secure-build-checklist.md` as they described the hand-built v1 | Read before rewriting them | Commit `5fd0490` |

## Rebuild steps and checks

| # | When (UTC) | Step | Result |
| --- | --- | --- | --- |
| R1 | 2026-11-10T04:18Z | Lab step 1: `/speckit-constitution` with the lab's prompt | `.specify/memory/constitution.md` version 1.0.0. Seven principles and their evidence carried over. Five conflicts flagged for the owner (K1–K5), five Spec Kit defaults held to the stricter reading, six points carried to later steps. |
| R2 | 2026-11-10T04:18Z | Independent carry-over check: a script compares every line and table cell of the source with the new file | Pass, 50 of 50. A copy with two clauses deleted fails, as it should. |
| R3 | 2026-11-10T15:09Z | Commit lab step 1 | `431cba3`. Not pushed. |
| R4 | 2026-11-10T15:11Z | Amend the constitution with the owner's decisions K1 and K2 | Version 1.1.0. Carry-over check passes with the two changes declared. |
| R5 | 2026-11-10T15:19Z | Lab step 2: `/speckit-specify` with the lab's prompt plus one sentence naming K1, K3, L1, L2 | `specs/001-backbone-first-playable/spec.md` and its requirements checklist. AC1–AC23 kept; AC24–AC25 added. |
| R6 | 2026-11-10T15:19Z | Independent preservation check of the spec against `StarterKit/SPEC.md` | First run: fail, three criteria had lost words in rewording. Fixed. Second run: pass, 246 pieces. |
| R7 | 2026-11-10T15:22Z | Lab step 3: `/speckit-clarify`. Five questions asked and answered by the build agent itself, because the owner was away | Five clarifications recorded in the spec, each marked as the agent's answer. One (reward offers) departs from the wording of the owner's decision Q2 and is flagged as K6. AC26 added. |
| R8 | 2026-11-10T15:30Z | Lab step 4: `/speckit-plan` with the lab's prompt. Tool versions read with `node --version`, `npm --version`, `docker version`, `npm view` | Plan and design files written. No research agents were used. Ten contradictions resolved in the plan (P1–P10). |
| R9 | 2026-11-10T15:33Z | Lab step 5: `/speckit-tasks` with the lab's prompt | `tasks.md`, 69 tasks. Format and coverage checked by script: sequential IDs, story labels only in story phases, every AC named. |
| R10 | 2026-11-10T15:39Z | Lab step 6: `/speckit-analyze`, two passes, with fixes to the spec, plan and tasks between them | Pass 1: 15 findings (1 critical, 2 high). Pass 2: none critical or high; full coverage by ID. Report in `docs/verification/analysis.md`. |
| R11 | 2026-11-10T15:57Z | Lab step 7 begins: `/speckit-implement` with the lab's prompt. Skill `secure-build-standard` loaded. `npm install` of exact versions; `npm audit`; `npx playwright install chromium` | 45 packages, 0 vulnerabilities. |
| R12 | 2026-11-10T15:57Z | Natural Earth data for the map, tag v5.1.2, fetched by `tools/build-map.mjs` from raw.githubusercontent.com: populated places 1:10m (SHA-256 `fd3fa867a320cbd5c5b6bb5bc550afeec2939fb2cef688e508007282a55ac42f`), land 1:50m (`e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b`), lakes 1:50m (`d350b75978b26fe839b797c2c529b2fb8f47fb3983c03f4964e36d5df9378a52`) | `region-na.json` (18 sites, coordinates from the data) and `coast-na.json` (39 land rings, 24 lake rings, 21 KB). The land and lake hashes equal the ones recorded for the hand-built v1. |
| R13 | 2026-11-10T15:57Z | Phase 2 checkpoint: `npm test` | 84 of 84 pass. Tests were written before the code. Ten mutation checks all caught. Details in `docs/verification/results.md`. |
| R14 | 2026-11-10T16:17Z | Phase 3: User Story 1 built; `npm test` and `npx playwright test tests/e2e/us1-shape.spec.ts` | Unit 104 of 104 (**corrected**: first written as 109, a miscount). End-to-end 12 of 12 (desktop and phone). First run: 12 failed because the tests reused a server on port 8765 that serves the hand-built v1; fixed by using port 8791 and never reusing. Second run found a touch ghost-click bug; fixed. |
| R15 | 2026-11-10T16:33Z | Phases 4 to 7: `npm test`, `npm run test:e2e` | Unit 105 of 105. End-to-end 48 pass, 4 skipped by design, 0 fail. Color census in the fallback renderer: 0 and 0 at both sizes after fixes (first measured 0.017% green, 0.009% red on desktop). |
| R16 | 2026-11-10T17:06Z | RFC 2328 and RFC 2991 downloaded again with `curl` from rfc-editor.org for the text review | SHA-256 equal to the hashes recorded for the hand-built v1 (`981690e2…f50c`, `7ed2e595…1e7f`). RFC 2328 sections 16.1, 16.1.1, 16.8, 9.2, 13.2, C.3 and A.4.2 read; RFC 2991 searched, not read in full. |
| R17 | 2026-11-10T17:06Z | `python3 tools/frr_check.py`: T1 and T2 as FRR routers in Docker, image `quay.io/frrouting/frr:10.7.1` (digest `sha256:e995beaa50fdc9edb35eadcfefa29b7f062cc06f2b812613789b68fa541554d2`, arm64, already on the machine), hello 1 s, dead 4 s | Pass on the first attempt: all adjacencies Full, 21 of 21 compared routes match. Lab removed afterwards. |
| R18 | 2026-11-10T17:06Z | Phase 8: `npm run test:e2e` with the WebGL renderer as default; hero art by `tools/make-card.mjs`; frame time read from the page in headless Chromium (WebGL on SwiftShader) | Census zero in both renderers. One suite run had 1 failure of 64: a race in a test, fixed. Final run recorded below. |

## Changes of direction by the owner in the rebuild

| When | What |
| --- | --- |
| 2026-11-10, about 15:05Z | Dropped the review between lab steps: "go, commit as you go, take your recommendations". K1–K5 are decided as the agent recommended; see the capture log's questions table. |

## Decisions the agent made without asking in the rebuild

| Decision | Why |
| --- | --- |
| Updated `docs/capture-log.md` and `docs/runbook.html` during the constitution command, which says to write only the constitution file | The owner's standing rule is that every step is logged as it happens |
| Nothing is pushed | The owner said "commit as you go" and did not mention pushing |
| The rebuild writes its code anew and does not copy from tag `v1-handbuilt` | `docs/PID.md` amendment 1.3 says the rebuild starts from a clean slate |
