/* The picture: the growing city (buildings, trees, cranes), the street seen from the city, the village-to-megacity scenery (props, farms,
   shrines, machiya, blocks, expressway, LED screens ...) and the vehicle drawings (cars, taxis, buses). Everything is built once, at start-up.

   createScene() runs at the very start of main.js, exactly where this code used to sit: it draws from the two SEEDED random generators
   (rnd, rn), so the order in which things are built decides where every building, tree and prop stands. Do not call it later.
   It returns what the rest of the page needs: the building and crane lists (for growth), updateScenery (era fades), the street projection
   (SX, SY), the lamp and crossing handles for the traffic signals, and the vehicle drawing functions. */
import { clamp, el, rn, rnd, sstep } from "./util.js";
import { trees } from "./skyline.js";

export function createScene() {
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
  for (var vx = 262; vx < 1350; vx += 46) el("rect", { x: vx, y: 605, width: 3, height: 11 }, viaduct, "f-fg");
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

  return { GROWTH_YEARS: GROWTH_YEARS, DAYS_PER_YEAR: DAYS_PER_YEAR, buildings: buildings, cranes: cranes, SX: SX, SY: SY, carsG: carsG, xings: xings, updateScenery: updateScenery, sigLamps: sigLamps, ltTrainEl: ltTrainEl, CAR_TYPES: CAR_TYPES, drawCar: drawCar, PAINTS: PAINTS, BUS_LIV: BUS_LIV, drawBus: drawBus };
}
