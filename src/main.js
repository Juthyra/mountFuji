/* Mount Fuji, a city grows: the wiring. Everything real lives in the modules; this file builds them in the order that matters and starts the loop.
   Order matters: createScene() and createTraffic() draw from the two seeded random generators, so they must run first and in this order
   (the city layout is the same on every visit because of it). */
import { buildFuji, buildSnow } from "./fujiGeometry.js";
import { createWeather } from "./weather.js";
import { S } from "./state.js";
import { createTraffic } from "./traffic.js";
import { createScene, paintBuilding } from "./scene.js";
import { initAudio, sfx } from "./audio.js";
import { fx, svg } from "./util.js";
import { GOV, initGovernor } from "./governor.js";
import { createFrame } from "./frame.js";
import { createControls } from "./controls.js";
import { installHooks } from "./hooks.js";

var scene = createScene();

var traffic = createTraffic({
  SX: scene.SX, SY: scene.SY, carsG: scene.carsG, sigLamps: scene.sigLamps, xings: scene.xings, ltTrainEl: scene.ltTrainEl,
  drawCar: scene.drawCar, drawBus: scene.drawBus, CAR_TYPES: scene.CAR_TYPES, PAINTS: scene.PAINTS, BUS_LIV: scene.BUS_LIV,
  slow: function () { return weather.slow; }
});

/* ================= weather (see weather.js) ================= */
var wxRow = document.getElementById("wxRow"), wxKj = document.getElementById("wxKj"), wxName = document.getElementById("wxName");
var weather = createWeather({
  canvas: document.getElementById("wxRain"), shade: document.getElementById("wxShade"), wet: document.getElementById("wxWet"), flash: document.getElementById("wxFlash"), fx: fx,
  buildings: scene.buildings, growth: function () { return S.growth; }, paint: paintBuilding, quality: function () { return GOV.level; },
  onStatus: function (k) { wxRow.hidden = k === "clear"; if (k !== "clear") { wxKj.textContent = k === "typhoon" ? "台風" : "雨"; wxName.textContent = k === "typhoon" ? "Typhoon" : "Rain"; } },
  onRaining: function (on) { svg.classList.toggle("raining", on); },
  onThunder: function (delay, v) { sfx("thunder", delay * 1000, v); },
  onCollapse: function () { sfx("crash"); }
});

initAudio({ cranes: scene.cranes, sig: traffic.sig, weather: weather });

initGovernor(function (q) { traffic.setRates(q.car, q.bike, q.ped); });

var frame = createFrame({
  buildings: scene.buildings, cranes: scene.cranes, updateScenery: scene.updateScenery, GROWTH_YEARS: scene.GROWTH_YEARS, DAYS_PER_YEAR: scene.DAYS_PER_YEAR,
  traffic: traffic, weather: weather
});
var controls = createControls({ traffic: traffic, weather: weather });
installHooks({ traffic: traffic, weather: weather, setPaused: controls.setPaused, GROWTH_YEARS: scene.GROWTH_YEARS, DAYS_PER_YEAR: scene.DAYS_PER_YEAR });

/* ================= go ================= */
buildFuji();
buildSnow(365);
controls.setPaused(S.paused);
frame.applyFrame();
requestAnimationFrame(frame.tick);
