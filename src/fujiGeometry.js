/* Mount Fuji outline geometry and the snow cap. */
import { clamp } from "./util.js";

/* ================= Mount Fuji geometry ================= */
var FUJI = { cx: 800, top: 208, base: 620, halfTop: 28, halfBase: 420, exp: 1.5 };
function halfW(y) {
  var t = clamp((y - FUJI.top) / (FUJI.base - FUJI.top), 0, 1);
  return FUJI.halfTop + (FUJI.halfBase - FUJI.halfTop) * Math.pow(t, FUJI.exp);
}
function buildFuji() {
  var L = [], R = [], n = 64, y;
  for (var i = 0; i <= n; i++) {
    y = FUJI.base - (FUJI.base - (FUJI.top + 6)) * i / n;
    L.push([FUJI.cx - halfW(y), y]); R.push([FUJI.cx + halfW(y), y]);
  }
  var d = "M" + L[0][0].toFixed(1) + " " + FUJI.base;
  for (var j = 1; j < L.length; j++) d += " L" + L[j][0].toFixed(1) + " " + L[j][1].toFixed(1);
  d += " Q " + FUJI.cx + " " + (FUJI.top - 3) + " " + R[R.length - 1][0].toFixed(1) + " " + R[R.length - 1][1].toFixed(1);
  for (var k = R.length - 2; k >= 0; k--) d += " L" + R[k][0].toFixed(1) + " " + R[k][1].toFixed(1);
  d += " Z";
  document.getElementById("fujiBody").setAttribute("d", d);
  document.getElementById("fujiLit").setAttribute("d", d);
  var rd = "";
  [-.7, -.4, -.12, .2, .48, .76].forEach(function (f, idx) {
    for (var yy = FUJI.top + 46 + idx * 9, first = true; yy <= FUJI.base; yy += 14) {
      var xx = FUJI.cx + f * halfW(yy) * (1 + .05 * Math.sin(yy * .045 + idx));
      rd += (first ? "M" : " L") + xx.toFixed(1) + " " + yy; first = false;
    }
  });
  document.getElementById("fujiRidges").setAttribute("d", rd);
  var sd = "M" + FUJI.cx + " " + (FUJI.top - 1);
  sd += " Q " + (FUJI.cx + 14) + " " + (FUJI.top - 3) + " " + R[R.length - 1][0].toFixed(1) + " " + R[R.length - 1][1].toFixed(1);
  for (var m = R.length - 2; m >= 0; m--) sd += " L" + R[m][0].toFixed(1) + " " + R[m][1].toFixed(1);
  sd += " L" + FUJI.cx + " " + FUJI.base + " Z";
  document.getElementById("fujiShade").setAttribute("d", sd);
}
var lastSnowY = -1;
function buildSnow(snowY) {
  if (Math.abs(snowY - lastSnowY) < 1.2) return;
  lastSnowY = snowY;
  var lx = FUJI.cx - halfW(snowY), rx = FUJI.cx + halfW(snowY);
  var d = "M" + lx.toFixed(1) + " " + snowY.toFixed(1), y, steps = 26;
  for (var i = 1; i <= steps; i++) {
    y = snowY - (snowY - (FUJI.top + 6)) * i / steps;
    d += " L" + (FUJI.cx - halfW(y)).toFixed(1) + " " + y.toFixed(1);
  }
  d += " Q " + FUJI.cx + " " + (FUJI.top - 3) + " " + (FUJI.cx + halfW(FUJI.top + 6)).toFixed(1) + " " + (FUJI.top + 6);
  for (var j = 1; j <= steps; j++) {
    y = (FUJI.top + 6) + (snowY - (FUJI.top + 6)) * j / steps;
    d += " L" + (FUJI.cx + halfW(y)).toFixed(1) + " " + y.toFixed(1);
  }
  var teeth = 9;
  for (var t = 1; t <= teeth; t++) {
    var x = rx + (lx - rx) * t / teeth;
    var zy = snowY + (t % 2 ? -15 : 5) + ((t * 37) % 7) - 3;
    d += " L" + x.toFixed(1) + " " + zy.toFixed(1);
  }
  d += " Z";
  document.getElementById("fujiSnow").setAttribute("d", d);
  // gullies of snow streaming down from the snow line
  var dd = "";
  for (var k = 0; k < 11; k++) {
    var f = (k + .5) / 11, gx = lx + (rx - lx) * f;
    var len = 12 + ((k * 53) % 6) * 9, gy = snowY + (k % 2 ? -3 : 3);
    var sp = (f - .5) * len * .55;
    dd += "M" + (gx - 5.5).toFixed(1) + " " + (gy - 8).toFixed(1) + " L" + (gx + 5.5).toFixed(1) + " " + (gy - 8).toFixed(1) +
          " L" + (gx + sp + .6).toFixed(1) + " " + (gy + len).toFixed(1) + " Z ";
  }
  document.getElementById("snowDrips").setAttribute("d", dd);
}


export { buildFuji, buildSnow };
