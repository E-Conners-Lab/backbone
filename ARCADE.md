---
# ARCADE SUBMISSION for Backbone. Facts come from PROVENANCE.md, README.md and docs/capture-log.md in this repository.
# Fields marked (HUMAN) are left for the owner. consent_to_publish was set on the owner's instruction on 2026-11-09.
# This file now describes the game as rebuilt through Spec Kit on branch speckit-rebuild (2026-11-10). The consent
# above was given after the owner played the hand-built v1 (tag v1-handbuilt). He has said he will confirm it
# again after playing the rebuilt game. The build agent did not touch the creator block.
arcade_version: 1

game:
  title: "Backbone"
  slug: backbone
  tagline: "Build the backbone. Never steer a packet. Predict where the congestion goes."
  summary: "The player lays fiber between cities, sets link costs and upgrades capacity while every packet follows OSPF's lowest-cost path. Overloaded links drop packets and fiber cuts force reconvergence, so the player learns to predict where load moves when the network changes."
  topics: [OSPF, "Shortest path first", "Link cost", Reconvergence, "Capacity planning", "RFC 2328"]
  category: routing
  skill_level: intermediate
  play_minutes: 7            # the scripted player lasts 6:15 to 7:14 on eight seeds; a person's run length was not measured
  levels: 1                  # one region, endless mode
  card_image: public/hero.webp
  card_image_alt: "A dark map of North America with glowing fiber links between cities, two links amber with congestion and one cut link in magenta."
  repo: "https://github.com/E-Conners-Lab/backbone"
  repo_path: ""
  license: Apache-2.0

creator:                     # (HUMAN) filled in from the owner's answers on 2026-11-09
  name: "Elliot Conner"
  github: E-Conners-Lab
  location: ""               # the owner chose to leave this out
  organization: ""
  links: []
  first_spec_project: false
  workshop: "NAF AC6"
  consent_to_publish: true   # (HUMAN) the owner gave consent on 2026-11-09, after playing the game

build:
  started: unknown           # not recorded; the rebuild's first captured timestamp was 2026-11-10T04:14Z
  finished: "@@FINISHED@@"
  wall_time: unknown         # start was not recorded, and the session waited about 11 hours for the owner
  spec_driven:
    framework: spec-kit      # GitHub Spec Kit, the workshop's seven steps: constitution, specify, clarify, plan, tasks, analyze, implement
    framework_version: "1.2.2"
    artifacts: [constitution, spec, plan, tasks, research, data-model, contracts, quickstart, analysis]
    task_count: 70
    loops_or_phases: 9       # the nine phases of specs/001-backbone-first-playable/tasks.md
  model: "claude-fable-5-2"
  helper_models: ["code-review skill reviewer: one forked session of claude-fable-5-2, the same model"]
  harness: "Claude Code"
  harness_version: "2.1.322"
  mcp_servers: ["None was called. Connected but unused: claude-in-chrome, MCP_DOCKER, claude.ai Claude Docs, claude.ai Gmail / Google Calendar / Google Drive (auth stubs), ide, pycharm, itential-docs, nautobot-ashburn, nautobot-charlotte, netbox_mcp"]
  rag_and_sources: ["The owner's three approved input files in StarterKit/ (constitution, spec, plan)", "RFC 2328 (OSPF Version 2) text from rfc-editor.org, sections 16.1, 16.1.1, 16.8, 13.2, 9.2, A.4.2, C.3", "RFC 2991, searched for its statements on reordering and hashing", "NAF_AC6 workshop repo at commit b77da71: lab guide and StarterKit README", "Natural Earth v5.1.2: populated places 1:10m, land and lakes 1:50m (map data)", "FRR 10.7.1 as a reference OSPF implementation", "The approved visual mock in mock/"]
  skills_and_plugins: ["GitHub Spec Kit commands as Claude Code skills: speckit-constitution, speckit-specify, speckit-clarify, speckit-plan, speckit-tasks, speckit-analyze, speckit-implement", "secure-build-standard (owner's skill)", "code-review (Claude Code skill)", "Owner's Claude Code hooks: ruff on Python edits (seen to run), disk warning, code-review gate"]
  other_tools: ["TypeScript 7.0.2", "Vite 8.3.7", "Vitest 5.1.0", "Playwright 1.65.0 with Chromium headless shell 158.0.8127.18", "Node v26.3.1", "Python 3.15.0", "Docker 29.9.1", "ffmpeg 8.0.1", "cwebp 1.6.0", "ruff", "gitleaks 8.30.1", "curl", "git"]
  human_prompts: 3           # in the rebuild session; the three input files came from an earlier session with 6 prompts
  usage:
    input_tokens: unknown
    output_tokens: unknown
    cost_note: "not measured by the build agent"
  ai_generated_assets: ["All game code, CSS, markup, tests and tools: written by the build agent (claude-fable-5-2)", "Hero and card image: a frame rendered by the game's own WebGL renderer, captured with Playwright; no image generator", "Audio: none", "3D models: none"]

runtime:
  kind: static-web
  stack: [HTML, CSS, TypeScript, "WebGL2 with a Canvas 2D fallback", "no runtime dependencies"]
  start: "python3 -m http.server 8791 --bind 127.0.0.1 --directory dist"
  url_after_start: "http://127.0.0.1:8791"
  hosted_url: ""
  static_root: "dist"
  requires_install: false
  requires_network: false
  requires_api_key: false
  uses_ai_at_runtime: false
  browsers: ["Chromium headless shell 158 (Playwright)"]
  accessibility: "Tested by automation in Chromium only: keyboard-only play with visible focus at desktop size; touch at phone size; reduced motion; play without WebGL in the Canvas 2D fallback; no green or red in authored colors, and zero pixels in either band in screenshots of both renderers; text contrast at least 4.5 to 1; every control named. Not tested: a person playing, screen readers, a real phone, Safari, Firefox."
  save_state: "browser localStorage (five best scores and the reduced-motion setting)"

verification:
  tests: "npm test && npm run build && npm run verify:dist && npm run test:e2e"
  tests_passing: 185          # 113 unit (Vitest) + 72 end-to-end (Playwright); 4 end-to-end tests are skipped by design, each being checked at the other screen size
  facts_sourced_from: ["RFC 2328", "RFC 2991"]
  known_limits: ["Single area, point-to-point links, one router per site", "Convergence is instant: no hello or dead timers, flooding delay or micro-loops", "One cost per link for both directions", "Each router keeps one equal-cost route in v1; ties go to the lowest router ID", "Fixed-size packets, fixed-rate queue with tail drop, no TCP or QoS", "Capacity upgrades do not change cost", "Only links fail", "Not yet played by a person; run length for people and frame rate on a real phone were not measured", "Verified in Chromium only"]
---

## In one paragraph

Backbone is a network-building game for working network engineers. You lay fiber between cities on a dark
map, set link costs and upgrade capacity, and the traffic routes itself along OSPF's lowest-cost paths. You
never steer a packet. It is for anyone who has tuned a metric to fix one path and then been surprised by where
the rest of the traffic went.

## How it was built

The game was first hand-built from a constitution, specification and plan in the workshop's StarterKit shape.
The owner then asked for it to be rebuilt the way the lab teaches: those three approved files became the
inputs, and GitHub Spec Kit's seven commands were run in order. The constitution step carried the seven
principles over unchanged and flagged five conflicts, which the owner decided. He then asked for the other six
steps to run unattended. Specify kept the 23 acceptance criteria and added three. Clarify asked five questions,
which the agent answered from the owner's approved decisions and marked for his review. Plan resolved ten
contradictions in the open. Tasks put the simulation first, with tests written before the code. Analyze found
fifteen inconsistencies, one of them critical, and all were fixed before any code. Implement wrote the code
anew; nothing was copied from the hand-built version.

Things that broke: the first end-to-end run tested the wrong game, because an old server on the same port was
still serving the hand-built version. On a phone, tapping a link also pressed a button in the panel that
opened under the finger. Dragging the tilted map let the grabbed point slide away. The first color census
found a few dozen pixels in the green and red bands where cyan met amber at an edge; removing cyan from
everything that touches a link brought it to zero. Several end-to-end tests had races of their own and were
corrected without changing any expected value from the spec.

## What we'd tell the next builder

- Write the routing cases by hand before the engine exists, then check them twice: against a brute-force oracle and against a real router.
- Let a hand-worked case settle a design question. The order of work inside a simulation step was decided by which order gives the case's exact numbers.
- Make every renderer draw one shared scene, and make the tests ask each renderer what it drew.
- Measure "no green, no red" on screenshots, not only on the palette. Blending makes colors nobody wrote.
- Start your own test server and refuse to reuse one that is already running.
