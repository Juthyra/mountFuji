// 0b - performance probe. Run: npm run test:probe            (compare with tests/baseline.json)
//                           npm run test:probe -- --update   (rewrite the baseline after an intended change)
//
// What is measured, and how much to trust it:
//   scene nodes, running animations  EXACT   -> hard budget, fails the run
//   main-thread ms per frame         NOISY   -> compared with the baseline, only warns (depends on the machine and what else is running)
//   frames per second                NOISY   -> printed, never fails (headless Chrome is software-rendered, so it says nothing about a phone)
const fs = require("fs");
const os = require("os");
const path = require("path");
const { ROOT, openPage, median, pad, padL } = require("./lib");

const BASELINE = path.join(__dirname, "baseline.json");
const STATES = [                    // pin(days, timeOfDay): era frozen at a representative point
  { name: "village",         days: 3,    tod: 0.30 },
  { name: "town",            days: 11,   tod: 0.30 },
  { name: "city (phase 3)",  days: 19.5, tod: 0.30 },
  { name: "megacity night",  days: 26,   tod: 0.02 }
];
const RUNS = Number(process.env.PROBE_RUNS) || 3;   // fresh page per run, median taken
const MEASURE_SECONDS = 4;
const BUDGET = { nodes: 1.10, animations: 1.20, ms: 1.50 };   // allowed growth over baseline (ms is warn-only)

async function measure(state) {
  const { browser, page, errors } = await openPage();
  await page.evaluate(() => window.__fuji.quality(0));                     // fixed quality: the governor must not change the workload mid-measurement
  await page.evaluate((d, t) => window.__fuji.pin(d, t), state.days, state.tod);
  await new Promise((r) => setTimeout(r, 2000));                           // settle with era AND time of day frozen: counts below are exact
  const nodes = await page.evaluate(() => document.querySelectorAll("svg.scene *").length);
  const dom = await page.evaluate(() => document.querySelectorAll("*").length);
  const anims = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
  await page.evaluate((d) => window.__fuji.pinDays(d), state.days);        // now unfreeze the clocks (era stays, day and night move) for the timing
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate((secs) => {
    window.__probe = { n: 0, t0: performance.now(), done: false };
    (function f() { window.__probe.n++; if (performance.now() - window.__probe.t0 < secs * 1000) requestAnimationFrame(f); else window.__probe.done = performance.now(); })();
  }, MEASURE_SECONDS);
  const m0 = await page.metrics();
  await page.waitForFunction("window.__probe.done", { timeout: (MEASURE_SECONDS + 20) * 1000 });
  const m1 = await page.metrics();
  const p = await page.evaluate(() => ({ n: window.__probe.n, wall: (window.__probe.done - window.__probe.t0) / 1000 }));
  await browser.close();
  const per = (k) => ((m1[k] - m0[k]) * 1000) / p.n;
  return { nodes, dom, anims, fps: p.n / p.wall, mainMs: per("TaskDuration"), styleMs: per("RecalcStyleDuration"), scriptMs: per("ScriptDuration"), errors: errors.length };
}

(async () => {
  const update = process.argv.includes("--update");
  const results = {};
  for (const s of STATES) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measure(s));
    results[s.name] = {
      nodes: Math.round(median(runs.map((r) => r.nodes))), dom: Math.round(median(runs.map((r) => r.dom))), animations: Math.round(median(runs.map((r) => r.anims))),
      fps: +median(runs.map((r) => r.fps)).toFixed(1), mainMs: +median(runs.map((r) => r.mainMs)).toFixed(1), styleMs: +median(runs.map((r) => r.styleMs)).toFixed(1), scriptMs: +median(runs.map((r) => r.scriptMs)).toFixed(1),
      errors: Math.max(...runs.map((r) => r.errors))
    };
  }

  if (update) {
    const { browser } = await openPage();
    const chrome = await browser.version(); await browser.close();
    const out = { note: "Baseline for tests/probe.js. nodes and animations are exact budgets. mainMs and fps are from this machine only (software-rendered headless Chrome) and are used for warnings, not failures.",
      recorded: new Date().toISOString().slice(0, 10), machine: `${os.platform()} ${os.arch()}, ${os.cpus().length} cores`, chrome, states: results };
    fs.writeFileSync(BASELINE, JSON.stringify(out, null, 2) + "\n");
    console.log("Baseline written to tests/baseline.json\n");
  }
  const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")) : null;

  const failures = [], warnings = [];
  console.log(pad("state", 17) + padL("nodes", 7) + padL("dom", 7) + padL("anims", 7) + padL("fps", 7) + padL("main ms", 9) + padL("style ms", 9) + padL("script ms", 10) + "   vs baseline (nodes / anims / main ms)");
  for (const s of STATES) {
    const r = results[s.name], b = base && base.states[s.name];
    let cmp = "(no baseline)";
    if (b) {
      const rn = r.nodes / b.nodes, ra = b.animations ? r.animations / b.animations : 1, rm = r.mainMs / b.mainMs;
      cmp = `${(rn * 100).toFixed(0)}% / ${(ra * 100).toFixed(0)}% / ${(rm * 100).toFixed(0)}%`;
      if (rn > BUDGET.nodes) failures.push(`${s.name}: ${r.nodes} nodes is ${(rn * 100 - 100).toFixed(0)}% over baseline ${b.nodes} (budget +${(BUDGET.nodes * 100 - 100).toFixed(0)}%)`);
      if (ra > BUDGET.animations) failures.push(`${s.name}: ${r.animations} running animations is ${(ra * 100 - 100).toFixed(0)}% over baseline ${b.animations} (budget +${(BUDGET.animations * 100 - 100).toFixed(0)}%)`);
      if (rm > BUDGET.ms) warnings.push(`${s.name}: main-thread ${r.mainMs} ms/frame is ${(rm * 100 - 100).toFixed(0)}% over baseline ${b.mainMs} (noisy: rerun before worrying)`);
    }
    if (r.errors) failures.push(`${s.name}: ${r.errors} JS/console error(s)`);
    console.log(pad(s.name, 17) + padL(r.nodes, 7) + padL(r.dom, 7) + padL(r.animations, 7) + padL(r.fps, 7) + padL(r.mainMs, 9) + padL(r.styleMs, 9) + padL(r.scriptMs, 10) + "   " + cmp);
  }
  if (base) console.log(`\nBaseline: ${base.recorded}, ${base.machine}, ${base.chrome}`);
  if (warnings.length) console.log("\nWARNINGS (not failures):\n  " + warnings.join("\n  "));
  if (failures.length) { console.log("\nFAILED:\n  " + failures.join("\n  ")); process.exit(1); }
  console.log("\nProbe passed" + (base ? "." : " (no baseline yet: run with --update)."));
})().catch((e) => { console.error(e); process.exit(2); });
