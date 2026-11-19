# Progress log — Mount Fuji · A City Grows

Single source of truth for **what changed** and **what to do next**.
Rule: every PR adds an entry at the top of the Changelog and updates *Next steps* (see CONTRIBUTING.md).

_Last updated: 2026-11-20 · Stack: single-file HTML + SVG + vanilla JS (no build step)_

## Current status
`main` had fallen behind the feature branches: it was missing the haze CSS (black band at the horizon) and the dense-city / neon / pedestrian work. Branch `feature/progress-log-and-haze-fix` brings `main` up to date with `feature/realistic-street` (PRs #4 and #5). Once it is merged, the older stacked branches (`city-view`, `dense-city-nightlife`, `realistic-street`, `building-detail-and-horizon`) are superseded and can be deleted.

See `IMPROVEMENTS.md` for the review findings and their status.

## Changelog (newest first)

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

## Next steps (priority order)
1. **Merge the PR stack** (#1 → #2 → #3 → #4 → #5), retargeting bases to `main` as parents merge. Owner only.
2. **CI branch-name check** — needs `gh auth refresh -h github.com -s workflow`; then add `.github/workflows/branch-name.yml` and mark the check required on `main`.
3. **Performance / structure** — move to **Vite + TypeScript** (modules: sky, fuji, street, people, hud, audio), then a **Canvas 2D / PixiJS** renderer; thousands of SVG nodes + 62 per-frame people is the current bottleneck.
4. **Realism, next level** — real textures/lighting (needs Canvas/WebGL), window reflections of the sky, wet-road reflections, depth-of-field on the far skyline.
5. **Weather** — rain / typhoon cycle, umbrellas, wet roads.
6. **Life** — elevated Yamanote-style train, slow camera drift down the street, district label that fades in.
7. **Quality** — screenshot-based smoke test (seasons × eras × night) so visual regressions are caught.

## Known issues
- Kanji signs rely on system CJK fonts (Yu Gothic / Meiryo / Noto Sans JP); boxes appear on systems without one.
- Large far-left/right ground is a flat tone; suburbs help but it is still plain at wide aspect ratios.
- Near buildings are still simple extrusions (no real textures); tall back-row blocks can sit behind the title text.
- Verified in a desktop browser only; mobile/touch not tested. Ambient sound not auditioned by ear (levels verified numerically only).
