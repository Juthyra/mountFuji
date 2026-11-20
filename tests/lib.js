// Shared helpers for the test scripts. Dev-only: the app itself (index.html) has no dependencies.
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const ROOT = path.resolve(__dirname, "..");
// FUJI_PAGE=/path/to/other.html runs the tests against another copy (used to prove the tests can fail).
const PAGE_URL = "file://" + (process.env.FUJI_PAGE ? path.resolve(process.env.FUJI_PAGE) : path.join(ROOT, "index.html"));

function findChrome() {
  const cands = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  ].filter(Boolean);
  for (const c of cands) if (fs.existsSync(c)) return c;
  throw new Error("Chrome not found. Set CHROME_PATH to a Chrome/Chromium executable.");
}

// Opens the page in headless Chrome. Returns { browser, page, errors } where errors collects every JS error.
async function openPage(opts = {}) {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: "new",
    protocolTimeout: 120000,
    args: ["--no-sandbox", "--disable-gpu", "--mute-audio", "--hide-scrollbars",
           "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"]
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.setViewport({ width: opts.width || 1600, height: opts.height || 900, deviceScaleFactor: 1 });
  await page.goto(PAGE_URL, { waitUntil: "load" });
  await page.waitForFunction("window.__fuji && typeof window.__fuji.simTest === 'function'", { timeout: 15000 });
  return { browser, page, errors };
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pad = (v, n) => String(v).padEnd(n);
const padL = (v, n) => String(v).padStart(n);

module.exports = { ROOT, PAGE_URL, openPage, median, pad, padL };
