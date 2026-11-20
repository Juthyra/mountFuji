import { root, body, fx, svg, reduced, clamp, lerp, smooth, sstep, hx, mix, css, rgba, el, rnd, rn } from "./util.js";
import { T, timeVal, inkVal, seasonWeights, seasonVal } from "./palettes.js";
import { buildFuji, buildSnow } from "./fujiGeometry.js";
import { trees } from "./skyline.js";
import { createWeather, FALL } from "./weather.js";
import { S } from "./state.js";
import { createTraffic } from "./traffic.js";
import { createScene } from "./scene.js";
import { initAudio, updateAudio, toggleSound, auRender, audioStarted, sfx } from "./audio.js";
(function () {
  "use strict";
  var scene = createScene();
  var GROWTH_YEARS = scene.GROWTH_YEARS, DAYS_PER_YEAR = scene.DAYS_PER_YEAR, buildings = scene.buildings, cranes = scene.cranes, SX = scene.SX, SY = scene.SY, carsG = scene.carsG, xings = scene.xings, updateScenery = scene.updateScenery, sigLamps = scene.sigLamps, ltTrainEl = scene.ltTrainEl, CAR_TYPES = scene.CAR_TYPES, drawCar = scene.drawCar, PAINTS = scene.PAINTS, BUS_LIV = scene.BUS_LIV, drawBus = scene.drawBus;

  var traffic = createTraffic({
    SX: SX, SY: SY, carsG: carsG, sigLamps: sigLamps, xings: xings, ltTrainEl: ltTrainEl,
    drawCar: drawCar, drawBus: drawBus, CAR_TYPES: CAR_TYPES, PAINTS: PAINTS, BUS_LIV: BUS_LIV,
    slow: function () { return weather.slow; }
  });

  /* ================= simulation state ================= */
              // seasonal / era clock (8 days = 1 year)
              // time-of-day phase 0..1 (starts mid-morning)
        // growthOverride: test hook only (lets a screenshot pick era and season independently)
  var DAY_RATE = .09;          // day/night cycles per second at 1x
  var DAYS_PER_SEC = .45;      // sim days per second at 1x
  var HOLD_MULT = 8;

  var seasonKj = document.getElementById("seasonKj"), seasonName = document.getElementById("seasonName");
  var eraKj = document.getElementById("eraKj"), eraName = document.getElementById("eraName");
  var yearLabel = document.getElementById("yearLabel"), eraBar = document.getElementById("eraBar");
  var speedChip = document.getElementById("speedChip");
  var SEASONS = [["春", "Spring"], ["夏", "Summer"], ["秋", "Autumn"], ["冬", "Winter"]];
  var ERAS = [["村", "Village"], ["町", "Town"], ["市", "City"], ["大都市", "Megacity"]];
  var hudDue = true, beaconVis = false, bOn = false, wOn = false, blinkT = 0;
  var DIST = [["農村", "Farming village"], ["商店街", "Shopping street"], ["駅前", "Station district"], ["ビジネス街", "Business district"], ["繁華街", "Downtown"], ["歌舞伎町", "Kabukichō"]];
  var distIdx = -1, distRow = document.getElementById("distRow"), distKj = document.getElementById("distKj"), distName = document.getElementById("distName"), xingOn = false;
  function setDistrict(i) {
    var first = distIdx < 0; distIdx = i;
    if (first) { distKj.textContent = DIST[i][0]; distName.textContent = DIST[i][1]; return; }
    distRow.classList.add("out");
    setTimeout(function () { distKj.textContent = DIST[distIdx][0]; distName.textContent = DIST[distIdx][1]; distRow.classList.remove("out"); }, 460);
  }

  var sunG = document.getElementById("sunG"), moonG = document.getElementById("moonG");
  var sunDisc = document.getElementById("sunDisc");
  var cityGround = document.getElementById("cityGround");
  var todSlider = document.getElementById("todSlider");
  var fgLayer = document.getElementById("fgLayer"), sakuraEl = document.getElementById("sakura") || document.createElement("div"), cloudsEl = document.getElementById("clouds");
  fgLayer.style.transformOrigin = "800px 900px"; sakuraEl.style.transformOrigin = "0px 0px";

  /* The palette (about 60 CSS variables) is the most expensive thing in the scene: any change restyles ~6,000 nodes.
     It therefore runs on its own slower clock (see the frame governor), and only writes values that actually changed. */
  var palDue = true, varCache = {};
  function setVar(k, v) { if (!palDue || varCache[k] === v) return; varCache[k] = v; root.style.setProperty(k, v); }

  // A building's drawn size = how far it has grown (b.last) x how much of it still stands (b.dmg: 0 standing .. 1 flat). Damaged ones also lean.
  function paintBuilding(b) {
    var sc = b.last < 0 ? 0 : b.last, d = b.dmg || 0, s = d > 0 ? sc * (1 - FALL.flatten * d) : sc;
    b.inner.style.transform = "scaleY(" + s.toFixed(3) + ")" + (d > 0 ? " skewX(" + ((b.tilt || 0) * Math.sin(Math.min(1, d) * Math.PI)).toFixed(2) + "deg)" : "");
    b.inner.style.opacity = Math.min(1, sc * 3).toFixed(2);
  }
  function applyFrame() {
    var tod = ((S.dayAcc % 1) + 1) % 1;
    var s = (((S.simDays - .6) / 2) % 4 + 4) % 4;
    var w = seasonWeights(s);
    var year = S.simDays / DAYS_PER_YEAR;
    S.growth = S.growthOverride !== null ? S.growthOverride : clamp(year / GROWTH_YEARS, 0, 1);
    var nf = (Math.cos(tod * Math.PI * 2) + 1) / 2;         // 1 midnight, 0 noon
    var nfS = sstep(nf, .35, .8);

    /* ---- colors ---- */
    setVar("--sky-top", css(timeVal("skyTop", tod)));
    setVar("--sky-mid", css(timeVal("skyMid", tod)));
    setVar("--sky-low", css(timeVal("skyLow", tod)));
    setVar("--haze", css(timeVal("skyLow", tod)));
    var fTint = seasonVal("fujiTint", w), fA = seasonVal("fujiTintA", w);
    setVar("--fuji-a", css(mix(timeVal("fujiA", tod), fTint, fA)));
    setVar("--fuji-b", css(mix(timeVal("fujiB", tod), fTint, fA * .8)));
    setVar("--snow", css(timeVal("snow", tod)));
    setVar("--far", css(mix(timeVal("far", tod), seasonVal("farTint", w), seasonVal("farTintA", w))));
    var lTint = seasonVal("lakeTint", w), lA = seasonVal("lakeTintA", w);
    setVar("--lake-top", css(mix(timeVal("lakeT", tod), lTint, lA)));
    setVar("--lake-bot", css(mix(timeVal("lakeB", tod), lTint, lA * .6)));
    setVar("--cloud", css(mix(timeVal("cloud", tod), [240, 246, 252], w[3] * .18)));
    setVar("--cloud-op", timeVal("cloudOp", tod).toFixed(3));
    setVar("--sun-fill", css(timeVal("sun", tod)));
    setVar("--sun-glow", rgba(timeVal("glow", tod), timeVal("glowA", tod)));
    setVar("--ink", css(inkVal(tod)));
    setVar("--ink-soft", rgba(inkVal(tod), .78));
    setVar("--stars-op", sstep(nf, .62, .95).toFixed(3));
    setVar("--mist-op", timeVal("mistOp", tod).toFixed(3));
    setVar("--torii", css(timeVal("torii", tod)));
    setVar("--branch", css(timeVal("branch", tod)));
    setVar("--blossom", css(timeVal("blossom", tod)));
    setVar("--blossom-core", css(timeVal("core", tod)));
    setVar("--tree", css(seasonVal("tree", w)));
    setVar("--decid", css(seasonVal("decid", w)));
    setVar("--decid-op", seasonVal("decidOp", w).toFixed(3));
    setVar("--shore", css(mix(seasonVal("shore", w), [10, 14, 28], nf * .55)));
    setVar("--fg", css(mix(seasonVal("fg", w), [8, 11, 24], nf * .6)));
    setVar("--ground", css(mix(seasonVal("ground", w), [14, 19, 36], nf * .6)));
    setVar("--field", css(seasonVal("field", w)));
    setVar("--field-op", (1 - sstep(S.growth, .18, .4)).toFixed(3));
    setVar("--leaf", css(seasonVal("leaf", w)));
    setVar("--blossom-op", seasonVal("blossomOp", w).toFixed(3));
    setVar("--leaf-op", seasonVal("leafOp", w).toFixed(3));
    setVar("--branch-snow-op", seasonVal("branchSnow", w).toFixed(3));
    if (palDue) buildSnow(seasonVal("snowY", w));

    /* ---- city materials ---- */
    var nightSil = [16, 22, 44], nm = nf * .9;
    setVar("--wall", css(mix(hx("ddd2c0"), nightSil, nm)));
    setVar("--roof", css(mix(hx("5a6478"), nightSil, nm)));
    setVar("--facade-a", css(mix(hx("bcc1c8"), nightSil, nm)));
    setVar("--facade-b", css(mix(hx("c9c2b4"), nightSil, nm)));
    setVar("--facade-c", css(mix(hx("a4abb3"), nightSil, nm)));
    setVar("--glass", css(mix(hx("9fc0d8"), [14, 20, 40], nf * .88)));
    setVar("--pagoda", css(mix(hx("8a4a3a"), nightSil, nm)));
    setVar("--tower-red", css(mix(hx("d0453a"), hx("5a1f26"), nf * .8)));
    setVar("--spire", css(mix(hx("c8d8e8"), hx("3a4a6e"), nf * .85)));
    setVar("--train-body", css(mix(hx("f4f6fa"), hx("9aa6c0"), nf * .6)));
    setVar("--win-dark", rgba(mix([52, 78, 112], [8, 12, 26], nf), .42 + .2 * nf));
    setVar("--win-lit", css(mix(hx("ffdfa6"), hx("ffeccb"), w[3] * .5)));
    setVar("--win-lit-op", (.05 + .93 * nfS).toFixed(3));
    setVar("--beacon-op", sstep(nf, .4, .75).toFixed(3));
    setVar("--city-glow", css(hx("ffb45e")));
    setVar("--city-glow-op", (S.growth * sstep(nf, .45, .85) * .5).toFixed(3));
    setVar("--smoke-op", (1 - sstep(S.growth, .15, .35)).toFixed(3));
    setVar("--train-op", sstep(S.growth, .45, .6).toFixed(3));
    setVar("--plane-op", sstep(S.growth, .78, .9).toFixed(3));
    setVar("--bird-op", ((1 - nf) * (1 - S.growth * .55)).toFixed(3));
    if (palDue) cityGround.setAttribute("opacity", Math.min(1, S.growth * 5).toFixed(2));

    /* ---- sun / moon / glade ---- */
    var p = (tod - .25) / .5, sunUp = p >= -.04 && p <= 1.04;
    var pc = clamp(p, 0, 1);
    var sx = 1350 - 1100 * pc, sy = 592 - 470 * Math.sin(Math.PI * pc);
    sunG.setAttribute("transform", "translate(" + sx.toFixed(1) + "," + sy.toFixed(1) + ")");
    sunG.style.opacity = (sstep(p, -.04, .05) * (1 - sstep(p, .95, 1.04))).toFixed(3);
    sunDisc.setAttribute("r", (52 + 14 * (1 - Math.sin(Math.PI * pc))).toFixed(1));
    var pm = (((tod - .75) % 1) + 1) % 1 / .5, moonUp = pm <= 1.04;
    var pmc = clamp(pm, 0, 1);
    var mx = 1350 - 1100 * pmc, my = 592 - 470 * Math.sin(Math.PI * pmc);
    moonG.setAttribute("transform", "translate(" + mx.toFixed(1) + "," + my.toFixed(1) + ")");
    moonG.style.opacity = (moonUp ? sstep(pm, -.02, .06) * (1 - sstep(pm, .94, 1.04)) : 0).toFixed(3);

    /* ---- sun-side lighting on Fuji, rays, summit cloud ---- */
    var sunVis = parseFloat(sunG.style.opacity) || 0;
    var lowSun = 1 - Math.sin(Math.PI * pc);
    setVar("--rays-op", (sunVis * Math.pow(lowSun, 1.6) * .3).toFixed(3));
    var side = clamp((sx - 800) / 550, -1, 1), dayF = 1 - nf;
    var warmC = [255, 188, 128], coolC = [22, 24, 70];
    var litA = dayF * (.1 + .24 * lowSun) * sunVis, shdA = .3 * dayF * sunVis;
    var lL = clamp(.5 - side * .5, 0, 1);
    function litStop(id, light) {
      var s = document.getElementById(id);
      s.setAttribute("stop-color", css(mix(coolC, warmC, light)));
      s.setAttribute("stop-opacity", lerp(shdA, litA, light).toFixed(3));
    }
    if (palDue) {
      litStop("litS0", lL); litStop("litS2", 1 - lL);
      document.getElementById("litS1").setAttribute("stop-opacity", (shdA * .15).toFixed(3));
    }
    var landDay = mix(seasonVal("field", w), seasonVal("ground", w), .3);
    var landC = mix(landDay, mix(hx("858a90"), [226, 233, 243], w[3] * .35 * (1 - S.growth * .5)), sstep(S.growth, .25, .55));
    var roadC = mix(mix(hx("8e7d64"), hx("4a505a"), sstep(S.growth, .2, .45)), [232, 238, 246], w[3] * .45 * (1 - sstep(S.growth, .4, .8) * .7));
    var walkC = mix(roadC, [196, 196, 204], .38 * sstep(S.growth, .25, .5));
    var dk = [9, 12, 26];
    setVar("--land", css(mix(landC, dk, nf * .64)));
    setVar("--road", css(mix(roadC, dk, nf * .68)));
    setVar("--walk", css(mix(walkC, dk, nf * .6)));
    setVar("--shade-l", (.12 + .26 * (1 - clamp(side, 0, 1)) * dayF).toFixed(3));
    setVar("--shade-r", (.12 + .26 * (1 - clamp(-side, 0, 1)) * dayF).toFixed(3));
    var lampGate = sstep(S.growth, .3, .5);
    setVar("--lamp-gate", lampGate.toFixed(3));
    setVar("--lamp-glow", (lampGate * sstep(nf, .5, .8) * .85).toFixed(3));
    setVar("--tree-op", (1 - lampGate).toFixed(3));
    setVar("--car-op", sstep(S.growth, .38, .5).toFixed(3));
    setVar("--car-bright", (1 - .65 * nf).toFixed(2));
    setVar("--lights-op", (sstep(nf, .45, .8) * .5).toFixed(3));
    setVar("--lane-op", (sstep(S.growth, .42, .55) * .85).toFixed(3));
    var distOn = sstep(S.growth, .5, .6);
    setVar("--neon-op", ((.3 + .7 * sstep(nf, .4, .8)) * distOn).toFixed(3));
    setVar("--neon-txt", (.78 + .22 * sstep(nf, .4, .8)).toFixed(3));
    setVar("--neon-glow", (distOn * sstep(nf, .4, .85) * .95).toFixed(3));
    setVar("--gate-op", distOn.toFixed(3));
    setVar("--nite", sstep(nf, .45, .8).toFixed(3));
    setVar("--sig-op", sstep(S.growth, .34, .4).toFixed(3));
    setVar("--mega-op", sstep(S.growth, .74, .9).toFixed(3));
    setVar("--led-op", (sstep(S.growth, .72, .86) * (.55 + .45 * sstep(nf, .4, .8))).toFixed(3));
    setVar("--cap-op", (.25 + .6 * (Math.sin(S.simDays * .31) * .5 + .5)).toFixed(3));
    if (palDue) {                                                   // switch animations off while their layer is invisible
      svg.classList.toggle("noStars", sstep(nf, .62, .95) < .01);
      svg.classList.toggle("smokeOff", (1 - sstep(S.growth, .15, .35)) < .01);
      svg.classList.toggle("ledOn", sstep(S.growth, .72, .86) > .01);
      beaconVis = sstep(nf, .4, .75) > .02;
    }
    if (palDue && !S.scrubbing) todSlider.value = Math.round(tod * 1000);

    /* ---- growth: buildings, trees, cranes ---- */
    if (Math.abs(S.growth - S.growthApplied) > .0015) {
      S.growthApplied = S.growth;
      for (var i = 0; i < buildings.length; i++) {
        var b = buildings[i];
        var sc = sstep(S.growth, b.g0, b.g0 + b.dg); if (b.inv) sc = 1 - sc;
        if (Math.abs(sc - b.last) > .004) { b.last = sc; paintBuilding(b); }
      }
      for (var t = 0; t < trees.length; t++) {
        var tr = trees[t];
        if (tr.nearest >= 1) continue;
        var op = 1 - sstep(S.growth, tr.nearest - .02, tr.nearest + .07);
        if (Math.abs(op - tr.fade) > .03) { tr.fade = op; tr.el.style.opacity = op.toFixed(2); }
      }
      for (var c = 0; c < cranes.length; c++) {
        var cr = cranes[c];
        var cro = clamp(1 - Math.abs(S.growth - cr.c) / .2, 0, 1) * .95;
        cr.el.style.opacity = cro.toFixed(2); cr.el.classList.toggle("idle", cro < .02);
      }
      updateScenery(S.growth);
    }

    /* ---- HUD (own slow clock) ---- */
    if (!hudDue) return;
    var dom = 0; for (var d = 1; d < 4; d++) if (w[d] > w[dom]) dom = d;
    var era = S.growth < .22 ? 0 : S.growth < .47 ? 1 : S.growth < .74 ? 2 : 3;
    var yr = Math.floor(year) + 1;
    var key = dom + "|" + era + "|" + yr;
    if (key !== S.hudCache) {
      S.hudCache = key;
      seasonKj.textContent = SEASONS[dom][0]; seasonName.textContent = SEASONS[dom][1];
      eraKj.textContent = ERAS[era][0]; eraName.textContent = ERAS[era][1];
      yearLabel.textContent = "Year " + yr;
    }
    eraBar.style.width = (S.growth * 100).toFixed(1) + "%";
    var di = S.growth < .22 ? 0 : S.growth < .47 ? 1 : S.growth < .56 ? 2 : S.growth < .65 ? 3 : S.growth < .74 ? 4 : 5;
    if (di !== distIdx) setDistrict(di);
    var spd = Math.max(1, Math.round(S.speed));
    var chipTxt = S.paused ? "0×" : spd + "×";
    if (speedChip.textContent !== chipTxt) speedChip.textContent = chipTxt;
    body.classList.toggle("ff", S.speed > 2.5);
  }

  /* ================= particles ================= */
  var acc = { petal: 0, maple: 0, flake: 0, fly: 0, fw: 0 };
  function applyRateTo(e) {
    if (S.rateApplied >= 0 && Math.abs(S.rateApplied - 1) > .01 && e.getAnimations) {
      e.getAnimations({ subtree: true }).forEach(function (a) { a.playbackRate = S.rateApplied; });
    }
  }
  function spawnFaller(kind) {
    if (S.particleCount > (S.speed > 3 ? 32 : GOV.cur.part)) return;
    var wrap = document.createElement("div"); wrap.className = "petalWrap";
    var p = document.createElement("div"); p.className = "petal" + (kind === "petal" ? "" : " " + kind);
    var sz = kind === "flake" ? 3 + Math.random() * 4.5 : kind === "maple" ? 9 + Math.random() * 6 : 7 + Math.random() * 8;
    var dur = kind === "flake" ? 11 + Math.random() * 7 : 8 + Math.random() * 8;
    var x0 = Math.random() * 100, x1 = x0 + (Math.random() * 30 - (kind === "flake" ? 15 : 8));
    wrap.style.setProperty("--sz", sz.toFixed(1) + "px");
    wrap.style.setProperty("--d", dur.toFixed(2) + "s");
    wrap.style.setProperty("--s", (kind === "flake" ? 2.4 + Math.random() * 2 : 1.4 + Math.random() * 1.8).toFixed(2) + "s");
    wrap.style.setProperty("--x0", x0.toFixed(1) + "vw");
    wrap.style.setProperty("--x1", x1.toFixed(1) + "vw");
    wrap.style.opacity = (kind === "flake" ? .7 + Math.random() * .3 : .65 + Math.random() * .35).toFixed(2);
    wrap.appendChild(p); fx.appendChild(wrap); S.particleCount++;
    applyRateTo(wrap);
    wrap.addEventListener("animationend", function (e) {
      if (e.animationName === "petalFall") { wrap.remove(); S.particleCount--; }
    });
  }
  function spawnFirefly() {
    if (S.particleCount > GOV.cur.part) return;
    var wrap = document.createElement("div"); wrap.className = "flyWrap";
    wrap.style.left = (8 + Math.random() * 84) + "vw";
    wrap.style.top = (58 + Math.random() * 28) + "vh";
    wrap.style.setProperty("--d", (6 + Math.random() * 4).toFixed(2) + "s");
    var dot = document.createElement("div"); dot.className = "flyDot";
    wrap.appendChild(dot); fx.appendChild(wrap); S.particleCount++;
    applyRateTo(wrap);
    wrap.addEventListener("animationend", function (e) {
      if (e.animationName === "flyWander") { wrap.remove(); S.particleCount--; }
    });
  }
  var fwG = document.getElementById("fireworks"), FWC = ["#ff5a7a", "#ffd24a", "#6ad1ff", "#9dff7a", "#ff9a3a", "#d58aff"];
  function spawnFirework() {
    if (fwG.childNodes.length > 5) return;
    var x = 260 + Math.random() * 1000, y = 120 + Math.random() * 210, c1 = FWC[Math.floor(Math.random() * FWC.length)], c2 = FWC[Math.floor(Math.random() * FWC.length)];
    var g = el("g", { transform: "translate(" + x.toFixed(0) + "," + y.toFixed(0) + ")" }, fwG), b = el("g", {}, g, "fwBurst"), d1 = "", d2 = "", n = 18, i, a;
    for (i = 0; i < n; i++) { a = i / n * Math.PI * 2; d1 += "M" + (Math.cos(a) * 14).toFixed(1) + " " + (Math.sin(a) * 14).toFixed(1) + "L" + (Math.cos(a) * 62).toFixed(1) + " " + (Math.sin(a) * 62).toFixed(1); }
    for (i = 0; i < 12; i++) { a = i / 12 * Math.PI * 2 + .26; d2 += "M" + (Math.cos(a) * 30).toFixed(1) + " " + (Math.sin(a) * 30).toFixed(1) + "L" + (Math.cos(a) * 40).toFixed(1) + " " + (Math.sin(a) * 40).toFixed(1); }
    el("path", { d: d1, fill: "none", stroke: c1, "stroke-width": 2.4, "stroke-linecap": "round", "stroke-dasharray": "16 40" }, b);
    el("path", { d: d2, fill: "none", stroke: c2, "stroke-width": 3, "stroke-linecap": "round" }, b);
    setTimeout(function () { g.remove(); }, 2100);
    sfx("boom", 380);
  }
  function spawnShot() {
    var nf = (Math.cos((((S.dayAcc % 1) + 1) % 1) * Math.PI * 2) + 1) / 2;
    if (nf < .85 || document.hidden || reduced || S.paused) return;
    var shot = document.createElement("div"); shot.className = "shot";
    shot.style.left = (10 + Math.random() * 55) + "vw";
    shot.style.top = (4 + Math.random() * 22) + "vh";
    fx.appendChild(shot);
    shot.addEventListener("animationend", function () { shot.remove(); });
  }
  setInterval(spawnShot, 5200);

  /* ================= animation speed sync ================= */
  function syncRates() {
    if (Math.abs(S.speed - S.rateApplied) < .12) return;
    S.rateApplied = S.speed;
    if (!document.getAnimations) return;
    document.getAnimations().forEach(function (a) {
      var t = a.effect && a.effect.target;
      if (t && t.closest && t.closest("svg.scene, #fx")) {
        try { a.playbackRate = S.speed; } catch (e) {}
      }
    });
  }

  /* ================= frame governor =================
     Every kind of element runs on its own clock instead of "everything, every frame":
       every display frame : camera parallax, sun and moon, drawing of vehicles / people (interpolated)
       signals 10 Hz · vehicles 30 Hz · bicycles 24 Hz · pedestrians 20 Hz  (traffic section)
       palette (the ~60 CSS colour variables) 10 Hz · HUD 5 Hz · audio levels 10 Hz · beacon blink on two JS clocks
     The governor watches the real frame interval and, on a slow device, steps down to lighter settings (and back up
     when there is headroom), so the picture stays smooth instead of stuttering. */
  var QUALITY = [
    { name: "full",     pal: 10, hud: 5, aud: 10, part: 90, car: 30, bike: 24, ped: 20 },
    { name: "balanced", pal: 6,  hud: 4, aud: 6,  part: 45, car: 24, bike: 20, ped: 15 },
    { name: "light",    pal: 4,  hud: 3, aud: 4,  part: 20, car: 20, bike: 15, ped: 12 }
  ];
  var GOV = { level: 0, auto: true, ema: 16.7, slowFor: 0, fastFor: 0, cur: QUALITY[0], runs: { pal: 0, hud: 0, aud: 0, frames: 0 }, t0: performance.now(), palAcc: 0, hudAcc: 0, audAcc: 0 };
  function setQuality(l) {
    GOV.level = clamp(l, 0, QUALITY.length - 1); GOV.cur = QUALITY[GOV.level];
    traffic.setRates(GOV.cur.car, GOV.cur.bike, GOV.cur.ped);
  }
  function govFrame(dt) {                                  // dt in seconds (unclamped real interval)
    GOV.runs.frames++;
    GOV.ema += (dt * 1000 - GOV.ema) * .08;
    if (!GOV.auto || document.hidden || performance.now() - GOV.t0 < 4000) return;           // warm-up: start-up frames are always slow
    if (GOV.ema > 38) { GOV.slowFor += dt; GOV.fastFor = 0; } else if (GOV.ema < 22) { GOV.fastFor += dt; GOV.slowFor = 0; } else { GOV.slowFor = GOV.fastFor = 0; }
    if (GOV.slowFor > 2 && GOV.level < QUALITY.length - 1) { setQuality(GOV.level + 1); GOV.slowFor = 0; }     // sustained slow frames: lighten up
    else if (GOV.fastFor > 6 && GOV.level > 0) { setQuality(GOV.level - 1); GOV.fastFor = 0; }                // sustained headroom: restore detail
  }
  function tierDue(key, hz, dt, force) {                   // true when this tier's clock fires on this frame
    GOV[key + "Acc"] += dt;
    if (force || GOV[key + "Acc"] >= 1 / hz) { GOV[key + "Acc"] = force ? 0 : GOV[key + "Acc"] % (1 / hz); GOV.runs[key]++; return true; }
    return false;
  }

  /* ================= weather (see weather.js) ================= */
  var wxRow = document.getElementById("wxRow"), wxKj = document.getElementById("wxKj"), wxName = document.getElementById("wxName");
  var weather = createWeather({
    canvas: document.getElementById("wxRain"), shade: document.getElementById("wxShade"), wet: document.getElementById("wxWet"), flash: document.getElementById("wxFlash"), fx: fx,
    buildings: buildings, growth: function () { return S.growth; }, paint: paintBuilding, quality: function () { return GOV.level; },
    onStatus: function (k) { wxRow.hidden = k === "clear"; if (k !== "clear") { wxKj.textContent = k === "typhoon" ? "台風" : "雨"; wxName.textContent = k === "typhoon" ? "Typhoon" : "Rain"; } },
    onRaining: function (on) { svg.classList.toggle("raining", on); },
    onThunder: function (delay, v) { sfx("thunder", delay * 1000, v); },
    onCollapse: function () { sfx("crash"); }
  });

  initAudio({ cranes: cranes, sig: traffic.sig, weather: weather });

  /* ================= main loop ================= */
  var last = performance.now();
  function tick(now) {
    var rdt = (now - last) / 1000, dt = Math.min(.08, rdt); last = now;
    govFrame(rdt);
    S.targetSpeed = S.paused ? 0 : (S.holding || S.holdKey) ? HOLD_MULT : 1;
    S.speed += (S.targetSpeed - S.speed) * Math.min(1, dt * 4.5);
    if (Math.abs(S.speed - S.targetSpeed) < .01) S.speed = S.targetSpeed;
    if (S.pinned) { S.simDays = S.pinned[0]; S.dayAcc = S.pinned[1]; }
    else {
      S.simDays += dt * S.speed * DAYS_PER_SEC;
      S.dayAcc += dt * Math.min(S.speed, 3.5) * DAY_RATE;   // cap day-cycle rate: no strobing
      if (S.pinDays !== null) S.simDays = S.pinDays;          // test hook: freeze the era but let day and night keep moving
    }
    var s = (((S.simDays - .6) / 2) % 4 + 4) % 4, w = seasonWeights(s);
    var nf = (Math.cos((((S.dayAcc % 1) + 1) % 1) * Math.PI * 2) + 1) / 2;
    if (S.petalsOn && !reduced && S.speed > .02) {
      acc.petal += dt * S.speed * 2.4 * w[0];
      acc.maple += dt * S.speed * 2.0 * w[2];
      acc.flake += dt * S.speed * 6.5 * w[3];
      acc.fly   += dt * Math.min(S.speed, 3) * 1.3 * w[1] * sstep(nf, .6, .9);
      while (acc.petal >= 1) { acc.petal--; spawnFaller("petal"); }
      while (acc.maple >= 1) { acc.maple--; spawnFaller("maple"); }
      while (acc.flake >= 1) { acc.flake--; spawnFaller("flake"); }
      while (acc.fly >= 1) { acc.fly--; spawnFirefly(); }
      acc.fw += dt * Math.min(S.speed, 3) * .4 * w[1] * sstep(nf, .55, .85) * sstep(S.growth, .12, .2);
      while (acc.fw >= 1) { acc.fw--; spawnFirework(); }
    }
    // parallax: foreground and branch drift against the distant mountain
    S.px += (S.pxT - S.px) * Math.min(1, dt * 3); S.py += (S.pyT - S.py) * Math.min(1, dt * 3);
    fgLayer.style.transform = "translate(" + (-S.px * 8).toFixed(1) + "px,0)";
    sakuraEl.style.transform = "translate(" + (-S.px * 22).toFixed(1) + "px," + (-S.py * 8).toFixed(1) + "px) scale(1.04)";
    cloudsEl.style.transform = "translate(" + (S.px * 7).toFixed(1) + "px,0)";
    if (audioStarted() && tierDue("aud", GOV.cur.aud, dt, false)) updateAudio(w, nf);
    traffic.updateTraffic(dt);
    weather.step(S.paused ? 0 : dt * Math.min(S.speed, 3), !S.pinned && S.pinDays === null && S.growthOverride === null && !reduced);     // frozen while a test pins the scene
    syncRates();
    palDue = tierDue("pal", S.scrubbing ? 30 : GOV.cur.pal, dt, S.growthApplied < 0);          // forced when the era / time is jumped, fast while scrubbing
    hudDue = tierDue("hud", GOV.cur.hud, dt, S.growthApplied < 0);
    blinkT += dt * Math.min(S.speed, 3);
    if (beaconVis) {                                                                          // aircraft-warning beacons: two shared clocks, only at night
      var bo = (blinkT % 2.2) < 1.21, wo = (blinkT % 1.4) < .77;
      if (bo !== bOn) { bOn = bo; svg.classList.toggle("bOn", bo); }
      if (wo !== wOn) { wOn = wo; svg.classList.toggle("wOn", wo); }
    }
    applyFrame();
    requestAnimationFrame(tick);
  }


  // time-of-day scrubber + mouse parallax
  todSlider.addEventListener("pointerdown", function (e) { e.stopPropagation(); S.scrubbing = true; });
  todSlider.addEventListener("input", function () { S.dayAcc = todSlider.value / 1000; });
  window.addEventListener("pointerup", function () { S.scrubbing = false; });
  window.addEventListener("pointermove", function (e) {
    S.pxT = (e.clientX / innerWidth - .5) * 2; S.pyT = (e.clientY / innerHeight - .5) * 2;
  });

  /* ================= controls ================= */
  var playBtn = document.getElementById("playBtn");
  var icoPlay = document.getElementById("icoPlay"), icoPause = document.getElementById("icoPause");
  var playLabel = document.getElementById("playLabel");
  function setPaused(p) {
    S.paused = p;
    playBtn.setAttribute("aria-pressed", String(p));
    icoPlay.style.display = p ? "" : "none";
    icoPause.style.display = p ? "none" : "";
    playLabel.textContent = p ? "Play" : "Pause";
    try { p ? svg.pauseAnimations() : svg.unpauseAnimations(); } catch (e) {}
  }
  playBtn.addEventListener("click", function () { setPaused(!S.paused); });
  document.getElementById("restartBtn").addEventListener("click", restart);
  function restart() {
    S.simDays = .6; S.dayAcc = .32; S.growthApplied = -1; S.hudCache = "";
    fx.innerHTML = ""; S.particleCount = 0;
    acc.petal = acc.maple = acc.flake = acc.fly = acc.fw = 0;
    traffic.resetTraffic();
    weather.reset();
    setPaused(false);
  }
  var petalBtn = document.getElementById("petalBtn");
  petalBtn.setAttribute("aria-pressed", String(S.petalsOn));
  petalBtn.addEventListener("click", function () {
    S.petalsOn = !S.petalsOn;
    petalBtn.setAttribute("aria-pressed", String(S.petalsOn));
  });

  // press & hold anywhere (except the control panel) to fast-forward
  window.addEventListener("pointerdown", function (e) {
    if (e.target.closest && e.target.closest("#panel")) return;
    if (e.button !== undefined && e.button !== 0) return;
    S.holding = true; body.classList.add("holding");
  });
  function release() { S.holding = false; body.classList.remove("holding"); }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("blur", function () { release(); S.holdKey = false; });
  svg.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  window.addEventListener("keydown", function (e) {
    if (e.key === "Shift" || e.key.toLowerCase() === "f") S.holdKey = true;
    else if (e.key === " ") { e.preventDefault(); setPaused(!S.paused); }
    else if (e.key.toLowerCase() === "r") restart();
    else if (e.key.toLowerCase() === "p") petalBtn.click();
    else if (e.key.toLowerCase() === "m") toggleSound();
  });
  window.addEventListener("keyup", function (e) {
    if (e.key === "Shift" || e.key.toLowerCase() === "f") S.holdKey = false;
  });

  /* ================= debug / test hook ================= */
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

  /* ================= go ================= */
  buildFuji();
  buildSnow(365);
  setPaused(S.paused);
  applyFrame();
  requestAnimationFrame(tick);
})();
