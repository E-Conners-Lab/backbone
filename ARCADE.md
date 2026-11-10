---
# ARCADE SUBMISSION for Backbone. Facts come from PROVENANCE.md, README.md and docs/capture-log.md in this repository.
# Fields marked (HUMAN) are left for the owner. consent_to_publish was set on the owner's instruction on 2026-11-09.
arcade_version: 1

game:
  title: "Backbone"
  slug: backbone
  tagline: "Build the backbone. Never steer a packet. Predict where the congestion goes."
  summary: "The player lays fiber between cities, sets link costs and upgrades capacity while every packet follows OSPF's lowest-cost path. Overloaded links drop packets and fiber cuts force reconvergence, so the player learns to predict where load moves when the network changes."
  topics: [OSPF, "Shortest path first", "Link cost", Reconvergence, "Capacity planning", "RFC 2328"]
  category: routing
  skill_level: intermediate
  play_minutes: 5            # the scripted player lasts 3 to 6.5 minutes; human run length was not measured
  levels: 1                  # one region, endless mode
  card_image: public/hero.webp
  card_image_alt: "A dark map of North America with glowing fiber links between cities, one link amber with congestion and one cut link in magenta."
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
  started: unknown           # not recorded; the first timestamp captured was 2026-11-09T22:52:04Z, after the first fetches
  finished: "2026-11-10T01:06:00Z"
  wall_time: unknown         # start was not recorded and the session included waits for the owner
  spec_driven:
    framework: custom        # constitution, specification and plan hand-written in the NAF AC6 StarterKit shape
    framework_version: unknown   # GitHub Spec Kit CLI 1.2.2 was installed on the machine but not used
    artifacts: [constitution, spec, plan, tasks]
    task_count: 35
    loops_or_phases: 6       # the six slices in StarterKit/PLAN.md, after two approval gates
  model: "claude-fable-5-2"
  helper_models: ["WebFetch built-in summarizing model (ID not exposed)", "code-review skill reviewer agents (model IDs not reported)"]
  harness: "Claude Code"
  harness_version: "2.1.321"
  mcp_servers: ["None was called. Connected but unused: claude-in-chrome, MCP_DOCKER, claude.ai Claude Docs, claude.ai Gmail / Google Calendar / Google Drive (auth stubs), ide, pycharm, itential-docs, nautobot-ashburn, nautobot-charlotte, netbox_mcp"]
  rag_and_sources: ["RFC 2328 (OSPF Version 2) text from rfc-editor.org, sections 16.1, 16.1.1, 16.8, 13.2, 9.2, A.4.2, C.3", "RFC 2991 sections 1-4", "Arcade ARCADE.md template", "NAF_AC6 workshop repo at commit b77da71: StarterKit README, CONSTITUTION, SPEC, PLAN, ARCADE; lab guide; Per-Hop Works ARCADE.md", "Natural Earth 1:50m land and lakes (map data)", "FRR 10.7.1 as a reference OSPF implementation"]
  skills_and_plugins: ["project-initiation-standard (owner's skill)", "secure-build-standard (owner's skill)", "code-review (Claude Code skill)", "Owner's Claude Code hooks: ruff on Python edits, disk warning, code-review gate"]
  other_tools: ["TypeScript 7.0.2", "Vite 8.3.7", "Vitest 5.1.0", "Playwright 1.65.0 with Chromium headless shell 158.0.8127.18", "Node v26.3.1", "Google Chrome 157 headless (mock screenshots)", "Docker 29.9.1", "ffmpeg 8.0.1", "cwebp 1.6.0", "ruff", "gitleaks 8.30.1", "curl", "git", "gh"]
  human_prompts: 6
  usage:
    input_tokens: unknown
    output_tokens: unknown
    cost_note: "not measured by the build agent"
  ai_generated_assets: ["All game code, CSS and markup: written by the build agent (claude-fable-5-2)", "Hero and card image: a frame rendered by the game's own WebGL renderer, captured with Playwright; no image generator", "Audio: none", "3D models: none"]

runtime:
  kind: static-web
  stack: [HTML, CSS, TypeScript, "WebGL2 with a Canvas 2D fallback", "no runtime dependencies"]
  start: "python3 -m http.server 8000 --bind 127.0.0.1 --directory dist"
  url_after_start: "http://127.0.0.1:8000"
  hosted_url: ""
  static_root: "dist"
  requires_install: false
  requires_network: false
  requires_api_key: false
  uses_ai_at_runtime: false
  browsers: ["Chromium headless shell 158 (Playwright)"]
  accessibility: "Tested by automation in Chromium only: a keyboard-only core loop at desktop size; reduced-motion run; no-WebGL run in the 2D fallback; no green or red in source colors or rendered frames. Not tested: screen readers, a real phone, Safari, Firefox, portrait layout."
  save_state: "browser localStorage (five best scores and the reduced-motion setting)"

verification:
  tests: "npm test && npm run build && npm run test:e2e"
  tests_passing: 42           # 33 unit (Vitest) + 9 end-to-end (Playwright); 1 end-to-end test is skipped by design
  facts_sourced_from: ["RFC 2328", "RFC 2991"]
  known_limits: ["Single area, point-to-point links, one router per site", "Convergence is instant: no hello or dead timers, flooding delay or micro-loops", "One cost per link for both directions", "Each router keeps one equal-cost route in v1; ties go to the lowest router ID", "Fixed-size packets, fixed-rate queue with tail drop, no TCP or QoS", "Capacity upgrades do not change cost", "Only links fail", "Run length for human players and frame rate on a real phone were not measured"]
---

## In one paragraph

Backbone is a network-building game for working network engineers. You lay fiber between cities on a dark
map, set link costs and upgrade capacity, and the traffic routes itself along OSPF's lowest-cost paths. You
never steer a packet. It is for anyone who has tuned a metric to fix one path and then been surprised by where
the rest of the traffic went.

## How it was built

The owner supplied a detailed brief. The agent fetched the Arcade template, cloned the workshop repo, read the
RFC 2328 sections on path calculation, and wrote a constitution, specification and plan in the StarterKit shape,
with twelve hand-worked routing cases. The owner approved them with every default, then approved a static visual
mock at phone and desktop sizes. Only then was code written, in six slices: routing engine and tests first, then
the full simulation, then a playable 2D game, then the WebGL renderer with bloom, then the surrounding screens,
then packaging.

Things that broke: a keyboard test found that focus could not move into a field that was still hidden; bloom
washed amber toward yellow until the color mix was changed to preserve hue; the coastline simplifier returned
nothing for closed rings. The comparison against FRR took three attempts: the first had a wrong assumption in
the script about loopback cost, the second ran on a lab where one adjacency never formed, and the third, with a
health gate added, matched every expected route.

## What we'd tell the next builder

- Write the routing cases by hand before the engine exists, then check them twice: against a brute-force oracle and against a real router.
- Make the renderer draw only what the simulation computed. The replay, the tests and the videos then all come from the same command log.
- When an external check disagrees with you, check the checker's health before believing either side.
