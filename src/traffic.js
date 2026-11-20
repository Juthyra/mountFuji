/* Traffic and people: the Intelligent Driver Model car-following, the signal controller and level crossing, the pedestrian state machine,
   the per-kind fixed-rate clocks with interpolated drawing, and the safety test hooks (simTest, frameTest, settleTraffic).

   createTraffic(ctx) builds the vehicles and people at the point where main.js calls it (the order matters: it draws from the seeded city
   random generator) and returns the handful of functions the rest of the page needs.
   ctx: SX, SY (street projection), carsG, sigLamps, xings, ltTrainEl, drawCar, drawBus, CAR_TYPES, PAINTS, BUS_LIV, slow() (weather slow-down factor). */
import { S } from "./state.js";
import { clamp, sstep, el, rnd } from "./util.js";

export function createTraffic(ctx) {
  var SX = ctx.SX, SY = ctx.SY, carsG = ctx.carsG, sigLamps = ctx.sigLamps, xings = ctx.xings, ltTrainEl = ctx.ltTrainEl;
  var drawCar = ctx.drawCar, drawBus = ctx.drawBus, CAR_TYPES = ctx.CAR_TYPES, PAINTS = ctx.PAINTS, BUS_LIV = ctx.BUS_LIV;
  /* ================= pedestrians ================= */
  var peds = [], pedsG = document.getElementById("pedsG");
  var coats = ["#c0392b", "#2c6fbb", "#e8e8ee", "#2b2f3a", "#e0a82e", "#3f9a6a", "#8e5bb5", "#d97aa6", "#5a6478", "#e6e0d0", "#1f2530"];
  var skins = ["#f1c9a5", "#e0ac84", "#c68b62", "#f5d5b8"];
  var UMB = ["#c0392b", "#2c6fb0", "#e0b43a", "#3f8f5f", "#7b4fa0", "#d9d9df"];     // umbrellas: fixed colours, no rnd() so the seeded layout is untouched
  function makePed(o) {
    var g = el("g", {}, o.parent || pedsG, "pedG"), b = el("g", {}, g);
    o.legA = el("rect", { x: -1.9, y: -18, width: 3.8, height: 19, rx: 1.6, fill: "#1d2230" }, b);
    o.legB = el("rect", { x: -1.9, y: -18, width: 3.8, height: 19, rx: 1.6, fill: "#2a3040" }, b);
    el("rect", { x: -5, y: -38, width: 10, height: 21, rx: 4.2, fill: o.coat }, b);
    if (rnd() < .35) el("rect", { x: 3.6, y: -30, width: 5, height: 8, rx: 1.4, fill: "#3a2b20" }, b);
    el("circle", { cx: 0, cy: -43, r: 4.9, fill: skins[Math.floor(rnd() * skins.length)] }, b);
    el("path", { d: "M-5 -43 A5 5 0 0 1 5 -43 Z", fill: "#14110f" }, b);
    el("rect", { x: -.6, y: -55, width: 1.2, height: 13, fill: "#2a2a30" }, g, "umb");
    el("path", { d: "M-13 -52 Q0 -68 13 -52 Q6.5 -55.5 0 -54 Q-6.5 -55.5 -13 -52 Z", fill: UMB[peds.length % UMB.length] }, g, "umb");
    o.g = g; o.b = b; o.shown = true; o.phase = rnd() * 6.28; o.wait = 0; o.fade = 1;
    peds.push(o);
  }
  /* ================= cyclists (town era) ================= */
  var bikes = [], HAIR = ["#14110f", "#2a1d14", "#3a2a1c", "#6b6b6e"], BAGS = ["#c9a15a", "#5a86b5", "#d46a6a", "#4f8f66"];
  function drawBike(g, front, rider) {
    var tire = "#1b1f26", metal = "#8b94a1", dark = "#3a4150", leg = rider.pants, E = function (t, a, p) { return el(t, a, p || body); };
    el("ellipse", { cx: 0, cy: 1, rx: 13, ry: 2.6, fill: "#000", "fill-opacity": ".32" }, g);
    var body = el("g", {}, g), o = { body: body };
    function wheel() {
      E("ellipse", { cx: 0, cy: -10, rx: 2.7, ry: 10, fill: tire });
      E("ellipse", { cx: 0, cy: -10, rx: 1.1, ry: 8, fill: "#c4ccd6", "fill-opacity": ".5" });
      E("rect", { x: -3.4, y: -21, width: 6.8, height: 4, rx: 2, fill: "#5a6372" });                                    // mudguard
    }
    function torso() {
      o.legL = E("g", {}); o.legR = E("g", {});
      E("rect", { x: -5.6, y: -31, width: 3.8, height: 22, rx: 1.8, fill: leg }, o.legL); E("rect", { x: -6.2, y: -11, width: 5, height: 2.6, rx: 1.2, fill: "#1d2230" }, o.legL);
      E("rect", { x: 1.8, y: -31, width: 3.8, height: 22, rx: 1.8, fill: leg }, o.legR); E("rect", { x: 1.2, y: -11, width: 5, height: 2.6, rx: 1.2, fill: "#1d2230" }, o.legR);
      E("rect", { x: -3.2, y: -33, width: 6.4, height: 3.2, rx: 1.4, fill: "#2a2f3a" });                                // saddle
      if (!front && rider.pack) E("rect", { x: -4.6, y: -48, width: 9.2, height: 13, rx: 2.4, fill: rider.pack });     // rucksack
      E("rect", { x: -5.8, y: -50, width: 11.6, height: 19, rx: 4.4, fill: rider.coat });                                // jacket
      E("rect", { x: -5.8, y: -50, width: 3, height: 19, rx: 1.5, fill: "#000", "fill-opacity": ".12" });
      E("circle", { cx: 0, cy: -55.4, r: 4.6, fill: front ? rider.skin : rider.hair });                                   // head
      if (front) {
        E("path", { d: "M-4.7 -55.4A4.7 4.7 0 0 1 4.7 -55.4Q0 -58.4 -4.7 -55.4Z", fill: rider.hair });
        E("circle", { cx: -1.7, cy: -55, r: .6, fill: "#2a1f1a" }); E("circle", { cx: 1.7, cy: -55, r: .6, fill: "#2a1f1a" });
      } else E("path", { d: "M-4.6 -55.4A4.6 4.6 0 0 1 4.6 -55.4Z", fill: "#000", "fill-opacity": ".15" });
    }
    function bars() {
      E("path", { d: "M-5.2 -46L-10 -35M5.2 -46L10 -35", fill: "none", stroke: rider.coat, "stroke-width": 3.2, "stroke-linecap": "round" });   // arms
      E("path", { d: "M-11 -34.5Q0 -38 11 -34.5", fill: "none", stroke: dark, "stroke-width": 1.8, "stroke-linecap": "round" });                           // handlebar
      E("circle", { cx: -10.4, cy: -34.6, r: 1.7, fill: rider.skin }); E("circle", { cx: 10.4, cy: -34.6, r: 1.7, fill: rider.skin });
    }
    if (front) {
      torso(); wheel();
      E("path", { d: "M0 -10V-33", stroke: metal, "stroke-width": 2, fill: "none" });                                    // fork + stem
      E("rect", { x: -8.5, y: -30, width: 17, height: 11, rx: 1.6, fill: "none", stroke: "#a6afbc", "stroke-width": 1.1 });   // wire basket
      E("path", { d: "M-5 -30V-19M-1.7 -30V-19M1.7 -30V-19M5 -30V-19M-8.5 -25H8.5", stroke: "#a6afbc", "stroke-width": .7, fill: "none" });
      E("rect", { x: -6.5, y: -32, width: 13, height: 8, rx: 2, fill: rider.bag });                                         // shopping bag
      bars();
      E("circle", { cx: 0, cy: -22, r: 1.6, fill: "#fff3b8" });                                                             // dynamo lamp
      E("circle", { cx: 0, cy: -22, r: 9, fill: "#fff3b8" }, g).setAttribute("class", "carGlow");
    } else {
      E("path", { d: "M-11 -34.5Q0 -38 11 -34.5", fill: "none", stroke: dark, "stroke-width": 1.8, "stroke-linecap": "round" });
      torso(); bars();
      wheel();
      E("rect", { x: -5.4, y: -22.5, width: 10.8, height: 2.4, rx: 1, fill: "#7d8794" });                                  // rear rack
      E("rect", { x: -1.6, y: -17, width: 3.2, height: 3.6, rx: 1, fill: "#e0302a" });                                     // reflector
      el("circle", { cx: 0, cy: -15.2, r: 7, fill: "#ff3b30" }, g, "carGlow");
    }
    return o;
  }
  /* ================= traffic simulation =================
     How it works (beginner version):
     - Every vehicle follows the Intelligent Driver Model (IDM): it accelerates toward its own desired speed and brakes smoothly for
       whatever is in front of it — the vehicle ahead, a red light, or a person on the crossing. Because braking is part of the
       formula, vehicles cannot overlap (a hard "bumpers never touch" check backs it up).
     - A signal controller cycles: vehicles green -> yellow -> all red -> pedestrians WALK -> flashing -> all red.
       Pedestrians only start crossing during WALK; vehicles only get green when the crossing is empty.
     - Each kind of mover runs on its OWN fixed-rate clock ("own calculation frame speed"); drawing interpolates between the last two
       steps, so motion stays smooth whatever the screen refresh rate is.
         signals 10 Hz · vehicles 30 Hz · bicycles 24 Hz · pedestrians 20 Hz
     Depth is D (distance away); position along the road is progress p = dir * D (dir -1 = coming toward us, +1 = driving away). */
  var trs = 424242;                                                        // own rng: the traffic never disturbs any seeded layout
  function tr() { trs = (trs + 0x6D2B79F5) | 0; var t = Math.imul(trs ^ trs >>> 15, 1 | trs); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function trr(a, b) { return a + (b - a) * tr(); }
  var TR = { stop: { "-1": 1.86, "1": 1.38 }, z0: 1.40, z1: 1.78, kerb: .82 };
  var RAIL = { stop: { "-1": 5.95, "1": 4.9 }, z0: 5.12, z1: 5.72 }, railShut = false, railEra = false, testMode = false;      // level crossing (gates down while the local train passes)     // stop lines per direction, crossing zone (D range), kerb X
  var KINDS = {
    car:  { L: .56, v0: [.55, .85], a: .55, b: 1.3, T: .9, s0: .12 },
    taxi: { L: .56, v0: [.60, .90], a: .62, b: 1.4, T: .8, s0: .12 },
    bus:  { L: 1.3, v0: [.42, .58], a: .38, b: 1.1, T: 1.0, s0: .16 },
    bike: { L: .24, v0: [.28, .40], a: .40, b: 1.2, T: .8, s0: .08 }
  };
  var vehs = [], carList = [], bikeList = [], busN2 = 0, lanesG = {};
  function laneGroup(parent, name) { return lanesG[name] || (lanesG[name] = el("g", {}, parent)); }
  function newVeh(kind, dir, th, thOut) {
    var K = KINDS[kind], v = { kind: kind, dir: dir, X: dir * (kind === "bike" ? .66 : .4), L: K.L, a: K.a * trr(.92, 1.08), b: K.b, T: K.T * trr(.92, 1.15), s0: K.s0,
      v0: trr(K.v0[0], K.v0[1]), th: th, thOut: thOut == null ? 9 : thOut, active: false, wait: trr(0, 5), D: 5, Dp: 5, v: 0, acc: 0, brk: false, brkOn: false,
      fresh: true, show: true, op: -1, lastD: -1, accS: 0, dec: 0, dec2: 0, age: 0, key: (kind === "bike" ? "b" : "c") + dir, ph: tr() * 6.28, lastGs: null };
    if (kind === "bike") {
      var g = el("g", {}, pedsG, "pedG"), rider = { coat: coats[Math.floor(tr() * coats.length)], pants: tr() < .5 ? "#2a3040" : "#4a5468", skin: skins[Math.floor(tr() * skins.length)],
        hair: HAIR[Math.floor(tr() * HAIR.length)], pack: tr() < .45 ? coats[Math.floor(tr() * coats.length)] : null, bag: BAGS[Math.floor(tr() * BAGS.length)] };
      laneGroup(pedsG, v.key).appendChild(g); v.g = v.wrap = g; v.o = drawBike(g, dir < 0, rider); bikeList.push(v);
    } else {
      var wrap = el("g", {}, laneGroup(carsG, v.key)), cg = el("g", {}, wrap, "carG");
      if (kind === "bus") drawBus(cg, dir < 0, BUS_LIV[busN2++ % BUS_LIV.length]);
      else if (kind === "taxi") drawCar(cg, dir < 0, "#f2c230", CAR_TYPES[tr() < .7 ? 0 : 1], true);
      else drawCar(cg, dir < 0, PAINTS[Math.floor(tr() * PAINTS.length)], CAR_TYPES[Math.floor(tr() * CAR_TYPES.length)], false);
      v.g = cg; v.wrap = wrap; carList.push(v);
    }
    v.wrap.style.display = "none"; v.show = false; v.wrap.setAttribute("data-vid", vehs.length);
    vehs.push(v); return v;
  }
  var ti;
  for (ti = 0; ti < 12; ti++) newVeh("car", ti % 2 ? 1 : -1, .42 + ti * .012);
  for (ti = 0; ti < 3; ti++) newVeh("taxi", ti % 2 ? 1 : -1, .5 + ti * .02);
  for (ti = 0; ti < 2; ti++) newVeh("bus", ti % 2 ? 1 : -1, .58 + ti * .04);
  for (ti = 0; ti < 6; ti++) newVeh("bike", ti % 2 ? 1 : -1, .2 + ti * .03, .66);

  /* ---------- traffic signals ---------- */
  var SIGP = [["vg", 18], ["vy", 3], ["ar1", 2], ["pw", 7], ["pf", 4], ["ar2", 2]];     // phase name, seconds
  var sig = { i: 0, t: 0, clock: 0, name: "vg", on: false }, lampV = "", lampP = "";
  var sigGreen = true, sigYellow = false, pedBusy = false;
  function vehInZone() {
    for (var i = 0; i < vehs.length; i++) { var v = vehs[i]; if (v.active && v.D + v.L / 2 > TR.z0 && v.D - v.L / 2 < TR.z1) return true; }
    return false;
  }
  function pedOnRoad() {
    for (var i = 0; i < crossers.length; i++) { var c = crossers[i]; if (c.state === "cross" && Math.abs(c.X) < .8) return true; }
    return false;
  }
  function setLamps(list, on) { for (var i = 0; i < list.length; i++) list[i].setAttribute("opacity", on ? 1 : 0); }
  function updateLamps() {
    var vs = !sig.on || sig.name === "vg" ? "g" : sig.name === "vy" ? "y" : "r";
    var ps = !sig.on ? "r" : sig.name === "pw" ? "g" : sig.name === "pf" ? (Math.floor(sig.clock * 2) % 2 ? "o" : "g") : "r";
    if (vs !== lampV) {
      lampV = vs; setLamps(sigLamps.vr, vs === "r"); setLamps(sigLamps.vy, vs === "y"); setLamps(sigLamps.vg, vs === "g");
      sigLamps.rep.forEach(function (e) { e.setAttribute("fill", vs === "r" ? "#ff3b30" : vs === "y" ? "#ffcc33" : "#3be06a"); });
    }
    if (ps !== lampP) { lampP = ps; setLamps(sigLamps.pr, ps === "r"); setLamps(sigLamps.pg, ps === "g"); }
  }
  var railSimT = 0;
  function railEraNow() { return sstep(S.growth, .26, .32) * (1 - sstep(S.growth, .58, .64)) > .3; }
  function railUpdate(dt) {
    var era = railEraNow(), ph = -1, anim;
    if (testMode) { railSimT += dt; ph = (railSimT % 16) / 16; }
    else if (ltTrainEl && (anim = ltTrainEl.getAnimations()[0])) ph = (((anim.currentTime % 16000) + 16000) % 16000) / 16000;
    railEra = era && ph >= 0;
    // The train is on the road for phase .185-.265 (about 1.3 s). Gates close ~4 s before it arrives (phase .93) and open ~0.6 s after it clears.
    var shut = railEra && (ph >= .93 || ph <= .31);
    if (shut !== railShut) { railShut = shut; if (!testMode) xings.forEach(function (x) { x.classList.toggle("on", shut); }); }
  }
  function sigStep(dt) {
    railUpdate(dt);
    sig.on = S.growth > .37;
    if (!sig.on) { sig.i = 0; sig.t = 0; sig.name = "vg"; updateLamps(); return; }
    sig.t += dt; sig.clock += dt;
    var cur = SIGP[sig.i];
    if (sig.t >= cur[1]) {
      var nx = (sig.i + 1) % SIGP.length, nn = SIGP[nx][0], hold = false;
      if (nn === "pw" && vehInZone() && sig.t < cur[1] + 8) hold = true;           // never release pedestrians into moving traffic
      else if (nn === "vg" && pedOnRoad() && sig.t < cur[1] + 12) hold = true;     // never release traffic onto people still crossing
      if (!hold) { sig.i = nx; sig.t = 0; }
    }
    sig.name = SIGP[sig.i][0];
    updateLamps();
  }

  /* ---------- vehicles: IDM car-following ---------- */
  function laneClear(v, D, margin) {
    for (var i = 0; i < vehs.length; i++) { var o = vehs[i]; if (o === v || !o.active || o.key !== v.key) continue; if (Math.abs(o.D - D) - (o.L + v.L) / 2 < margin) return false; }
    return true;
  }
  function spawnVeh(v) {
    var D = null, vv = 0, t, c;
    if (v.fresh) for (t = 0; t < 10 && D === null; t++) { c = trr(2.4, 9.2); if (railEraNow() && c > RAIL.stop["1"] - .5 && c < RAIL.stop["-1"] + .5) continue; if (laneClear(v, c, .55)) { D = c; vv = v.v0 * .85; if (railEraNow() && (v.dir < 0 ? (c > RAIL.stop["-1"] && c < RAIL.stop["-1"] + 2.4) : (c < RAIL.stop["1"] && c > RAIL.stop["1"] - 2.4))) vv = 0; } }   // scattered next to the gates: start from rest (a car cannot brake from nowhere)     // first time: scatter along the road
    if (D === null) { c = v.dir < 0 ? 10.4 : .55; if (!laneClear(v, c, .35)) return; D = c; vv = v.dir < 0 ? v.v0 * .85 : 0; }
    var lead = null, lg = 99;                                                            // never appear faster than the car ahead can cope with
    for (t = 0; t < vehs.length; t++) { var o = vehs[t]; if (o === v || !o.active || o.key !== v.key) continue; var gg = o.dir * o.D - v.dir * D - (o.L + v.L) / 2; if (gg > 0 && gg < lg) { lg = gg; lead = o; } }
    if (lead) vv = Math.min(vv, .9 * Math.sqrt(lead.v * lead.v + 2 * v.b * Math.max(lg - v.s0, 0)), Math.max(0, (lg - v.s0) / v.T));   // and already at the equilibrium gap (s0 + v*T), so no correcting brake
    v.D = v.Dp = D; v.v = vv; v.acc = 0; v.accS = 0; v.dec = 0; v.dec2 = 0; v.active = true; v.fresh = false; v.lastGs = null; v.op = -1; v.age = 0;
  }
  function deactivate(v) { v.active = false; v.wait = trr(.8, 4); v.v = 0; v.accS = 0; v.dec = 0; v.dec2 = 0; v.brk = false; }
  function vehStep(list, dt) {
    sigGreen = !sig.on || sig.name === "vg"; sigYellow = sig.on && sig.name === "vy"; pedBusy = pedOnRoad();
    var lanes = { "c-1": [], "c1": [], "b-1": [], "b1": [] }, i, v;
    for (i = 0; i < list.length; i++) {
      v = list[i]; v.Dp = v.D;
      var allowed = S.growth >= v.th && S.growth < v.thOut;
      if (v.active && !allowed) deactivate(v);
      if (!v.active) { if (allowed) { v.wait -= dt; if (v.wait <= 0) spawnVeh(v); } if (!v.active) continue; }   // a vehicle that just spawned moves in the same step
      lanes[v.key].push(v);
    }
    for (var key in lanes) {
      var Ls = lanes[key]; if (!Ls.length) continue;
      Ls.sort(function (a, b) { return a.dir * a.D - b.dir * b.D; });                   // followers first … leader last
      for (i = Ls.length - 1; i >= 0; i--) {
        v = Ls[i];
        var lead = i < Ls.length - 1 ? Ls[i + 1] : null, p = v.dir * v.D, free = 1 - Math.pow(v.v / (v.v0 * (testMode ? 1 : ctx.slow())), 4), acc = v.a * free, rs = 2 * Math.sqrt(v.a * v.b);
        if (lead) {
          var gap = Math.max(.02, lead.dir * lead.D - p - (lead.L + v.L) / 2), ss = v.s0 + Math.max(0, v.v * v.T + v.v * (v.v - lead.v) / rs);
          acc = v.a * (free - (ss / gap) * (ss / gap));
        }
        var stopFor = !sigGreen || pedBusy;
        if (!stopFor) v.dec = 0;
        else {                                                                           // a red light / people on the crossing act like a stopped car at the stop line
          var gs = v.dir * TR.stop[v.dir] - (p + v.L / 2);
          if (gs < -.05) v.dec = 0;                                                      // already over the line: carry on
          else {
            var sl = v.s0 + Math.max(0, v.v * v.T + v.v * v.v / rs), rr = sl / Math.max(gs + .06, .02), a2 = v.a * (free - rr * rr);
            if (!v.dec) v.dec = (sigYellow && !pedBusy && a2 < -v.b * 1.6) ? 2 : 1;     // yellow: if stopping would need harsh braking, commit to going through (sticky choice)
            if (v.dec === 1) acc = Math.min(acc, a2);
          }
        }
        var railBlock = railShut;
        if (railEra && !railShut && lead) {                                              // "don't block the box": only enter the crossing if the whole queue ahead leaves room to clear it
          var exitP = v.dir < 0 ? -RAIL.z0 : RAIL.z1, need = v.L + .3, jj;
          for (jj = i + 1; jj < Ls.length; jj++) {
            var q = Ls[jj];
            if (q.v < .1) { if ((q.dir * q.D - q.L / 2) - exitP < need) railBlock = true; break; }     // first stopped car: its rear must be far enough past the tracks
            need += q.L + .2;                                                                             // moving cars ahead will need space too
          }
        }
        if (railEra && !railBlock && stopFor && v.dir < 0) {                             // predictive: light ahead is red, so everything between the tracks and the stop line will queue up
          var used = v.L + .3, ww;
          for (ww = 0; ww < Ls.length; ww++) { var o2 = Ls[ww]; if (o2 !== v && o2.dir * o2.D > p && o2.D < RAIL.z0 + .2) used += o2.L + .2; }
          if (used > RAIL.z0 - TR.stop[-1] && p > -RAIL.stop["-1"] - 1.5 && p < -RAIL.z1 + .1) railBlock = true;
        }
        if (railBlock) {                                                                 // gates down (or no room beyond): treat the crossing like another stop line
          var gr = v.dir * RAIL.stop[v.dir] - (p + v.L / 2);
          if (gr < -.2) v.dec2 = 0;                                                      // 20 cm of tolerance: still short of the rail bed, so a nose over the line must stop too
          else {
            var sr = v.s0 + Math.max(0, v.v * v.T + v.v * v.v / rs), rq = sr / Math.max(gr + .06, .02), a3 = v.a * (free - rq * rq);
            if (!v.dec2) v.dec2 = a3 < -v.b * 1.6 ? 2 : 1;                               // too fast to stop comfortably: clear the tracks (the gates give ~2 s of margin)
            if (v.dec2 === 1) acc = Math.min(acc, a3);
          }
        } else v.dec2 = 0;
        acc = clamp(acc, -5, v.a);
        var jm = acc > v.accS ? 2.2 : (acc < -3.5 ? 99 : 5);                           // smooth: acceleration changes at a limited rate
        v.accS += clamp(acc - v.accS, -jm * dt, jm * dt); acc = v.accS;
        v.age += dt;
        var v1 = Math.max(0, v.v + acc * dt);
        v.D += v.dir * (v.v + v1) / 2 * dt; v.v = v1; v.acc = acc;
        if (lead) {                                                                      // safety net: bumpers can never touch
          var g2 = lead.dir * lead.D - v.dir * v.D - (lead.L + v.L) / 2;
          if (g2 < .015) { v.D = v.dir * (lead.dir * lead.D - (lead.L + v.L) / 2 - .015); v.v = Math.min(v.v, lead.v); }
        }
        v.brk = acc < -.35 || (v.v < .04 && (stopFor || (lead && lead.v < .04)));
        if (v.dir < 0 ? v.D < .5 : v.D > 10.6) deactivate(v);
      }
    }
  }
  function renderVehs(list, alpha, dtr, items) {
    for (var i = 0; i < list.length; i++) {
      var v = list[i];
      if (!v.active) { if (v.show) { v.wrap.style.display = "none"; v.show = false; } continue; }
      if (!v.show) { v.wrap.style.display = ""; v.show = true; }
      var D = v.Dp + (v.D - v.Dp) * alpha, sc = 1 / D;
      v.Dr = D;
      if (Math.abs(D - v.lastD) > 1e-4) {                                              // parked vehicles cost nothing
        v.lastD = D;
        v.g.setAttribute("transform", "translate(" + SX(v.X, sc).toFixed(1) + "," + SY(sc).toFixed(1) + ") scale(" + sc.toFixed(3) + ")");
      }
      var op = sstep(S.growth, v.th, v.th + .04) * (1 - sstep(S.growth, v.thOut - .05, v.thOut)) * clamp((10 - D) / .9, 0, 1);
      if (Math.abs(op - v.op) > .02) { v.op = op; v.wrap.style.opacity = op.toFixed(2); }
      if (v.brk !== v.brkOn) { v.brkOn = v.brk; v.g.classList.toggle("brk", v.brk); }
      if (v.o) {                                                                         // cyclist: pedalling follows the real speed
        v.ph += dtr * (v.v / v.v0) * 9;
        var pa = Math.sin(v.ph) * 3.4;
        v.o.legL.setAttribute("transform", "translate(0," + pa.toFixed(2) + ")"); v.o.legR.setAttribute("transform", "translate(0," + (-pa).toFixed(2) + ")");
        v.o.body.setAttribute("transform", "rotate(" + (Math.sin(v.ph * .5) * 2.4).toFixed(2) + ")");
      }
      (items[v.key] = items[v.key] || []).push({ g: v.wrap, D: D });
    }
  }

  /* ---------- pedestrians ---------- */
  var pedItems = [], crossers = [], walkers = [];
  (function () {
    var g, i, o, gv = [trr(.19, .27), trr(.19, .27), trr(.19, .27), trr(.19, .27)];
    for (g = 0; g < 4; g++) for (i = 0; i < 9; i++) {                      // street walkers: 4 lanes (2 kerbs × 2 directions), one speed per lane → no overtaking, no overlap
      var sd = g < 2 ? -1 : 1, dir = g % 2 ? 1 : -1;
      o = { kind: 0, grp: "w" + g, parent: laneGroup(pedsG, "w" + g), dir: dir, X: sd * (dir < 0 ? .93 : 1.04), lo: 1.65, R: 7.5, v: dir * gv[g], th: i < 1 ? -.05 : Math.pow(tr(), 1.5) * .85, coat: coats[Math.floor(tr() * coats.length)] };
      o.D = o.lo + ((i + g * .31) % 9) / 9 * o.R; makePed(o); walkers.push(o);
    }
    var nv = [trr(.08, .16), trr(.08, .16)];
    for (g = 0; g < 2; g++) for (i = 0; i < 9; i++) {                      // Kabukicho crowd: 2 lanes along the right pavement, one speed per lane
      var dn = g ? 1 : -1;
      o = { kind: 2, grp: "n" + g, parent: laneGroup(pedsG, "n" + g), dir: dn, X: dn < 0 ? .86 : .99, lo: 2.2, R: 2.6, v: dn * nv[g], th: .52 + tr() * .2, coat: coats[Math.floor(tr() * coats.length)] };
      o.D = o.lo + (i + g * .5) / 9 * o.R; makePed(o); walkers.push(o);
    }
    for (i = 0; i < 8; i++) {                                              // crossers: each has its own crossing line (slot) and always waits at a kerb
      var side = i % 2 ? 1 : -1;
      o = { kind: 1, grp: "x", parent: laneGroup(pedsG, "x"), side: side, slotD: 1.46 + i * .036, v: trr(.30, .38), th: .3 + tr() * .5, coat: coats[Math.floor(tr() * coats.length)] };
      makePed(o); crossers.push(o);
    }
    peds.forEach(function (p) { p.Xp = p.X; p.Dp = p.D; p.moving = false; p.op = -1; p.lastD = -1; p.lastX = -1; p.dirty = true; });
  })();
  function resetCrosser(c, delay) {
    c.side = tr() < .5 ? -1 : 1; c.X = c.Xp = c.side * TR.kerb; c.target = -c.side * TR.kerb; c.D = c.Dp = c.slotD;
    c.state = "wait"; c.delay = trr(.2, 2.2); c.timer = 0; c.fade = delay ? 0 : 1; c.moving = false;
  }
  function pedStep(dt) {
    var i, p, canStart = !sig.on || (sig.name === "pw" && sig.t < 2.6);
    for (i = 0; i < peds.length; i++) { p = peds[i]; p.Xp = p.X; p.Dp = p.D; }
    for (i = 0; i < walkers.length; i++) {
      p = walkers[i]; p.moving = true; p.D += p.v * dt;
      if (p.dir < 0 && p.D < p.lo) { p.D += p.R; p.Dp = p.D; } else if (p.dir > 0 && p.D > p.lo + p.R) { p.D -= p.R; p.Dp = p.D; }
    }
    for (i = 0; i < crossers.length; i++) {
      p = crossers[i];
      if (S.growth < p.th) { p.state = "gone"; p.fade = 0; p.moving = false; p.timer = 0; continue; }
      if (p.state === "gone") { p.timer -= dt; if (p.timer <= 0) resetCrosser(p, true); continue; }
      if (p.fade < 1) p.fade = Math.min(1, p.fade + dt / .8);
      if (p.state === "wait") {
        p.moving = false;
        if (canStart) { p.delay -= dt; if (p.delay <= 0) { p.state = "cross"; p.startedOn = sig.on ? sig.name : "free"; } } else p.delay = trr(.2, 2.2);
      } else if (p.state === "cross") {
        p.moving = true; var dx = p.target - p.X, stepX = p.v * dt;
        if (Math.abs(dx) <= stepX) { p.X = p.target; p.state = "leave"; p.timer = 0; p.ld = tr() < .5 ? -1 : 1; } else p.X += Math.sign(dx) * stepX;
      } else if (p.state === "leave") {
        p.moving = true; p.timer += dt; p.X += (p.target * 1.07 - p.X) * Math.min(1, dt * 2.5); p.fade = Math.max(0, 1 - p.timer / 1.2);     // step up onto the pavement and fade out in place
        if (p.timer >= 1.2) { p.state = "gone"; p.timer = trr(3, 10); p.moving = false; p.fade = 0; }
      }
    }
  }
  function renderPeds(alpha, dtr, items) {
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i], vis = sstep(S.growth, p.th, p.th + .04), fade = 1;
      if (p.kind === 1) fade = p.fade; else fade = clamp((p.D - p.lo) / .35, 0, 1) * clamp((p.lo + p.R - p.D) / .6, 0, 1);
      if (vis * fade < .01) { if (p.shown) { p.g.style.display = "none"; p.shown = false; } continue; }
      if (!p.shown) { p.g.style.display = ""; p.shown = true; }
      var X = p.Xp + (p.X - p.Xp) * alpha, D = p.Dp + (p.D - p.Dp) * alpha, sc = 1 / D, walking = p.moving && !S.paused;
      if (walking) p.phase += dtr * 9;
      if (walking || p.dirty || Math.abs(D - p.lastD) > 1e-4 || Math.abs(X - p.lastX) > 1e-4) {      // standing people cost nothing
        p.lastD = D; p.lastX = X; p.dirty = walking;
        var sw = walking ? Math.sin(p.phase) * 26 : 0;
        p.g.setAttribute("transform", "translate(" + SX(X, sc).toFixed(1) + "," + SY(sc).toFixed(1) + ") scale(" + sc.toFixed(3) + ")");
        p.legA.setAttribute("transform", "rotate(" + sw.toFixed(1) + " 0 -18)");
        p.legB.setAttribute("transform", "rotate(" + (-sw).toFixed(1) + " 0 -18)");
        p.b.setAttribute("transform", "translate(0," + (walking ? -Math.abs(Math.cos(p.phase)) * .9 : 0).toFixed(2) + ")");
      }
      var po = vis * fade;
      if (Math.abs(po - p.op) > .01) { p.op = po; p.g.style.opacity = po.toFixed(2); }
      (items[p.grp] = items[p.grp] || []).push({ g: p.g, D: D });
    }
  }
  function depthSort(items) {                                                         // within one lane: nearer things are drawn on top; moves only nodes that are out of order
    for (var key in items) {
      var L = items[key]; if (L.length < 2) continue;
      L.sort(function (a, b) { return b.D - a.D; });
      for (var i = 0; i < L.length - 1; i++) if (L[i].g.compareDocumentPosition(L[i + 1].g) & 2) L[i].g.parentNode.insertBefore(L[i + 1].g, L[i].g.nextSibling);
    }
  }

  /* ---------- clocks + per-frame driver ---------- */
  function makeClock(hz, fn) {
    var step = 1 / hz, c = { acc: 0, alpha: 1, hz: hz };
    c.setHz = function (h) { c.hz = h; step = 1 / h; };
    c.run = function (dt, mult) {
      c.acc += dt; var n = 0;
      while (c.acc >= step && n < 5) { fn(step * mult); c.acc -= step; n++; }
      if (n === 5) c.acc = 0;
      c.alpha = c.acc / step;
    };
    return c;
  }
  var clkSig = makeClock(10, sigStep), clkCars = makeClock(30, function (d) { vehStep(carList, d); }),
      clkBikes = makeClock(24, function (d) { vehStep(bikeList, d); }), clkPeds = makeClock(20, pedStep);
  var sortTick = 0;
  function updateTraffic(dt) {
    var mult = S.paused ? 0 : Math.min(S.speed, 3);
    if (mult > .01) { clkSig.run(dt, mult); clkCars.run(dt, mult); clkBikes.run(dt, mult); clkPeds.run(dt, mult); }
    var dtr = mult > .01 ? dt * mult : 0, ci = {}, pi2 = {};
    renderVehs(carList, clkCars.alpha, dtr, ci);
    renderVehs(bikeList, clkBikes.alpha, dtr, pi2);
    renderPeds(clkPeds.alpha, dtr, pi2);
    if ((sortTick++ & 3) === 0) { depthSort(ci); depthSort(pi2); }
  }
  function resetTraffic() {
    vehs.forEach(function (v) { v.active = false; v.fresh = true; v.wait = trr(0, 4); v.v = 0; v.brk = false; v.brkOn = false; v.g.classList.remove("brk"); v.wrap.style.display = "none"; v.show = false; });
    crossers.forEach(function (c) { resetCrosser(c, false); });
    sig.i = 0; sig.t = 0; sig.clock = 0; sig.name = "vg"; lampV = lampP = "";
    vehs.forEach(function (v) { v.lastGr = undefined; });                              // so the seeded test starts from exactly the same state every time
    railEra = false;
  }
  resetTraffic();


  /* ---------- frame-pacing test: drives update + render with controlled frame times and measures how smooth the drawn motion is ---------- */
  function frameTest(frames, mode, g) {
    var keepG = S.growth, keepP = S.paused, keepS = S.speed, i, k, dtf = mode === "jitter" ? function () { return .008 + Math.random() * .045; } : function () { return 1 / mode; };
    S.growth = g; S.paused = false; S.speed = 1; trs = 424242; resetTraffic();
    var prevD = {}, prevV = {}, maxA = 0, sumA = 0, nA = 0, maxStepRatio = 0, accs = [];
    for (i = 0; i < frames; i++) {
      var dt = dtf(); updateTraffic(dt);
      for (k = 0; k < vehs.length; k++) {
        var v = vehs[k]; if (!v.active || v.Dr === undefined) { delete prevD[k]; delete prevV[k]; continue; }
        if (prevD[k] !== undefined && Math.abs(v.Dr - prevD[k]) < 1) {
          var sp = (v.Dr - prevD[k]) / dt;
          if (prevV[k] !== undefined && i > 60) { var a = Math.abs(sp - prevV[k]) / dt; accs.push(a); }
          prevV[k] = sp;
        } else delete prevV[k];
        prevD[k] = v.Dr;
      }
    }
    accs.sort(function (a, b) { return a - b; });
    var out = { mode: mode, frames: frames, samples: accs.length, p50: +accs[Math.floor(accs.length * .5)].toFixed(2), p99: +accs[Math.floor(accs.length * .99)].toFixed(2), max: +accs[accs.length - 1].toFixed(2) };
    S.growth = keepG; S.paused = keepP; S.speed = keepS; resetTraffic();
    return out;
  }
  /* ---------- offline test: runs the real simulation for N simulated seconds and reports safety/smoothness numbers ---------- */
  function simTest(secs, g) {
    var keepG = S.growth, keepSig = { i: sig.i, t: sig.t }, i, v, st = { minGap: 99, overlaps: 0, redRuns: 0, pedConflicts: 0, maxAcc: 0, maxJerk: 0, maxJump: 0,
      pedStartsOffWalk: 0, pedOverlaps: 0, pedCrossings: 0, vehPassed: 0, railConflicts: 0, railRuns: 0, phases: {} };
    S.growth = g; trs = 424242; resetTraffic();
    testMode = true; railShut = false; railSimT = 5.6;      // start with the gates open (phase .35): in the real app the rail era is only reached through the time-lapse, never cold
    var cS = makeClock(10, sigStep), cC = makeClock(30, function (d) { vehStep(carList, d); }), cB = makeClock(24, function (d) { vehStep(bikeList, d); }), cP = makeClock(20, pedStep);
    var prevAcc = new Array(vehs.length), prevD = new Array(vehs.length), prevGs = new Array(vehs.length), prevState = crossers.map(function (c) { return c.state; }), dt = 1 / 60;
    for (var n = 0; n < secs * 60; n++) {
      cS.run(dt, 1); cC.run(dt, 1); cB.run(dt, 1); cP.run(dt, 1);
      st.phases[sig.name] = (st.phases[sig.name] || 0) + 1;
      var red = sig.on && sig.name !== "vg" && sig.name !== "vy", busy = pedOnRoad(), lanes = {};
      for (i = 0; i < vehs.length; i++) {
        v = vehs[i]; if (!v.active) { prevAcc[i] = undefined; prevGs[i] = undefined; continue; }
        (lanes[v.key] = lanes[v.key] || []).push(v);
        var gs = v.dir * TR.stop[v.dir] - (v.dir * v.D + v.L / 2);
        if (prevGs[i] !== undefined && prevGs[i] > -.05 && gs <= -.05) { st.vehPassed++; if ((red && sig.t > .5) || busy) st.redRuns++; }
        prevGs[i] = gs;
        if (v.acc < -2.5 && v.v > .05) { st.hard = (st.hard || 0) + 1; (st.samples = st.samples || []).length < 6 && st.samples.push({ kind: v.kind, dir: v.dir, age: +v.age.toFixed(1), v: +v.v.toFixed(2), acc: +v.acc.toFixed(1), ph: sig.name, D: +v.D.toFixed(2), dec: v.dec, dec2: v.dec2, shut: railShut }); }
        if (prevAcc[i] !== undefined) { var j = Math.abs(v.acc - prevAcc[i]) / (1 / (v.kind === "bike" ? 24 : 30)); if (j > st.maxJerk && v.v > .02) st.maxJerk = j; }
        prevAcc[i] = v.acc; st.maxAcc = Math.max(st.maxAcc, Math.abs(v.acc));
        if (busy && v.v > .05 && v.D + v.L / 2 > TR.z0 && v.D - v.L / 2 < TR.z1) st.pedConflicts++;
        var q2 = (railSimT % 16) / 8, trainOn = railEra && q2 > .37 && q2 < .53;               // measured from the rendered train and gate positions (phase .185-.265)
        if (trainOn && v.D + v.L / 2 > 5.2 && v.D - v.L / 2 < 5.64) { st.railConflicts++; (st.railSamples = st.railSamples || []).length < 5 ? st.railSamples.push({ kind: v.kind, dir: v.dir, D: +v.D.toFixed(2), v: +v.v.toFixed(2), dec2: v.dec2, shut: railShut, q: +q2.toFixed(2), age: +v.age.toFixed(1) }) : 0; }
        var gr2 = v.dir * RAIL.stop[v.dir] - (v.dir * v.D + v.L / 2);
        if (v.lastGr !== undefined && v.lastGr > -.2 && gr2 <= -.2 && railShut && q2 > .1 && q2 < .62) st.railRuns++;
        v.lastGr = gr2;
      }
      for (var k in lanes) {
        var L = lanes[k].slice().sort(function (a, b) { return a.dir * a.D - b.dir * b.D; });
        for (i = 0; i < L.length - 1; i++) { var gp2 = L[i + 1].dir * L[i + 1].D - L[i].dir * L[i].D - (L[i].L + L[i + 1].L) / 2; if (gp2 < st.minGap) st.minGap = gp2; if (gp2 < 0) st.overlaps++; }
      }
      if ((n & 7) === 0) for (i = 0; i < peds.length; i++) {                           // people never walk through each other
        var pa = peds[i]; if (pa.kind === 1 ? pa.state === "gone" : S.growth < pa.th) continue;
        for (var j = i + 1; j < peds.length; j++) {
          var pb = peds[j]; if (pb.kind === 1 ? pb.state === "gone" : S.growth < pb.th) continue;
          if (Math.abs(pa.X - pb.X) < .03 && Math.abs(pa.D - pb.D) < .03) { st.pedOverlaps++; var pk = pa.kind + "/" + pb.kind; st.pairs = st.pairs || {}; st.pairs[pk] = (st.pairs[pk] || 0) + 1; }
        }
      }
      crossers.forEach(function (c, ci) {
        if (prevState[ci] === "wait" && c.state === "cross") { st.pedCrossings++; if (sig.on && sig.name !== "pw") st.pedStartsOffWalk++; }
        prevState[ci] = c.state;
      });
    }
    testMode = false; railShut = false;
    S.growth = keepG; trs = 424242 + Math.floor(Math.random() * 1000); resetTraffic(); sig.i = keepSig.i; sig.t = keepSig.t;
    st.minGap = +st.minGap.toFixed(3); st.maxAcc = +st.maxAcc.toFixed(2); st.maxJerk = +st.maxJerk.toFixed(2);
    return st;
  }

  // Test hook: a repeatable traffic snapshot (seeded, `secs` simulated seconds at growth `g`), drawn exactly, for screenshot tests.
  function settleTraffic(g, secs) {
    S.growth = g; trs = 424242; resetTraffic(); testMode = true; railShut = false; railSimT = 5.6;
    var cS = makeClock(10, sigStep), cC = makeClock(30, function (d) { vehStep(carList, d); }), cB = makeClock(24, function (d) { vehStep(bikeList, d); }), cP = makeClock(20, pedStep);
    for (var n = 0; n < secs * 60; n++) { cS.run(1 / 60, 1); cC.run(1 / 60, 1); cB.run(1 / 60, 1); cP.run(1 / 60, 1); }
    testMode = false; railShut = false;
    [clkSig, clkCars, clkBikes, clkPeds].forEach(function (c) { c.acc = 0; c.alpha = 1; });     // draw the settled state, not an interpolation of the live one
  }
  function setRates(car, bike, ped) { clkCars.setHz(car); clkBikes.setHz(bike); clkPeds.setHz(ped); }
  function rates() { return { cars: clkCars.hz, bikes: clkBikes.hz, people: clkPeds.hz }; }
  function info() { return { signal: sig.name, t: +sig.t.toFixed(1), on: sig.on, vehicles: vehs.filter(function (v) { return v.active; }).length, crossers: crossers.map(function (c) { return c.state; }) }; }

  return { sig: sig, updateTraffic: updateTraffic, resetTraffic: resetTraffic, frameTest: frameTest, simTest: simTest, settleTraffic: settleTraffic, setRates: setRates, rates: rates, info: info };
}
