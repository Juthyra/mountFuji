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

## How to use this file
- Add a row when you spot a problem; set status when it is fixed and mention the PR in `PROGRESS.md`.
