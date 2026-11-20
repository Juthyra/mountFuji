// 0c - screenshot tests. Run: npm run test:shots                 (compare with the saved baseline images)
//                          npm run test:shots -- --update       (rewrite the baselines after an intended visual change)
//                          npm run test:shots -- --only winter  (only states whose name contains "winter")
//
// 4 seasons x 6 eras x day/night = 48 pictures. Each is taken in a fresh page with everything that moves frozen:
//   - era, season and time of day set independently (__fuji.pinScene; in the real timeline they are coupled)
//   - random particles off, the main loop paused, every endless CSS animation paused at its start, transitions finished
//   - traffic = a seeded, repeatable snapshot (__fuji.settleTraffic)
// Baselines are per platform (tests/screenshots/<platform>): fonts and anti-aliasing differ between macOS and Linux.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch");
const { openPage, pad, padL } = require("./lib");

const SEASONS = ["spring", "summer", "autumn", "winter"];
const ERAS = [                                   // growth 0..1, taken from the middle of each era
  { name: "village", g: 0.107 }, { name: "town", g: 0.375 }, { name: "city1", g: 0.518 },
  { name: "city2", g: 0.607 }, { name: "city3", g: 0.696 }, { name: "mega", g: 0.93 }
];
const TIMES = [{ name: "day", tod: 0.5 }, { name: "night", tod: 0.02 }];
const VIEW = { width: 640, height: 360 };      // small on purpose: 48 baseline PNGs live in git (about 6 MB at this size, 15 MB at 960x540)
const MAX_DIFF = 0.0015;                         // fail when more than 0.15 % of the pixels differ (identical code measured 0.00-0.06 %)
const PIXEL_THRESHOLD = 0.1;                     // per-pixel colour tolerance (0 strict .. 1 anything), absorbs anti-aliasing noise
const CONCURRENCY = 4;

const platform = `${os.platform()}-${os.arch()}`;
const DIR = path.join(__dirname, "screenshots", platform);
const DIFF_DIR = path.join(__dirname, "screenshots", "__diff__");
const update = process.argv.includes("--update");
const onlyIdx = process.argv.indexOf("--only");
const only = onlyIdx > 0 ? process.argv[onlyIdx + 1] : null;

const STATES = [];
for (const s of SEASONS.keys()) for (const e of ERAS) for (const t of TIMES)
  STATES.push({ name: `${SEASONS[s]}-${e.name}-${t.name}`, season: s, g: e.g, tod: t.tod });

async function shoot(st) {
  const { browser, page, errors } = await openPage(VIEW);
  try {
    await page.keyboard.press("p");                                                    // seasonal particles off (they are random)
    await page.evaluate(() => window.__fuji.quality(0));
    await page.evaluate((st) => window.__fuji.pinScene(st.g, st.season, st.tod), st);
    await new Promise((r) => setTimeout(r, 2200));                                     // let palette, era props and animation classes settle
    await page.evaluate((st) => {
      window.__fuji.setPaused(true);
      window.__fuji.settleTraffic(st.g, 90);
      document.getAnimations().forEach((a) => {
        const it = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming().iterations : 1;
        if (it === Infinity) { a.pause(); a.currentTime = (a.effect && a.effect.target && a.effect.target.id === "ltTrain") ? 6400 : 0; }   // local train parked off-screen, gates open
        else { try { a.finish(); } catch (e) {} }
      });
    }, st);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 400)))));
    const buf = await page.screenshot({ type: "png" });
    return { buf, errors };
  } finally { await browser.close(); }
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  fs.rmSync(DIFF_DIR, { recursive: true, force: true });
  const todo = STATES.filter((s) => !only || s.name.includes(only));
  const rows = [], failures = [];
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      const st = todo[next++];
      let res;
      let lastErr = null;
      for (let attempt = 0; attempt < 3 && !res; attempt++) {                  // Chrome occasionally times out while starting under load: retry, it is not a picture problem
        try { res = await shoot(st); } catch (e) { lastErr = e; }
      }
      if (!res) { rows.push({ st, status: "ERROR", detail: String(lastErr.message || lastErr) }); failures.push(`${st.name}: could not take the screenshot after 3 tries: ${lastErr.message}`); continue; }
      const file = path.join(DIR, st.name + ".png");
      if (res.errors.length) { failures.push(`${st.name}: ${res.errors.length} JS/console error(s): ${res.errors[0]}`); }
      if (update || !fs.existsSync(file)) {
        fs.writeFileSync(file, res.buf);
        rows.push({ st, status: update ? "updated" : "NEW", detail: "" });
        if (!update) failures.push(`${st.name}: no baseline image (run with --update to create it)`);
        continue;
      }
      const a = PNG.sync.read(fs.readFileSync(file)), b = PNG.sync.read(res.buf);
      if (a.width !== b.width || a.height !== b.height) { rows.push({ st, status: "FAIL", detail: "size changed" }); failures.push(`${st.name}: image size changed`); continue; }
      const diff = new PNG({ width: a.width, height: a.height });
      const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: PIXEL_THRESHOLD });
      const frac = n / (a.width * a.height);
      if (frac > MAX_DIFF) {
        fs.mkdirSync(DIFF_DIR, { recursive: true });
        fs.writeFileSync(path.join(DIFF_DIR, st.name + ".diff.png"), PNG.sync.write(diff));
        fs.writeFileSync(path.join(DIFF_DIR, st.name + ".actual.png"), res.buf);
        rows.push({ st, status: "FAIL", detail: `${(frac * 100).toFixed(2)}% pixels differ` });
        failures.push(`${st.name}: ${(frac * 100).toFixed(2)}% of pixels differ (limit ${(MAX_DIFF * 100).toFixed(1)}%), see tests/screenshots/__diff__/`);
      } else rows.push({ st, status: "ok", detail: `${(frac * 100).toFixed(3)}%` });
    }
  }
  const t0 = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  rows.sort((x, y) => STATES.indexOf(x.st) - STATES.indexOf(y.st));
  console.log(`\nScreenshots (${platform}), ${todo.length} states, ${((Date.now() - t0) / 1000).toFixed(0)} s, limit ${(MAX_DIFF * 100).toFixed(1)}% differing pixels\n`);
  for (const r of rows) console.log(pad(r.st.name, 24) + pad(r.status, 9) + r.detail);
  if (failures.length) { console.log("\nFAILED:\n  " + failures.join("\n  ")); process.exit(1); }
  console.log(update ? "\nBaselines written to " + path.relative(process.cwd(), DIR) : "\nAll screenshots match.");
})().catch((e) => { console.error(e); process.exit(2); });
