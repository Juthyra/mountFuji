import { S } from "./state.js";
import { clamp, sstep } from "./util.js";

/* ================= ambient sound (WebAudio, no files) =================
   The soundscape follows the timelapse. Every layer is driven by `growth` (era), night and season:
     village   frogs, crickets, cicadas, temple bell, birds, wind chime, koto
     town      bicycle bells, muffled voices, rail-crossing bell and train
     city      traffic, car passes, horns, crosswalk chime, cranes, crowd (3 phases)
     megacity  Kabukicho at night: dense crowd, pachinko, neon hum, store chime, shouts, sirens, planes */
var audio = null, soundOn = false;
var cranes, sig, weather, trainEl = null, ltTrainEl = null;                // handed over by main.js (initAudio); the two train elements are looked up when first needed
export function initAudio(ctx) { cranes = ctx.cranes; sig = ctx.sig; weather = ctx.weather; }
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
  trainEl = trainEl || document.getElementById("train"); ltTrainEl = ltTrainEl || document.getElementById("ltTrain");
  return { g: S.growth, nf: nf, w: w, rain: weather.rain, wind: weather.wind, fast: S.speed > 2.5, craneAct: auCrane(S.growth), walk: sig.on && sig.name === "pw",
           trainQ: Math.max(auAnimQ(trainEl, 9000, .55), ltTrainEl ? auAnimQ(ltTrainEl, 16000, .5) : -1), planeQ: auAnimQ(auPlaneEl, 30000, .42) };
}
function startAudio() {
  var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  audio = auBuild(new AC()); audio.L = null;
}
export function updateAudio(w, nf) {
  var t = audio.c.currentTime, on = soundOn && !S.paused;
  audio.out.gain.setTargetAtTime(on ? .9 : 0, t, .3);
  audio.L = auLevels(auSnapshot(w, nf));
  auApply(audio, audio.L, t, .6, false);
}
setInterval(function () {
  if (!audio || !audio.L || !soundOn || S.paused || S.speed > 3 || audio.c.state !== "running") return;
  auEvents(audio, audio.L, audio.c.currentTime + .05);
}, 400);
// offline render for tests: returns RMS / peak in dBFS for a given growth, night factor and season
export function auRender(g, nf, w, secs, wx) {                     // wx (optional): { rain, wind } to include weather
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
export function toggleSound() {
  soundOn = !soundOn;
  soundBtn.setAttribute("aria-pressed", String(soundOn));
  if (soundOn) { if (!audio) startAudio(); if (audio && audio.c.state === "suspended") audio.c.resume(); }
}
soundBtn.addEventListener("click", toggleSound);

/* ---- what the rest of the page needs ---- */
export function audioStarted() { return !!audio; }
// Play a one-shot effect if sound is on and running: kind = "boom" (firework) | "thunder" | "crash"; delayMs optional; v = loudness for thunder.
export function sfx(kind, delayMs, v) {
  function go() {
    if (!audio || !soundOn || S.paused || audio.c.state !== "running") return;
    var t = audio.c.currentTime + .02;
    if (kind === "boom") auBoom(audio, t); else if (kind === "thunder") auThunder(audio, t, v); else if (kind === "crash") auCrash(audio, t);
  }
  if (!audio || !soundOn || audio.c.state !== "running") return;
  if (delayMs) setTimeout(go, delayMs); else go();
}

