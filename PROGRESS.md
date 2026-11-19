# Progress log — Mount Fuji · A City Grows

Single source of truth for **what changed** and **what to do next**.
Rule: every PR adds an entry at the top of the Changelog and updates *Next steps* (see CONTRIBUTING.md).

_Last updated: 2026-11-19 · Stack: single-file HTML + SVG + vanilla JS (no build step)_

## Current status
Open PR stack — merge in this order, retargeting each PR's base to `main` after its parent merges:

| # | Branch | Base | Summary |
|---|---|---|---|
| 1 | `feature/branch-name-hook` | `main` | Local pre-push hook for branch naming |
| 2 | `feature/city-view` | `main` | Lake removed; street-level view toward Fuji |
| 3 | `feature/dense-city-nightlife` | #2 | Denser city, pedestrians, Kabukicho district |
| 4 | `feature/realistic-street` | #3 | Simpler, more realistic look (haze, lighting) |
| 5 | `feature/building-detail-and-horizon` | #4 | Facade detail, horizon-band fix |

## Changelog (newest first)

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
- Verified in a desktop browser only; mobile/touch not tested. Ambient sound not auditioned.
