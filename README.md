# Mount Fuji — 富士山 · A City Grows

An animated single-file SVG/JS timelapse. You stand in the main street of a settlement and look toward Mount Fuji while it grows from a village into a megacity (Kabukichō) through the seasons and the day/night cycle.

Open `index.html` in any modern browser. No build step, no libraries, no external files.

## Controls

| Input | Action |
|---|---|
| Hold mouse / `F` / `Shift` | fast-forward |
| `Space` | pause / play |
| `R` | restart |
| `P` | seasonal particles |
| `M` | ambient sound |
| Slider | scrub time of day |

## What you see

| Era | Scene |
|---|---|
| Village | paddies, stream, farmhouses, shrine, temple bell, frogs and crickets |
| Town | machiya, lantern strings, stalls, a railway crossing with a local train |
| City (3 phases) | blocks, street grid, overpass, expressway, cranes, a signalised pedestrian crossing |
| Megacity | LED screens, rooftop gardens, helicopter, fireworks, the Kabukichō gate |

Sound is synthesised in the browser (WebAudio) and follows the era, the season and the time of day.

## How traffic works

Cars, taxis, buses and bicycles follow the **Intelligent Driver Model**: each one accelerates toward its own speed and brakes smoothly for whatever is ahead, so nothing overlaps and nothing teleports. A signal controller runs vehicle green, yellow, all red, pedestrian WALK, flashing, all red. Pedestrians cross only on WALK, and vehicles are held until the crossing is empty. At the railway crossing the gates close about 4 s before the train, and vehicles will not enter the tracks unless the queue ahead leaves room to clear them.

## How it stays smooth

Every kind of element has its own update rate instead of everything updating every frame. Drawing of moving things is **interpolated** between the last two simulation steps, so motion looks the same at 24, 60 or 144 Hz.

| Element | Rate |
|---|---|
| Camera parallax, sun and moon, drawing of vehicles and people | every display frame |
| Cars and buses | 30 Hz |
| Bicycles | 24 Hz |
| Pedestrians | 20 Hz |
| Traffic signals and level crossing | 10 Hz |
| Colour palette (about 60 CSS variables) | 10 Hz, only changed values are written |
| Audio levels | 10 Hz |
| HUD text | 5 Hz |
| Aircraft beacons | two shared clocks, only at night |

Animations nobody can see are switched off (stars by day, smoke after the village era, LED colour shift before the megacity, hidden crane jibs).

A **frame governor** watches the real frame interval. After 2 s of slow frames it drops to a lighter level, and after 6 s of headroom it goes back up:

| Level | Palette | HUD | Audio | Cars / bikes / people | Particles |
|---|---|---|---|---|---|
| full | 10 Hz | 5 Hz | 10 Hz | 30 / 24 / 20 Hz | 90 |
| balanced | 6 Hz | 4 Hz | 6 Hz | 24 / 20 / 15 Hz | 45 |
| light | 4 Hz | 3 Hz | 4 Hz | 20 / 15 / 12 Hz | 20 |

## Testing from the browser console

```js
__fuji.simTest(600, 1.0)        // 10 simulated minutes: overlaps, red-light runs, conflicts, rail conflicts (all want 0)
__fuji.frameTest(2400, 60, .8)  // motion smoothness at 60 Hz (also 144, 24, "jitter"); want p99 below ~1
__fuji.perf()                   // quality level, frame ms, measured rate of every clock
__fuji.quality(0)               // force a quality level (0 full, 1 balanced, 2 light, "auto")
__fuji.pinDays(26)              // freeze the era, day and night keep moving
__fuji.pin(26, .02)             // freeze era and time of day
__fuji.traffic()                // live signal phase and pedestrian states
__fuji.renderAudio(1, .5, 0, 4) // render the soundscape offline and measure levels
```

Measured numbers and known limits are in `PROGRESS.md` and `IMPROVEMENTS.md`. Frame rates so far come from software-rendered Chrome; a real GPU and phones are untested.

## Files

| File | Purpose |
|---|---|
| `index.html` | the whole app |
| `PROGRESS.md` | changelog, current status, roadmap, next steps (updated in every PR) |
| `IMPROVEMENTS.md` | review findings with status, upgrade path (Vite, modules, Canvas) |
| `CONTRIBUTING.md` | branch and PR rules |
| `.githooks/`, `.github/` | pre-push hook (enforces branch names and a `PROGRESS.md` entry), PR template |

Run `git config core.hooksPath .githooks` once after cloning so the hook is active.

See `CONTRIBUTING.md` for the branch and PR rules.
