/* Controls: the buttons, keyboard, press-and-hold fast-forward, the time-of-day scrubber and the mouse parallax.
   createControls(ctx) needs the traffic and weather objects so Restart can reset them. */
import { S } from "./state.js";
import { body, svg } from "./util.js";
import { toggleSound } from "./audio.js";
import { resetParticles } from "./particles.js";

export function createControls(ctx) {
  var traffic = ctx.traffic, weather = ctx.weather;
  var todSlider = document.getElementById("todSlider");
  // time-of-day scrubber + mouse parallax
  todSlider.addEventListener("pointerdown", function (e) { e.stopPropagation(); S.scrubbing = true; });
  todSlider.addEventListener("input", function () { S.dayAcc = todSlider.value / 1000; });
  window.addEventListener("pointerup", function () { S.scrubbing = false; });
  window.addEventListener("pointermove", function (e) {
    S.pxT = (e.clientX / innerWidth - .5) * 2; S.pyT = (e.clientY / innerHeight - .5) * 2;
  });

  /* ================= controls ================= */
  var playBtn = document.getElementById("playBtn");
  var icoPlay = document.getElementById("icoPlay"), icoPause = document.getElementById("icoPause");
  var playLabel = document.getElementById("playLabel");
  function setPaused(p) {
    S.paused = p;
    playBtn.setAttribute("aria-pressed", String(p));
    icoPlay.style.display = p ? "" : "none";
    icoPause.style.display = p ? "none" : "";
    playLabel.textContent = p ? "Play" : "Pause";
    try { p ? svg.pauseAnimations() : svg.unpauseAnimations(); } catch (e) {}
  }
  playBtn.addEventListener("click", function () { setPaused(!S.paused); });
  document.getElementById("restartBtn").addEventListener("click", restart);
  function restart() {
    S.simDays = .6; S.dayAcc = .32; S.growthApplied = -1; S.hudCache = "";
    resetParticles();
    traffic.resetTraffic();
    weather.reset();
    setPaused(false);
  }
  var petalBtn = document.getElementById("petalBtn");
  petalBtn.setAttribute("aria-pressed", String(S.petalsOn));
  petalBtn.addEventListener("click", function () {
    S.petalsOn = !S.petalsOn;
    petalBtn.setAttribute("aria-pressed", String(S.petalsOn));
  });

  // press & hold anywhere (except the control panel) to fast-forward
  window.addEventListener("pointerdown", function (e) {
    if (e.target.closest && e.target.closest("#panel")) return;
    if (e.button !== undefined && e.button !== 0) return;
    S.holding = true; body.classList.add("holding");
  });
  function release() { S.holding = false; body.classList.remove("holding"); }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("blur", function () { release(); S.holdKey = false; });
  svg.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  window.addEventListener("keydown", function (e) {
    if (e.key === "Shift" || e.key.toLowerCase() === "f") S.holdKey = true;
    else if (e.key === " ") { e.preventDefault(); setPaused(!S.paused); }
    else if (e.key.toLowerCase() === "r") restart();
    else if (e.key.toLowerCase() === "p") petalBtn.click();
    else if (e.key.toLowerCase() === "m") toggleSound();
  });
  window.addEventListener("keyup", function (e) {
    if (e.key === "Shift" || e.key.toLowerCase() === "f") S.holdKey = false;
  });

  return { setPaused: setPaused, restart: restart };
}
