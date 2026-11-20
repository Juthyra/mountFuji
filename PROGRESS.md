# Progress log — Mount Fuji · A City Grows

Single source of truth for **what changed** and **what to do next**.
Rule: every PR adds an entry at the top of the Changelog and updates *Next steps* (see CONTRIBUTING.md).

_Last updated: 2026-11-20 · Stack: single-file HTML + SVG + vanilla JS (no build step)_

## Current status
`main` has everything through the performance and smoothness work (#14). Branch `feature/perf-probe-and-tests` adds Phase 0 steps 0a and 0b: headless traffic-safety tests and a performance probe with a baseline (`npm test`). Next in Phase 0: screenshot tests (0c) and a GitHub Action (0d). Still one self-contained `index.html`, no libraries.

See `IMPROVEMENTS.md` for review findings and their status.

## Changelog (newest first)

### 2026-11-20 — `feature/perf-probe-and-tests` (Phase 0, steps 0a + 0b)
- **Added — `npm run test:sim` (0a).** Runs the real traffic simulation headlessly (your installed Chrome, via `puppeteer-core`) for 600 simulated seconds at 10 growth levels, each in a **fresh page**, then the frame-smoothness test at 144 / 60 / 24 Hz and jitter. Fails (exit 1) if any safety counter is not 0 (overlaps, red-light runs, vehicle/pedestrian conflicts, pedestrian overlaps, rail conflicts, rail-gate runs, jumps, hard brakes), if peak acceleration or smallest gap leaves its limit, if smoothness p99 > 1.5, or if there is any JS or console error. It also fails when traffic did not flow (fewer than 30 vehicles passed, or no pedestrian ever crossed), because a run of zeros means nothing if nothing moved. About 13 s.
- **Added — `npm run test:probe` (0b).** For four states (village, town, city phase 3, megacity night) it measures SVG node count, running CSS animations, frames per second and main-thread / style / script time per frame, 3 fresh-page runs, median. Node count (+10 %) and running animations (+20 %) are **exact hard budgets** against `tests/baseline.json`; timing is compared and only **warns** at +50 % because it varies about ±15 % between identical runs on one machine (and far more with machine load). About 2 min. `npm run test:probe -- --update` rewrites the baseline after an intended change.
- **Proved the tests can fail:** a copy with the rail gates disabled fails with 876–3,157 rail conflicts; a copy with 900 extra nodes fails the node budget (+15 %); a copy where cars never pass fails the "traffic must flow" check.
- **Found by the new checks and fixed in `index.html`:**
  - Every car logged `<rect> attribute height: A negative value is not valid ("-2")`: the driver-torso rectangle had a negative height on short bodies. Earlier "no JS errors" checks listened only for page errors, not console errors. The torso is now skipped when its height would be ≤ 0 (the picture is unchanged, since the browser never drew it); 6 fewer nodes.
  - `simTest` was not repeatable (a second run in the same page differed). `resetTraffic()` now clears stale per-vehicle rail state. Exact repeatability still needs a fresh page, which `test:sim` uses.
- **Result on a quiet re-run:** all 10 growth levels pass with 0 overlaps, 0 red-light runs, 0 conflicts and 0 rail conflicts. The rail edge case recorded earlier at growth .58 / .60 did **not** reproduce in repeatable runs; it came from state carried between runs in one page (see `IMPROVEMENTS.md` #36).
- **Measured, exact:** 6,139 scene nodes in every era (the whole city is pre-built); running animations 33 (village), 37 (town), 29 (city), 151 (megacity night, stars on).
- **Added dev tooling:** `package.json`, `package-lock.json`, `.gitignore`, `tests/`. The app is still the single `index.html` with no dependencies; Node is needed only to run the tests.
- Known limits: headless Chrome here is software-rendered, so fps and ms say nothing about a phone; timing baselines are from one Mac and must be re-recorded on another machine. No screenshot tests and no CI yet (steps 0c and 0d).

### 2026-11-20 — `feature/performance-smoothness`
- **Changed — every kind of element now runs on its own clock** instead of "everything, every frame": signals 10 Hz, vehicles 30 Hz, bicycles 24 Hz, pedestrians 20 Hz, colour palette 10 Hz, HUD 5 Hz, audio levels 10 Hz; camera parallax, sun/moon and the drawing of vehicles and people stay at display rate (interpolated). The table is in `README.md`.
- **Added — frame governor.** It watches the real frame interval and steps between three quality levels (`full` → `balanced` → `light`: slower clocks and fewer particles) after 2 s of slow frames, and steps back up after 6 s of headroom. The first 4 s are ignored (start-up is always slow). `__fuji.quality(0|1|2|"auto")` and `__fuji.perf()` expose it.
- **Changed — the palette is the expensive part.** About 60 CSS variables restyle ~6,000 SVG nodes whenever one changes. They are now written at 10 Hz and only when the value actually changed (`setVar` cache); scrubbing the slider forces 30 Hz so it stays responsive.
- **Changed — animations that cannot be seen are switched off.** In a profiling A/B (CSS injected into the live page) the always-running CSS animations were the largest single cost (megacity 24.2 → 28.4 fps with stars, beacons, LEDs, smoke and crane jibs disabled). Now: the 110 star twinkles stop by day, smoke stops after the village era, LED hue-shift runs only in the megacity, crane jibs pause while a crane is invisible, and the 90 aircraft-warning beacons blink from **two shared JS clocks** (one class toggle each) instead of 90 separate CSS animations.
- **Added — the level crossing is now part of the simulation.** The gates and train were decoration; cars drove through them. The gates now close ~4 s before the local train reaches the road and open ~0.6 s after it clears (train position measured from the rendered train: on the road for ~1.3 s). Vehicles stop at a rail stop line, and "don't block the box": they will not enter the tracks unless the queue ahead leaves room to clear them (also predictive while the pedestrian light ahead is red).
- **Fixed — new vehicles braked hard on entry.** A vehicle spawned behind a stopped queue entered at cruising speed with less than IDM's equilibrium gap and had to brake at ~3.6. It now enters already at the equilibrium gap (`s0 + v·T`).
- **Changed — test hooks:** `__fuji.pinDays(d)` freezes the era but lets day and night run; `simTest` now also reports `railConflicts` / `railRuns`.
- **Verified (10 simulated minutes at growth .3 .4 .5 .55 .58 .6 .62 .65 .75 1.0):** 0 vehicle overlaps (smallest gap 0.08–0.12 in dense traffic), 0 red-light runs, 0 vehicle/pedestrian conflicts, 0 pedestrian overlaps, 0 hard brakes, peak acceleration ≤ 1.5, 0 rail-gate runs. Rail conflicts: 0 at every level except .58/.60, where one slow car sits with its rear a few cm into the rail bed for ~2.6 s of simulated time. Frame smoothness (`frameTest`, 144/60/24 Hz) p99 render noise 0.18–0.91, same as before. No JS errors. Seeded city layout unchanged.
- **Measured (software-rendered Chrome, busy machine, megacity, 2 runs each):** 14.8 → 18.9 fps (+28 %), main-thread 21.0 → 19.8 ms per frame; an earlier A/B on the same machine gave 28.6 → 20.9 ms. Not tested on a real GPU or a phone. Per-element brightness filters, the sun/moon drop-shadow and the mist blur showed no measurable cost, so they were left alone.
- Known limits: hidden-tab pause is still open (#8); the palette's own contribution was not isolated from the animation change; the test starts with the gates open because the rail era is only ever reached through the time-lapse.

### 2026-11-20 — `feature/traffic-simulation`
- **Changed — vehicles now drive like real traffic.** Cars, taxis, buses and bicycles follow the **Intelligent Driver Model**: each accelerates toward its own speed and brakes smoothly for whatever is ahead (the vehicle in front, a red light, people on the crossing). They can no longer overlap (a "bumpers never touch" check backs the maths up). Vehicles queue at stop lines, accelerate gently when the light turns green, and show **brake lights** when slowing or stopped. Yellow is handled like a driver: if they cannot stop comfortably they go through, and the decision does not flip mid-brake. Bicycles use the same engine in their own lane and pedal in proportion to their real speed.
- **Added — a working pedestrian crossing.** Traffic-signal heads on both kerbs (vehicle red/yellow/green plus pedestrian red/green, flashing green at the end; repeaters for the oncoming lane). The cycle is vehicles green → yellow → all red → **pedestrians WALK** → flashing → all red. Pedestrians only start crossing during WALK; vehicles only get green when the crossing is empty (and the controller waits for traffic to clear before releasing people). After crossing, people step onto the pavement and fade out; new ones arrive at the kerb and wait. Before the lights exist (town era) people cross freely and cyclists still give way.
- **Changed — pedestrians never overlap.** Pavement walkers use four lanes (two kerbs × two directions) with one speed per lane, so nobody overtakes or walks through anybody; the Kabukichō crowd does the same. Every crosser has its own crossing line.
- **Added — each kind of mover has its own calculation rate.** Signals 10 Hz, vehicles 30 Hz, bicycles 24 Hz, pedestrians 20 Hz, each on a fixed-timestep clock. Drawing **interpolates** between the last two steps, so motion is smooth at any screen refresh rate and does not depend on frame rate.
- **Changed — performance-safe rendering:** depth ordering is done per lane (lanes never overlap on screen) and only moves nodes that are out of order; parked vehicles and standing people cost no DOM writes. (A first version sorted everything and cut the frame rate to a third; fixed before merging.)
- **Changed — sound:** the pedestrian "pi-po" chime now plays only while the signal shows WALK (it was random).
- **Added — test hooks:** `__fuji.simTest(seconds, growth)` runs the real simulation and reports overlaps, red-light runs, vehicle/pedestrian conflicts, pedestrians starting off WALK, pedestrian overlaps, peak acceleration and jerk. `__fuji.frameTest(frames, fps|"jitter", growth)` drives update + render at a chosen frame pacing and measures how smooth the drawn motion is. `__fuji.traffic()` shows the live signal state.
- **Verified (10 simulated minutes at 5 city stages):** 0 vehicle overlaps (smallest gap 0.08–0.12), 0 red-light runs, 0 vehicle/pedestrian conflicts, 0 pedestrians starting off WALK, 0 pedestrian overlaps, 0 hard-braking events; peak acceleration 1.5 (was hitting the 5.0 limit before the yellow-light fix), jerk-limited to 5. Rendered motion at 144 / 60 / 24 fps and jittery pacing: 99th-percentile acceleration noise 0.5–0.9 D/s². Frame rate in a software-rendered browser about 5–8 % below before (22.8 vs 24.8 city, 22.8 vs 24.0 megacity). Screenshots reviewed (WALK, green, yellow, night, town). Not tested on real GPUs or phones.
- Known limits: one signalised crossing; no lane changes, turning, overtaking or emergency vehicles; people cross only at the zebra crossing.

### 2026-11-20 — `feature/realistic-cars`
- **Changed — cars:** the 14 background cars and 5 taxis were flat side-on boxes. They are now drawn **head-on** (oncoming lane: windscreen with driver and optional passenger, wipers, mirrors, grille and badge, headlights, fog/indicator lamps, bumper, number plate) and **from behind** (receding lane: rear window with headrests, high brake light, wrap-around tail lights, plate, bumper, exhaust). Four body types (sedan, hatchback, SUV, kei van), ten paint colours, glass reflections, body sheen and edge shading, ground shadow. Taxis have a roof lamp. At night each car casts a headlight / tail-light pool on the road.
- Car variety uses its own tiny rng, so the seeded city layout is unchanged (verified: pedestrians, buildings, landmarks and street items are byte-identical to `main`).
- **Added — upgrade path in `IMPROVEMENTS.md`:** beginner-level explanation of modules, Vite and Canvas, when each is worth doing, and a phased combined plan (measure → Vite + modules → single-file build → optional TypeScript → Canvas). No code changed for this.
- **Verified:** no JS errors; close-up showcase of every body type front/rear, and in-scene day / night screenshots reviewed. SVG nodes 5,764 → 6,297. Not tested on real GPU devices.

### 2026-11-20 — `feature/realistic-vehicles`
- **Changed — buses:** the old bus was a flat side-on box with a row of windows, which is wrong for traffic driving toward and away from the viewer. Buses are now drawn **head-on** (oncoming lane: destination board, split windscreen with driver, wipers, grille, number plate, headlights and indicators, mirrors) and **from behind** (receding lane: rear window with passengers, high brake light, engine louvres, tail lights, number plate), with roof air-conditioner, livery band (green / blue / red), bumper, tyres and a ground shadow. Headlights and tail lights glow at night through the existing `carGlow` layer.
- **Changed — bicycles:** replaced the side-profile bike with a city bike (mamachari) seen **head-on** (basket with shopping bag, dynamo lamp, handlebar, fork) or **from behind** (rear rack, red reflector, optional rucksack). Riders have varied clothes, hair and skin, **pedalling legs** and a slight body sway; the left side rides toward the viewer and the right side away, matching the cars.
- **Verified:** loaded with no JS errors; close-up and in-scene screenshots reviewed (day and night); pedalling animation confirmed by sampling the transforms over time. SVG nodes 5,520 → 5,764. Taxis/cars were not changed. Not tested on real GPU devices.

### 2026-11-20 — `bug/responsive-hud-overlap`
- **Fixed — hint overlapping the controls:** the hint was pinned bottom-right while the panel is centred, so they collided on every window between ~1,000 and 1,900 px wide. Both now live in one bottom `#dock` (hint above, panel below), so they cannot overlap at any size. The hint also fades out after ~18 s.
- **Fixed — title vs fast-forward toast:** the toast moved to the top-right; on phones the title sits below it.
- **Fixed — panel running off-screen at 320 px:** the panel now wraps; on ≤560 px it spans the width with the slider on its own row.
- **Changed — touch friendly:** buttons ≥40 px (44 px on touch devices), a taller slider hit area, touch wording in the hint, icon-only buttons keep their labels for screen readers.
- **Changed — short screens:** on short windows (landscape phones) the title shrinks and the district row / hint are hidden; safe-area insets and `100dvh` are respected.
- **Verified:** a layout probe at 12 sizes (320×568 … 2560×1440, plus 844×390 and 900×300) found 0 overlaps, 0 off-screen elements, 0 undersized targets (before: overlaps at 11 of 12 sizes). Screenshots at phone, laptop and landscape sizes reviewed. Not tested on real devices.

### 2026-11-20 — `feature/era-scenery`
- **Added — Village (農村 Farming village):** rice paddies with water sheen and seedling rows, a far patchwork of fields, a stream with a wooden footbridge, thatched and tiled farmhouses (laundry lines, drying persimmons), haystacks, scarecrows, farmers in conical hats, a shrine with torii, stone lanterns and a sacred tree, utility poles with wires, vending machines and a bus stop.
- **Added — Town (商店街 Shopping street):** machiya shop-houses with noren curtains and lanterns, paper-lantern strings across the road (glow at night), market stalls, cyclists, and a railway crossing with a local train, lowering gates and blinking lights (the crossing bell in the soundscape is now synced to this train).
- **Added — City, 3 phases (駅前 Station district → ビジネス街 Business district → 繁華街 Downtown):** mid-rise blocks on the plain, a street grid, convenience-store pylon signs, rooftop billboards, a pedestrian overpass, taxis and buses, a commuter train on the viaduct, and an elevated expressway with moving headlight/taillight streams.
- **Added — Megacity (歌舞伎町 Kabukichō):** glass towers at the edges, animated LED screens on building walls, rooftop gardens on the skyline, a helicopter, and summer-night fireworks (with a synthesised boom).
- **Added — district caption:** a third HUD row that fades between the six districts.
- Day/night, season and growth all drive the new props through the existing CSS variables; new props use a second seeded rng, so the original city layout is unchanged.
- **Verified:** loaded in a browser with no JS errors; screenshots reviewed for every era; level crossing, fireworks, helicopter and audio sync exercised directly. SVG nodes 3.7k → 5.5k; frame rate in a software-rendered headless browser is similar before and after (about 18–23 fps both). **Not tested:** real GPU browsers, mobile.

### 2026-11-20 — `feature/kabukicho-soundscape`
- **Added — era-driven soundscape (WebAudio, still no audio files):** the sound now follows the timelapse instead of one static ambience.
  - Village: frogs (spring/summer nights), crickets, cicadas (summer days), temple bell, birds, wind chime, koto plucks.
  - Town: bicycle bells, muffled voices, level-crossing bell synced to the train, train rumble.
  - City (3 phases, c1/c2/c3 at growth .47/.56/.65): traffic rumble, stereo car passes, horns, crosswalk chime, crane clangs (only while cranes are visible), store chime, crowd babble growing each phase.
  - Megacity / Kabukicho at night: dense crowd, pachinko hiss and clatter, jackpot jingle, neon hum, formant-synthesised shouts and laughs, passing sirens, plane flyover synced to the plane.
- Added a safety compressor on the master bus; events pause during fast-forward as before.
- Added test hook `__fuji.renderAudio(growth, night, season, seconds)` (offline render → RMS/peak dBFS).
- **Verified:** loudness rises village ≈ −34 dB → megacity ≈ −20 dB RMS, peaks below −7 dB; live run has no errors and every era fires events. **Not auditioned by ear** — levels are in `auApply` / `auEvents` for tuning.

### 2026-11-20 — `feature/progress-log-and-haze-fix`
- **Fixed — black band behind the city:** `.hz0/.hz1/.hz2` stop-colour rules were missing on `main`, so the `#mtnHaze` gradient stops defaulted to opaque black. Restored the rules (plus `.hzm` and the middle stop in `#groundHaze`).
- **Fixed — `main` regression:** `main`'s `index.html` had lost the dense city, pedestrians and Kabukicho neon work. Brought in everything from `feature/realistic-street` (PRs #4, #5); conflicts resolved by taking that branch's `index.html`, since `main` only held older content.
- Added `IMPROVEMENTS.md` (code review findings, status and priorities).
- Added the rule that every PR updates `PROGRESS.md`; the pre-push hook now enforces it.

### 2026-11-19 — #5 `feature/building-detail-and-horizon`
- **Fixed — horizon band:** the ground-haze rectangle was drawn *on top of* the buildings, producing a pale stripe across the whole view. It now sits behind them and fades over a longer gradient.
- **Fixed — plain boxes:** near buildings gain floor-slab lines, vertical bays on long walls, ground-floor shopfronts with coloured awnings (lit at night), a lit corner edge, parapets and rooftop equipment (AC units, water tanks). Houses get a door.
- Back-row towers are narrower and vary in height; near blocks are narrower so Fuji stays the focal point.
- Skyline now extends to the screen edges as low-rise suburbs (no empty plain).
- Added this progress log and the rule to keep it updated.

### 2026-11-19 — #4 `feature/realistic-street`
- Atmospheric haze (distant buildings, ground and Fuji's base fade into sky colour, time-of-day aware).
- Lower, narrower skyline; finer window grids, fewer lit windows; sky-reflecting glass by day.
- Wall shading toward the street, building shadows on the road, calmer neon palette, 14 cars.
- Removed the sakura branch; softened sun rays; title now "Tokyo, looking west".

### 2026-11-19 — #3 `feature/dense-city-nightlife`
- Tighter blocks, second tower row, ~2.5× skyline density, 22 cars, city murmur in ambient sound.
- 62 pedestrians (walkers, crosswalk crossers, nightlife crowd) with leg animation.
- Kabukicho: red 歌舞伎町 一番街 gate, neon-signed block, red night haze.

### 2026-11-19 — #2 `feature/city-view`
- Lake, reflections, boat, shores removed. Camera moved to a perspective street looking toward Fuji.
- Houses → mid-rise → towers timelapse on both sides; trees → lamps; dirt → asphalt; traffic; torii across the road.

### 2026-11-19 — #1 `feature/branch-name-hook`
- `.githooks/pre-push`: only `feature/<action_name>` / `bug/<action_name>`; no direct push to `main`.

### Baseline (before this log)
- v2 of the reference scene: sun-side lighting on Fuji, sun rays, summit cloud, snow gullies, parallax, time slider, WebAudio ambience.
- Repo created; `main` protected by ruleset `protect-main` (PR required, no force-push/deletion, linear history); CONTRIBUTING, PR template, CODEOWNERS (@Juthyra).

## Roadmap — future phases (recorded, not started)
Detail, decision rules and risks are in `IMPROVEMENTS.md` → *Upgrade path*. Do the phases in order, one PR each, and keep the screenshot test green.
| Phase | What | Status |
|---|---|---|
| 0a | Run the traffic safety and smoothness tests headlessly with pass/fail (`npm run test:sim`) | ✅ |
| 0b | Performance probe: node count, running animations, ms per frame, baseline file (`npm run test:probe`) | ✅ |
| 0c | Screenshot tests (4 seasons × 6 eras × day/night, about 48 images) | 🔲 |
| 0d | GitHub Action runs 0a–0c on every PR (needs `gh auth refresh -h github.com -s workflow`) | 🔲 |
| 1 | Add **Vite**, move the file into `src/` unchanged, then split into **modules** one at a time (utils → palettes → fuji → city → street → vehicles/traffic → people → audio → hud) | 🔲 |
| 2 | Build step outputs a **single `index.html`** again (`vite-plugin-singlefile`) so "just open it" still works | 🔲 |
| 3 | Optional: **TypeScript**, one module at a time | 🔲 |
| 4 | **Canvas 2D** renderer behind the same simulation (only if Phase 0 numbers show SVG is too slow) | 🔲 |
| 5 | WebGL / PixiJS (only if Canvas 2D is still too slow) | 🔲 |
Other ideas parked for later: weather (rain / typhoon, wet-road reflections, rain sound), second crossing and side streets, lane changes and turning traffic, emergency vehicles, autumn lantern festival, slow camera drift.

## Next steps (priority order)
1. **Phase 0, steps 0c and 0d** (screenshot tests, then the GitHub Action). In parallel: **measure on real hardware** — open the page on a phone and a GPU laptop, record `__fuji.perf()` and fps here (`IMPROVEMENTS.md` #34), then decide whether Phase 0 (probe + screenshot tests) is next.
2. **CI branch-name check** — needs `gh auth refresh -h github.com -s workflow`; then add `.github/workflows/branch-name.yml` and mark the check required on `main`.
3. **Performance / structure** — see the phased *Upgrade path* in `IMPROVEMENTS.md` (Vite + modules first, Canvas only if measurements need it). Original note: move to **Vite + TypeScript** (modules: sky, fuji, street, people, hud, audio), then a **Canvas 2D / PixiJS** renderer; thousands of SVG nodes + 62 per-frame people is the current bottleneck.
4. **Realism, next level** — real textures/lighting (needs Canvas/WebGL), window reflections of the sky, wet-road reflections, depth-of-field on the far skyline.
5. **Weather** — rain / typhoon cycle, umbrellas, wet roads, lightning (not started).
6. **Life** — slow camera drift down the street, autumn lantern festival, more people on the village side (partly done: trains, cyclists, district caption, fireworks).
7. **Quality** — screenshot-based smoke test (seasons × eras × night) so visual regressions are caught.

## Known issues
- Kanji signs rely on system CJK fonts (Yu Gothic / Meiryo / Noto Sans JP); boxes appear on systems without one.
- Large far-left/right ground is a flat tone in the city eras; blocks and a street grid help but it is still plain at wide aspect ratios.
- Era props sit on the ground plane at |X| ≈ 1.5–2.4 × depth to avoid the near buildings, so they are small on screen; many are hidden at narrow aspect ratios.
- Scene is now ~5,500 SVG nodes; low-end devices may be slower (see IMPROVEMENTS.md).
- Near buildings are still simple extrusions (no real textures); tall back-row blocks can sit behind the title text.
- Verified in a desktop browser only; mobile/touch not tested. Ambient sound not auditioned by ear (levels verified numerically only).
