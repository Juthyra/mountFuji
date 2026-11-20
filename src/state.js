/* Shared mutable state: the timelapse clocks and the user's controls.
   Everything that more than one part of the page reads or changes lives here as a property of S, so that parts can move into their own
   modules without handing each other half a dozen variables. (Plain ES imports are read-only, a shared object is not.) */
import { reduced } from "./util.js";

export var S = {
  simDays: .6,
  dayAcc: .32,
  speed: 1,
  targetSpeed: 1,
  paused: reduced,
  holding: false,
  holdKey: false,
  petalsOn: !reduced,
  growth: 0,
  growthApplied: -1,
  growthOverride: null,
  hudCache: "",
  scrubbing: false,
  pxT: 0,
  pyT: 0,
  px: 0,
  py: 0,
  pinned: null,
  pinDays: null,
  particleCount: 0,
  rateApplied: -1,
};
