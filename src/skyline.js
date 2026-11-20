/* Stars, the tree line and the water. */
import { el, rnd } from "./util.js";

/* ================= stars, treeline, water ================= */
var stars = document.getElementById("stars");
for (var si = 0; si < 110; si++) {
  var st = el("circle", { cx: (rnd() * 1600).toFixed(1), cy: (rnd() * 500).toFixed(1), r: (0.5 + rnd() * 1.3).toFixed(2) }, stars, "star");
  st.style.animationDuration = (2 + rnd() * 3.5).toFixed(2) + "s";
  st.style.animationDelay = (-rnd() * 5).toFixed(2) + "s";
}
var treeline = document.getElementById("treeline");
el("rect", { x: 0, y: 612, width: 1600, height: 9 }, treeline, "f-tree");
var trees = [];
for (var tx = 6; tx < 1600; tx += 9 + rnd() * 12) {
  if (tx > 640 && tx < 960 && rnd() < .75) continue;
  var th = 7 + rnd() * 13;
  var tp = el("path", { d: "M" + tx.toFixed(1) + " 614 l 5 " + (-th).toFixed(1) + " l 5 " + th.toFixed(1) + " Z" }, treeline, "f-tree");
  trees.push({ x: tx, el: tp, fade: 1 });
}
for (var di = 0; di < 11; di++) {
  var dx = 90 + rnd() * 1420;
  var g = el("g", {}, treeline);
  el("rect", { x: dx - 1.2, y: 600, width: 2.4, height: 14 }, g, "f-tree");
  el("circle", { cx: dx, cy: 598, r: 6.5 + rnd() * 3.5 }, g, "f-decid");
  trees.push({ x: dx, el: g, fade: 1 });
}
// leaves on the sakura branch (summer / autumn)
var branchLeaf = document.getElementById("branchLeaf");
[[120,96,1.2],[184,116,1],[244,102,1.3],[276,90,.9],[262,140,1.1],[312,168,1.25],
 [352,192,1],[356,148,.9],[408,136,1.15],[424,154,.95],[66,82,1],[210,132,.8]].forEach(function (p) {
  el("use", { href: "#leafCluster", transform: "translate(" + p[0] + "," + p[1] + ") scale(" + p[2] + ") rotate(" + Math.floor(rnd() * 90) + ")" }, branchLeaf);
});

// sun rays (god rays), rotated slowly by CSS
var rays = document.getElementById("sunRays");
for (var ri = 0; ri < 14; ri++) {
  var ra = ri * Math.PI * 2 / 14 + rnd() * .2, rw = .03 + rnd() * .05, RR = 1300;
  el("polygon", { points: "0,0 " + (Math.cos(ra - rw) * RR).toFixed(0) + "," + (Math.sin(ra - rw) * RR).toFixed(0) + " " +
    (Math.cos(ra + rw) * RR).toFixed(0) + "," + (Math.sin(ra + rw) * RR).toFixed(0), fill: "url(#rayGrad)" }, rays);
}


export { trees };
