/* Shared helpers: maths, colour, SVG element factory, the two seeded random generators and the main DOM handles. */

/* ================= utilities ================= */
var svgNS = "http://www.w3.org/2000/svg";
var root = document.documentElement, body = document.body;
var fx = document.getElementById("fx");
var svg = document.querySelector("svg.scene");
var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function sstep(v, a, b) { return smooth((v - a) / (b - a)); }
function hx(h) { return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function css(c) { return "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")"; }
function rgba(c, a) { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + a.toFixed(3) + ")"; }
function el(tag, attrs, parent, cls) {
  var e = document.createElementNS(svgNS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (cls) e.setAttribute("class", cls);
  if (parent) parent.appendChild(e);
  return e;
}
// deterministic rng so the city is the same every visit
var seed = 20261119;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }

var s2 = 90210;     // second seeded rng for era scenery (keeps the original city layout untouched)
function rn() { s2 = (s2 + 0x6D2B79F5) | 0; var t = Math.imul(s2 ^ s2 >>> 15, 1 | s2); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }


export { root, body, fx, svg, reduced, clamp, lerp, smooth, sstep, hx, mix, css, rgba, el, rnd, rn };
