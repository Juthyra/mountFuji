// 0a - traffic safety and smoothness tests. Run: npm run test:sim
// Each growth level runs in a FRESH browser page: the seeded simulation is exactly repeatable that way
// (re-using one page carries state over, so a second simTest in the same page can differ slightly).
const { openPage, pad, padL } = require("./lib");

const LEVELS = [0.3, 0.4, 0.5, 0.55, 0.58, 0.6, 0.62, 0.65, 0.75, 1.0];   // village-ish town ... megacity
const SIM_SECONDS = 600;                                                   // simulated seconds per level (about 0.15 s of real time)
const FRAME_MODES = [144, 60, 24, "jitter"];                               // drawn-motion smoothness at these refresh rates
const FRAME_BUDGET = { p99: 1.5, max: 4 };                                 // observed so far: p99 0.18-0.91, max 0.6-2.84

// Every counter that must be exactly 0. A passing run of zeros only means something if traffic actually flowed, hence the sanity floors below.
const MUST_BE_ZERO = ["overlaps", "redRuns", "pedConflicts", "pedOverlaps", "pedStartsOffWalk", "railConflicts", "railRuns", "maxJump", "hard"];
const MAX_ACCEL = 2.5;      // above this a vehicle counts as braking hard (the sim reports `hard` for it)
const MIN_GAP = 0.05;       // bumpers must never touch (smallest observed: 0.08)
const MIN_VEHICLES_PASSED = 30;   // sanity: vehicles really crossed the stop line during the run
const MIN_CROSSINGS_FROM = 0.5;   // sanity: from this growth on, pedestrians must have crossed at least once

(async () => {
  const failures = [];
  const rows = [];
  for (const g of LEVELS) {
    const { browser, page, errors } = await openPage();
    const r = await page.evaluate((g, s) => window.__fuji.simTest(s, g), g, SIM_SECONDS);
    await browser.close();
    const bad = [];
    for (const k of MUST_BE_ZERO) if ((r[k] || 0) !== 0) bad.push(`${k}=${r[k]}`);
    if (r.maxAcc > MAX_ACCEL) bad.push(`maxAcc=${r.maxAcc} > ${MAX_ACCEL}`);
    if (r.minGap < MIN_GAP) bad.push(`minGap=${r.minGap} < ${MIN_GAP}`);
    if (r.vehPassed < MIN_VEHICLES_PASSED) bad.push(`vehPassed=${r.vehPassed} < ${MIN_VEHICLES_PASSED} (no traffic flowed)`);
    if (g >= MIN_CROSSINGS_FROM && r.pedCrossings < 1) bad.push("no pedestrian ever crossed");
    if (errors.length) bad.push(`${errors.length} JS error(s): ${errors[0]}`);
    rows.push({ g, r, ok: bad.length === 0 });
    if (bad.length) failures.push(`growth ${g}: ${bad.join(", ")}`);
  }

  console.log(`\nTraffic simulation, ${SIM_SECONDS} simulated seconds per level (fresh page each)\n`);
  console.log(pad("growth", 8) + padL("overlap", 8) + padL("redRun", 7) + padL("pedConf", 8) + padL("pedOvl", 7) + padL("railCf", 7) + padL("railRn", 7) + padL("maxAcc", 7) + padL("minGap", 7) + padL("passed", 7) + padL("cross", 6) + "  result");
  for (const { g, r, ok } of rows) {
    console.log(pad(g, 8) + padL(r.overlaps, 8) + padL(r.redRuns, 7) + padL(r.pedConflicts, 8) + padL(r.pedOverlaps, 7) + padL(r.railConflicts, 7) + padL(r.railRuns, 7) + padL(r.maxAcc, 7) + padL(r.minGap, 7) + padL(r.vehPassed, 7) + padL(r.pedCrossings, 6) + "  " + (ok ? "ok" : "FAIL"));
  }

  // Frame smoothness: drives update + render with controlled frame times and measures how smooth the drawn motion is.
  console.log("\nFrame smoothness (drawn-motion noise, lower is better; budget p99 <= " + FRAME_BUDGET.p99 + ", max <= " + FRAME_BUDGET.max + ")\n");
  console.log(pad("mode", 8) + padL("p99", 8) + padL("max", 8) + "  result");
  for (const mode of FRAME_MODES) {
    const { browser, page, errors } = await openPage();
    const f = await page.evaluate((m) => window.__fuji.frameTest(2400, m, 0.8), mode);
    await browser.close();
    const bad = [];
    if (f.p99 > FRAME_BUDGET.p99) bad.push(`p99=${f.p99} > ${FRAME_BUDGET.p99}`);
    if (f.max > FRAME_BUDGET.max) bad.push(`max=${f.max} > ${FRAME_BUDGET.max}`);
    if (errors.length) bad.push(`${errors.length} JS error(s): ${errors[0]}`);
    console.log(pad(mode, 8) + padL(f.p99, 8) + padL(f.max, 8) + "  " + (bad.length ? "FAIL" : "ok"));
    if (bad.length) failures.push(`frameTest ${mode}: ${bad.join(", ")}`);
  }

  if (failures.length) {
    console.log("\nFAILED:\n  " + failures.join("\n  "));
    process.exit(1);
  }
  console.log("\nAll traffic and smoothness checks passed.");
})().catch((e) => { console.error(e); process.exit(2); });
