import { clamp } from "./util.js";

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
export var GOV = { level: 0, auto: true, ema: 16.7, slowFor: 0, fastFor: 0, cur: QUALITY[0], runs: { pal: 0, hud: 0, aud: 0, frames: 0 }, t0: performance.now(), palAcc: 0, hudAcc: 0, audAcc: 0 };
export function setQuality(l) {
  GOV.level = clamp(l, 0, QUALITY.length - 1); GOV.cur = QUALITY[GOV.level];
  if (onQuality) onQuality(GOV.cur);
}
export function govFrame(dt) {                                  // dt in seconds (unclamped real interval)
  GOV.runs.frames++;
  GOV.ema += (dt * 1000 - GOV.ema) * .08;
  if (!GOV.auto || document.hidden || performance.now() - GOV.t0 < 4000) return;           // warm-up: start-up frames are always slow
  if (GOV.ema > 38) { GOV.slowFor += dt; GOV.fastFor = 0; } else if (GOV.ema < 22) { GOV.fastFor += dt; GOV.slowFor = 0; } else { GOV.slowFor = GOV.fastFor = 0; }
  if (GOV.slowFor > 2 && GOV.level < QUALITY.length - 1) { setQuality(GOV.level + 1); GOV.slowFor = 0; }     // sustained slow frames: lighten up
  else if (GOV.fastFor > 6 && GOV.level > 0) { setQuality(GOV.level - 1); GOV.fastFor = 0; }                // sustained headroom: restore detail
}
export function tierDue(key, hz, dt, force) {                   // true when this tier's clock fires on this frame
  GOV[key + "Acc"] += dt;
  if (force || GOV[key + "Acc"] >= 1 / hz) { GOV[key + "Acc"] = force ? 0 : GOV[key + "Acc"] % (1 / hz); GOV.runs[key]++; return true; }
  return false;
}

var onQuality = null;                                   // main.js registers what happens when the level changes (the traffic clock rates)
export function initGovernor(fn) { onQuality = fn; fn(GOV.cur); }
