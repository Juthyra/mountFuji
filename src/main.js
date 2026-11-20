import { root, body, fx, svg, reduced, clamp, lerp, smooth, sstep, hx, mix, css, rgba, el, rnd, rn } from "./util.js";
import { T, timeVal, inkVal, seasonWeights, seasonVal } from "./palettes.js";
import { buildFuji, buildSnow } from "./fujiGeometry.js";
import { trees } from "./skyline.js";
import { createWeather, FALL } from "./weather.js";
(function () {
  "use strict";
  /* ================= the growing city ================= */
  var GROWTH_YEARS = 3.5, DAYS_PER_YEAR = 8;
  var cityBack = document.getElementById("cityBack");
  var cityFront = document.getElementById("cityFront");
  var landmarks = document.getElementById("landmarks");
  var buildings = [];   // {g0, dg, inner, last}
  var facClasses = ["f-fac-a", "f-fac-b", "f-fac-c"];

  function windowPaths(w, h, cols, rows, litRatio) {
    var lit = "", dark = "";
    var mx = (w - cols * 4.6) / (cols + 1), my = (h - rows * 5.6) / (rows + 1);
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var x = -w / 2 + mx + c * (4.6 + mx), y = -h + my + r * (5.6 + my);
      var seg = "M" + x.toFixed(1) + " " + y.toFixed(1) + "h3.4v4h-3.4z";
      if (rnd() < litRatio) lit += seg; else dark += seg;
    }
    return [lit, dark];
  }
  var lastB = null;
  function addBuilding(parent, x, tier, g0, scale, dgOverride) {
    var g = el("g", { transform: "translate(" + x.toFixed(1) + ",616) scale(" + scale + ")" }, parent);
    var inner = el("g", {}, g);
    var w, h, wp;
    if (tier === 0) {                                   // village house
      w = 15 + rnd() * 8; h = 11 + rnd() * 5;
      el("rect", { x: -w / 2, y: -h, width: w, height: h }, inner, "f-wall");
      el("path", { d: "M" + (-w / 2 - 2.5) + " " + (-h) + " L0 " + (-h - 7) + " L" + (w / 2 + 2.5) + " " + (-h) + " Z" }, inner, "f-roof");
      el("rect", { x: -1.6, y: -5, width: 3.2, height: 5 }, inner, "f-roof");
      wp = windowPaths(w, h, 1, 1, .8);
      el("path", { d: "M" + (w / 2 - 5.4) + " " + (-h + 2.6) + "h3.2v3h-3.2z" }, inner, "f-win-lit");
      if (rnd() < .5) el("rect", { x: w / 2 - 4, y: -h - 6, width: 2.6, height: 5 }, inner, "f-roof");
    } else {
      if (tier === 1) { w = 16 + rnd() * 10; h = 20 + rnd() * 16; }
      else if (tier === 2) { w = 18 + rnd() * 12; h = 44 + rnd() * 40; }
      else { w = 22 + rnd() * 14; h = 92 + rnd() * 58; }
      var fc = tier === 3 ? "f-glass" : facClasses[Math.floor(rnd() * 3)];
      el("rect", { x: -w / 2, y: -h, width: w, height: h }, inner, fc);
      if (tier === 3 && rnd() < .6) {  // stepped crown
        el("rect", { x: -w / 4, y: -h - 8, width: w / 2, height: 8 }, inner, fc);
        el("rect", { x: -1, y: -h - 20, width: 2, height: 12 }, inner, fc);
        var bw = el("g", {}, inner, "beaconWrap");
        el("circle", { cx: 0, cy: -h - 21, r: 2.2 }, bw, "beacon");
      } else if (tier === 2 && rnd() < .5) {
        el("rect", { x: -0.9, y: -h - 12, width: 1.8, height: 12 }, inner, fc);
        var bw2 = el("g", {}, inner, "beaconWrap");
        el("circle", { cx: 0, cy: -h - 13, r: 1.8 }, bw2, "beacon");
      } else if (tier === 1 && rnd() < .4) {
        el("rect", { x: -w / 4, y: -h - 5, width: w / 3, height: 5 }, inner, "f-roof");
      }
      var cols = Math.max(2, Math.floor(w / 7)), rows = Math.max(2, Math.floor(h / 9));
      wp = windowPaths(w, h, cols, rows, tier === 3 ? .62 : .5);
      el("path", { d: wp[1] }, inner, "f-win-dark");
      el("path", { d: wp[0] }, inner, "f-win-lit");
    }
    inner.style.transform = "scaleY(0)";
    buildings.push({ g0: g0, dg: dgOverride || (.06 + rnd() * .05), inner: inner, last: -1, x: x });
    lastB = { inner: inner, w: w, h: h };
    return g;
  }
  // forced village houses (also anchor the chimney smoke) — up almost immediately
  var villageX = [430, 520, 640, 760, 880, 1010];
  villageX.forEach(function (x) { addBuilding(cityFront, x, 0, 0, 1, .03); });
  // back layer — hazier, smaller
  for (var bi = 0; bi < 90; bi++) {
    var bx = 20 + rnd() * 1560;
    var bg = Math.pow(rnd(), 1.15);
    var bt = bg < .2 ? 0 : bg < .45 ? 1 : bg < .72 ? 2 : 3;
    if (Math.abs(bx - 800) > 600 && bt > 1) bt = 1;      // low-rise suburbs toward the edges
    addBuilding(cityBack, bx, bt, bg, .72);
    if (bt >= 2 && rn() < .3) roofGarden(lastB.inner, lastB.w, lastB.h);
  }
  // front layer
  for (var fi = 0; fi < 110; fi++) {
    var fx2 = 250 + rnd() * 1100;
    var fg2 = Math.pow(rnd(), 1.15);
    var ft = fg2 < .18 ? 0 : fg2 < .44 ? 1 : fg2 < .72 ? 2 : 3;
    addBuilding(cityFront, fx2, ft, fg2, 1);
    if (ft >= 2 && rn() < .25) roofGarden(lastB.inner, lastB.w, lastB.h);
  }

  // ---- landmarks ----
  function landmark(g0, dg, x, builder) {
    var g = el("g", { transform: "translate(" + x + ",616)" }, landmarks);
    var inner = el("g", {}, g);
    builder(inner);
    inner.style.transform = "scaleY(0)";
    buildings.push({ g0: g0, dg: dg, inner: inner, last: -1, x: x });
    return g;
  }
  landmark(.26, .09, 310, function (g) {            // five-storey pagoda
    var widths = [34, 30, 26, 22, 18], y = 0;
    for (var i = 0; i < 5; i++) {
      var w = widths[i], bh = 8;
      el("rect", { x: -w / 2 + 4, y: y - bh, width: w - 8, height: bh }, g, "f-pagoda");
      el("path", { d: "M" + (-w / 2 - 4) + " " + (y - bh) + " Q0 " + (y - bh - 7) + " " + (w / 2 + 4) + " " + (y - bh) + " L" + (w / 2 - 2) + " " + (y - bh - 4) + " Q0 " + (y - bh - 9) + " " + (-w / 2 + 2) + " " + (y - bh - 4) + " Z" }, g, "f-roof");
      y -= bh + 6;
    }
    el("rect", { x: -1, y: y - 12, width: 2, height: 12 }, g, "f-roof");
    el("circle", { cx: 0, cy: y - 13, r: 2 }, g, "f-roof");
  });
  landmark(.58, .1, 1065, function (g) {             // red lattice tower
    el("path", { d: "M-26 0 L-4 -104 L4 -104 L26 0 L18 0 L0 -78 L-18 0 Z" }, g, "f-towerred");
    el("rect", { x: -14, y: -66, width: 28, height: 5 }, g, "f-towerred");
    el("rect", { x: -9, y: -104, width: 18, height: 6 }, g, "f-towerred");
    el("rect", { x: -1.2, y: -122, width: 2.4, height: 18 }, g, "f-towerred");
    var bw = el("g", {}, g, "beaconWrap");
    el("circle", { cx: 0, cy: -123, r: 2.4 }, bw, "beacon");
    var braces = el("path", { d: "M-18 -20 L18 -20 M-12 -44 L12 -44 M-7 -84 L7 -84", "stroke-width": 2.4, fill: "none" }, g);
    braces.style.stroke = "var(--tower-red)";
  });
  landmark(.84, .1, 620, function (g) {             // tall broadcasting spire
    el("path", { d: "M-9 0 L-2.6 -150 L2.6 -150 L9 0 Z" }, g, "f-spire");
    el("ellipse", { cx: 0, cy: -118, rx: 8.5, ry: 4.5 }, g, "f-spire");
    el("ellipse", { cx: 0, cy: -142, rx: 6, ry: 3.6 }, g, "f-spire");
    el("rect", { x: -0.9, y: -172, width: 1.8, height: 24 }, g, "f-spire");
    var bw = el("g", {}, g, "beaconWrap");
    el("circle", { cx: 0, cy: -173, r: 2.2 }, bw, "beacon");
    var braces = el("path", { d: "M-6 -40 L6 -40 M-4.6 -80 L4.6 -80", "stroke-width": 2, fill: "none", opacity: .7 }, g);
    braces.style.stroke = "var(--spire)";
  });

  // ---- construction cranes ----
  var cranes = [];
  [[470, .34], [900, .58], [1190, .8]].forEach(function (c) {
    var g = el("g", { transform: "translate(" + c[0] + ",616)" }, document.getElementById("cranes"));
    g.style.opacity = 0;
    var mast = el("g", {}, g, "f-fg");
    el("rect", { x: -1.6, y: -74, width: 3.2, height: 74 }, mast);
    var jib = el("g", {}, g, "craneJib");
    el("rect", { x: -14, y: -76, width: 66, height: 2.6 }, jib, "f-fg");
    el("rect", { x: -14, y: -73.4, width: 10, height: 6 }, jib, "f-fg");
    var jibLines = el("path", { d: "M0 -74 L0 -84 L44 -75 M0 -84 L-12 -75", "stroke-width": 1.6, fill: "none" }, jib);
    jibLines.style.stroke = "var(--fg)";
    var cable = el("path", { d: "M40 -73.4 v22", "stroke-width": 1.2 }, jib);
    cable.style.stroke = "var(--fg)";
    el("rect", { x: 37.6, y: -51, width: 5, height: 5 }, jib, "f-fg");
    cranes.push({ el: g, c: c[1] });
  });

  // ---- farm fields (village era) ----
  var fields = document.getElementById("fields");
  [[455, 30], [560, 40], [700, 34], [830, 44], [950, 30], [1060, 38]].forEach(function (f) {
    el("rect", { x: f[0], y: 607, width: f[1], height: 6, rx: 1 }, fields, "f-field");
  });
  // precompute when each tree gets replaced (static — buildings never move)
  trees.forEach(function (tr) {
    tr.nearest = 1;
    if (tr.x < 240 || tr.x > 1360) return;
    for (var j = 0; j < buildings.length; j++) {
      var bb = buildings[j];
      if (Math.abs(bb.x - tr.x) < 26 && bb.g0 < tr.nearest) tr.nearest = bb.g0;
    }
  });

  // ---- chimney smoke ----
  var smokeG = document.getElementById("smokeG");
  [520, 880].forEach(function (x) {
    for (var i = 0; i < 3; i++) {
      var p = el("circle", { cx: x + 5, cy: 596, r: 3 + i }, smokeG, "smokePuff");
      p.style.animationDelay = (-i * 1.5) + "s";
    }
  });

  // ---- elevated rail + bullet train ----
  var viaduct = document.getElementById("viaduct");
  el("rect", { x: 250, y: 602.5, width: 1100, height: 3 }, viaduct, "f-fg");
  for (var px = 262; px < 1350; px += 46) el("rect", { x: px, y: 605, width: 3, height: 11 }, viaduct, "f-fg");
  var train = document.getElementById("train");
  for (var car = 0; car < 3; car++) {
    var cx0 = car * 38;
    el("rect", { x: cx0, y: 594.5, width: 35, height: 8, rx: car === 0 ? 4 : 2 }, train, "f-train");
    el("rect", { x: cx0 + 2, y: 599.4, width: 31, height: 1.8 }, train, "f-torii");
    el("path", { d: "M" + (cx0 + 5) + " 596.4h4v2.4h-4z M" + (cx0 + 13) + " 596.4h4v2.4h-4z M" + (cx0 + 21) + " 596.4h4v2.4h-4z M" + (cx0 + 28) + " 596.4h4v2.4h-4z" }, train, "f-win-lit");
  }


  var train2 = el("g", { id: "train2" }, document.getElementById("railG"));
  for (var car2 = 0; car2 < 4; car2++) {
    var cx2 = car2 * 38;
    el("rect", { x: cx2, y: 594.5, width: 35, height: 8, rx: 2 }, train2, "f-train");
    el("rect", { x: cx2, y: 599.2, width: 35, height: 1.8, fill: "#3aa66a" }, train2);
    el("path", { d: "M" + (cx2 + 5) + " 596.4h4v2.4h-4z M" + (cx2 + 13) + " 596.4h4v2.4h-4z M" + (cx2 + 21) + " 596.4h4v2.4h-4z M" + (cx2 + 28) + " 596.4h4v2.4h-4z" }, train2, "f-win-lit");
  }

  /* ================= the street (view from the city) ================= */
  var HZ = 592, KX = 330, KY = 250, KH = 190;      // horizon, perspective constants
  function SX(X, s) { return 800 + X * KX * s; }
  function SY(s) { return HZ + KY * s; }
  function pd(pts) { return "M" + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" L") + " Z"; }
  function poly(pts, cls, parent) { return el("path", { d: pd(pts) }, parent, cls); }
  var roadG = document.getElementById("roadG"), carsG = document.getElementById("carsG"), streetItems = document.getElementById("streetItems");

  // road, pavements, markings
  (function () {
    var sf = .004, sn = 1.75;
    poly([[SX(-.75, sf), SY(sf)], [SX(.75, sf), SY(sf)], [SX(.75, sn), SY(sn)], [SX(-.75, sn), SY(sn)]], "f-road", roadG);
    [-1, 1].forEach(function (sd) {
      poly([[SX(sd * .75, sf), SY(sf)], [SX(sd * 1.08, sf), SY(sf)], [SX(sd * 1.08, sn), SY(sn)], [SX(sd * .75, sn), SY(sn)]], "f-walk", roadG);
    });
    [-1, 1].forEach(function (sd) {   // building shadows falling across the road
      poly([[SX(sd * .75, sf), SY(sf)], [SX(sd * .42, sf), SY(sf)], [SX(sd * .42, sn), SY(sn)], [SX(sd * .75, sn), SY(sn)]], sd < 0 ? "f-shL" : "f-shR", roadG);
    });
    var dd = "", D, hw = .018;
    function strip(X0, X1, Da, Db) {   // flat marking between depths Da (far) and Db (near)
      var sa = 1 / Da, sb = 1 / Db;
      dd += pd([[SX(X0, sa), SY(sa)], [SX(X1, sa), SY(sa)], [SX(X1, sb), SY(sb)], [SX(X0, sb), SY(sb)]]) + " ";
    }
    for (D = 9.5; D > .9; D -= .6) strip(-hw, hw, D, D - .26);                 // centre dashes
    strip(-.72, -.7, 12, .62); strip(.7, .72, 12, .62);                         // edge lines
    for (var i = 0; i < 9; i++) strip(-.66 + i * .165, -.66 + i * .165 + .085, 1.75, 1.42);   // crosswalk
    el("path", { d: dd }, roadG, "laneMark");
  })();

  // buildings, trees, lamps and the torii — collected, then drawn far → near
  var drawList = [];
  var TORII_D = 3.2;
  var NEON = ["#ff5a4a", "#ffb347", "#ffe3a0", "#ff7aa2"], GLYPHS = "酒夜遊薬店宿湯龍桜金歌舞";
  function wpt(c, u, v) { var D = c.D0 + (c.D1 - c.D0) * u, sc = 1 / D; return [SX(c.side * c.Xin, sc), SY(sc) - v * KH * sc]; }
  function wquad(c, u0, u1, v0, v1) { return [wpt(c, u0, v1), wpt(c, u1, v1), wpt(c, u1, v0), wpt(c, u0, v0)]; }
  function addNeon(inner, c) {
    if (c.side < 0) return;                                   // text would read mirrored on the left wall
    poly(wquad(c, 0, 1, .1, .24), "neonGlow", inner).style.fill = "#e8303a";          // red lantern band
    var n = 2 + Math.floor(rnd() * 2);
    for (var k = 0; k < n; k++) {
      var u0 = (k + .14 + rnd() * .08) / n, u1 = u0 + .6 / n, ng = Math.max(1, Math.min(5, Math.floor((c.hu - .5) / .3)));
      var col = NEON[Math.floor(rnd() * NEON.length)], v0 = .34, v1 = v0 + ng * .3;
      poly(wquad(c, u0 - .02, u1 + .02, v0 - .03, v1 + .03), "", inner).setAttribute("fill", "#12060c");
      var gl = poly(wquad(c, u0 - .04, u1 + .04, v0 - .06, v1 + .06), "neonGlow", inner); gl.style.fill = col; gl.setAttribute("fill-opacity", ".35");
      for (var j = 0; j < ng; j++) {
        var T = wpt(c, u0, v0 + (j + 1) * .3), B = wpt(c, u1, v0 + (j + 1) * .3), L = wpt(c, u0, v0 + j * .3);
        var t = el("text", { transform: "matrix(" + [(B[0] - T[0]) / 100, (B[1] - T[1]) / 100, (L[0] - T[0]) / 100, (L[1] - T[1]) / 100, T[0], T[1]].map(function (v) { return v.toFixed(4); }).join(",") + ")",
          x: 50, y: 80, "font-size": 84, "text-anchor": "middle", fill: col }, inner, "neonTxt");
        t.textContent = GLYPHS.charAt(Math.floor(rnd() * GLYPHS.length));
      }
    }
  }
  function drawBox(inner, c) {
    var sF = 1 / c.D0, sN = 1 / c.D1, sd = c.side;
    var xi0 = SX(sd * c.Xin, sF), xi1 = SX(sd * c.Xin, sN), xo1 = SX(sd * (c.Xin + c.Wd), sN);
    var yb0 = SY(sF), yb1 = SY(sN), h0 = c.hu * KH * sF, h1 = c.hu * KH * sN;
    var cls = c.kind === 0 ? "f-wall" : c.kind === 3 ? "f-glass" : facClasses[c.fc];
    el("rect", { x: Math.min(xi1, xo1).toFixed(1), y: (yb1 - h1).toFixed(1), width: Math.abs(xi1 - xo1).toFixed(1), height: h1.toFixed(1) }, inner, cls);
    var wall = [[xi0, yb0 - h0], [xi1, yb1 - h1], [xi1, yb1], [xi0, yb0]];
    poly(wall, cls, inner);
    poly(wall, sd < 0 ? "f-shL" : "f-shR", inner);
    poly(wall, "", inner).setAttribute("fill", "url(#wallGrad)");
    if (c.kind === 0) {                                   // house: pitched roof + gable
      var xc = c.Xin + c.Wd / 2, rise = .3;
      var xc0 = SX(sd * xc, sF), xc1 = SX(sd * xc, sN);
      poly([[xi0, yb0 - h0], [xi1, yb1 - h1], [xc1, yb1 - h1 - rise * KH * sN], [xc0, yb0 - h0 - rise * KH * sF]], "f-roof", inner);
      poly([[xi1, yb1 - h1], [xo1, yb1 - h1], [xc1, yb1 - h1 - rise * KH * sN]], "f-roof", inner);
    }
    // windows
    var fh = c.kind === 0 ? .3 : c.kind === 1 ? .2 : .14, rows = Math.max(1, Math.floor(c.hu / fh));
    var cols = clamp(Math.round((c.D0 - c.D1) * 2.8), 1, 8), lit = "", dark = "", r, k;
    var lr = c.kind === 3 ? .4 : .32;
    for (r = 0; r < rows; r++) for (k = 0; k < cols; k++) {
      var u0 = (k + .22) / cols, u1 = (k + .72) / cols, v0 = (r + .26) * fh, v1 = (r + .78) * fh;
      var Da = c.D0 + (c.D1 - c.D0) * u0, Db = c.D0 + (c.D1 - c.D0) * u1, sa = 1 / Da, sb = 1 / Db;
      var q = pd([[SX(sd * c.Xin, sa), SY(sa) - v1 * KH * sa], [SX(sd * c.Xin, sb), SY(sb) - v1 * KH * sb],
                  [SX(sd * c.Xin, sb), SY(sb) - v0 * KH * sb], [SX(sd * c.Xin, sa), SY(sa) - v0 * KH * sa]]) + " ";
      if (rnd() < lr) lit += q; else dark += q;
    }
    var fc = Math.max(1, Math.round(c.Wd / .34));
    for (r = 0; r < rows; r++) for (k = 0; k < fc; k++) {
      var xa = SX(sd * (c.Xin + (k + .2) / fc * c.Wd), sN), xb = SX(sd * (c.Xin + (k + .72) / fc * c.Wd), sN);
      var ya = yb1 - (r + .78) * fh * KH * sN, yh = (.52 * fh) * KH * sN;
      var q2 = "M" + Math.min(xa, xb).toFixed(1) + " " + ya.toFixed(1) + "h" + Math.abs(xb - xa).toFixed(1) + "v" + yh.toFixed(1) + "h-" + Math.abs(xb - xa).toFixed(1) + "z ";
      if (rnd() < lr) lit += q2; else dark += q2;
    }
    if (dark) el("path", { d: dark }, inner, "f-win-dark");
    if (lit) el("path", { d: lit }, inner, "f-win-lit");
    // ---- facade detail: floor slabs, shopfront + awning, corner edge, parapet, rooftop gear ----
    var fx0 = Math.min(xi1, xo1), fw = Math.abs(xi1 - xo1), shadeCls = sd < 0 ? "f-shL" : "f-shR", q;
    var AW = ["#9c2f2f", "#2f5d8c", "#3b7a57", "#b98a2e", "#6c4a8c"];
    if (c.kind >= 1) {
      var sl = "";
      for (q = 1; q < rows; q++) {
        var pa = wpt(c, 0, q * fh), pb = wpt(c, 1, q * fh);
        sl += "M" + pa[0].toFixed(1) + " " + pa[1].toFixed(1) + "L" + pb[0].toFixed(1) + " " + pb[1].toFixed(1) +
              "M" + fx0.toFixed(1) + " " + (yb1 - q * fh * KH * sN).toFixed(1) + "h" + fw.toFixed(1);
      }
      var nb = Math.round((c.D0 - c.D1) / .38);                  // vertical bays on long walls
      for (q = 1; q < nb; q++) { var bu = q / nb, ba = wpt(c, bu, 0), bt2 = wpt(c, bu, c.hu); sl += "M" + ba[0].toFixed(1) + " " + ba[1].toFixed(1) + "L" + bt2[0].toFixed(1) + " " + bt2[1].toFixed(1); }
      if (sl) el("path", { d: sl, fill: "none", stroke: "#000", "stroke-opacity": ".12", "stroke-width": Math.max(.5, 1.3 * sN).toFixed(2) }, inner);
      // shopfront on the ground floor (covers the first window row)
      var sfv = Math.min(.19, fh * .9), ac = AW[Math.floor(rnd() * AW.length)], gh = fh * KH * sN;
      poly(wquad(c, 0, 1, 0, fh), cls, inner); poly(wquad(c, 0, 1, 0, fh), shadeCls, inner);
      el("rect", { x: fx0.toFixed(1), y: (yb1 - gh).toFixed(1), width: fw.toFixed(1), height: gh.toFixed(1) }, inner, cls);
      poly(wquad(c, .05, .95, 0, sfv), "f-win-dark", inner);
      poly(wquad(c, .05, .95, 0, sfv), "f-win-lit", inner).setAttribute("fill-opacity", ".6");
      poly(wquad(c, .04, .96, sfv, sfv + .07), "", inner).setAttribute("fill", ac);
      el("rect", { x: (fx0 + fw * .06).toFixed(1), y: (yb1 - sfv * KH * sN).toFixed(1), width: (fw * .88).toFixed(1), height: (sfv * KH * sN).toFixed(1) }, inner, "f-win-dark");
      el("rect", { x: (fx0 + fw * .06).toFixed(1), y: (yb1 - sfv * KH * sN).toFixed(1), width: (fw * .88).toFixed(1), height: (sfv * KH * sN).toFixed(1), "fill-opacity": ".6" }, inner, "f-win-lit");
      el("rect", { x: (fx0 + fw * .04).toFixed(1), y: (yb1 - (sfv + .07) * KH * sN).toFixed(1), width: (fw * .92).toFixed(1), height: (.07 * KH * sN).toFixed(1), fill: ac }, inner);
      // parapet + rooftop equipment
      poly(wquad(c, 0, 1, c.hu, c.hu + .035), "f-roof", inner);
      var ph = .035 * KH * sN;
      el("rect", { x: (fx0 - .5).toFixed(1), y: (yb1 - h1 - ph).toFixed(1), width: (fw + 1).toFixed(1), height: ph.toFixed(1) }, inner, "f-roof");
      if (c.kind >= 2) {
        var nAc = 1 + Math.floor(rnd() * 2);
        for (q = 0; q < nAc; q++) el("rect", { x: (fx0 + fw * (.12 + q * .3 + rnd() * .1)).toFixed(1), y: (yb1 - h1 - ph - .06 * KH * sN).toFixed(1), width: (fw * .15).toFixed(1), height: (.06 * KH * sN).toFixed(1) }, inner, "f-roof");
        if (rnd() < .45) {
          var tx0 = fx0 + fw * .68, tw = fw * .13, th2 = .1 * KH * sN, ty = yb1 - h1 - ph;
          el("rect", { x: tx0.toFixed(1), y: (ty - th2).toFixed(1), width: tw.toFixed(1), height: th2.toFixed(1) }, inner, "f-roof");
          el("path", { d: "M" + (tx0 - 1).toFixed(1) + " " + (ty - th2).toFixed(1) + " L" + (tx0 + tw / 2).toFixed(1) + " " + (ty - th2 - .04 * KH * sN).toFixed(1) + " L" + (tx0 + tw + 1).toFixed(1) + " " + (ty - th2).toFixed(1) + " Z" }, inner, "f-roof");
        }
      }
    } else {
      var dh = .2 * KH * sN;                                    // house door
      el("rect", { x: (fx0 + fw * .42).toFixed(1), y: (yb1 - dh).toFixed(1), width: (fw * .16).toFixed(1), height: dh.toFixed(1), fill: "#3a2b20" }, inner);
    }
    var ce = el("rect", { x: (xi1 - .8).toFixed(1), y: (yb1 - h1).toFixed(1), width: "1.6", height: h1.toFixed(1), fill: "#fff", opacity: ".2" }, inner);   // lit corner edge
    var hzA = clamp((c.D0 - 2.0) / 7.5, 0, .78);
    if (hzA > .02) {
      var hf = el("rect", { x: Math.min(xi1, xo1).toFixed(1), y: (yb1 - h1).toFixed(1), width: Math.abs(xi1 - xo1).toFixed(1), height: h1.toFixed(1), opacity: hzA.toFixed(2) }, inner); hf.style.fill = "var(--haze)";
      var hw2 = poly(wall, "", inner); hw2.style.fill = "var(--haze)"; hw2.setAttribute("opacity", hzA.toFixed(2));
    }
    if (c.neon) addNeon(inner, c);
    if (c.bill) addBillboard(inner, c, xi1, xo1, yb1, h1, sN);
    if (c.screen) addScreen(inner, c);
    if (c.kind >= 2 && rnd() < (c.kind === 3 ? 1 : .5)) {
      var bw = el("g", {}, inner, "beaconWrap");
      el("circle", { cx: ((xi1 + xo1) / 2).toFixed(1), cy: (yb1 - h1 - 5).toFixed(1), r: Math.max(1.5, 3.2 * sN).toFixed(1) }, bw, "beacon");
    }
    return yb1;
  }
  function pushBuilding(c, g0, dg, inv) {
    drawList.push({ D: c.D0, draw: function (parent) {
      var inner = el("g", {}, parent);
      var yb1 = drawBox(inner, c);
      inner.style.transformOrigin = "0px " + yb1.toFixed(1) + "px";
      inner.style.transform = inv ? "scaleY(1)" : "scaleY(0)";
      buildings.push({ g0: g0, dg: dg, inner: inner, last: -1, x: 0, inv: inv });
    } });
  }
  [-1, 1].forEach(function (sd) {
    var D = 9.4 - (sd > 0 ? .5 : 0);
    while (D > 1.75) {
      var len = Math.max(.32 + rnd() * .38, D * .05);
      if (D > 3.5 && D - len < 3.5) { len = D - 3.5; }
      if (len < .12) { D = 3.05; continue; }
      var D1 = Math.max(1.5, D - len), sN = 1 / D1;
      var g = Math.pow(rnd(), 1.08);
      var tier = g < .16 ? 0 : g < .42 ? 1 : g < .7 ? 2 : 3;
      if (sN > .34 && tier === 3) tier = 2;
      var dist = sd > 0 && D <= 4.7 && D1 >= 1.6;       // Kabukicho block (right side)
      if (dist) { g = .5 + rnd() * .1; tier = 2; }
      var Xin = 1.12 + rnd() * .12;
      var house = { side: sd, Xin: Xin, Wd: .75 + rnd() * .35, D0: D - .08, D1: D1 + .08, hu: .55 + rnd() * .25, kind: 0, fc: 0 };
      if (tier === 0) pushBuilding(house, 0, .03 + rnd() * .03, false);
      else pushBuilding(house, g - .01, .05, true);   // the house shrinks away just before its replacement rises
      if (tier > 0) {
        var hu = tier === 1 ? 1.0 + rnd() * .9 : tier === 2 ? 1.8 + rnd() * 1.4 : 3.0 + rnd() * 1.8;
        var capPx = (SY(sN) - 370), cap = capPx / (KH * sN);
        if (dist) hu = 1.7 + rnd() * 1.2;
        hu = Math.max(1.1, Math.min(hu, cap));
        var big = { side: sd, Xin: Xin, Wd: (.95 + rnd() * 1.1) * (D1 < 3.2 ? .62 : 1), D0: D, D1: D1, hu: hu, kind: tier, fc: Math.floor(rnd() * 3) };
        big.neon = dist;
        big.bill = !dist && rn() < .3;
        big.screen = tier >= 2 && !dist && rn() < .55;
        pushBuilding(big, g, .06 + rnd() * .05, false);
      }
      D = D1 - D * (.015 + rnd() * .03);
      if (D < 3.5 && D > 3.0) D = 3.0;
    }
  });
  // second row of taller towers behind the street frontage — adds depth and volume
  [-1, 1].forEach(function (sd) {
    var D = 9.0 - rnd() * .5;
    while (D > 2.5) {
      var D1 = Math.max(2.2, D - (.4 + rnd() * .6)), bg = .28 + rnd() * .62, sNb = 1 / D1;
      var hb = Math.min(3.2 + rnd() * 4.2, (SY(sNb) - 360) / (KH * sNb));
      pushBuilding({ side: sd, Xin: 2.35 + rnd() * .3, Wd: .9 + rnd() * .8, D0: D, D1: D1, hu: Math.max(1.5, hb * (.65 + rnd() * .5)), kind: bg > .62 ? 3 : 2, fc: Math.floor(rnd() * 3) }, bg, .07 + rnd() * .05, false);
      D = D1 - .04;
    }
  });
  // trees (village era) and street lamps (city era)
  [-1, 1].forEach(function (sd) {
    for (var i = 0, D = 8.8; D > 1.5; i++, D *= .84) {
      if ((D > 2.8 && D < 3.6) || D < 1.6) continue;
      (function (D, i) {
        drawList.push({ D: D, draw: function (parent) {
          var s = 1 / D, bx = SX(sd * .93, s), by = SY(s), gtr = el("g", {}, parent, "streetTree");
          el("rect", { x: (bx - 3.5 * s * 2).toFixed(1), y: (by - .5 * KH * s).toFixed(1), width: (7 * s * 2).toFixed(1), height: (.5 * KH * s).toFixed(1) }, gtr, "f-fg");
          el("ellipse", { cx: bx.toFixed(1), cy: (by - .72 * KH * s).toFixed(1), rx: (.26 * KX * s).toFixed(1), ry: (.3 * KH * s).toFixed(1) }, gtr, "f-decid");
          el("ellipse", { cx: bx.toFixed(1), cy: (by - .6 * KH * s).toFixed(1), rx: (.2 * KX * s).toFixed(1), ry: (.22 * KH * s).toFixed(1) }, gtr, "f-tree");
        } });
      })(D, i);
      var DL = D * .92;
      if ((DL > 2.8 && DL < 3.6) || DL < 1.5) continue;
      (function (DL) {
        drawList.push({ D: DL, draw: function (parent) {
          var s = 1 / DL, bx = SX(sd * .93, s), by = SY(s), top = by - 1.05 * KH * s, g = el("g", {}, parent, "streetLamp");
          var pole = el("path", { d: "M" + bx.toFixed(1) + " " + by.toFixed(1) + " L" + bx.toFixed(1) + " " + top.toFixed(1) + " L" + SX(sd * .72, s).toFixed(1) + " " + (top - .03 * KH * s).toFixed(1) }, g, "lampPole");
          pole.setAttribute("stroke-width", Math.max(.8, 5 * s).toFixed(2));
          var lx = SX(sd * .72, s), ly = top - .03 * KH * s;
          el("circle", { cx: lx.toFixed(1), cy: ly.toFixed(1), r: (.045 * KX * s + 3).toFixed(1) }, g, "lampGlow");
          el("circle", { cx: lx.toFixed(1), cy: (ly + 1).toFixed(1), r: Math.max(1.2, 6 * s).toFixed(1), fill: "#fff1c4" }, g);
        } });
      })(DL);
    }
  });
  // torii gate across the road: it frames Fuji down the street
  drawList.push({ D: TORII_D, draw: function (parent) {
    var s = 1 / TORII_D, by = SY(s), g = el("g", {}, parent, "f-torii");
    var pw = .085 * KX * s, H1 = 1.25 * KH * s, H2 = 1.02 * KH * s;
    [-1, 1].forEach(function (sd) { el("rect", { x: (SX(sd * .8, s) - pw / 2).toFixed(1), y: (by - H1).toFixed(1), width: pw.toFixed(1), height: H1.toFixed(1), rx: 1.5 }, g); });
    el("rect", { x: (SX(-.86, s)).toFixed(1), y: (by - H2).toFixed(1), width: (1.72 * KX * s).toFixed(1), height: (.06 * KH * s * 2).toFixed(1) }, g);
    var xl = SX(-1.18, s), xr = SX(1.18, s), xm = 800, yt = by - H1;
    el("path", { d: "M" + xl.toFixed(1) + " " + (yt - .02 * KH * s).toFixed(1) + " Q " + xm + " " + (yt - .2 * KH * s).toFixed(1) + " " + xr.toFixed(1) + " " + (yt - .02 * KH * s).toFixed(1) +
      " L" + xr.toFixed(1) + " " + (yt + .1 * KH * s).toFixed(1) + " Q " + xm + " " + (yt - .06 * KH * s).toFixed(1) + " " + xl.toFixed(1) + " " + (yt + .1 * KH * s).toFixed(1) + " Z" }, g);
  } });
  drawList.push({ D: 2.0, draw: function (parent) {          // red light haze over the district
    var e = el("ellipse", { cx: 965, cy: 612, rx: 230, ry: 130, fill: "url(#neonGrad)" }, parent); e.setAttribute("id", "redGlow");
  } });
  drawList.push({ D: 1.99, draw: function (parent) {         // Kabukicho Ichibangai gate
    var by = SY(.5), xl = SX(-1.08, .5), xr = SX(1.08, .5), g = el("g", {}, parent, "kabuGate");
    el("path", { d: "M" + (xl - 46) + " " + (by - 170) + " Q 800 " + (by - 214) + " " + (xr + 46) + " " + (by - 170) + " L" + (xr + 30) + " " + (by - 160) + " L" + (xl - 30) + " " + (by - 160) + " Z", fill: "#6e0d17" }, g);
    el("rect", { x: xl - 8, y: by - 166, width: 16, height: 166, fill: "#a8111e" }, g);
    el("rect", { x: xr - 8, y: by - 166, width: 16, height: 166, fill: "#a8111e" }, g);
    var bd = el("rect", { x: xl - 30, y: by - 164, width: xr - xl + 60, height: 46, rx: 6, fill: "#b3182a", stroke: "#e8c27a", "stroke-width": 2 }, g);
    var t = el("text", { x: 800, y: by - 129, "text-anchor": "middle", "font-size": 31, fill: "#fff3c4", "letter-spacing": 7 }, g, "gateTxt"); t.textContent = "歌舞伎町";
    var t2 = el("text", { x: 800, y: by - 105, "text-anchor": "middle", "font-size": 11, fill: "#ffd36b", "letter-spacing": 4 }, g, "gateTxt"); t2.textContent = "一番街";
    for (var li = 0; li < 7; li++) {
      var lx = xl + (xr - xl) * (li + .5) / 7;
      var gl = el("circle", { cx: lx, cy: by - 104, r: 15, fill: "#ff3b3b", "fill-opacity": ".4" }, g, "neonGlow");
      el("ellipse", { cx: lx, cy: by - 102, rx: 5.5, ry: 7.5, fill: "#e5202c" }, g);
    }
  } });
  /* ================= era scenery: village → town → city → megacity =================
     Props live on the ground plane of the street's perspective (X lateral, D depth, scale 1/D).
     Local prop coordinates are px at D=1 (about 25 px per metre). g0 = growth when a prop rises,
     gOut = growth when it is replaced (null = stays). Uses its own seeded rng so the existing city layout is unchanged. */
  var fades = [], xings = [];
  function gp(X, D) { var s = 1 / D; return [SX(X, s), SY(s)]; }
  function gquad(parent, X0, X1, D0, D1, cls) { return poly([gp(X0, D0), gp(X1, D0), gp(X1, D1), gp(X0, D1)], cls, parent); }
  function gpd(X0, X1, D0, D1) { return pd([gp(X0, D0), gp(X1, D0), gp(X1, D1), gp(X0, D1)]) + " "; }
  function sR(p, x, y, w, h, cls, fill) { var e = el("rect", { x: x, y: y, width: w, height: h }, p, cls); if (fill) e.setAttribute("fill", fill); return e; }
  function sP(p, d, cls, fill) { var e = el("path", { d: d }, p, cls); if (fill) e.setAttribute("fill", fill); return e; }
  function sC(p, cx, cy, r, cls, fill) { var e = el("circle", { cx: cx, cy: cy, r: r }, p, cls); if (fill) e.setAttribute("fill", fill); return e; }
  function sE(p, cx, cy, rx, ry, cls, fill) { var e = el("ellipse", { cx: cx, cy: cy, rx: rx, ry: ry }, p, cls); if (fill) e.setAttribute("fill", fill); return e; }
  function sL(p, d, col, w, cls) {
    var e = el("path", { d: d, fill: "none", "stroke-width": w, "stroke-linecap": "round" }, p, cls);
    if (col.indexOf("var(") === 0) e.style.stroke = col; else e.setAttribute("stroke", col);
    return e;
  }
  function ground(order, g0, dg, gOut, fn) {            // flat ground layer, drawn before everything else, fades with growth
    drawList.push({ D: 99 + order, draw: function (parent) {
      var g = el("g", {}, parent); fn(g); fades.push({ g0: g0, dg: dg, gOut: gOut, el: g, last: -1 });
    } });
  }
  function prop(X, D, g0, dg, gOut, fn, k) {            // upright prop standing on the ground at (X, D)
    k = k || 1;
    drawList.push({ D: D, draw: function (parent) {
      var s = 1 / D, x = SX(X, s), y = SY(s), org = "0px " + y.toFixed(1) + "px";
      var inner = el("g", {}, parent), outer = inner;
      inner.style.transformOrigin = org; inner.style.transform = "scaleY(0)";
      buildings.push({ g0: g0, dg: dg, inner: inner, last: -1, x: 0, inv: false });
      if (gOut != null) {
        outer = el("g", {}, inner); outer.style.transformOrigin = org;
        buildings.push({ g0: gOut, dg: .05, inner: outer, last: -1, x: 0, inv: true });
      }
      var g = el("g", { transform: "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ") scale(" + (s * k).toFixed(4) + ")" }, outer);
      g.style.opacity = (1 - .4 * clamp((D - 4) / 12, 0, 1)).toFixed(2);       // light depth haze
      fn(g, s * k, X, D);
    } });
  }
  function updateScenery(g) {
    for (var i = 0; i < fades.length; i++) {
      var f = fades[i], o = sstep(g, f.g0, f.g0 + f.dg);
      if (f.gOut != null) o *= 1 - sstep(g, f.gOut, f.gOut + .05);
      if (Math.abs(o - f.last) > .01) { f.last = o; f.el.style.opacity = o.toFixed(2); }
    }
  }
  var START = -.1;      // g0 for things that are there from the first frame

  /* ---------- VILLAGE: paddies, stream, farmhouses, shrine ---------- */
  ground(0, START, .02, null, function (g) {                 // far patchwork of fields
    var gg = el("g", {}, g, "fieldFade"), dA = "", dB = "";
    for (var i = 0; i < 60; i++) {
      var D0 = 15 + rn() * 38, X0 = (rn() * 2 - 1) * D0 * 2.4, wq = D0 * .1 * (.6 + rn()), dl = D0 * .07 * (.6 + rn());
      if (Math.abs(X0) < 1.3) continue;
      var q = gpd(X0, X0 + wq, D0, D0 - dl); if (i % 2) dA += q; else dB += q;
    }
    sP(gg, dA, "f-fieldc"); sP(gg, dB, "f-glass").setAttribute("opacity", ".28");
  });
  ground(1, START, .02, null, function (g) {                 // rice paddies with water sheen and seedling rows
    var gg = el("g", {}, g, "fieldFade"), dA = "", dB = "", sheen = "", rows = "";
    [-1, 1].forEach(function (sd) {
      for (var row = 0; row < 5; row++) {
        var Da = 14.5 - row * 2.4, Db = Da - 2.1, X = 1.55 + row * .2, c = 3 + (row % 2);
        for (var cc = 0; cc < c; cc++) {
          var wq = .75 + rn() * .55, q = gpd(sd * X, sd * (X + wq), Da, Db);
          if ((row + cc) % 2) dA += q; else dB += q;
          sheen += gpd(sd * (X + .06), sd * (X + wq - .06), Da - .1, Da - .1 - (Da - Db) * .45);
          for (var r = 1; r < 5; r++) {
            var xx = sd * (X + wq * r / 5), a = gp(xx, Da - .12), b = gp(xx, Db + .12);
            rows += "M" + a[0].toFixed(1) + " " + a[1].toFixed(1) + "L" + b[0].toFixed(1) + " " + b[1].toFixed(1);
          }
          X += wq + .1;
        }
      }
    });
    sP(gg, dA, "f-fieldc"); sP(gg, dB, "f-glass").setAttribute("opacity", ".42");
    sP(gg, sheen, "f-glass").setAttribute("opacity", ".35");
    var rw = sL(gg, rows, "var(--tree)", .8); rw.setAttribute("opacity", ".4");
  });
  ground(2, START, .02, null, function (g) {                 // stream running toward the viewer on the left
    var gg = el("g", {}, g, "fieldFade"), pts = [[-3.2, 17], [-3.5, 12], [-3.9, 8.6], [-3.7, 6.2], [-3.4, 4.7], [-3.8, 3.3]], A = [], B = [], mid = "";
    pts.forEach(function (p) { A.push(gp(p[0] - .16, p[1])); B.unshift(gp(p[0] + .16, p[1])); var m = gp(p[0], p[1]); mid += (mid ? "L" : "M") + m[0].toFixed(1) + " " + m[1].toFixed(1); });
    poly(A.concat(B), "f-glass", gg).setAttribute("opacity", ".95");
    var hl = sL(gg, mid, "#ffffff", 1.2); hl.setAttribute("opacity", ".25");
  });
  function tree(g, x, h, r) { sR(g, x - 3, -h, 6, h, "f-fg"); sE(g, x, -h - r * .4, r, r * .9, "f-tree"); sE(g, x - r * .15, -h - r * .55, r * .8, r * .7, "f-decid"); }
  function farmhouse(g, thatch) {
    var fxg = el("g", {}, g, "propG"), rd = "M-136 -74 Q-112 -82 -88 -154 L88 -154 Q112 -82 136 -74 Z";
    sR(g, -100, -80, 200, 80, "f-wall");
    if (thatch) sP(fxg, rd, null, "#a98f55"); else sP(g, rd, "f-roof");
    sR(g, 48, -172, 14, 30, "f-roof");
    sR(g, -100, -80, 200, 7, "f-shR");
    sR(g, -70, -60, 38, 30, "f-win-dark"); sR(g, -70, -60, 38, 30, "f-win-lit");
    sL(g, "M-51 -60V-30M-70 -45H-32", "#3a2b20", 2);
    sR(g, 30, -52, 28, 52, null, "#4a3524");
    sL(fxg, "M64 -70H100", "#6b5b3a", 1.5);                                 // persimmons drying under the eave
    [68, 78, 88, 98].forEach(function (x) { sL(fxg, "M" + x + " -70V-62", "#6b5b3a", 1.2); sC(fxg, x, -58, 5, null, "#e8832a"); });
    sR(g, 112, -72, 3, 72, "f-fg"); sR(g, 168, -72, 3, 72, "f-fg"); sL(g, "M113 -69Q141 -60 170 -69", "var(--fg)", 1.4);   // laundry line
    sR(fxg, 119, -66, 14, 20, null, "#e9eef5"); sR(fxg, 139, -63, 14, 18, null, "#d46a6a"); sR(fxg, 157, -66, 10, 16, null, "#5a86b5");
  }
  [[3.3, 3.9, 1, 1.7, .34], [5.0, 4.7, 0, 1.6, .4], [4.1, 6.4, 1, 1.5, .3], [6.8, 6.0, 0, 1.4, .38], [5.6, 8.4, 1, 1.4, .33], [3.8, 10.2, 0, 1.4, .28],
   [-5.7, 4.2, 0, 1.7, .36], [-4.6, 5.8, 1, 1.5, .31], [-7.2, 6.8, 0, 1.5, .41], [-5.4, 8.4, 1, 1.4, .29], [-3.9, 10.2, 0, 1.4, .35]].forEach(function (h) {
    prop(h[0], h[1], START, .02, h[4], function (g) { farmhouse(g, h[2]); }, h[3]);
  });
  [[3.8, 5.2, .27], [-5.2, 6.4, .24]].forEach(function (p) {      // scarecrows
    prop(p[0], p[1], START, .02, p[2], function (g) {
      sR(g, -2, -74, 4, 74, "f-fg"); sR(g, -26, -56, 52, 4, "f-fg");
      var f = el("g", {}, g, "propG"); sR(f, -10, -64, 20, 24, null, "#5a7fa8"); sE(f, 0, -78, 18, 6, null, "#c9b27a"); sC(f, 0, -70, 7, null, "#e9d9b4");
    }, 2.1);
  });
  [[4.6, 3.2, .26], [7.0, 4.4, .3], [-6.4, 3.7, .28], [-4.4, 9.4, .26]].forEach(function (p) {   // haystacks
    prop(p[0], p[1], START, .02, p[2], function (g) {
      var f = el("g", {}, g, "propG"); sP(f, "M-34 0Q-30 -52 0 -60Q30 -52 34 0Z", null, "#c9a85c"); sL(f, "M-20 -8Q0 -30 20 -8", "#a98a44", 2);
    }, 1.9);
  });
  [[4.8, 5.6, .25], [-6.0, 5.2, .25]].forEach(function (p) {          // farmers in conical hats
    prop(p[0], p[1], START, .02, p[2], function (g) {
      var f = el("g", {}, g, "propG"); sR(f, -6, -34, 12, 24, null, "#3d5a7a"); sR(f, -5, -12, 4, 12, null, "#2a3040"); sR(f, 1, -12, 4, 12, null, "#2a3040");
      sC(f, 0, -40, 5, null, "#e0ac84"); sP(f, "M-14 -42L0 -56L14 -42Z", null, "#d8c070");
    }, 2.2);
  });
  prop(-3.45, 4.7, START, .02, .36, function (g) {                    // wooden footbridge over the stream
    var f = el("g", {}, g, "propG");
    sP(f, "M-92 0Q0 -44 92 0L92 -8Q0 -54 -92 -8Z", null, "#8a6a44");
    sL(f, "M-80 -14L-80 -32M-40 -30L-40 -48M0 -36L0 -54M40 -30L40 -48M80 -14L80 -32", "#6b4f30", 3);
    sL(f, "M-92 -34Q0 -80 92 -34", "#6b4f30", 3);
  }, 1.2);
  prop(-5.0, 3.3, START, .02, null, function (g) {                    // shrine with torii, stone lanterns and a sacred tree
    var f = el("g", {}, g, "propG");
    sR(g, -70, -24, 140, 24, "f-fg"); sR(g, -52, -72, 104, 48, "f-wall"); sP(g, "M-88 -68L0 -124L88 -68Z", "f-roof");
    sR(g, -12, -62, 24, 38, "f-win-dark"); sR(g, -12, -62, 24, 38, "f-win-lit");
    sL(f, "M-40 -66H40", "#e8e0c8", 2.4);
    sR(g, -214, -104, 10, 104, "f-torii"); sR(g, -124, -104, 10, 104, "f-torii"); sR(g, -228, -118, 128, 10, "f-torii");
    sP(g, "M-236 -122Q-164 -140 -92 -122L-96 -130Q-164 -148 -232 -130Z", "f-torii"); sR(g, -218, -88, 100, 5, "f-torii");
    [-60, -168].forEach(function (x) {
      sR(g, x - 6, -22, 12, 22, "f-fg"); sR(g, x - 10, -42, 20, 20, "f-fg"); sP(g, "M" + (x - 16) + " -42L" + x + " -56L" + (x + 16) + " -42Z", "f-fg");
      sR(f, x - 5, -38, 10, 12, null, "#ffd98a").setAttribute("class", "niteGlow");
    });
    sR(g, 160, -120, 18, 120, "f-fg"); sE(g, 168, -150, 62, 46, "f-tree"); sE(g, 150, -176, 46, 34, "f-decid"); sE(g, 196, -168, 40, 30, "f-decid");
  }, 1.2);

  /* ---------- everywhere: utility poles, vending machines, bus stop ---------- */
  [-1, 1].forEach(function (sd) {
    var Ds = [12.4, 9.3, 6.9, 5.0, 3.9, 2.8];
    Ds.forEach(function (D, i) {
      var Df = Ds[i - 1];
      prop(sd * 1.14, D, START, .02, null, function (g, sk) {
        sR(g, -3, -190, 6, 190, "f-fg"); sR(g, -24, -178, 48, 5, "f-fg"); sR(g, -16, -150, 32, 4, "f-fg");
        if (!Df) return;
        var sf = 1 / Df, q = sf / sk, ex = (SX(sd * 1.14, sf) - SX(sd * 1.14, 1 / D)) / sk, ey = (SY(sf) - SY(1 / D)) / sk;
        [-20, 0, 20].forEach(function (o) {
          var x1 = ex + o * q, y1 = ey - 178 * q;
          sL(g, "M" + o + " -178Q" + ((o + x1) / 2).toFixed(1) + " " + (((-178 + y1) / 2) + 10 + 6 * q).toFixed(1) + " " + x1.toFixed(1) + " " + y1.toFixed(1), "var(--fg)", 1.2, "lampPole").setAttribute("opacity", ".75");
        });
      });
    });
  });
  function vending(g, col) {
    var f = el("g", {}, g, "propG");
    sR(f, -15, -48, 30, 48, null, col); sR(g, -11, -42, 22, 24, "f-win-lit"); sR(g, -11, -42, 22, 24, "f-win-dark").setAttribute("opacity", ".35");
    sR(f, -11, -14, 22, 8, null, "#1d2230"); sR(f, 6, -34, 4, 6, null, "#fff");
    sE(g, 0, -30, 26, 30, "niteGlow", "#ffe7a8").setAttribute("fill-opacity", ".5");
  }
  prop(-1.03, 2.55, START, .02, null, function (g) { vending(g, "#d8232a"); vending(el("g", { transform: "translate(32,0)" }, g), "#2a6fb8"); }, 1.1);
  prop(1.03, 2.95, START, .02, null, function (g) {                   // bus stop
    var f = el("g", {}, g, "propG");
    sR(g, -2, -90, 4, 90, "f-fg"); sC(f, 0, -98, 13, null, "#fff"); sC(f, 0, -98, 9, null, "#1f6fb2");
    sR(g, 20, -66, 70, 4, "f-fg"); sR(g, 22, -62, 3, 62, "f-fg"); sR(g, 86, -62, 3, 62, "f-fg"); sR(g, 24, -60, 62, 34, "f-glass").setAttribute("opacity", ".4");
    sR(g, 26, -18, 56, 5, "f-fg");
  }, 1.1);

  /* ---------- TOWN: lantern strings, market stalls, level crossing with a local train ---------- */
  [7.4, 4.1].forEach(function (D) {
    prop(0, D, .22, .04, null, function (g) {
      sR(g, -372, -150, 6, 150, "f-fg"); sR(g, 366, -150, 6, 150, "f-fg");
      var f = el("g", {}, g, "propG"), N = 11, pc = "#c8321e";
      sL(g, "M-369 -142Q0 -86 369 -142", "var(--fg)", 1.6);
      for (var i = 0; i < N; i++) {
        var t = (i + .5) / N, x = -369 + 738 * t, y = (1 - t) * (1 - t) * -142 + 2 * (1 - t) * t * -86 + t * t * -142;
        sE(g, x, y + 20, 30, 30, "niteGlow", "#ffb45a").setAttribute("fill-opacity", ".55");
        sE(f, x, y + 18, 13, 17, null, i % 2 ? "#f4f0e4" : pc); sR(f, x - 6, y + 1, 12, 4, null, "#2a2420"); sR(f, x - 6, y + 33, 12, 4, null, "#2a2420");
      }
    });
  });
  [[.98, 6.3, .25], [-.98, 6.9, .27], [.98, 3.75, .29], [-.98, 4.5, .31]].forEach(function (p, i) {
    prop(p[0], p[1], p[2], .03, .56, function (g) {
      var f = el("g", {}, g, "propG"), cols = ["#c8321e", "#2f6fa0", "#3b7a57", "#d9a030"], c = cols[i % 4];
      sR(g, -44, -30, 88, 30, "f-fac-b");
      for (var k = 0; k < 6; k++) sP(f, "M" + (-58 + k * 19.3) + " -70L" + (-38.7 + k * 19.3) + " -70L" + (-34 + k * 19.3) + " -48L" + (-62.6 + k * 19.3) + " -48Z", null, k % 2 ? "#f4f0e4" : c);
      sR(g, -46, -70, 4, 70, "f-fg"); sR(g, 42, -70, 4, 70, "f-fg");
      [[-30, "#d9482b"], [-10, "#8ac24a"], [10, "#f0b429"], [30, "#d9482b"]].forEach(function (b) { sR(f, b[0] - 8, -42, 16, 12, null, "#a98a60"); sC(f, b[0], -45, 6, null, b[1]); });
      sC(f, 0, -62, 9, null, "#fff6d6");       // paper lantern
    }, 1.7);
  });
  ground(3, .26, .03, .62, function (g) {                    // railway line crossing the plain and the road
    gquad(g, -45, 45, 5.64, 5.2, "f-walk");
    gquad(g, -45, 45, 5.52, 5.45, "f-fg"); gquad(g, -45, 45, 5.37, 5.3, "f-fg");
  });
  [-1, 1].forEach(function (sd) {                            // crossing gates and blinking lights
    prop(sd * .9, 5.5, .26, .03, .62, function (g) {
      var f = el("g", { class: "xing" }, g); xings.push(f);
      sR(f, -2.5, -84, 5, 84, null, "#2a2f38");
      var arm = el("g", {}, f, "gateArm" + (sd > 0 ? " r" : "")), len = 290 * sd;
      sR(arm, sd > 0 ? -290 : 0, -64, 290, 6, null, "#f4f0e4");
      sL(arm, "M" + (sd > 0 ? -290 : 0) + " -61H" + (sd > 0 ? 0 : 290), "#d52b1e", 6).setAttribute("stroke-dasharray", "30 30");
      sC(f, -9, -78, 5, "xlamp", "#ff2a2a"); sC(f, 9, -78, 5, "xlamp b", "#ff2a2a");
      sC(f, -9, -78, 15, "xglow", "#ff2a2a"); sC(f, 9, -78, 15, "xglow b", "#ff2a2a");
    }, 1.2);
  });
  prop(0, 5.38, .26, .03, .62, function (g) {                // the local train
    var t = el("g", { id: "ltTrain" }, g);
    for (var c = 0; c < 3; c++) {
      var x0 = c * 508, f = el("g", {}, t, "propG");
      sR(f, x0, -92, 500, 82, null, "#d8dde6"); sR(f, x0, -52, 500, 10, null, "#2f7fb8"); sR(f, x0 + 4, -98, 492, 8, null, "#9aa3b2");
      for (var k = 0; k < 6; k++) { sR(t, x0 + 24 + k * 78, -82, 52, 26, "f-win-dark"); sR(t, x0 + 24 + k * 78, -82, 52, 26, "f-win-lit"); }
      sC(f, x0 + 70, -6, 10, null, "#1d2230"); sC(f, x0 + 430, -6, 10, null, "#1d2230");
    }
  }, 1);

  /* ---------- TOWN: shop-houses (machiya) fill the plain ---------- */
  var NOREN = ["#2f5d8c", "#9c2f2f", "#3b7a57", "#6c4a8c", "#b98a2e"];
  function machiya(g, ci) {
    var f = el("g", {}, g, "propG");
    sR(g, -70, -96, 140, 96, "f-wall");
    sR(g, -56, -48, 112, 48, "f-win-dark"); sR(g, -56, -48, 112, 48, "f-win-lit").setAttribute("fill-opacity", ".55");
    sP(f, "M-60 -50H60V-34H48V-40H34V-34H22V-40H8V-34H-6V-40H-20V-34H-32V-40H-46V-34H-60Z", null, NOREN[ci % 5]);
    sR(g, -78, -54, 156, 5, "f-roof");
    sR(g, -40, -84, 80, 28, "f-win-dark"); sR(g, -40, -84, 80, 28, "f-win-lit"); sL(g, "M-14 -84V-56M12 -84V-56M-40 -70H40", "#3a2b20", 2);
    sP(g, "M-98 -92L-72 -140H72L98 -92Z", "f-roof");
    sR(f, 74, -92, 8, 44, null, "#e9e2cc"); sR(f, 76, -86, 4, 8, null, "#9c2f2f"); sR(f, 76, -74, 4, 8, null, "#9c2f2f");
    sE(g, -66, -28, 10, 13, "niteGlow", "#ffb45a").setAttribute("fill-opacity", ".6"); sE(f, -66, -28, 5, 8, null, "#c8321e");
  }
  [-1, 1].forEach(function (sd) {
    for (var i = 0; i < 7; i++) {
      var D = 3.5 + i * 1.05 + rn() * .5, X = sd * (3.1 + rn() * 4.2 + D * .1), ci = i + (sd > 0 ? 2 : 0);
      prop(X, D, .22 + rn() * .13, .05, .58 + rn() * .1, function (g) { machiya(g, ci); }, 1.5);
    }
  });

  ground(4, .45, .1, null, function (g) {                    // street grid appears as the city spreads over the plain
    [3.5, 5.2, 7.2, 9.8, 13.5, 18].forEach(function (D) { gquad(g, -60, 60, D * 1.1, D, "f-road"); });
    [-1, 1].forEach(function (sd) { gquad(g, sd * 3.0, sd * 3.4, 40, 2.6, "f-road"); gquad(g, sd * 9.5, sd * 10.1, 60, 3.6, "f-road"); });
  });
  /* ---------- CITY: mid-rise blocks fill the plain in three phases; MEGACITY adds towers ---------- */
  function block(g, w, h, fc, tall) {
    var cols = Math.max(2, Math.floor(w / 24)), rows = Math.max(3, Math.floor(h / 30)), lit = "", dark = "", mx = (w - cols * 12) / (cols + 1), my = (h - rows * 15) / (rows + 1), r, c;
    sR(g, -w / 2, -h, w, h, fc);
    for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
      var seg = "M" + (-w / 2 + mx + c * (12 + mx)).toFixed(1) + " " + (-h + my + r * (15 + my)).toFixed(1) + "h12v15h-12z";
      if (rn() < .45) lit += seg; else dark += seg;
    }
    sP(g, dark, "f-win-dark"); sP(g, lit, "f-win-lit");
    sR(g, w / 2 - w * .2, -h, w * .2, h, "f-shR");
    sR(g, -w / 2 - 2, -h - 6, w + 4, 7, "f-roof");
    var f = el("g", {}, g, "propG"); sR(f, -w / 2, -38, w, 6, null, NOREN[Math.floor(rn() * 5)]);
    if (tall) { sR(g, -1.5, -h - 40, 3, 34, "f-roof"); var bw = el("g", {}, g, "beaconWrap"); sC(bw, 0, -h - 42, 4, "beacon"); }
  }
  [-1, 1].forEach(function (sd) {
    for (var i = 0; i < 9; i++) {
      var D = 3.4 + i * .95 + rn() * .5, X = sd * D * (1.5 + rn() * .85), w = 110 + rn() * 90, fl = 7 + Math.floor(rn() * 16);
      var h = Math.min(fl * 28 + 30, (SY(1 / D) - 400) * D), fc = ["f-fac-a", "f-fac-b", "f-fac-c"][i % 3];
      (function (X, D, w, h, fc, tall) { prop(X, D, .47 + rn() * .2, .07, null, function (g) { block(g, w, h, fc, tall); }, 1); })(X, D, w, h, fc, fl > 15);
    }
    for (var j = 0; j < 4; j++) {                          // megacity towers
      var D2 = 5 + j * 1.9 + rn(), X2 = sd * D2 * (1.45 + rn() * .8), w2 = 90 + rn() * 50, h2 = (SY(1 / D2) - 360) * D2 * (.75 + rn() * .25);
      (function (X, D, w, h) { prop(X, D, .74 + rn() * .14, .06, null, function (g) { block(g, w, h, "f-glass", true); }, 1); })(X2, D2, w2, h2);
    }
  });

  /* ---------- CITY: store pylon signs, pedestrian overpass, elevated expressway ---------- */
  [[-1.06, 2.35], [1.06, 6.0], [-1.06, 8.2]].forEach(function (p) {
    prop(p[0], p[1], .5, .04, null, function (g) {
      var f = el("g", {}, g, "propG");
      sR(g, -3, -150, 6, 150, "f-fg"); sR(f, -28, -196, 56, 52, null, "#f4f4f0");
      sR(f, -28, -182, 56, 8, null, "#1d9a5a"); sR(f, -28, -170, 56, 8, null, "#f08a1c"); sR(f, -28, -158, 56, 8, null, "#d8232a");
      sR(g, -28, -196, 56, 52, "niteGlow", "#ffffff").setAttribute("fill-opacity", ".35");
    }, 1.2);
  });
  prop(0, 4.0, .5, .05, null, function (g) {
    sR(g, -380, -118, 760, 14, "f-fac-a"); sR(g, -380, -104, 760, 4, "f-shR");
    sR(g, -380, -144, 760, 3, "f-fac-b"); sR(g, -380, -141, 760, 23, "f-glass").setAttribute("opacity", ".3");
    sR(g, -340, -104, 9, 104, "f-fg"); sR(g, 331, -104, 9, 104, "f-fg");
    sP(g, "M380 -118L520 0L556 0L400 -118Z", "f-fac-b"); sP(g, "M-380 -118L-520 0L-556 0L-400 -118Z", "f-fac-b");
    sL(g, "M382 -142L526 -24M-382 -142L-526 -24", "var(--fg)", 2);
  }, 1);
  prop(0, 6.5, .62, .06, null, function (g) {                // elevated expressway across the whole view
    sR(g, -5200, -180, 10400, 20, "f-fac-b"); sR(g, -5200, -184, 10400, 5, "f-fg"); sR(g, -5200, -160, 10400, 5, "f-shR");
    for (var x = -5100; x < 5200; x += 300) sR(g, x, -160, 22, 160, "f-fg");
    var lg = el("g", { class: "xwL" }, g);
    sL(lg, "M-5200 -190H5200", "#fff2b8", 5, "xwHead"); sL(lg, "M-5200 -196H5200", "#ff4338", 5, "xwTail");
  }, 1);

  /* ---------- MEGACITY: rooftop gardens, billboards, LED screens (called from the building code) ---------- */
  function roofGarden(inner, w, h) {
    var gg = el("g", {}, inner, "megaOnly"), n = 2 + Math.floor(rn() * 3);
    sR(gg, -w / 2, -h - 3, w, 3, "f-tree");
    for (var i = 0; i < n; i++) sC(gg, -w / 2 + w * (i + .5) / n, -h - 5, 2.6 + rn() * 2, "f-decid");
  }
  var AD = [["#232a44", "#ff4f6a", "#ffd24a"], ["#1d3a35", "#3ad1a0", "#fff"], ["#3a2330", "#ff9a3a", "#ffe9b0"], ["#1a2a4a", "#4aa8ff", "#fff"]];
  function addBillboard(inner, c, xi1, xo1, yb1, h1, sN) {
    var fx0 = Math.min(xi1, xo1), fw = Math.abs(xi1 - xo1), pw = fw * .84, ph = Math.max(6, .3 * KH * sN), leg = Math.max(3, .08 * KH * sN);
    var x0 = fx0 + fw * .08, y0 = yb1 - h1 - leg - ph, pal = AD[Math.floor(rn() * AD.length)];
    var f = el("g", {}, inner, "propG");
    sR(f, x0 + pw * .15, y0 + ph, 1.6, leg, null, "#20242c"); sR(f, x0 + pw * .8, y0 + ph, 1.6, leg, null, "#20242c");
    sR(f, x0, y0, pw, ph, null, pal[0]); sR(f, x0, y0, pw * .34, ph, null, pal[1]); sC(f, x0 + pw * .62, y0 + ph / 2, ph * .3, null, pal[2]);
    sR(inner, x0, y0, pw, ph, "neonGlow", pal[1]).setAttribute("fill-opacity", ".3");
  }
  function addScreen(inner, c) {
    var v0 = .34, v1 = Math.min(c.hu - .22, v0 + 1.0);
    if (v1 < v0 + .3) return;
    poly(wquad(c, .1, .9, v0 - .03, v1 + .03), "", inner).setAttribute("fill", "#0a0c14");
    poly(wquad(c, .13, .87, v0, v1), "led", inner).setAttribute("fill", "url(#ledGrad)");
  }

  /* ---------- traffic signals at the crossing: heads facing the viewer on both kerbs, plus repeaters facing the oncoming lane ---------- */
  var sigLamps = { vr: [], vy: [], vg: [], pr: [], pg: [], rep: [] };
  function lampAt(g, cx, cy, r, dim, lit, list) {
    sC(g, cx, cy, r, null, dim);
    var on = el("g", { opacity: 0 }, g); sC(on, cx, cy, r + .6, null, lit); sC(on, cx, cy, r * 2.7, null, lit).setAttribute("fill-opacity", ".22");
    list.push(on);
  }
  [-1, 1].forEach(function (sd) {
    drawList.push({ D: 1.34, draw: function (parent) {
      var s = 1 / 1.34, g = el("g", { transform: "translate(" + SX(sd * .94, s).toFixed(1) + "," + SY(s).toFixed(1) + ") scale(" + s.toFixed(4) + ")", class: "sigG" }, parent);
      sR(g, -2.5, -210, 5, 210, "f-fg");
      sR(g, -10, -226, 20, 52, "", "#151a22").setAttribute("rx", 5);
      lampAt(g, 0, -214, 5.6, "#3a1616", "#ff3b30", sigLamps.vr); lampAt(g, 0, -199, 5.6, "#3a3216", "#ffcc33", sigLamps.vy); lampAt(g, 0, -184, 5.6, "#16341e", "#3be06a", sigLamps.vg);
      sR(g, -9, -166, 18, 36, "", "#151a22").setAttribute("rx", 4);
      lampAt(g, 0, -154, 5, "#3a1616", "#ff3b30", sigLamps.pr); lampAt(g, 0, -139, 5, "#16341e", "#3be06a", sigLamps.pg);
    } });
    drawList.push({ D: 1.92, draw: function (parent) {                                // back of the heads that face oncoming traffic: a small repeater lamp on top
      var s = 1 / 1.92, g = el("g", { transform: "translate(" + SX(sd * .94, s).toFixed(1) + "," + SY(s).toFixed(1) + ") scale(" + s.toFixed(4) + ")", class: "sigG" }, parent);
      sR(g, -2.5, -200, 5, 200, "f-fg"); sR(g, -9, -214, 18, 32, "", "#151a22").setAttribute("rx", 4);
      var d = sC(g, 0, -200, 4.2, null, "#3be06a"); sigLamps.rep.push(d);
    } });
  });
  drawList.sort(function (a, b) { return b.D - a.D; });
  drawList.forEach(function (it) { it.draw(streetItems); });
  var ltTrainEl = document.getElementById("ltTrain");

  // traffic
  // (vehicles are created in the traffic simulation section below)
  /* ---------- cars: seen head-on when oncoming, from behind when receding ---------- */
  var CAR_TYPES = [
    { bw: 36, top: -30, hood: -36, cab: -54, cb: 28, ct: 21 },      // sedan
    { bw: 35, top: -29, hood: -35, cab: -57, cb: 28, ct: 23 },      // hatchback
    { bw: 38, top: -34, hood: -41, cab: -65, cb: 31, ct: 26 },      // SUV
    { bw: 33, top: -31, hood: -37, cab: -71, cb: 29, ct: 27 }       // kei van
  ];
  var carRs = 7771;                                                  // own tiny rng: car variety must not shift any other seeded layout
  function cr() { carRs = (carRs + 0x6D2B79F5) | 0; var t = Math.imul(carRs ^ carRs >>> 15, 1 | carRs); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function drawCar(cg, front, paint, T, taxi) {
    var R = function (x, y, w, h, rx, fill, op) { var e = el("rect", { x: x, y: y, width: w, height: h, rx: rx || 0, fill: fill }, cg); if (op != null) e.setAttribute("fill-opacity", op); return e; };
    var P = function (d, fill, op) { var e = el("path", { d: d, fill: fill }, cg); if (op != null) e.setAttribute("fill-opacity", op); return e; };
    var bw = T.bw, top = T.top, hood = T.hood, cab = T.cab, cb = T.cb, ct = T.ct, sd;
    el("ellipse", { cx: 0, cy: 1, rx: bw + 6, ry: 4.5, fill: "#000", "fill-opacity": ".42" }, cg);
    el("ellipse", { cx: 0, cy: 4, rx: bw + 5, ry: 7, fill: front ? "#fff6cf" : "#ff3b30", "fill-opacity": ".3" }, cg, "carGlow");     // light pool on the road
    [-1, 1].forEach(function (sd) { R(sd * (bw - 8) - 5.5, -17, 11, 17, 3.5, "#14171d"); R(sd * (bw - 8) - 5.5, -17, 11, 3, 1.5, "#2c323d"); });   // tyres
    R(-bw, top, bw * 2, -9 - top, 6, paint);                                                                                          // lower body
    P("M" + (-bw + 2) + " " + top + "Q" + (-bw + 3) + " " + hood + " " + (-bw + 10) + " " + hood + "L" + (bw - 10) + " " + hood + "Q" + (bw - 3) + " " + hood + " " + (bw - 2) + " " + top + "Z", paint);   // bonnet / boot lid
    P("M" + (-bw + 8) + " " + (hood + 1) + "L" + (bw - 8) + " " + (hood + 1) + "L" + (bw - 10) + " " + (hood + 4) + "L" + (-bw + 10) + " " + (hood + 4) + "Z", "#fff", .14);        // highlight on the lid
    P("M" + (-cb - 3) + " " + hood + "L" + (-ct - 2) + " " + (cab - 1) + "L" + (ct + 2) + " " + (cab - 1) + "L" + (cb + 3) + " " + hood + "Z", paint);                          // cabin shell
    P("M" + (-cb) + " " + (hood - 1) + "L" + (-ct) + " " + (cab + 3) + "L" + ct + " " + (cab + 3) + "L" + cb + " " + (hood - 1) + "Z", "url(#busGlass)");                      // glass
    R(-ct - 2, cab - 2, ct * 2 + 4, 4, 2, paint); R(-ct - 2, cab - 2, ct * 2 + 4, 1.6, 0.8, "#fff", .2);                                                                  // roof edge
    P("M" + (-cb) + " " + (hood - 1) + "L" + (-ct) + " " + (cab + 3) + "L" + (-ct + 9) + " " + (cab + 3) + "L" + (-cb + 13) + " " + (hood - 1) + "Z", "#fff", .13);            // glass reflection
    if (front) {
      el("circle", { cx: -cb * .42, cy: cab + 13, r: 4.3, fill: "#10141b", "fill-opacity": ".8" }, cg);                                                                  // driver (right-hand drive)
      if (hood - cab - 20 > 0) R(-cb * .42 - 7, cab + 17, 14, hood - cab - 20, 4, "#10141b", .75);      // driver torso (a negative height is invalid SVG; skip on bodies too short for it)
      if (cr() < .55) { el("circle", { cx: cb * .42, cy: cab + 13, r: 4, fill: "#10141b", "fill-opacity": ".4" }, cg); if (hood - cab - 20 > 0) R(cb * .42 - 6, cab + 17, 12, hood - cab - 20, 4, "#10141b", .35); }
      el("path", { d: "M" + (-cb + 3) + " " + (hood - 3) + "L" + (-1) + " " + (hood - 12) + "M" + (cb - 3) + " " + (hood - 3) + "L" + 3 + " " + (hood - 12), stroke: "#0c0e12", "stroke-width": 1.2, fill: "none", "stroke-linecap": "round" }, cg);   // wipers
      [-1, 1].forEach(function (sd) { R(sd * (cb + 3) - (sd < 0 ? 6.5 : 0), hood - 6, 6.5, 5, 2, paint); R(sd * (cb + 3) - (sd < 0 ? 6.5 : 0), hood - 6, 6.5, 1.5, .7, "#fff", .25); });   // mirrors
      R(-13, top + 1, 26, 8, 2, "#15181d"); R(-13, top + 4.4, 26, 1.1, 0, "#a7b0ba"); el("circle", { cx: 0, cy: top + 4.9, r: 2, fill: "#c9d0d8" }, cg);                   // grille + badge
      [-1, 1].forEach(function (sd) {
        P("M" + (sd * (bw - 1.5)) + " " + (top + .5) + "L" + (sd * (bw - 14)) + " " + (top - 1.2) + "L" + (sd * (bw - 15)) + " " + (top + 7) + "L" + (sd * (bw - 1.5)) + " " + (top + 8) + "Z", "#fff6cf");   // headlight
        R(sd * (bw - 9) - 3, -16, 6, 3, 1, "#e8a23a", .85);                                                                                                                  // fog / indicator
        el("ellipse", { cx: sd * (bw - 8), cy: top + 4, rx: 15, ry: 10, fill: "#fff6cf" }, cg, "carGlow");
      });
      R(-bw + 1, -15, bw * 2 - 2, 8, 3, "#272b33"); R(-15, -13, 30, 4, 1.5, "#101216");                                                                                   // bumper + intake
      R(-8.5, -14.5, 17, 6, 1, "#f4f4ee"); R(-6, -12.5, 12, 1.1, 0, "#8a8f98"); R(-6, -10.4, 8, 1.1, 0, "#8a8f98");                                                    // plate
    } else {
      R(-8, cab + 4, 7, 7, 2.5, "#10141b", .6); R(1, cab + 4, 7, 7, 2.5, "#10141b", .6);                                                                                 // headrests
      R(-10, cab + 3, 20, 2.2, 1, "#ff3b30", .95);                                                                                                                          // high brake light
      [-1, 1].forEach(function (sd) {
        P("M" + (sd * bw) + " " + (top + 1) + "L" + (sd * (bw - 15)) + " " + (top - 1) + "L" + (sd * (bw - 15)) + " " + (top + 7) + "L" + (sd * (bw - 1)) + " " + (top + 8.5) + "Z", "#c8261d");   // tail light
        P("M" + (sd * (bw - 1)) + " " + (top + 2) + "L" + (sd * (bw - 8)) + " " + (top + 1) + "L" + (sd * (bw - 8)) + " " + (top + 6) + "L" + (sd * (bw - 2)) + " " + (top + 7) + "Z", "#ff6a5a", .9);
        el("ellipse", { cx: sd * (bw - 8), cy: top + 4, rx: 14, ry: 10, fill: "#ff3b30" }, cg, "carGlow");
        el("ellipse", { cx: sd * (bw - 8), cy: top + 4, rx: 15, ry: 10, fill: "#ff2a1a" }, cg, "brkGlow");
      });
      R(-bw + 1, -15, bw * 2 - 2, 8, 3, "#272b33");                                                                                                                         // bumper
      R(-9, top + 3, 18, 8, 1.2, "#f4f4ee"); R(-6.5, top + 5.2, 13, 1.1, 0, "#8a8f98"); R(-6.5, top + 7.6, 9, 1.1, 0, "#8a8f98");                                       // plate
      R(-12, hood + 2, 24, 1.2, 0, "#000", .25);                                                                                                                            // boot seam
      el("ellipse", { cx: bw - 14, cy: -9, rx: 3.4, ry: 2.1, fill: "#0d0f13" }, cg);                                                                                      // exhaust
    }
    if (taxi) {                                                                                                                                                                // roof lamp
      R(-5, cab - 4, 10, 3, 0, "#14171d"); R(-10, cab - 11, 20, 8, 3, "#f4f4ee"); R(-10, cab - 11, 20, 2.2, 1.1, "#fff", .6); R(-6.5, cab - 6.4, 13, 1.2, 0, "#9a8f60");
      el("ellipse", { cx: 0, cy: cab - 7, rx: 17, ry: 9, fill: "#fff6cf" }, cg, "carGlow");
    }
    R(-bw, top, bw * 2, -9 - top, 6, "url(#carSheen)"); R(-bw, hood, bw * 2, -9 - hood, 6, "url(#busShade)");                                                           // volume
  }

  var PAINTS = ["#c0392b", "#2c6fbb", "#e8e8ee", "#2b2f3a", "#e0a82e", "#3f9a6a", "#8e5bb5", "#b9bfc9", "#1f3a5f", "#f2f2ee"];
  /* ---------- buses: seen head-on when oncoming, from behind when receding ---------- */
  var BUS_LIV = ["#2f8f5b", "#2d6fb3", "#c8452f"];
  function drawBus(cg, front, liv) {
    var R = function (x, y, w, h, rx, fill, op) { var e = el("rect", { x: x, y: y, width: w, height: h, rx: rx || 0, fill: fill }, cg); if (op != null) e.setAttribute("fill-opacity", op); return e; };
    var i;
    el("ellipse", { cx: 0, cy: 1, rx: 62, ry: 5, fill: "#000", "fill-opacity": ".38" }, cg);
    [-40, 40].forEach(function (x) { R(x - 9, -24, 18, 24, 3.5, "#14171d"); R(x - 9, -24, 18, 3, 1.5, "#2c323d"); });          // tyres
    R(-53, -116, 106, 100, 9, "#f2f4f5");                                                                                          // body shell
    R(-53, -116, 106, 10, 5, "#d8dde1");                                                                                          // roof cap
    R(-28, -124, 56, 9, 3, "#c3c9ce"); R(-22, -127, 44, 4, 2, "#aab1b8");                                                          // roof air-conditioner
    el("path", { d: "M-53 -54H53V-31H-53Z", fill: liv }, cg);                                                                      // livery band
    R(-53, -31, 106, 2.4, 0, "#fff", .55);
    R(-55, -19, 110, 10, 3, "#3a3f48"); R(-55, -19, 110, 2.6, 1.3, "#59606c");                                                      // bumper
    [-63, 57].forEach(function (x) { R(x, -90, 6, 28, 2.5, "#14171d"); R(x < 0 ? x + 6 : x - 5, -80, 5, 2, 0, "#14171d"); });     // mirrors
    if (front) {
      R(-32, -104, 64, 9, 2, "#0d1016");                                                                                          // destination board
      for (i = 0; i < 7; i++) R(-27 + i * 8.2, -101, 5.6, 3, 1, "#ffb347");
      R(-47, -92, 94, 40, 5, "url(#busGlass)");                                                                                   // windscreen
      R(-1, -92, 2, 40, 0, "#f2f4f5");                                                                                            // centre pillar
      el("circle", { cx: -24, cy: -73, r: 5.2, fill: "#10141b", "fill-opacity": ".8" }, cg);                                      // driver (right-hand drive)
      R(-33, -67, 18, 15, 5, "#10141b", .8);
      el("path", { d: "M-42 -55L-10 -64M6 -55L40 -64", stroke: "#111", "stroke-width": 1.4, fill: "none", "stroke-linecap": "round" }, cg);   // wipers
      R(-47, -92, 94, 7, 5, "#fff", .14);                                                                                         // glass reflection
      R(-22, -48, 44, 17, 2, "#4a505a"); for (i = 0; i < 4; i++) R(-22, -46 + i * 4, 44, 1.2, 0, "#2b2f37");                      // grille
      R(-10, -30, 20, 9, 1.5, "#f4f4ee"); R(-7, -27, 14, 1.4, 0, "#8a8f98"); R(-7, -24, 9, 1.4, 0, "#8a8f98");                   // number plate
      [-1, 1].forEach(function (sd) {
        R(sd * 41 - 8, -48, 16, 9, 3, "#fff6cf"); R(sd * 41 - 8, -39, 16, 3, 1, "#ffb347");                                      // head + indicator lights
        el("ellipse", { cx: sd * 41, cy: -43, rx: 16, ry: 12, fill: "#fff6cf" }, cg, "carGlow");
      });
    } else {
      R(-30, -104, 60, 5, 1.5, "#0d1016"); for (i = 0; i < 5; i++) R(-22 + i * 9, -103, 6, 3, 1, "#ffb347");                      // rear route board
      R(-41, -94, 82, 34, 5, "url(#busGlass)");                                                                                   // rear window
      R(-41, -94, 82, 6, 5, "#fff", .12);
      [[-26, -72], [-6, -74], [14, -72], [30, -71]].forEach(function (p) { el("circle", { cx: p[0], cy: p[1], r: 3.2, fill: "#10141b", "fill-opacity": ".55" }, cg); });   // passengers
      R(-18, -99, 36, 3, 1.5, "#ff3b30");                                                                                         // high brake light
      R(-34, -56, 68, 3, 1.5, "#cfd5da");
      R(-34, -50, 68, 28, 3, "#e4e8eb"); for (i = 0; i < 5; i++) R(-34, -46 + i * 5, 68, 1, 0, "#aeb5bd");                         // engine hatch louvres
      R(-11, -29, 22, 10, 1.5, "#f4f4ee"); R(-8, -26, 16, 1.4, 0, "#8a8f98"); R(-8, -23, 10, 1.4, 0, "#8a8f98");                 // number plate
      [-1, 1].forEach(function (sd) {
        R(sd * 47 - 3.5, -92, 7, 56, 3, "#b8321f"); R(sd * 47 - 3.5, -92, 7, 10, 3, "#ff3b30");
        el("ellipse", { cx: sd * 47, cy: -64, rx: 11, ry: 30, fill: "#ff3b30" }, cg, "carGlow");
        el("ellipse", { cx: sd * 47, cy: -64, rx: 12, ry: 30, fill: "#ff2a1a" }, cg, "brkGlow");
      });
    }
    R(-53, -116, 106, 100, 9, "url(#busShade)");                                                                                  // edge shading
  }

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
  function railEraNow() { return sstep(growth, .26, .32) * (1 - sstep(growth, .58, .64)) > .3; }
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
    sig.on = growth > .37;
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
      var allowed = growth >= v.th && growth < v.thOut;
      if (v.active && !allowed) deactivate(v);
      if (!v.active) { if (allowed) { v.wait -= dt; if (v.wait <= 0) spawnVeh(v); } if (!v.active) continue; }   // a vehicle that just spawned moves in the same step
      lanes[v.key].push(v);
    }
    for (var key in lanes) {
      var Ls = lanes[key]; if (!Ls.length) continue;
      Ls.sort(function (a, b) { return a.dir * a.D - b.dir * b.D; });                   // followers first … leader last
      for (i = Ls.length - 1; i >= 0; i--) {
        v = Ls[i];
        var lead = i < Ls.length - 1 ? Ls[i + 1] : null, p = v.dir * v.D, free = 1 - Math.pow(v.v / (v.v0 * (testMode ? 1 : weather.slow)), 4), acc = v.a * free, rs = 2 * Math.sqrt(v.a * v.b);
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
      var op = sstep(growth, v.th, v.th + .04) * (1 - sstep(growth, v.thOut - .05, v.thOut)) * clamp((10 - D) / .9, 0, 1);
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
      if (growth < p.th) { p.state = "gone"; p.fade = 0; p.moving = false; p.timer = 0; continue; }
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
      var p = peds[i], vis = sstep(growth, p.th, p.th + .04), fade = 1;
      if (p.kind === 1) fade = p.fade; else fade = clamp((p.D - p.lo) / .35, 0, 1) * clamp((p.lo + p.R - p.D) / .6, 0, 1);
      if (vis * fade < .01) { if (p.shown) { p.g.style.display = "none"; p.shown = false; } continue; }
      if (!p.shown) { p.g.style.display = ""; p.shown = true; }
      var X = p.Xp + (p.X - p.Xp) * alpha, D = p.Dp + (p.D - p.Dp) * alpha, sc = 1 / D, walking = p.moving && !paused;
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
    var mult = paused ? 0 : Math.min(speed, 3);
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
    var keepG = growth, keepP = paused, keepS = speed, i, k, dtf = mode === "jitter" ? function () { return .008 + Math.random() * .045; } : function () { return 1 / mode; };
    growth = g; paused = false; speed = 1; trs = 424242; resetTraffic();
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
    growth = keepG; paused = keepP; speed = keepS; resetTraffic();
    return out;
  }
  /* ---------- offline test: runs the real simulation for N simulated seconds and reports safety/smoothness numbers ---------- */
  function simTest(secs, g) {
    var keepG = growth, keepSig = { i: sig.i, t: sig.t }, i, v, st = { minGap: 99, overlaps: 0, redRuns: 0, pedConflicts: 0, maxAcc: 0, maxJerk: 0, maxJump: 0,
      pedStartsOffWalk: 0, pedOverlaps: 0, pedCrossings: 0, vehPassed: 0, railConflicts: 0, railRuns: 0, phases: {} };
    growth = g; trs = 424242; resetTraffic();
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
        var pa = peds[i]; if (pa.kind === 1 ? pa.state === "gone" : growth < pa.th) continue;
        for (var j = i + 1; j < peds.length; j++) {
          var pb = peds[j]; if (pb.kind === 1 ? pb.state === "gone" : growth < pb.th) continue;
          if (Math.abs(pa.X - pb.X) < .03 && Math.abs(pa.D - pb.D) < .03) { st.pedOverlaps++; var pk = pa.kind + "/" + pb.kind; st.pairs = st.pairs || {}; st.pairs[pk] = (st.pairs[pk] || 0) + 1; }
        }
      }
      crossers.forEach(function (c, ci) {
        if (prevState[ci] === "wait" && c.state === "cross") { st.pedCrossings++; if (sig.on && sig.name !== "pw") st.pedStartsOffWalk++; }
        prevState[ci] = c.state;
      });
    }
    testMode = false; railShut = false;
    growth = keepG; trs = 424242 + Math.floor(Math.random() * 1000); resetTraffic(); sig.i = keepSig.i; sig.t = keepSig.t;
    st.minGap = +st.minGap.toFixed(3); st.maxAcc = +st.maxAcc.toFixed(2); st.maxJerk = +st.maxJerk.toFixed(2);
    return st;
  }

  /* ================= simulation state ================= */
  var simDays = .6;            // seasonal / era clock (8 days = 1 year)
  var dayAcc = .32;            // time-of-day phase 0..1 (starts mid-morning)
  var speed = 1, targetSpeed = 1, rateApplied = -1;
  var paused = reduced, holding = false, holdKey = false;
  var petalsOn = !reduced;
  var growth = 0, growthApplied = -1, growthOverride = null;      // growthOverride: test hook only (lets a screenshot pick era and season independently)
  var DAY_RATE = .09;          // day/night cycles per second at 1x
  var DAYS_PER_SEC = .45;      // sim days per second at 1x
  var HOLD_MULT = 8;

  var seasonKj = document.getElementById("seasonKj"), seasonName = document.getElementById("seasonName");
  var eraKj = document.getElementById("eraKj"), eraName = document.getElementById("eraName");
  var yearLabel = document.getElementById("yearLabel"), eraBar = document.getElementById("eraBar");
  var speedChip = document.getElementById("speedChip");
  var SEASONS = [["春", "Spring"], ["夏", "Summer"], ["秋", "Autumn"], ["冬", "Winter"]];
  var ERAS = [["村", "Village"], ["町", "Town"], ["市", "City"], ["大都市", "Megacity"]];
  var hudDue = true, hudCache = "", beaconVis = false, bOn = false, wOn = false, blinkT = 0;
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
  var todSlider = document.getElementById("todSlider"), scrubbing = false;
  var fgLayer = document.getElementById("fgLayer"), sakuraEl = document.getElementById("sakura") || document.createElement("div"), cloudsEl = document.getElementById("clouds");
  fgLayer.style.transformOrigin = "800px 900px"; sakuraEl.style.transformOrigin = "0px 0px";
  var pxT = 0, pyT = 0, px = 0, py = 0;

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
    var tod = ((dayAcc % 1) + 1) % 1;
    var s = (((simDays - .6) / 2) % 4 + 4) % 4;
    var w = seasonWeights(s);
    var year = simDays / DAYS_PER_YEAR;
    growth = growthOverride !== null ? growthOverride : clamp(year / GROWTH_YEARS, 0, 1);
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
    setVar("--field-op", (1 - sstep(growth, .18, .4)).toFixed(3));
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
    setVar("--city-glow-op", (growth * sstep(nf, .45, .85) * .5).toFixed(3));
    setVar("--smoke-op", (1 - sstep(growth, .15, .35)).toFixed(3));
    setVar("--train-op", sstep(growth, .45, .6).toFixed(3));
    setVar("--plane-op", sstep(growth, .78, .9).toFixed(3));
    setVar("--bird-op", ((1 - nf) * (1 - growth * .55)).toFixed(3));
    if (palDue) cityGround.setAttribute("opacity", Math.min(1, growth * 5).toFixed(2));

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
    var landC = mix(landDay, mix(hx("858a90"), [226, 233, 243], w[3] * .35 * (1 - growth * .5)), sstep(growth, .25, .55));
    var roadC = mix(mix(hx("8e7d64"), hx("4a505a"), sstep(growth, .2, .45)), [232, 238, 246], w[3] * .45 * (1 - sstep(growth, .4, .8) * .7));
    var walkC = mix(roadC, [196, 196, 204], .38 * sstep(growth, .25, .5));
    var dk = [9, 12, 26];
    setVar("--land", css(mix(landC, dk, nf * .64)));
    setVar("--road", css(mix(roadC, dk, nf * .68)));
    setVar("--walk", css(mix(walkC, dk, nf * .6)));
    setVar("--shade-l", (.12 + .26 * (1 - clamp(side, 0, 1)) * dayF).toFixed(3));
    setVar("--shade-r", (.12 + .26 * (1 - clamp(-side, 0, 1)) * dayF).toFixed(3));
    var lampGate = sstep(growth, .3, .5);
    setVar("--lamp-gate", lampGate.toFixed(3));
    setVar("--lamp-glow", (lampGate * sstep(nf, .5, .8) * .85).toFixed(3));
    setVar("--tree-op", (1 - lampGate).toFixed(3));
    setVar("--car-op", sstep(growth, .38, .5).toFixed(3));
    setVar("--car-bright", (1 - .65 * nf).toFixed(2));
    setVar("--lights-op", (sstep(nf, .45, .8) * .5).toFixed(3));
    setVar("--lane-op", (sstep(growth, .42, .55) * .85).toFixed(3));
    var distOn = sstep(growth, .5, .6);
    setVar("--neon-op", ((.3 + .7 * sstep(nf, .4, .8)) * distOn).toFixed(3));
    setVar("--neon-txt", (.78 + .22 * sstep(nf, .4, .8)).toFixed(3));
    setVar("--neon-glow", (distOn * sstep(nf, .4, .85) * .95).toFixed(3));
    setVar("--gate-op", distOn.toFixed(3));
    setVar("--nite", sstep(nf, .45, .8).toFixed(3));
    setVar("--sig-op", sstep(growth, .34, .4).toFixed(3));
    setVar("--mega-op", sstep(growth, .74, .9).toFixed(3));
    setVar("--led-op", (sstep(growth, .72, .86) * (.55 + .45 * sstep(nf, .4, .8))).toFixed(3));
    setVar("--cap-op", (.25 + .6 * (Math.sin(simDays * .31) * .5 + .5)).toFixed(3));
    if (palDue) {                                                   // switch animations off while their layer is invisible
      svg.classList.toggle("noStars", sstep(nf, .62, .95) < .01);
      svg.classList.toggle("smokeOff", (1 - sstep(growth, .15, .35)) < .01);
      svg.classList.toggle("ledOn", sstep(growth, .72, .86) > .01);
      beaconVis = sstep(nf, .4, .75) > .02;
    }
    if (palDue && !scrubbing) todSlider.value = Math.round(tod * 1000);

    /* ---- growth: buildings, trees, cranes ---- */
    if (Math.abs(growth - growthApplied) > .0015) {
      growthApplied = growth;
      for (var i = 0; i < buildings.length; i++) {
        var b = buildings[i];
        var sc = sstep(growth, b.g0, b.g0 + b.dg); if (b.inv) sc = 1 - sc;
        if (Math.abs(sc - b.last) > .004) { b.last = sc; paintBuilding(b); }
      }
      for (var t = 0; t < trees.length; t++) {
        var tr = trees[t];
        if (tr.nearest >= 1) continue;
        var op = 1 - sstep(growth, tr.nearest - .02, tr.nearest + .07);
        if (Math.abs(op - tr.fade) > .03) { tr.fade = op; tr.el.style.opacity = op.toFixed(2); }
      }
      for (var c = 0; c < cranes.length; c++) {
        var cr = cranes[c];
        var cro = clamp(1 - Math.abs(growth - cr.c) / .2, 0, 1) * .95;
        cr.el.style.opacity = cro.toFixed(2); cr.el.classList.toggle("idle", cro < .02);
      }
      updateScenery(growth);
    }

    /* ---- HUD (own slow clock) ---- */
    if (!hudDue) return;
    var dom = 0; for (var d = 1; d < 4; d++) if (w[d] > w[dom]) dom = d;
    var era = growth < .22 ? 0 : growth < .47 ? 1 : growth < .74 ? 2 : 3;
    var yr = Math.floor(year) + 1;
    var key = dom + "|" + era + "|" + yr;
    if (key !== hudCache) {
      hudCache = key;
      seasonKj.textContent = SEASONS[dom][0]; seasonName.textContent = SEASONS[dom][1];
      eraKj.textContent = ERAS[era][0]; eraName.textContent = ERAS[era][1];
      yearLabel.textContent = "Year " + yr;
    }
    eraBar.style.width = (growth * 100).toFixed(1) + "%";
    var di = growth < .22 ? 0 : growth < .47 ? 1 : growth < .56 ? 2 : growth < .65 ? 3 : growth < .74 ? 4 : 5;
    if (di !== distIdx) setDistrict(di);
    var spd = Math.max(1, Math.round(speed));
    var chipTxt = paused ? "0×" : spd + "×";
    if (speedChip.textContent !== chipTxt) speedChip.textContent = chipTxt;
    body.classList.toggle("ff", speed > 2.5);
  }

  /* ================= particles ================= */
  var particleCount = 0, acc = { petal: 0, maple: 0, flake: 0, fly: 0, fw: 0 };
  function applyRateTo(e) {
    if (rateApplied >= 0 && Math.abs(rateApplied - 1) > .01 && e.getAnimations) {
      e.getAnimations({ subtree: true }).forEach(function (a) { a.playbackRate = rateApplied; });
    }
  }
  function spawnFaller(kind) {
    if (particleCount > (speed > 3 ? 32 : GOV.cur.part)) return;
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
    wrap.appendChild(p); fx.appendChild(wrap); particleCount++;
    applyRateTo(wrap);
    wrap.addEventListener("animationend", function (e) {
      if (e.animationName === "petalFall") { wrap.remove(); particleCount--; }
    });
  }
  function spawnFirefly() {
    if (particleCount > GOV.cur.part) return;
    var wrap = document.createElement("div"); wrap.className = "flyWrap";
    wrap.style.left = (8 + Math.random() * 84) + "vw";
    wrap.style.top = (58 + Math.random() * 28) + "vh";
    wrap.style.setProperty("--d", (6 + Math.random() * 4).toFixed(2) + "s");
    var dot = document.createElement("div"); dot.className = "flyDot";
    wrap.appendChild(dot); fx.appendChild(wrap); particleCount++;
    applyRateTo(wrap);
    wrap.addEventListener("animationend", function (e) {
      if (e.animationName === "flyWander") { wrap.remove(); particleCount--; }
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
    if (audio && soundOn && audio.c.state === "running") setTimeout(function () { auBoom(audio, audio.c.currentTime + .02); }, 380);
  }
  function spawnShot() {
    var nf = (Math.cos((((dayAcc % 1) + 1) % 1) * Math.PI * 2) + 1) / 2;
    if (nf < .85 || document.hidden || reduced || paused) return;
    var shot = document.createElement("div"); shot.className = "shot";
    shot.style.left = (10 + Math.random() * 55) + "vw";
    shot.style.top = (4 + Math.random() * 22) + "vh";
    fx.appendChild(shot);
    shot.addEventListener("animationend", function () { shot.remove(); });
  }
  setInterval(spawnShot, 5200);

  /* ================= animation speed sync ================= */
  function syncRates() {
    if (Math.abs(speed - rateApplied) < .12) return;
    rateApplied = speed;
    if (!document.getAnimations) return;
    document.getAnimations().forEach(function (a) {
      var t = a.effect && a.effect.target;
      if (t && t.closest && t.closest("svg.scene, #fx")) {
        try { a.playbackRate = speed; } catch (e) {}
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
    clkCars.setHz(GOV.cur.car); clkBikes.setHz(GOV.cur.bike); clkPeds.setHz(GOV.cur.ped);
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
    buildings: buildings, growth: function () { return growth; }, paint: paintBuilding, quality: function () { return GOV.level; },
    onStatus: function (k) { wxRow.hidden = k === "clear"; if (k !== "clear") { wxKj.textContent = k === "typhoon" ? "台風" : "雨"; wxName.textContent = k === "typhoon" ? "Typhoon" : "Rain"; } },
    onRaining: function (on) { svg.classList.toggle("raining", on); },
    onThunder: function (delay, v) { setTimeout(function () { if (audio && soundOn && !paused && audio.c.state === "running") auThunder(audio, audio.c.currentTime + .02, v); }, delay * 1000); },
    onCollapse: function () { if (audio && soundOn && !paused && audio.c.state === "running") auCrash(audio, audio.c.currentTime + .02); }
  });

  /* ================= main loop ================= */
  var last = performance.now(), pinned = null, pinDays = null;
  function tick(now) {
    var rdt = (now - last) / 1000, dt = Math.min(.08, rdt); last = now;
    govFrame(rdt);
    targetSpeed = paused ? 0 : (holding || holdKey) ? HOLD_MULT : 1;
    speed += (targetSpeed - speed) * Math.min(1, dt * 4.5);
    if (Math.abs(speed - targetSpeed) < .01) speed = targetSpeed;
    if (pinned) { simDays = pinned[0]; dayAcc = pinned[1]; }
    else {
      simDays += dt * speed * DAYS_PER_SEC;
      dayAcc += dt * Math.min(speed, 3.5) * DAY_RATE;   // cap day-cycle rate: no strobing
      if (pinDays !== null) simDays = pinDays;          // test hook: freeze the era but let day and night keep moving
    }
    var s = (((simDays - .6) / 2) % 4 + 4) % 4, w = seasonWeights(s);
    var nf = (Math.cos((((dayAcc % 1) + 1) % 1) * Math.PI * 2) + 1) / 2;
    if (petalsOn && !reduced && speed > .02) {
      acc.petal += dt * speed * 2.4 * w[0];
      acc.maple += dt * speed * 2.0 * w[2];
      acc.flake += dt * speed * 6.5 * w[3];
      acc.fly   += dt * Math.min(speed, 3) * 1.3 * w[1] * sstep(nf, .6, .9);
      while (acc.petal >= 1) { acc.petal--; spawnFaller("petal"); }
      while (acc.maple >= 1) { acc.maple--; spawnFaller("maple"); }
      while (acc.flake >= 1) { acc.flake--; spawnFaller("flake"); }
      while (acc.fly >= 1) { acc.fly--; spawnFirefly(); }
      acc.fw += dt * Math.min(speed, 3) * .4 * w[1] * sstep(nf, .55, .85) * sstep(growth, .12, .2);
      while (acc.fw >= 1) { acc.fw--; spawnFirework(); }
    }
    // parallax: foreground and branch drift against the distant mountain
    px += (pxT - px) * Math.min(1, dt * 3); py += (pyT - py) * Math.min(1, dt * 3);
    fgLayer.style.transform = "translate(" + (-px * 8).toFixed(1) + "px,0)";
    sakuraEl.style.transform = "translate(" + (-px * 22).toFixed(1) + "px," + (-py * 8).toFixed(1) + "px) scale(1.04)";
    cloudsEl.style.transform = "translate(" + (px * 7).toFixed(1) + "px,0)";
    if (audio && tierDue("aud", GOV.cur.aud, dt, false)) updateAudio(w, nf);
    updateTraffic(dt);
    weather.step(paused ? 0 : dt * Math.min(speed, 3), !pinned && pinDays === null && growthOverride === null && !reduced);     // frozen while a test pins the scene
    syncRates();
    palDue = tierDue("pal", scrubbing ? 30 : GOV.cur.pal, dt, growthApplied < 0);          // forced when the era / time is jumped, fast while scrubbing
    hudDue = tierDue("hud", GOV.cur.hud, dt, growthApplied < 0);
    blinkT += dt * Math.min(speed, 3);
    if (beaconVis) {                                                                          // aircraft-warning beacons: two shared clocks, only at night
      var bo = (blinkT % 2.2) < 1.21, wo = (blinkT % 1.4) < .77;
      if (bo !== bOn) { bOn = bo; svg.classList.toggle("bOn", bo); }
      if (wo !== wOn) { wOn = wo; svg.classList.toggle("wOn", wo); }
    }
    applyFrame();
    requestAnimationFrame(tick);
  }

  /* ================= ambient sound (WebAudio, no files) =================
     The soundscape follows the timelapse. Every layer is driven by `growth` (era), night and season:
       village   frogs, crickets, cicadas, temple bell, birds, wind chime, koto
       town      bicycle bells, muffled voices, rail-crossing bell and train
       city      traffic, car passes, horns, crosswalk chime, cranes, crowd (3 phases)
       megacity  Kabukicho at night: dense crowd, pachinko, neon hum, store chime, shouts, sirens, planes */
  var audio = null, soundOn = false;
  var SCALE = [293.66, 329.63, 392.0, 440.0, 493.88, 587.33, 659.25];
  var auPlaneEl = document.getElementById("plane");

  function auNoise(c, brown) {
    var len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0), b = 0;
    for (var i = 0; i < len; i++) {
      var v = Math.random() * 2 - 1;
      if (brown) { b = (b + .02 * v) / 1.02; d[i] = b * 3.5; } else d[i] = v * .5;
    }
    return buf;
  }
  function auLoop(c, buf) { var s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }
  function auFilt(c, type, f, q) { var n = c.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q != null) n.Q.value = q; return n; }
  function auGain(c, v) { var g = c.createGain(); g.gain.value = v; return g; }
  function auLfo(c, rate, depth, target, type) {
    var o = c.createOscillator(); o.type = type || "sine"; o.frequency.value = rate;
    var g = auGain(c, depth); o.connect(g); g.connect(target); o.start(); return o;
  }
  function auSet(p, v, t, tc, inst) { if (inst) p.setValueAtTime(v, t); else p.setTargetAtTime(v, t, tc); }

  function auBuild(c) {
    var A = { c: c, toggle: 0 };
    A.wnBuf = auNoise(c, false); A.bnBuf = auNoise(c, true);
    var comp = c.createDynamicsCompressor();                       // safety limiter for event pile-ups
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 6;
    A.out = auGain(c, .9); A.out.connect(comp); comp.connect(c.destination);
    // wind
    var sw = auLoop(c, A.bnBuf); A.windLp = auFilt(c, "lowpass", 520); A.wind = auGain(c, 0);
    sw.connect(A.windLp); A.windLp.connect(A.wind); A.wind.connect(A.out);
    // crickets: 4.3 kHz tone chopped by a fast square LFO
    var co = c.createOscillator(); co.frequency.value = 4300; A.cri = auGain(c, 0); A.criLfo = auGain(c, 0);
    co.connect(A.cri); A.cri.connect(A.out);
    var cl = c.createOscillator(); cl.type = "square"; cl.frequency.value = 17; cl.connect(A.criLfo); A.criLfo.connect(A.cri.gain);
    co.start(); cl.start();
    // cicadas: narrow band noise, 38 Hz buzz, slow swell
    var sc = auLoop(c, A.wnBuf), cb = auFilt(c, "bandpass", 6200, 5), buzz = auGain(c, .55), swell = auGain(c, .6);
    A.cic = auGain(c, 0);
    sc.connect(cb); cb.connect(buzz); auLfo(c, 38, .45, buzz.gain); buzz.connect(swell); auLfo(c, .11, .4, swell.gain);
    swell.connect(A.cic); A.cic.connect(A.out);
    // traffic rumble
    var st = auLoop(c, A.bnBuf); A.trafLp = auFilt(c, "lowpass", 220); A.traf = auGain(c, 0);
    st.connect(A.trafLp); A.trafLp.connect(A.traf); A.traf.connect(A.out);
    // crowd babble: three drifting formant-ish bands
    var sb = auLoop(c, A.wnBuf); A.crowd = auGain(c, 0);
    [[480, .9, .31], [1150, 1.1, .17], [2200, 1.5, .23]].forEach(function (b) {
      var f = auFilt(c, "bandpass", b[0], b[1]), g = auGain(c, .5);
      sb.connect(f); f.connect(g); auLfo(c, b[2], .45, g.gain); g.connect(A.crowd);
    });
    A.crowd.connect(A.out);
    // pachinko hall hiss
    var sp = auLoop(c, A.wnBuf), hp = auFilt(c, "highpass", 5200); A.hiss = auGain(c, 0);
    sp.connect(hp); hp.connect(A.hiss); A.hiss.connect(A.out);
    // neon transformer hum
    var h1 = c.createOscillator(), h2 = c.createOscillator(); h1.frequency.value = 100; h2.frequency.value = 200;
    A.hum = auGain(c, 0); var h2g = auGain(c, .4); h1.connect(A.hum); h2.connect(h2g); h2g.connect(A.hum); A.hum.connect(A.out);
    h1.start(); h2.start();
    // train rumble (rhythmic) and plane flyover
    var sr = auLoop(c, A.bnBuf), rb = auFilt(c, "bandpass", 150, .7), ram = auGain(c, .6); A.rail = auGain(c, 0);
    sr.connect(rb); rb.connect(ram); auLfo(c, 9, .4, ram.gain); ram.connect(A.rail); A.rail.connect(A.out);
    // rain: hiss and patter; gale: the howl of a typhoon
    var srn = auLoop(c, A.wnBuf), rhp = auFilt(c, "highpass", 1400), rlp = auFilt(c, "lowpass", 7500); A.rain = auGain(c, 0);
    srn.connect(rhp); rhp.connect(rlp); rlp.connect(A.rain); A.rain.connect(A.out);
    var sg = auLoop(c, A.bnBuf), gb = auFilt(c, "bandpass", 420, .8), gam = auGain(c, .6); A.gale = auGain(c, 0); A.galeBp = gb;
    sg.connect(gb); gb.connect(gam); auLfo(c, .23, .5, gam.gain); gam.connect(A.gale); A.gale.connect(A.out);
    var spl = auLoop(c, A.wnBuf); A.planeLp = auFilt(c, "lowpass", 300); A.plane = auGain(c, 0);
    spl.connect(A.planeLp); A.planeLp.connect(A.plane); A.plane.connect(A.out);
    return A;
  }

  function auCrane(g) {
    var m = 0;
    for (var i = 0; i < cranes.length; i++) m = Math.max(m, clamp(1 - Math.abs(g - cranes[i].c) / .2, 0, 1));
    return m;
  }
  function auAnimQ(el, period, moving) {      // 0..1 progress while the CSS animation is on screen, else -1
    try {
      var a = el.getAnimations()[0]; if (!a) return -1;
      var p = (((a.currentTime % period) + period) % period) / period;
      return p < moving ? p / moving : -1;
    } catch (e) { return -1; }
  }
  function auLevels(st) {
    var g = st.g, nf = st.nf, L = {
      g: g, w: st.w, rain: st.rain || 0, gale: st.wind || 0, fast: st.fast, craneAct: st.craneAct, trainQ: st.trainQ, planeQ: st.planeQ, walk: !!st.walk,
      night: sstep(nf, .35, .8), day: 1 - sstep(nf, .3, .6),
      rural: 1 - sstep(g, .18, .42),
      busy: sstep(g, .16, .3) * (1 - sstep(g, .6, .74) * .6),
      traffic: sstep(g, .3, .74),
      c1: sstep(g, .47, .56), c2: sstep(g, .56, .65), c3: sstep(g, .65, .74),   // the 3 city phases
      mega: sstep(g, .74, .9), trainOp: Math.max(sstep(g, .45, .6), sstep(g, .26, .32) * (1 - sstep(g, .58, .64))), planeOp: sstep(g, .78, .9)
    };
    L.kabu = sstep(g, .55, .82) * L.night;
    L.crowd = .35 * sstep(g, .18, .3) + .2 * L.c1 + .2 * L.c2 + .15 * L.c3 + .1 * L.mega;   // 0..1
    return L;
  }
  function auApply(A, L, t, tc, inst) {
    var w = L.w, tr = L.trainQ >= 0 ? Math.sin(Math.PI * L.trainQ) : 0, pl = L.planeQ >= 0 ? Math.sin(Math.PI * L.planeQ) : 0;
    auSet(A.wind.gain, .05 + .2 * w[3] + .03 * w[2] + .08 * L.g + (L.fast ? .05 : 0), t, tc, inst);
    auSet(A.windLp.frequency, 380 + 500 * w[3] + 700 * L.g, t, tc, inst);
    var cl = w[1] * L.night * L.rural * .014;
    auSet(A.cri.gain, cl, t, tc, inst); auSet(A.criLfo.gain, cl, t, tc, inst);
    auSet(A.cic.gain, w[1] * L.day * L.rural * .03, t, tc, inst);
    auSet(A.traf.gain, .12 * L.traffic, t, tc, inst);
    auSet(A.trafLp.frequency, 160 + 220 * L.traffic, t, tc, inst);
    auSet(A.crowd.gain, .22 * L.crowd * (.55 + .45 * L.night), t, tc, inst);
    auSet(A.hiss.gain, .012 * L.kabu, t, tc, inst);
    auSet(A.hum.gain, (.006 * L.kabu + .003 * L.mega * L.night), t, tc, inst);
    auSet(A.rail.gain, .1 * L.trainOp * tr, t, .25, inst);
    auSet(A.plane.gain, .12 * L.planeOp * pl, t, .25, inst);
    auSet(A.rain.gain, .15 * L.rain, t, tc, inst);
    auSet(A.gale.gain, .2 * L.gale, t, tc, inst);
    auSet(A.galeBp.frequency, 380 + 460 * L.gale, t, tc, inst);
    auSet(A.planeLp.frequency, 250 + 450 * pl, t, .25, inst);
  }

  // ---- one-shot sounds ----
  function auTone(A, t, f, dur, vel, type, att) {
    var c = A.c, o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + (att || .008));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(A.out); o.start(t); o.stop(t + dur + .05);
  }
  function auBurst(A, t, type, f, q, dur, vel) {
    var c = A.c, s = c.createBufferSource(), fl = auFilt(c, type, f, q), g = c.createGain();
    s.buffer = A.wnBuf; s.connect(fl); fl.connect(g); g.connect(A.out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.start(t, Math.random() * 2); s.stop(t + dur + .05);
  }
  var VOW = { a: [800, 1200], i: [300, 2300], u: [350, 1300], e: [500, 1900], o: [500, 900] };
  function auVoice(A, t, f0, dur, vel, va, vb) {       // sawtooth through two formant filters
    var c = A.c, o = c.createOscillator(), g = c.createGain(), b1 = auFilt(c, "bandpass", va[0], 4), b2 = auFilt(c, "bandpass", va[1], 5);
    o.type = "sawtooth"; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * .9, t + dur);
    b1.frequency.setValueAtTime(va[0], t); b1.frequency.linearRampToValueAtTime(vb[0], t + dur);
    b2.frequency.setValueAtTime(va[1], t); b2.frequency.linearRampToValueAtTime(vb[1], t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + Math.min(.05, dur * .3)); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g); g.connect(A.out); o.start(t); o.stop(t + dur + .05);
  }
  function auBell(A, t, f0, vel) {      // inharmonic partials of a temple bell
    [[1, 1, 7], [2.01, .5, 5], [2.76, .4, 4], [4.07, .2, 3], [5.4, .12, 2.5]].forEach(function (p) {
      auTone(A, t, f0 * p[0], p[2], vel * p[1], "sine", .03);
    });
  }
  function auCar(A, t, L) {
    var c = A.c, s = c.createBufferSource(), f = auFilt(c, "bandpass", 240, 1.2), g = c.createGain();
    var dur = 2.2 + Math.random() * 2, v = .05 + .05 * L.traffic, dir = Math.random() < .5 ? -1 : 1, tail = f;
    s.buffer = A.bnBuf; s.loop = true; s.connect(f); f.connect(g);
    f.frequency.setValueAtTime(240, t); f.frequency.linearRampToValueAtTime(620, t + dur * .5); f.frequency.linearRampToValueAtTime(280, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + dur * .5); g.gain.linearRampToValueAtTime(0, t + dur);
    if (c.createStereoPanner) {
      var p = c.createStereoPanner(); p.pan.setValueAtTime(-.8 * dir, t); p.pan.linearRampToValueAtTime(.8 * dir, t + dur);
      g.connect(p); p.connect(A.out);
    } else g.connect(A.out);
    s.start(t, Math.random() * 2); s.stop(t + dur + .05);
  }
  function auShout(A, t) {       // "irasshaimase"-like call: six short syllables falling in pitch
    var f0 = 210 + Math.random() * 40, V = ["i", "a", "a", "i", "a", "e"];
    for (var k = 0; k < V.length; k++) auVoice(A, t + k * .14, f0 - k * 6, .12, .05, VOW[V[k]], VOW[V[(k + 1) % V.length]]);
  }
  function auLaugh(A, t) {
    var f0 = Math.random() < .5 ? 190 + Math.random() * 40 : 300 + Math.random() * 60, n = 3 + Math.floor(Math.random() * 3);
    for (var k = 0; k < n; k++) auVoice(A, t + k * .15, f0 - k * 8, .1, .045, VOW.a, VOW.e);
  }

  function auThunder(A, t, v) {          // a crack, then a long low roll
    var c = A.c, o = c.createOscillator(), g = c.createGain(), lp = auFilt(c, "lowpass", 140, .7);
    auBurst(A, t, "bandpass", 1200, .8, .12, .045 * v);
    o.type = "sawtooth"; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(32, t + 2.4);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.08 * v, t + .08); g.gain.exponentialRampToValueAtTime(.0001, t + 2.8);
    o.connect(lp); lp.connect(g); g.connect(A.out); o.start(t); o.stop(t + 2.9);
    auBurst(A, t + .05, "lowpass", 260, .6, 2.2, .06 * v);
  }
  function auCrash(A, t) {               // a building giving way: deep thump, grinding roar, falling debris
    var c = A.c, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(28, t + .9);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.1, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + 1.2);
    o.connect(g); g.connect(A.out); o.start(t); o.stop(t + 1.25);
    auBurst(A, t, "lowpass", 420, .7, 1.6, .075);
    for (var i = 0; i < 6; i++) auBurst(A, t + .1 + Math.random() * 1.2, "bandpass", 900 + Math.random() * 1400, 1.2, .08, .03);
  }
  function auBoom(A, t) {            // firework: low thump, noise tail, crackle
    var c = A.c, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(38, t + .5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .7);
    o.connect(g); g.connect(A.out); o.start(t); o.stop(t + .75);
    auBurst(A, t, "lowpass", 500, .7, .5, .1);
    for (var i = 0; i < 8; i++) auBurst(A, t + .25 + Math.random() * .9, "highpass", 4000, 1, .05, .025);
  }
  // ---- scheduler: called every 0.4 s with the current level set ----
  function auEvents(A, L, t) {
    var w = L.w, r = Math.random;
    function hit(rate) { return r() < rate * .4; }
    // village
    if (L.rural > .2) {
      if (hit(.035)) auBell(A, t, 146.8, .05 * L.rural);
      if (hit(.27 * (1 - .4 * L.night) * L.rural)) {                         // koto pluck
        var f = SCALE[Math.floor(r() * SCALE.length)];
        auTone(A, t, f, 3.2, .045, "triangle", .012); auTone(A, t, f * 2.003, 1.4, .012, "sine", .012);
      }
      if (L.night > .5 && (w[0] + w[1]) > .4 && hit(.5)) {                   // frogs
        var n = 3 + Math.floor(r() * 3), ff = 480 + r() * 240;
        for (var i = 0; i < n; i++) auTone(A, t + i * .13, ff, .09, .02 * L.rural, "triangle");
      }
      if (w[1] > .3 && hit(.12)) auTone(A, t, 2300 + r() * 1000, 1.8, .02 * L.rural, "sine");   // furin
    }
    if (L.day > .4 && hit(.5 * L.day * (1 - sstep(L.g, .3, .7)))) {          // birds
      var nb = 2 + Math.floor(r() * 3), fb = 2500 + r() * 1800;
      for (var j = 0; j < nb; j++) {
        var o = A.c.createOscillator(), g = A.c.createGain(), tj = t + j * .16;
        o.frequency.setValueAtTime(fb, tj); o.frequency.exponentialRampToValueAtTime(fb * 1.3, tj + .1);
        g.gain.setValueAtTime(0, tj); g.gain.linearRampToValueAtTime(.015, tj + .02); g.gain.exponentialRampToValueAtTime(.0001, tj + .12);
        o.connect(g); g.connect(A.out); o.start(tj); o.stop(tj + .15);
      }
    }
    // town
    if (hit(.09 * L.busy * L.day)) { auTone(A, t, 2600, .5, .02, "sine"); auTone(A, t + .22, 3400, .5, .02, "sine"); }   // bicycle bell
    if (hit(.3 * L.busy * (1 - .3 * L.night))) {                                                                            // muffled voices
      var vv = r() < .5 ? VOW.a : VOW.o;
      auVoice(A, t, 120 + r() * 100, .35, .02, vv, VOW.e);
    }
    if (L.trainOp > .4 && L.trainQ >= 0) {                                                                                  // level-crossing bell
      A.toggle ^= 1; var fk = A.toggle ? 1480 : 1245;
      auTone(A, t, fk, .45, .035 * L.trainOp, "sine"); auTone(A, t, fk * 2.76, .2, .008 * L.trainOp, "sine");
    }
    // city
    if (hit(.04 + .45 * L.traffic)) auCar(A, t, L);
    if (hit(.04 * L.crowd * L.traffic * (.5 + .5 * L.night))) { auTone(A, t, 420, .25, .012, "square"); auTone(A, t + .02, 500, .25, .01, "square"); }
    if (L.walk) { A.xw = (A.xw || 0) ^ 1; auTone(A, t, A.xw ? 1318 : 988, .32, .024, "sine"); }                             // "pi-po" while the pedestrian signal shows WALK
    if (L.craneAct > .2 && L.day > .4 && hit(L.craneAct)) {                                                                 // construction
      for (var q = 0; q < 3; q++) { auBurst(A, t + q * .45, "bandpass", 1900, 5, .12, .04); auTone(A, t + q * .45, 1250, .4, .015, "triangle"); }
    }
    if (hit(.05 * L.c2 * (.5 + .5 * L.night))) { [784, 988, 1175].forEach(function (nf, k) { auTone(A, t + k * .16, nf, .3, .02, "sine"); }); }   // store chime
    // Kabukicho
    if (L.kabu > .15 && hit(.35 * L.kabu + .35 * L.mega * L.kabu)) { (r() < .5 ? auShout : auLaugh)(A, t); }
    if (hit(.5 * L.kabu)) {                                                                                                 // pachinko clatter
      var nt = 10 + Math.floor(r() * 14), tt = t;
      for (var k = 0; k < nt; k++) { auBurst(A, tt, "bandpass", 2800 + r() * 1800, 3, .035, .03); tt += .025 + r() * .05; }
    }
    if (hit(.07 * L.kabu)) { [1568, 1760, 2093, 2349].forEach(function (pf, k) { auTone(A, t + k * .08, pf, .4, .012, "triangle"); }); }   // jackpot jingle
    if (hit(.015 * L.mega)) {                                                                                               // passing siren
      for (var s = 0; s < 6; s++) auTone(A, t + s * .55, (s % 2 ? 770 : 960) * (1.05 - .02 * s), .5, .02 * (1 - Math.abs(s - 2.5) / 3.5), "sine");
    }
  }

  function auSnapshot(w, nf) {
    return { g: growth, nf: nf, w: w, rain: weather.rain, wind: weather.wind, fast: speed > 2.5, craneAct: auCrane(growth), walk: sig.on && sig.name === "pw",
             trainQ: Math.max(auAnimQ(train, 9000, .55), ltTrainEl ? auAnimQ(ltTrainEl, 16000, .5) : -1), planeQ: auAnimQ(auPlaneEl, 30000, .42) };
  }
  function startAudio() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    audio = auBuild(new AC()); audio.L = null;
  }
  function updateAudio(w, nf) {
    var t = audio.c.currentTime, on = soundOn && !paused;
    audio.out.gain.setTargetAtTime(on ? .9 : 0, t, .3);
    audio.L = auLevels(auSnapshot(w, nf));
    auApply(audio, audio.L, t, .6, false);
  }
  setInterval(function () {
    if (!audio || !audio.L || !soundOn || paused || speed > 3 || audio.c.state !== "running") return;
    auEvents(audio, audio.L, audio.c.currentTime + .05);
  }, 400);
  // offline render for tests: returns RMS / peak in dBFS for a given growth, night factor and season
  function auRender(g, nf, w, secs, wx) {                     // wx (optional): { rain, wind } to include weather
    var OAC = window.OfflineAudioContext, sr = 32000, c = new OAC(1, sr * secs, sr), A = auBuild(c);
    var L = auLevels({ g: g, nf: nf, w: w, rain: wx && wx.rain, wind: wx && wx.wind, fast: false, craneAct: auCrane(g), trainQ: .5, planeQ: .5 });
    auApply(A, L, 0, 0, true);
    for (var t = 0; t < secs; t += .4) auEvents(A, L, t + .05);
    if (wx && wx.rain > .4) { auThunder(A, 1, 1); auCrash(A, 2.5); }
    return c.startRendering().then(function (buf) {
      var d = buf.getChannelData(0), s2 = 0, pk = 0, off = Math.floor(d.length * .25);
      for (var i = off; i < d.length; i++) { s2 += d[i] * d[i]; pk = Math.max(pk, Math.abs(d[i])); }
      return { rmsDb: +(10 * Math.log10(s2 / (d.length - off) + 1e-12)).toFixed(1), peakDb: +(20 * Math.log10(pk + 1e-9)).toFixed(1) };
    });
  }
  var soundBtn = document.getElementById("soundBtn");
  function toggleSound() {
    soundOn = !soundOn;
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    if (soundOn) { if (!audio) startAudio(); if (audio && audio.c.state === "suspended") audio.c.resume(); }
  }
  soundBtn.addEventListener("click", toggleSound);

  // time-of-day scrubber + mouse parallax
  todSlider.addEventListener("pointerdown", function (e) { e.stopPropagation(); scrubbing = true; });
  todSlider.addEventListener("input", function () { dayAcc = todSlider.value / 1000; });
  window.addEventListener("pointerup", function () { scrubbing = false; });
  window.addEventListener("pointermove", function (e) {
    pxT = (e.clientX / innerWidth - .5) * 2; pyT = (e.clientY / innerHeight - .5) * 2;
  });

  /* ================= controls ================= */
  var playBtn = document.getElementById("playBtn");
  var icoPlay = document.getElementById("icoPlay"), icoPause = document.getElementById("icoPause");
  var playLabel = document.getElementById("playLabel");
  function setPaused(p) {
    paused = p;
    playBtn.setAttribute("aria-pressed", String(p));
    icoPlay.style.display = p ? "" : "none";
    icoPause.style.display = p ? "none" : "";
    playLabel.textContent = p ? "Play" : "Pause";
    try { p ? svg.pauseAnimations() : svg.unpauseAnimations(); } catch (e) {}
  }
  playBtn.addEventListener("click", function () { setPaused(!paused); });
  document.getElementById("restartBtn").addEventListener("click", restart);
  function restart() {
    simDays = .6; dayAcc = .32; growthApplied = -1; hudCache = "";
    fx.innerHTML = ""; particleCount = 0;
    acc.petal = acc.maple = acc.flake = acc.fly = acc.fw = 0;
    resetTraffic();
    weather.reset();
    setPaused(false);
  }
  var petalBtn = document.getElementById("petalBtn");
  petalBtn.setAttribute("aria-pressed", String(petalsOn));
  petalBtn.addEventListener("click", function () {
    petalsOn = !petalsOn;
    petalBtn.setAttribute("aria-pressed", String(petalsOn));
  });

  // press & hold anywhere (except the control panel) to fast-forward
  window.addEventListener("pointerdown", function (e) {
    if (e.target.closest && e.target.closest("#panel")) return;
    if (e.button !== undefined && e.button !== 0) return;
    holding = true; body.classList.add("holding");
  });
  function release() { holding = false; body.classList.remove("holding"); }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("blur", function () { release(); holdKey = false; });
  svg.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  window.addEventListener("keydown", function (e) {
    if (e.key === "Shift" || e.key.toLowerCase() === "f") holdKey = true;
    else if (e.key === " ") { e.preventDefault(); setPaused(!paused); }
    else if (e.key.toLowerCase() === "r") restart();
    else if (e.key.toLowerCase() === "p") petalBtn.click();
    else if (e.key.toLowerCase() === "m") toggleSound();
  });
  window.addEventListener("keyup", function (e) {
    if (e.key === "Shift" || e.key.toLowerCase() === "f") holdKey = false;
  });

  /* ================= debug / test hook ================= */
  window.__fuji = {
    jump: function (days, tod) { simDays = days; dayAcc = tod; growthApplied = -1; hudCache = ""; },
    pin: function (days, tod) { weather.reset(); pinned = [days, tod]; growthApplied = -1; hudCache = ""; },
    unpin: function () { pinned = null; pinDays = null; growthOverride = null; },
    // Test hook: era (growth 0..1), season (0 spring, 1 summer, 2 autumn, 3 winter) and time of day (0 midnight, .5 noon) chosen independently.
    // In the real timeline they are coupled (one clock), so e.g. a village never sees winter.
    pinScene: function (g, season, tod) {
      var base = .6 + 2 * season, d = base + 8 * Math.round((g * GROWTH_YEARS * DAYS_PER_YEAR - base) / 8);      // the day nearest to this era that has this season
      weather.reset(); growthOverride = g; pinDays = null; pinned = [Math.max(base, d), tod]; growthApplied = -1; hudCache = "";
    },
    // Test hook: a repeatable traffic snapshot (seeded, `secs` simulated seconds at growth `g`), drawn exactly, for screenshot tests.
    settleTraffic: function (g, secs) {
      growth = g; trs = 424242; resetTraffic(); testMode = true; railShut = false; railSimT = 5.6;
      var cS = makeClock(10, sigStep), cC = makeClock(30, function (d) { vehStep(carList, d); }), cB = makeClock(24, function (d) { vehStep(bikeList, d); }), cP = makeClock(20, pedStep);
      for (var n = 0; n < secs * 60; n++) { cS.run(1 / 60, 1); cC.run(1 / 60, 1); cB.run(1 / 60, 1); cP.run(1 / 60, 1); }
      testMode = false; railShut = false;
      [clkSig, clkCars, clkBikes, clkPeds].forEach(function (c) { c.acc = 0; c.alpha = 1; });     // draw the settled state, not an interpolation of the live one
    },
    pinDays: function (d) { weather.reset(); pinned = null; pinDays = d; simDays = d; growthApplied = -1; hudCache = ""; },
    get speed() { return speed; },
    get growth() { return growth; },
    get paused() { return paused; },
    setPaused: setPaused,
    renderAudio: auRender,
    perf: function () { var el = (performance.now() - GOV.t0) / 1000; return { quality: GOV.cur.name, auto: GOV.auto, frameMs: +GOV.ema.toFixed(1), tiersHz: { palette: +(GOV.runs.pal / el).toFixed(1), hud: +(GOV.runs.hud / el).toFixed(1), audio: +(GOV.runs.aud / el).toFixed(1), display: +(GOV.runs.frames / el).toFixed(1), cars: clkCars.hz, bikes: clkBikes.hz, people: clkPeds.hz, signals: 10 } }; },
    quality: function (l) { if (l === "auto") { GOV.auto = true; GOV.t0 = performance.now(); return; } GOV.auto = false; setQuality(l); GOV.t0 = performance.now(); GOV.runs = { pal: 0, hud: 0, aud: 0, frames: 0 }; },
    weather: weather,
    simTest: simTest,
    frameTest: frameTest,
    traffic: function () { return { signal: sig.name, t: +sig.t.toFixed(1), on: sig.on, vehicles: vehs.filter(function (v) { return v.active; }).length, crossers: crossers.map(function (c) { return c.state; }) }; },
    fireworks: spawnFirework
  };

  /* ================= go ================= */
  buildFuji();
  buildSnow(365);
  setPaused(paused);
  applyFrame();
  requestAnimationFrame(tick);
})();
