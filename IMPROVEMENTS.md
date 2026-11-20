# Improvements — Mount Fuji · A City Grows

Review findings and what was done about them. `PROGRESS.md` records *what changed*; this file records *what could be better* and whether it was fixed.
Status: ✅ done · 🔲 open · 🚫 won't do

## Fixed
| # | Finding | Status | Where |
|---|---|---|---|
| 1 | Black band across the horizon: `.hz0/.hz1/.hz2` CSS rules missing on `main`, so gradient stops rendered opaque black | ✅ | `index.html` `<style>`, `#mtnHaze`, `#groundHaze` |
| 2 | `main` lost the dense-city / pedestrian / neon features and the horizon fix because stacked PRs were squash-merged out of order | ✅ | merged from `feature/realistic-street` |
| 3 | No rule forcing the progress log to be updated | ✅ | `CONTRIBUTING.md`, PR template, `.githooks/pre-push` |
| 13 | Sound was one static ambience that did not follow the eras | ✅ | `index.html` audio block (`auBuild`, `auLevels`, `auApply`, `auEvents`) |
| 14 | Village and town were an empty green plain with two plain boxes in front | ✅ | era scenery block (`prop`, `ground`, `farmhouse`, `machiya`) |
| 15 | City and megacity had no visible mid-ground or edge detail | ✅ | `block`, expressway, billboards, LED screens, rooftop gardens |
| 20 | HUD hint overlapped the controls; panel overflowed on small screens; touch targets too small | ✅ | `#dock`, responsive CSS in `index.html` |
| 21 | Bus and bicycle were drawn side-on although they drive toward/away from the viewer | ✅ | `drawBus`, `drawBike` in `index.html` |
| 22 | Cars were flat side-on boxes although they drive toward/away from the viewer | ✅ | `drawCar` in `index.html` (4 body types, head-on and rear views, taxi roof lamp, night light pools) |
| 23 | Vehicles wrapped around at random, could overlap, ignored people, and moved by raw speed × time (jerky, frame-rate dependent) | ✅ | traffic simulation block: IDM car-following, jerk limit, fixed-rate clocks + interpolation |
| 24 | Pedestrians bounced back and forth, overlapped, and crossed regardless of any light | ✅ | signal controller + pedestrian state machine; walkers in lanes |
| 25 | No way to prove movement is safe or smooth | ✅ | `__fuji.simTest` and `__fuji.frameTest` (numbers in `PROGRESS.md`) |
| 7 | `applyFrame()` rewrote ~60 CSS variables every frame, restyling ~6,000 nodes | ✅ | palette on its own 10 Hz clock, writes only changed values (`setVar`), forced 30 Hz while scrubbing |
| 30 | ~200 CSS animations ran all the time, even when invisible (stars by day, smoke after the village, LEDs before the megacity, hidden crane jibs, 90 beacons) | ✅ | classes `noStars` / `smokeOff` / `ledOn`, `.idle` crane, two shared beacon clocks |
| 31 | No frame budget: everything ran at display rate whatever the device | ✅ | frame governor + `QUALITY` levels (`__fuji.perf()`, `__fuji.quality()`) |
| 32 | Level-crossing gates and train were decoration; vehicles drove through them | ✅ | `RAIL`, `railUpdate`, don't-block-the-box in the vehicle step |
| 33 | New vehicles entered behind a queue at cruising speed and braked at ~3.6 | ✅ | `spawnVeh` caps entry speed at the equilibrium gap |

## Open — process
| # | Finding | Status | Notes |
|---|---|---|---|
| 4 | Stacked PRs drift: a child merged before its parent drops changes | 🔲 | Rebase onto fresh `main` before opening a PR; one concern per branch; do not stack |
| 5 | Nothing catches a `class` used in SVG markup with no CSS rule (cause of #1) | 🔲 | CI exists now (`.github/workflows/tests.yml`); add a small static check as a fourth job. The screenshot tests already catch the visible effect (#1 fails at 12-18 %) |
| 6 | No screenshot smoke test (seasons × eras × night) | ✅ | `npm run test:shots`: 48 pictures vs baseline, 0.15 % pixel limit. Not yet automatic on each PR (step 0d) |

## Open — code
| # | Finding | Status | Notes |
|---|---|---|---|
| 8 | Animation loop keeps running in a hidden tab | 🔲 | Pause on `visibilitychange` |
| 9 | ~3,700 SVG nodes + per-frame pedestrians are the performance bottleneck | 🔲 | Longer term: Canvas 2D / PixiJS renderer |
| 10 | Single 2,900-line file with a base64 font inline | 🔶 | Vite build done (`src/` -> single `index.html`). Still to do: split `src/main.js` into modules (see Roadmap Phase 1) |
| 11 | Kanji signs depended on system CJK fonts; tofu boxes without one | ✅ | `"FujiKanji"` embedded fallback (all 38 characters, 8.6 KB) in every font stack |
| 12 | Mobile / touch not tested; new soundscape not auditioned by ear | 🔲 | Test on a phone; tune levels by ear (shouts/laughs are synthetic and may need tweaking) |

| 16 | SVG is now ~5,500 nodes; per-frame cost grows with every prop | 🔲 | Batch props into paths, cache unchanged frames, or move to Canvas |
| 17 | Props are small because they must sit behind the near buildings | 🔲 | Re-design the camera so the mid-ground is visible, or add a wider/higher view |
| 18 | Weather (rain, typhoon, wet roads) not started | 🔲 | Needs particles plus a rain soundscape |
| 19 | Overpass, pylon signs and the local train are partly hidden by trees, the gate and near houses | 🔲 | Re-position or add a mode that hides the foreground |

## Upgrade path (suggestion, not started): Vite + modules, then Canvas
Do these **in order**, as two separate steps. Do not mix them in one PR.

### In plain words
- **Module** = one small file that does one job and shares only what it chooses to (`export` / `import`). Today everything is one 2,000-line file; modules split it into `sky.js`, `fuji.js`, `street.js`, `vehicles.js`, `audio.js`, `hud.js` …
- **Vite** = a free tool that runs on the developer's computer. It serves the modules while you work (instant reload) and, for release, **bundles** them back into a few small, fast files (it can even inline them into one HTML file again).
- **Canvas** = a browser surface you paint pixels onto every frame. Today the scene is ~6,000 SVG *objects* that the browser tracks one by one; on Canvas it would be *one* picture that we redraw 60 times a second. Far fewer things to track = faster.

### Why
| Problem today | Fix |
|---|---|
| One huge file: hard to find things, merge conflicts in the same lines (we already had some) | Modules (step 1) |
| ~6,000 SVG nodes; every frame the browser re-styles all of them; slow on weak phones | Canvas (step 2) |
| No build step: no checks, no tests, no type safety | Vite gives lint, tests, optional TypeScript |

### When to do it (decision rules)
- **Modules + Vite when:** the file keeps growing, two people edit it at once, or you want tests. Honest answer: we are at that point **now** (files conflict, finding code is slow).
- **Canvas when:** measured frame rate is poor on the devices we care about (target: 60 fps on a mid-range phone) **or** the node count passes ~8,000. Measure first (`__fuji` frame-time probe); if SVG is fast enough, skip Canvas.
- **Stay with one file when:** the project is a small personal demo that one person edits and it already runs smoothly. The one-file design is a real advantage (open `index.html`, done).

### Combined plan
| Phase | What | Risk | Done when |
|---|---|---|---|
| 0 | Add a frame-time / node-count probe and a screenshot test (seasons × eras × night) so we can prove nothing breaks | low | `npm run test:visual` passes on today's build |
| 1 | Add Vite; move the file into `src/` **unchanged**, then split into modules one at a time (utils → palettes → fuji → city → street → vehicles → people → audio → hud) | low–medium | output looks identical to Phase 0 screenshots |
| 2 | Build step outputs a **single `index.html`** as before (`vite-plugin-singlefile`) so "just open it" still works | low | `npm run build` gives one self-contained file |
| 3 | Optional: TypeScript, one module at a time | low | `tsc --noEmit` clean |
| 4 | Canvas 2D renderer behind the same simulation (sim state stays; only drawing changes). Start with the static far layers (sky, Fuji, skyline) drawn once and cached; then vehicles/people; keep SVG for HUD | **high** (largest rewrite) | same screenshots, ≥2× frame rate |
| 5 | Only if Canvas 2D is still too slow: WebGL / PixiJS | high | measured need |

Rules: one PR per phase; every phase keeps the screenshot test green; do not start Phase 4 before Phase 0 numbers show it is needed.

## Open — traffic and movement (new)
| # | Finding | Status | Notes |
|---|---|---|---|
| 26 | Only one crossing; no side streets, turning, lane changes, overtaking or emergency vehicles | 🔲 | Extend lanes + a small route graph |
| 27 | Pedestrians cross only at the zebra crossing (no mid-block, no waiting-for-bus behaviour) | 🔲 | Add destinations / simple goals |
| 28 | Traffic tests run only in a browser by hand | ✅ | `npm run test:sim` runs them headlessly (steps 0a); running them in CI is step 0d |
| 29 | Per-vehicle rendering is still ~60 SVG nodes each; many cars on screen is the main cost | 🔲 | Part of the Canvas phase |

## Open — performance (new)
| # | Finding | Status | Notes |
|---|---|---|---|
| 34 | All numbers came from software-rendered Chrome; real GPU and phones were untested | ✅ | Mac with GPU: about 52 fps in the megacity at full quality (`PROGRESS.md`). Phones and weaker laptops not tested, by decision |
| 35 | Hidden tab still runs audio and the simulation clocks catch up on return (#8) | 🔲 | Pause on `visibilitychange`, suspend the AudioContext |
| 36 | One slow car appeared to sit a few cm into the rail bed at growth .58–.60 | ✅ | Not reproduced in repeatable fresh-page runs; it came from state carried between runs in one page (`resetTraffic` now clears it). Re-check if rail conflicts ever show in `test:sim` |
| 37 | The palette's own cost was not measured separately from the animation change | 🔲 | `test:probe` now records ms per frame; extend it to toggle tiers (`__fuji.quality`) and compare |
| 38 | No automatic perf regression test | ✅ | `npm run test:probe`: node and animation budgets fail the run, timing warns. Not yet run on every PR (step 0d) |
| 39 | Every car logged an invalid `<rect>` (negative height) on load; earlier checks only listened for page errors, not console errors | ✅ | `drawCar` driver torso; `tests/lib.js` collects console errors too |
| 40 | `simTest` gave slightly different numbers when run twice in one page | ✅ | `resetTraffic` clears rail state; `test:sim` uses a fresh page per level |
| 41 | No CI: tests only run when someone runs them | ✅ | `.github/workflows/tests.yml`: `sim`, `probe`, `shots` on every PR |
| 43 | Screenshot baselines existed only for macOS arm64; Linux (CI) fonts and anti-aliasing differ | ✅ | `tests/screenshots/linux-x64/`, created on the runner |
| 45 | Kabukichō caption and gate sign (歌舞伎町) rendered as empty boxes without a Japanese system font (seen on the Linux runner) | ✅ | Same fix as #11: `"FujiKanji"` fallback font |
| 46 | The pre-push hook was committed non-executable, so branch-name and PROGRESS.md rules were not enforced locally | ✅ | `.githooks/pre-push` is now mode 100755 |
| 47 | The checks are not required: a red PR can still be merged, and branch rules are only enforced by the local hook | 🔲 | Owner: Settings → Branches → require `sim`, `probe`, `shots` and the branch-name rule |
| 48 | `ubuntu-latest` upgrades Chrome over time; anti-aliasing can shift and fail the Linux screenshots with no code change | 🔲 | Re-create the Linux baselines (see CONTRIBUTING); pin a Chrome version if it happens often |
| 44 | Screenshots are frozen and 640×360, so small details (one sign) and motion are not covered | 🔲 | Motion is covered by `test:sim`. Add a few full-size crops of key areas if small regressions start slipping through |
| 42 | Timing baseline in `tests/baseline.json` comes from one Mac under unknown load | 🔲 | Re-record on a quiet machine, or keep one per machine; never fail CI on it |

### How to run the traffic tests (browser console on `index.html`)
```js
__fuji.simTest(600, 1.0)        // 10 simulated minutes at megacity growth; want: overlaps 0, redRuns 0, pedConflicts 0, pedOverlaps 0, pedStartsOffWalk 0
__fuji.frameTest(2400, 60, .8)  // drawn-motion smoothness at 60 fps (also try 144, 24, "jitter"); want p99 below ~1
__fuji.traffic()                // live signal phase and pedestrian states
__fuji.perf()                   // governor: quality level, frame ms, measured Hz of every clock
__fuji.quality(0)               // force full quality (1 balanced, 2 light, "auto" to let the governor decide)
__fuji.pinDays(26)              // freeze the era but let day and night keep moving
```
`simTest` also reports `railConflicts` (a vehicle on the tracks while the train is on the road) and `railRuns` (crossing the gate stop line while shut); want both 0.

## How to use this file
- Add a row when you spot a problem; set status when it is fixed and mention the PR in `PROGRESS.md`.
