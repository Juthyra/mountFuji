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

## Open — process
| # | Finding | Status | Notes |
|---|---|---|---|
| 4 | Stacked PRs drift: a child merged before its parent drops changes | 🔲 | Rebase onto fresh `main` before opening a PR; one concern per branch; do not stack |
| 5 | No CI. Nothing catches a `class` used in SVG markup with no CSS rule (cause of #1) | 🔲 | Add a workflow running a small script; needs `gh auth refresh -h github.com -s workflow` |
| 6 | No screenshot smoke test (seasons × eras × night) | 🔲 | Headless browser, compare against baseline |

## Open — code
| # | Finding | Status | Notes |
|---|---|---|---|
| 7 | `applyFrame()` rewrites ~28 CSS variables and many attributes every frame | 🔲 | Update only when time of day / season changes noticeably |
| 8 | Animation loop keeps running in a hidden tab | 🔲 | Pause on `visibilitychange` |
| 9 | ~3,700 SVG nodes + per-frame pedestrians are the performance bottleneck | 🔲 | Longer term: Canvas 2D / PixiJS renderer |
| 10 | Single 1,500+ line file with an ~80 KB base64 font inline | 🔲 | Longer term: Vite + modules (sky, fuji, street, people, hud, audio) |
| 11 | Kanji signs depend on system CJK fonts; tofu boxes without one | 🔲 | Embed a subset or fall back to non-text signs |
| 12 | Mobile / touch not tested; new soundscape not auditioned by ear | 🔲 | Test on a phone; tune levels by ear (shouts/laughs are synthetic and may need tweaking) |

| 16 | SVG is now ~5,500 nodes; per-frame cost grows with every prop | 🔲 | Batch props into paths, cache unchanged frames, or move to Canvas |
| 17 | Props are small because they must sit behind the near buildings | 🔲 | Re-design the camera so the mid-ground is visible, or add a wider/higher view |
| 18 | Weather (rain, typhoon, wet roads) not started | 🔲 | Needs particles plus a rain soundscape |
| 19 | Overpass, pylon signs and the local train are partly hidden by trees, the gate and near houses | 🔲 | Re-position or add a mode that hides the foreground |

## How to use this file
- Add a row when you spot a problem; set status when it is fixed and mention the PR in `PROGRESS.md`.
