/* Test and debug hooks: window.__fuji. The automatic tests (tests/*.js) and the README's console commands use these;
   nothing in the page itself depends on them. */
import { S } from "./state.js";
import { GOV, setQuality } from "./governor.js";
import { auRender } from "./audio.js";
import { spawnFirework } from "./particles.js";

export function installHooks(ctx) {
  var traffic = ctx.traffic, weather = ctx.weather, setPaused = ctx.setPaused, GROWTH_YEARS = ctx.GROWTH_YEARS, DAYS_PER_YEAR = ctx.DAYS_PER_YEAR;
  window.__fuji = {
    jump: function (days, tod) { S.simDays = days; S.dayAcc = tod; S.growthApplied = -1; S.hudCache = ""; },
    pin: function (days, tod) { weather.reset(); S.pinned = [days, tod]; S.growthApplied = -1; S.hudCache = ""; },
    unpin: function () { S.pinned = null; S.pinDays = null; S.growthOverride = null; },
    // Test hook: era (growth 0..1), season (0 spring, 1 summer, 2 autumn, 3 winter) and time of day (0 midnight, .5 noon) chosen independently.
    // In the real timeline they are coupled (one clock), so e.g. a village never sees winter.
    pinScene: function (g, season, tod) {
      var base = .6 + 2 * season, d = base + 8 * Math.round((g * GROWTH_YEARS * DAYS_PER_YEAR - base) / 8);      // the day nearest to this era that has this season
      weather.reset(); S.growthOverride = g; S.pinDays = null; S.pinned = [Math.max(base, d), tod]; S.growthApplied = -1; S.hudCache = "";
    },
    settleTraffic: traffic.settleTraffic,                // test hook: a repeatable traffic snapshot (see traffic.js)
    pinDays: function (d) { weather.reset(); S.pinned = null; S.pinDays = d; S.simDays = d; S.growthApplied = -1; S.hudCache = ""; },
    get speed() { return S.speed; },
    get growth() { return S.growth; },
    get paused() { return S.paused; },
    setPaused: setPaused,
    renderAudio: auRender,
    perf: function () { var el = (performance.now() - GOV.t0) / 1000; return { quality: GOV.cur.name, auto: GOV.auto, frameMs: +GOV.ema.toFixed(1), tiersHz: { palette: +(GOV.runs.pal / el).toFixed(1), hud: +(GOV.runs.hud / el).toFixed(1), audio: +(GOV.runs.aud / el).toFixed(1), display: +(GOV.runs.frames / el).toFixed(1), cars: traffic.rates().cars, bikes: traffic.rates().bikes, people: traffic.rates().people, signals: 10 } }; },
    quality: function (l) { if (l === "auto") { GOV.auto = true; GOV.t0 = performance.now(); return; } GOV.auto = false; setQuality(l); GOV.t0 = performance.now(); GOV.runs = { pal: 0, hud: 0, aud: 0, frames: 0 }; },
    weather: weather,
    simTest: traffic.simTest,
    frameTest: traffic.frameTest,
    traffic: traffic.info,
    fireworks: spawnFirework
  };
}
