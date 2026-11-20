/* Particles and animation-speed sync: falling petals / maple leaves / snow, fireflies, summer fireworks, shooting stars.
   They live in the #fx layer (plain DOM + CSS animation, not SVG nodes). The quality governor sets how many may exist at once. */
import { S } from "./state.js";
import { fx, el, reduced } from "./util.js";
import { sfx } from "./audio.js";
import { GOV } from "./governor.js";

/* ================= particles ================= */
export var acc = { petal: 0, maple: 0, flake: 0, fly: 0, fw: 0 };
function applyRateTo(e) {
  if (S.rateApplied >= 0 && Math.abs(S.rateApplied - 1) > .01 && e.getAnimations) {
    e.getAnimations({ subtree: true }).forEach(function (a) { a.playbackRate = S.rateApplied; });
  }
}
export function spawnFaller(kind) {
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
export function spawnFirefly() {
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
var fwG = null, FWC = ["#ff5a7a", "#ffd24a", "#6ad1ff", "#9dff7a", "#ff9a3a", "#d58aff"];
export function spawnFirework() {
  fwG = fwG || document.getElementById("fireworks");
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
export function syncRates() {
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

export function resetParticles() { fx.innerHTML = ""; S.particleCount = 0; acc.petal = acc.maple = acc.flake = acc.fly = acc.fw = 0; }
