/* Weather: rain, and the occasional typhoon that knocks buildings down and then the timelapse builds them back.

   Everything that moves here runs on its own clock (the page rule): the state machine at 10 Hz, building damage at 30 Hz, rain streaks at 30 Hz,
   lightning at display rate only while a flash is on. Timing is random (Math.random) so a visit never looks the same; every cosmetic detail
   (where a raindrop starts, which buildings a *fixed* test scene knocks down) comes from a seeded generator so screenshot tests are repeatable.

   The module knows nothing about the rest of the page. main.js hands it a small context (DOM layers, the list of buildings, a few callbacks). */

var TAU = Math.PI * 2;
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

export var RAIN = { in: [5, 8], hold: [14, 22], out: [8, 12], peak: [.5, .85], wind: [.1, .3], gap: [26, 70] };
export var TYPHOON = { in: [9, 12], hold: [26, 34], out: [12, 16], peak: [1, 1], wind: [1, 1], gap: [60, 120], minGrowth: .3, chance: .3, firstChance: .55, minSince: 90 };
export var FALL = { dur: [2.4, 3.8], tilt: [4, 9], count: [3, 6], rebuildDur: [9, 14], rebuildWait: [.5, 6], flatten: .93 };
var MAX_DROPS = 640;

export function createWeather(ctx) {
  var R = ctx.random || Math.random;
  var rr = function (r) { return r[0] + (r[1] - r[0]) * R(); };
  var seed = 1234567;                                    // cosmetic randomness only
  function sr() { seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }

  var W = {
    kind: "clear", phase: "idle", t: 0, inDur: 0, holdDur: 0, outDur: 0, peakRain: 0, peakWind: 0,
    rain: 0, wind: 0, wet: 0, slow: 1, flash: 0, flashT: -1, nextFlash: 9, nextAt: rr([18, 38]), sinceTyphoon: 999,
    pending: [], fixed: false, raining: false
  };
  var dm = [];                                           // buildings being knocked down / rebuilt: { b, st: fall|rubble|wait|rebuild, t, dur, wait }
  var accLogic = 0, accDmg = 0, accDraw = 0;
  var drops = [], i;
  for (i = 0; i < MAX_DROPS; i++) drops.push({ x: sr(), y: sr(), z: sr() });      // z: 0 far .. 1 near
  var c2 = ctx.canvas ? ctx.canvas.getContext("2d") : null, cw = 0, ch = 0, drawn = false;
  var stats = { collapsed: 0, rebuilt: 0, events: 0, typhoons: 0, thunder: 0 };

  /* ---------- starting and ending weather ---------- */
  function start(kind) {
    var P = kind === "typhoon" ? TYPHOON : RAIN;
    W.kind = kind; W.phase = "in"; W.t = 0;
    W.inDur = rr(P.in); W.holdDur = rr(P.hold); W.outDur = rr(P.out);
    W.peakRain = rr(P.peak); W.peakWind = rr(P.wind);
    W.nextFlash = kind === "typhoon" ? rr([3, 7]) : rr([6, 12]);
    W.pending = [];
    stats.events++;
    if (kind === "typhoon") { stats.typhoons++; W.sinceTyphoon = 0; }
    if (ctx.onStatus) ctx.onStatus(kind);
  }
  function schedulePending() {                           // typhoon: when, during the hold, buildings fall (relative seconds)
    var n = Math.round(rr(FALL.count)), t = 4, out = [];
    for (var k = 0; k < n; k++) { out.push(t); t += rr([1.6, 4.2]); }
    W.pending = out.filter(function (x) { return x < W.holdDur - 3; });
  }
  function finish() {
    W.phase = "idle"; W.kind = "clear"; W.t = 0;
    W.nextAt = rr(W.kindWas === "typhoon" ? [50, 110] : RAIN.gap);
    if (ctx.onStatus) ctx.onStatus("clear");
  }
  function finishQuiet() { W.rain = W.wind = 0; W.slow = 1; W.wet = Math.max(0, W.wet - .01); }       // test hook: "quiet" lets a storm end without a new one starting
  function chooseKind() {
    // typhoons: only once there is a town to hit, not twice in a row, and a bit more likely the first time so a short visit can still see one
    if (ctx.growth() >= TYPHOON.minGrowth && W.sinceTyphoon > TYPHOON.minSince && R() < (stats.typhoons ? TYPHOON.chance : TYPHOON.firstChance)) return "typhoon";
    return "rain";
  }

  /* ---------- buildings: knock down, hold as rubble, rebuild ---------- */
  function candidates() {
    var out = [], bl = ctx.buildings, k;
    var vh = window.innerHeight, vw = window.innerWidth, seen = [];
    for (k = 0; k < bl.length; k++) {
      var b = bl[k]; if (b.inv || !(b.last > .97) || b.dmg > 0) continue;
      out.push(b);
      var r = b.inner.getBoundingClientRect();                       // prefer buildings you can actually see falling: big enough and on screen
      if (r.height > vh * .13 && r.width > vw * .02 && r.right > vw * .03 && r.left < vw * .97 && r.bottom > vh * .35) seen.push(b);
    }
    return seen.length >= 3 ? seen : out;
  }
  function collapseOne(pick) {
    var c = candidates(); if (!c.length) return null;
    var b = c[Math.floor(pick() * c.length)];
    b.dmg = .0001; b.tilt = (pick() < .5 ? -1 : 1) * (FALL.tilt[0] + (FALL.tilt[1] - FALL.tilt[0]) * pick());
    var e = { b: b, st: "fall", t: 0, dur: FALL.dur[0] + (FALL.dur[1] - FALL.dur[0]) * pick(), wait: 0 };
    dm.push(e); stats.collapsed++;
    dust(b, 1);
    if (ctx.onCollapse) ctx.onCollapse();
    return e;
  }
  function dust(b, strength) {
    if (!ctx.fx || !b.inner.getBoundingClientRect) return;
    var r = b.inner.getBoundingClientRect(); if (!r.width) return;
    if (ctx.fx.querySelectorAll(".dust").length > 40) return;
    var n = Math.round(6 * strength) + 3;
    for (var k = 0; k < n; k++) {
      var d = document.createElement("i"); d.className = "dust";
      var s = 26 + sr() * 46;
      d.style.left = (r.left + r.width * (.1 + .8 * sr()) - s / 2).toFixed(0) + "px";
      d.style.top = (r.bottom - s * (.4 + .5 * sr())).toFixed(0) + "px";
      d.style.width = d.style.height = s.toFixed(0) + "px";
      d.style.setProperty("--dx", ((sr() - .5) * 90 + W.wind * 70).toFixed(0) + "px");
      d.style.setProperty("--dy", (-30 - sr() * 70).toFixed(0) + "px");
      d.style.animationDelay = (sr() * .5).toFixed(2) + "s";
      d.addEventListener("animationend", function () { this.remove(); });
      ctx.fx.appendChild(d);
    }
  }
  function stepDamage(dt) {
    var k, e;
    for (k = dm.length - 1; k >= 0; k--) {
      e = dm[k];
      if (e.st === "fall") {
        e.t += dt; var p = clamp(e.t / e.dur, 0, 1);
        e.b.dmg = Math.max(.0001, p * p);                                  // accelerates: it gives way slowly, then drops
        if (p >= 1) { e.st = "rubble"; e.b.dmg = 1; e.b.tilt = 0; dust(e.b, 1.4); if (ctx.onCollapse) ctx.onCollapse(); }
        ctx.paint(e.b);
      } else if (e.st === "wait") {
        e.t += dt; if (e.t >= e.wait) { e.st = "rebuild"; e.t = 0; e.dur = rr(FALL.rebuildDur); }
      } else if (e.st === "rebuild") {
        e.t += dt; var q = clamp(e.t / e.dur, 0, 1);
        e.b.dmg = 1 - smooth(q);
        if (q >= 1) { e.b.dmg = 0; e.b.tilt = 0; dm.splice(k, 1); stats.rebuilt++; }
        ctx.paint(e.b);
      }
    }
  }
  function beginRebuild(allNow) {                        // called while the storm is dying down: every ruin gets a random start delay
    dm.forEach(function (e) { if (e.st === "rubble") { e.st = "wait"; e.t = 0; e.wait = allNow ? rr([0, 1.2]) : rr(FALL.rebuildWait); } });
  }

  /* ---------- the state machine (10 Hz) ---------- */
  function stepLogic(dt) {
    var e = 0;
    if (W.phase === "idle") {
      W.sinceTyphoon += dt; if (W.quiet) return finishQuiet();
      W.nextAt -= dt;
      if (W.nextAt <= 0) { W.kindWas = null; start(chooseKind()); }
    } else {
      W.t += dt; W.sinceTyphoon += dt;
      if (W.phase === "in") { e = smooth(W.t / W.inDur); if (W.t >= W.inDur) { W.phase = "hold"; W.t = 0; if (W.kind === "typhoon") schedulePending(); } }
      else if (W.phase === "hold") {
        e = 1;
        while (W.pending.length && W.t >= W.pending[0]) { W.pending.shift(); collapseOne(R); }
        if (W.t >= W.holdDur) { W.phase = "out"; W.t = 0; }
      } else if (W.phase === "out") {
        e = 1 - smooth(W.t / W.outDur);
        if (W.kind === "typhoon" && e < .5) beginRebuild(false);        // the rebuilding starts as the storm eases
        if (W.t >= W.outDur) { W.kindWas = W.kind; beginRebuild(false); finish(); }
      }
    }
    W.rain = e * W.peakRain; W.wind = e * W.peakWind;
    W.wet += W.rain > .05 ? (1 - W.wet) * Math.min(1, dt / 7) : -Math.min(W.wet, dt / 28);
    W.slow = 1 - .17 * W.rain - .2 * W.wind * W.wind;
    // lightning
    if (W.rain > .45) { W.nextFlash -= dt; if (W.nextFlash <= 0) { flash(); W.nextFlash = W.kind === "typhoon" ? rr([2.5, 6]) : rr([7, 15]); } }
    var wet = W.rain > .08;
    if (wet !== W.raining) { W.raining = wet; if (ctx.onRaining) ctx.onRaining(wet); }
  }
  function flash() {
    W.flashT = 0; stats.thunder++;
    if (ctx.onThunder) ctx.onThunder(.3 + R() * 1.4, .4 + .6 * W.rain);
  }
  function flashLevel(t) {                               // double flash: sharp, dip, second, long fade
    if (t < .05) return t / .05 * .9;
    if (t < .13) return .9 - (t - .05) / .08 * .75;
    if (t < .19) return .15 + (t - .13) / .06 * .65;
    if (t < .6) return .8 * (1 - (t - .19) / .41);
    return 0;
  }

  /* ---------- drawing ---------- */
  var lastShade = -1, lastWet = -1, lastFlash = -1;
  function paintLayers() {
    var sh = clamp(W.rain * .3 + W.wind * .24, 0, .6);
    if (Math.abs(sh - lastShade) > .004) { lastShade = sh; ctx.shade.style.opacity = sh.toFixed(3); }
    var wt = clamp(W.wet, 0, 1);
    if (Math.abs(wt - lastWet) > .004) { lastWet = wt; ctx.wet.style.opacity = wt.toFixed(3); }
  }
  function drawRain(dt) {
    if (!c2) return;
    var level = W.rain, q = ctx.quality ? ctx.quality() : 0, scale = [1, .6, .35][q] || 1;
    if (level < .01) { if (drawn) { c2.clearRect(0, 0, cw, ch); drawn = false; } return; }
    var w = ctx.canvas.clientWidth || window.innerWidth, h = ctx.canvas.clientHeight || window.innerHeight;
    if (cw !== w || ch !== h) { ctx.canvas.width = cw = w; ctx.canvas.height = ch = h; }
    c2.clearRect(0, 0, cw, ch);
    var area = clamp(cw * ch / (1100 * 620), .4, 1.2), kk = clamp(ch / 700, .6, 1.3);          // smaller window: fewer, shorter streaks
    var n = Math.min(MAX_DROPS, Math.floor(MAX_DROPS * level * scale * area)), slant = .1 + .8 * W.wind, k, d;
    for (var layer = 0; layer < 2; layer++) {
      c2.beginPath();
      c2.strokeStyle = layer ? "rgba(214,226,246," + (.3 + .25 * level).toFixed(2) + ")" : "rgba(190,205,232," + (.16 + .14 * level).toFixed(2) + ")";
      c2.lineWidth = layer ? 1.4 : 1;
      for (k = 0; k < n; k++) {
        d = drops[k]; if ((d.z > .5) !== (layer === 1)) continue;
        var len = (10 + d.z * 22) * kk, spd = (.7 + d.z * 1.0) * (1 + W.wind * .6);     // screen heights per second
        d.y += spd * dt; d.x += slant * spd * dt * ch / Math.max(1, cw);
        if (d.y > 1.05) { d.y -= 1.1 + sr() * .05; d.x = sr() * 1.3 - .15; }
        if (d.x > 1.1) d.x -= 1.3;
        var x = d.x * cw, y = d.y * ch;
        c2.moveTo(x, y); c2.lineTo(x + slant * len, y + len);
      }
      c2.stroke();
    }
    drawn = true;
  }

  /* ---------- per-frame entry point ---------- */
  function step(dt, live) {                              // dt: simulated seconds this frame (0 when paused); live: weather is allowed to run
    if (live || W.fixed) {
      accLogic += dt; accDmg += dt; accDraw += dt;
      if (live && !W.fixed && accLogic >= .1) { stepLogic(accLogic); accLogic = 0; }
      if (accDmg >= 1 / 30) { stepDamage(accDmg); accDmg = 0; paintLayers(); }
      if (accDraw >= 1 / 30) { drawRain(accDraw); accDraw = 0; }
      if (W.flashT >= 0) {
        W.flashT += dt; var f = flashLevel(W.flashT); if (W.flashT > .6) { W.flashT = -1; f = 0; }
        if (Math.abs(f - lastFlash) > .01 || f === 0) { lastFlash = f; ctx.flash.style.opacity = f.toFixed(3); }
      }
    }
  }

  /* ---------- test and control hooks ---------- */
  function reset() {                                     // back to a clear sky, every building standing (used by restart and by every test pin)
    dm.forEach(function (e) { e.b.dmg = 0; e.b.tilt = 0; ctx.paint(e.b); }); dm = [];
    W.kind = "clear"; W.phase = "idle"; W.t = 0; W.rain = W.wind = W.wet = 0; W.slow = 1; W.flashT = -1; W.pending = []; W.fixed = false; W.nextAt = rr([18, 38]); W.sinceTyphoon = 999;
    if (W.raining && ctx.onRaining) ctx.onRaining(false); W.raining = false;
    lastShade = lastWet = lastFlash = -1; ctx.shade.style.opacity = 0; ctx.wet.style.opacity = 0; ctx.flash.style.opacity = 0;
    if (ctx.fx) ctx.fx.querySelectorAll(".dust").forEach(function (d) { d.remove(); });
    if (c2 && drawn) { c2.clearRect(0, 0, cw, ch); drawn = false; }
    if (ctx.onStatus) ctx.onStatus("clear");
  }
  function force(kind) {                                 // start an event now ("rain" | "typhoon"); "clear" ends it and rebuilds everything fast
    if (kind === "clear") { if (W.phase === "idle") { beginRebuild(true); return; } W.phase = "out"; W.t = W.outDur * .5; W.kindWas = W.kind; beginRebuild(true); return; }
    start(kind);
  }
  // A frozen, repeatable scene for screenshots: weather kind at a given strength, with `ruins` buildings (seeded pick) lying flat / half fallen.
  function setFixed(kind, level, ruins, partial) {
    reset(); W.fixed = true; W.kind = kind; W.phase = "hold"; W.peakRain = W.rain = kind === "clear" ? 0 : level; W.peakWind = W.wind = kind === "typhoon" ? level : (kind === "rain" ? .2 : 0);
    W.wet = kind === "clear" ? 0 : 1; W.slow = 1;
    var save = seed; seed = 987654;
    for (var k = 0; k < (ruins || 0); k++) {
      var e = collapseOne(sr); if (!e) break;
      e.st = k < (partial || 0) ? "fall" : "rubble"; e.t = e.st === "fall" ? e.dur * .72 : e.dur; e.b.dmg = e.st === "fall" ? .72 * .72 : 1; ctx.paint(e.b);
    }
    ctx.fx.querySelectorAll(".dust").forEach(function (d) { d.remove(); });
    seed = save; W.raining = W.rain > .08; if (ctx.onRaining) ctx.onRaining(W.raining);
    if (ctx.onStatus) ctx.onStatus(kind);
    paintLayers(); accDmg = accDraw = 0; drawRain(.016);
  }

  return {
    step: step, reset: reset, force: force, setFixed: setFixed,
    get slow() { return W.slow; }, get rain() { return W.rain; }, get wind() { return W.wind; }, get wet() { return W.wet; },
    get kind() { return W.kind; }, get phase() { return W.phase; },
    info: function () {
      var st = { standing: 0, falling: 0, rubble: 0, waiting: 0, rebuilding: 0 };
      dm.forEach(function (e) { st[{ fall: "falling", rubble: "rubble", wait: "waiting", rebuild: "rebuilding" }[e.st]]++; });
      return { kind: W.kind, phase: W.phase, t: +W.t.toFixed(1), rain: +W.rain.toFixed(2), wind: +W.wind.toFixed(2), wet: +W.wet.toFixed(2), slow: +W.slow.toFixed(2), nextIn: +W.nextAt.toFixed(0), buildings: st, stats: Object.assign({}, stats), damaged: dm.length };
    },
    // run the whole state machine as fast as possible (no drawing) and report: used by the weather test
    simulate: function (secs, hz) {
      var step_ = 1 / (hz || 30), n = Math.round(secs * (hz || 30)), peakDown = 0, k, worst = 0;
      for (k = 0; k < n; k++) {
        accLogic += step_; if (accLogic >= .1) { stepLogic(accLogic); accLogic = 0; }
        stepDamage(step_);
        var down = dm.filter(function (e) { return e.st === "rubble" || e.st === "fall"; }).length; if (down > peakDown) peakDown = down;
        ctx.buildings.forEach(function (b) { var d = b.dmg || 0; if (d < 0 || d > 1 || d !== d) worst++; });
      }
      return { peakDown: peakDown, invalidDamage: worst };
    },
    set quiet(v) { W.quiet = !!v; }, get quiet() { return !!W.quiet; },
    _seed: function (s) { seed = s; }
  };
}
