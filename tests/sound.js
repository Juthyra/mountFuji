// Sound smoke test. Run: npm run test:sound
// Real clicks start audio (browsers insist), so this clicks the Sound button, then checks that audio started and runs at its own clock,
// that the M key switches it off and on, and that the firework, thunder and collapse sounds do not throw.
const { openPage } = require("./lib");
(async () => {
  const fails = [];
  const check = (ok, msg) => { if (!ok) fails.push(msg); };
  const { browser, page, errors } = await openPage({ width: 1100, height: 620 });
  const pressed = () => page.evaluate(() => document.getElementById("soundBtn").getAttribute("aria-pressed"));
  await page.evaluate(() => window.__fuji.jump(27, 0.02));
  check((await pressed()) === "false", "sound should start off");
  await page.click("#soundBtn");
  await new Promise((r) => setTimeout(r, 4000));
  check((await pressed()) === "true", "clicking Sound did not switch it on");
  const hz = await page.evaluate(() => window.__fuji.perf().tiersHz.audio);
  check(hz > 3, `audio levels should update at about 10 Hz once sound is on, measured ${hz}`);
  await page.evaluate(() => { window.__fuji.weather.force("typhoon"); window.__fuji.fireworks(); });   // boom, and later thunder and collapse sounds
  await new Promise((r) => setTimeout(r, 3000));
  await page.keyboard.press("m");
  check((await pressed()) === "false", "the M key did not switch sound off");
  await page.keyboard.press("m");
  check((await pressed()) === "true", "the M key did not switch sound back on");
  check(errors.length === 0, `${errors.length} JS/console error(s): ${errors[0]}`);
  await browser.close();
  console.log(`\nSound: starts on click, audio clock ${hz} Hz, M toggles, effects play without errors`);
  if (fails.length) { console.log("\nFAILED:\n  " + fails.join("\n  ")); process.exit(1); }
  console.log("\nAll sound checks passed.");
})().catch((e) => { console.error(e); process.exit(2); });
