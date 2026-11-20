// Weather tests. Run: npm run test:weather
// Runs the real weather state machine (no drawing) for many simulated hours and forced storms, and checks the rules that matter:
//   - a typhoon knocks down a few buildings (3-6), they stay down while it blows, then ALL of them are rebuilt
//   - nothing is ever left damaged after the weather has cleared; no building size is ever out of range or NaN
//   - rain happens, typhoons are random but not constant, the storm slows traffic and then traffic recovers
//   - the storm sound stays inside the loudness limits
const { openPage } = require("./lib");

const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); return ok; };

(async () => {
  const { browser, page, errors } = await openPage();
  await page.evaluate(() => { window.__fuji.jump(27, 0.5); });                       // megacity era, daytime: every building has finished growing
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(() => window.__fuji.setPaused(true));                          // the live loop must not touch the weather while we drive it
  await new Promise((r) => setTimeout(r, 400));

  const W = (fn, ...a) => page.evaluate(fn, ...a);
  const standing = await W(() => window.__fuji.weather.info().buildings.standing);

  // ---- 1. forced typhoons, one after another: collapse count, rebuild, no leftovers ----
  const storms = [];
  for (let i = 0; i < 12; i++) {
    const r = await W(() => {
      const w = window.__fuji.weather; w.reset(); w.quiet = true; w.force("typhoon");
      const during = w.simulate(130, 30);                                           // in + hold + out of one typhoon
      const mid = w.info();
      const after = w.simulate(40, 30);                                             // settle: everything must be rebuilt by now
      const end = w.info();
      return { peakDown: during.peakDown, invalid: during.invalidDamage + after.invalidDamage, endDamaged: end.damaged, endKind: end.kind, collapsed: end.stats.collapsed, rebuilt: end.stats.rebuilt, slowMid: mid.slow };
    });
    storms.push(r);
  }
  if (process.env.DEBUG_WX) console.log(JSON.stringify(storms));
  const peaks = storms.map((s) => s.peakDown);
  check(peaks.every((p) => p >= 3 && p <= 6), `a typhoon should knock down 3-6 buildings, got ${peaks.join(",")}`);
  check(new Set(peaks).size > 1, "collapse counts are identical every time: they should vary (random)");
  check(storms.every((s) => s.endDamaged === 0), "after a typhoon and its clean-up, some building was still damaged");
  check(storms.every((s) => s.endKind === "clear"), "weather did not return to clear");
  check(storms.every((s) => s.invalid === 0), "a building had an invalid damage value (outside 0..1 or NaN)");
  const last = storms[storms.length - 1];
  check(last.collapsed === last.rebuilt, `collapsed ${last.collapsed} but rebuilt ${last.rebuilt}`);

  // ---- 2. order inside one storm: rubble first, rebuild only as the storm eases ----
  const order = await W(() => {
    const w = window.__fuji.weather; w.reset(); w.quiet = true; w.force("typhoon");
    const log = []; let sawRebuildWhileStrong = false;
    for (let t = 0; t < 170; t++) {
      w.simulate(1, 30);
      const i = w.info(); log.push([i.phase, i.rain, i.buildings.falling + i.buildings.rubble, i.buildings.rebuilding]);
      if (i.buildings.rebuilding > 0 && i.rain > 0.6) sawRebuildWhileStrong = true;
    }
    return { sawRebuildWhileStrong, peakDown: Math.max(...log.map((l) => l[2])), maxRebuilding: Math.max(...log.map((l) => l[3])), sawRubbleInHold: log.some((l) => l[0] === "hold" && l[2] > 0) };
  });
  check(order.sawRubbleInHold, "no building was down during the strongest part of the typhoon");
  check(!order.sawRebuildWhileStrong, "rebuilding started while the storm was still strong");
  check(order.maxRebuilding > 0, "nothing was rebuilt after the storm");

  // ---- 3. long random run: how often rain and typhoons happen ----
  const long = await W(() => {
    const w = window.__fuji.weather; w.reset(); w.quiet = false;
    let events = 0, last = "clear", rainSecs = 0, typhoonSecs = 0, maxSlowDrop = 1, bad = 0, clearDamaged = 0;
    const s0 = w.info().stats;
    for (let t = 0; t < 4 * 3600; t++) {                                              // 4 simulated hours
      w.simulate(1, 10);
      const i = w.info();
      if (i.kind !== last) { if (i.kind !== "clear") events++; last = i.kind; }
      if (i.kind === "rain") rainSecs++; if (i.kind === "typhoon") typhoonSecs++;
      maxSlowDrop = Math.min(maxSlowDrop, i.slow);
      if (i.kind === "clear" && i.rain === 0 && i.damaged > 0 && i.buildings.rubble > 0 && i.buildings.waiting === 0 && i.buildings.rebuilding === 0) clearDamaged++;
    }
    const i = w.info();
    return { events, rainSecs, typhoonSecs, typhoons: i.stats.typhoons - s0.typhoons, collapsed: i.stats.collapsed - s0.collapsed, rebuilt: i.stats.rebuilt - s0.rebuilt, minSlow: maxSlowDrop, clearDamaged, endDamaged: i.damaged };
  });
  check(long.events >= 100, `expected many weather events in 4 hours, got ${long.events}`);
  check(long.typhoons >= 5 && long.typhoons <= 60, `typhoons in 4 hours: ${long.typhoons} (expected 5-60)`);
  const clearShare = 1 - (long.rainSecs + long.typhoonSecs) / (4 * 3600);
  check(clearShare > 0.35 && clearShare < 0.8, `clear sky should be about half the time, got ${(clearShare * 100).toFixed(0)}%`);
  check(long.clearDamaged === 0, "ruins were left standing under a clear sky with no rebuild scheduled");
  check(long.minSlow >= 0.55 && long.minSlow < 1, `traffic slow-down factor out of range: ${long.minSlow}`);

  // ---- 4. rain only (no collapse) and the village era (nothing to knock down) ----
  const rainOnly = await W(() => { const w = window.__fuji.weather; w.reset(); w.quiet = true; w.force("rain"); const r = w.simulate(20, 30); const mid = w.info(); w.simulate(60, 30); return { down: r.peakDown, info: mid, end: w.info() }; });
  check(rainOnly.down === 0, "rain knocked a building down");
  check(rainOnly.info.rain > 0.3, "rain intensity did not rise");
  check(rainOnly.end.kind === "clear" && rainOnly.end.rain === 0, "rain did not stop");
  await W(() => { window.__fuji.jump(1, 0.5); return 1; });                           // village era: random weather may rain but must never choose a typhoon
  await new Promise((r) => setTimeout(r, 800));
  const early = await W(() => { const w = window.__fuji.weather; w.reset(); w.quiet = false; const s0 = w.info().stats; w.simulate(2 * 3600, 10); const i = w.info(); return { typhoons: i.stats.typhoons - s0.typhoons, events: i.stats.events - s0.events, growth: window.__fuji.growth }; });
  check(early.growth < 0.3 && early.events > 20, `village test setup is wrong (growth ${early.growth}, events ${early.events})`);
  check(early.typhoons === 0, `${early.typhoons} typhoon(s) chosen in the village era (a typhoon needs a town to hit)`);
  await W(() => { window.__fuji.jump(27, 0.5); window.__fuji.weather.reset(); });

  // ---- 5. storm sound: loud enough to hear, never clipping ----
  const audio = await W(() => Promise.all([window.__fuji.renderAudio(0.93, 0.9, [0, 1, 0, 0], 6, { rain: 0, wind: 0 }), window.__fuji.renderAudio(0.93, 0.9, [0, 1, 0, 0], 6, { rain: 0.7, wind: 0.2 }), window.__fuji.renderAudio(0.93, 0.9, [0, 1, 0, 0], 6, { rain: 1, wind: 1 })]));
  check(audio[2].peakDb < -5 && audio[2].peakDb - audio[0].peakDb < 3, `typhoon sound peaks at ${audio[2].peakDb} dBFS (limit -5 dBFS, and at most 3 dB above the clear scene)`);
  check(audio[1].rmsDb > audio[0].rmsDb, "rain did not make the soundscape louder");
  check(audio[2].rmsDb > audio[1].rmsDb, "typhoon is not louder than rain");

  check(errors.length === 0, `${errors.length} JS/console error(s): ${errors[0]}`);
  await browser.close();

  console.log("\nWeather tests");
  console.log(`  typhoon x12: buildings down ${peaks.join(", ")} (3-6 each), all rebuilt, none left over`);
  console.log(`  order: rubble while it blows (${order.sawRubbleInHold}), rebuild only as it eases (${!order.sawRebuildWhileStrong}), up to ${order.maxRebuilding} rebuilding at once`);
  console.log(`  4 simulated hours: ${long.events} events, ${long.typhoons} typhoons, ${long.collapsed} collapses / ${long.rebuilt} rebuilds, clear sky ${(clearShare * 100).toFixed(0)}% of the time, slowest traffic factor ${long.minSlow}`);
  console.log(`  village era, 2 simulated hours: ${early.events} weather events, ${early.typhoons} typhoons; storm sound peak ${audio[2].peakDb} dBFS, rms clear ${audio[0].rmsDb} / rain ${audio[1].rmsDb} / typhoon ${audio[2].rmsDb}`);
  if (fails.filter(Boolean).length) { console.log("\nFAILED:\n  " + fails.filter(Boolean).join("\n  ")); process.exit(1); }
  console.log("\nAll weather checks passed.");
})().catch((e) => { console.error(e); process.exit(2); });
