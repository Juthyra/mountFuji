// npm run build: vite build -> copy dist/index.html to ./index.html.   npm run build -- --check: fail if ./index.html is not what the sources build to.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
execSync("npx vite build", { cwd: root, stdio: "inherit" });
const built = fs.readFileSync(path.join(root, "dist", "index.html"), "utf8");
const target = path.join(root, "index.html");
if (process.argv.includes("--check")) {
  const cur = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (cur !== built) { console.error("index.html is out of date: run `npm run build` and commit the result."); process.exit(1); }
  console.log("index.html matches the sources.");
} else {
  fs.writeFileSync(target, built);
  console.log("Wrote index.html (" + built.length + " bytes) from src/.");
}
