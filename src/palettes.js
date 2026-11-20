/* Time-of-day and season palettes and the functions that blend them. */
import { clamp, lerp, smooth, hx, mix } from "./util.js";

/* ================= palettes ================= */
// time-of-day keyframes at tod = 0, .25, .5, .75, 1  (midnight, sunrise, noon, sunset, midnight)
var T = {};
function tk(name, a, b, c, d) { T[name] = [hx(a), hx(b), hx(c), hx(d), hx(a)]; }
tk("skyTop", "080e2c", "47549b", "6db9e8", "393d78");
tk("skyMid", "152047", "d78ba1", "a9d9f2", "c96a70");
tk("skyLow", "2a3a66", "ffd9ae", "eef8fc", "ff9e5e");
tk("fujiA",  "3a4a78", "8a7fae", "7d9cc8", "6b5f96");
tk("fujiB",  "222b4e", "5a5190", "48699e", "413868");
tk("snow",   "c9d6f2", "ffe9ec", "ffffff", "ffd9c4");
tk("far",    "22305a", "7d7aa8", "9db8d6", "5d5486");
tk("lakeT",  "223058", "e9ab8d", "c3e2f2", "e08a5e");
tk("lakeB",  "0b112c", "585089", "4a7cab", "3a3266");
tk("cloud",  "3d4d78", "ffd4cc", "ffffff", "ffb08a");
tk("sun",    "f4f6fb", "ffb36b", "fff4c1", "ff8c4a");
tk("glow",   "c8dcff", "ff965a", "fff0b4", "ff783c");
tk("ink",    "dfe8ff", "fff0e6", "173a54", "ffe6d0");
tk("glade",  "cfe0ff", "ffcf9e", "fff7cf", "ffb877");
tk("torii",  "4a2029", "a03a38", "c23b32", "8f2f34");
tk("branch", "141020", "332430", "3a2a28", "2b1e28");
tk("blossom","cfa8c0", "ffc9d8", "ffd9e6", "f2b3c4");
tk("core",   "a87a96", "f2839f", "ff9ebb", "e07a94");
T.cloudOp = [.55, .85, .92, .8, .55];
T.glowA   = [.7, .85, .95, .9, .7];
T.mistOp  = [.14, .3, .2, .26, .14];
T.gladeOp = [.38, .6, .5, .65, .38];
function timeVal(name, tod) {
  var p = tod * 4, i = Math.min(3, Math.floor(p)), f = smooth(p - i);
  var k = T[name];
  return Array.isArray(k[0]) ? mix(k[i], k[i + 1], f) : lerp(k[i], k[i + 1], f);
}
// title ink switches contrast sharply so it never washes out mid-transition
function inkVal(tod) {
  var p = tod * 4, i = Math.min(3, Math.floor(p)), f = p - i;
  if (i === 1) f = smooth(clamp(f / .35, 0, 1));          // dawn→day: darken early
  else if (i === 2) f = smooth(clamp((f - .55) / .45, 0, 1)); // day→dusk: lighten late
  else f = smooth(f);
  return mix(T.ink[i], T.ink[i + 1], f);
}

// season palettes: spring, summer, autumn, winter
var S = {
  tree:    [hx("3f7a52"), hx("2f6b45"), hx("77713a"), hx("3a5570")],
  decid:   [hx("f2b8cc"), hx("4a8a4f"), hx("e07a30"), hx("8a97a8")],
  decidOp: [1, 1, 1, .12],
  shore:   [hx("24402f"), hx("1e3a28"), hx("3a2c20"), hx("dfe8f2")],
  fg:      [hx("20323d"), hx("1c3038"), hx("2b241c"), hx("2a3644")],
  ground:  [hx("4a5a48"), hx("3f5540"), hx("55483a"), hx("cfd9e6")],
  field:   [hx("7fae62"), hx("5f9a4a"), hx("c0a050"), hx("d8e2ee")],
  leaf:    [hx("9fc98f"), hx("6ba86f"), hx("e08a30"), hx("9fb0c0")],
  snowY:   [365, 318, 382, 478],
  fujiTint:  [hx("8aa8c8"), hx("6f9cc0"), hx("9c8aa8"), hx("b8c8e0")],
  fujiTintA: [.06, .08, .12, .26],
  farTint:   [hx("a8b8d0"), hx("8fb0a0"), hx("b09a8a"), hx("c0d0e4")],
  farTintA:  [.05, .1, .15, .3],
  lakeTint:  [hx("7fb8a0"), hx("4f9f8f"), hx("c08a5a"), hx("b8cfe0")],
  lakeTintA: [.1, .16, .14, .3],
  blossomOp: [1, 0, 0, 0],
  leafOp:    [0, 1, 1, 0],
  branchSnow:[0, 0, 0, .9]
};
function seasonWeights(s) {
  var w = [0, 0, 0, 0], sum = 0;
  for (var i = 0; i < 4; i++) {
    var d = Math.abs(s - i); d = Math.min(d, 4 - d);
    w[i] = Math.max(0, 1 - d / .55); sum += w[i];
  }
  if (sum === 0) { w[Math.round(s) % 4] = 1; sum = 1; }
  return [w[0] / sum, w[1] / sum, w[2] / sum, w[3] / sum];
}
function seasonVal(name, w) {
  var k = S[name];
  if (Array.isArray(k[0])) {
    var c = [0, 0, 0];
    for (var i = 0; i < 4; i++) { c[0] += k[i][0] * w[i]; c[1] += k[i][1] * w[i]; c[2] += k[i][2] * w[i]; }
    return c;
  }
  var v = 0; for (var j = 0; j < 4; j++) v += k[j] * w[j];
  return v;
}


export { T, timeVal, inkVal, seasonWeights, seasonVal };
