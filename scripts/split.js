// Split a contiguous run of top-level sections out of src/main.js into ES modules (a mechanical, behaviour-preserving move).
// usage: node scripts/split.js <spec.json>
//   spec: { file:"src/main.js", modules:[{ name:"util", from:<line>, to:<line>, header:"...comment" }, ...] }  (1-based inclusive lines, contiguous, in file order)
// It: lists each module's top-level declarations, exports those used by later code, imports what each module needs from earlier modules,
// refuses if any exported name is reassigned from outside (an ES import is read-only), and rewrites main.js to import them.
const fs = require("fs");
const path = require("path");
const espree = require(process.env.ESPREE || "espree");

const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const lines = fs.readFileSync(spec.file, "utf8").split("\n");
const parse = (src) => espree.parse(src, { ecmaVersion: 2020, range: true, tokens: true, sourceType: "script" });

function declared(src) {
  const ast = parse(src), names = [];
  for (const n of ast.body) {
    if (n.type === "FunctionDeclaration") names.push(n.id.name);
    else if (n.type === "VariableDeclaration") for (const d of n.declarations) if (d.id.type === "Identifier") names.push(d.id.name); else throw new Error("destructuring not supported");
  }
  return names;
}
function usedIdents(src) {          // identifier tokens that are not property names
  const toks = parse(src).tokens, out = new Set();
  toks.forEach((t, i) => { if (t.type === "Identifier" && !(i > 0 && toks[i - 1].value === "." && toks[i - 1].type === "Punctuator")) { const nx = toks[i + 1]; if (!(nx && nx.value === ":" && toks[i - 1] && /[{,]/.test(toks[i - 1].value))) out.add(t.value); } });
  return out;
}

const first = spec.modules[0].from, last = spec.modules[spec.modules.length - 1].to;
const before = lines.slice(0, first - 1), after = lines.slice(last);
const afterSrc = after.join("\n");
const afterIds = usedIdents("(function(){" + afterSrc.replace(/^\}\)\(\);\s*$/m, "") + "\n})") ;  // rest of the IIFE body (tokens only)
const mods = spec.modules.map((m) => { const body = lines.slice(m.from - 1, m.to).join("\n"); return Object.assign({}, m, { body, decl: declared(body) }); });
const owner = {}; mods.forEach((m) => m.decl.forEach((n) => { if (owner[n]) throw new Error("duplicate " + n); owner[n] = m.name; }));

const out = [], report = [];
mods.forEach((m, mi) => {
  const ids = usedIdents(m.body);
  const earlier = {};
  mods.slice(0, mi).forEach((e) => e.decl.forEach((n) => { if (ids.has(n) && !m.decl.includes(n)) (earlier[e.name] = earlier[e.name] || []).push(n); }));
  const exportsUsedLater = m.decl.filter((n) => afterIds.has(n) || mods.slice(mi + 1).some((o) => usedIdents(o.body).has(n) && !o.decl.includes(n)));
  // reassignment from outside this module is illegal for an import
  const bad = [], ignore = new Set(spec.ignoreReassign || []);       // ignoreReassign: names whose "assignments" were checked by hand to be shadowing local variables
  const others = [...before, ...after, ...mods.filter((o) => o !== m).map((o) => o.body)].join("\n");
  exportsUsedLater.forEach((n) => { const re = new RegExp("(^|[^.\\w$])" + n.replace(/\$/g, "\\$") + "\\s*(\\+\\+|--|[-+*/%|&^]?=(?!=))|(\\+\\+|--)\\s*" + n + "\\b", "m"); if (!ignore.has(n) && re.test(others.replace(/\bvar\s+[^;]*;/g, ""))) bad.push(n); });
  const imp = Object.keys(earlier).map((k) => `import { ${earlier[k].join(", ")} } from "./${k}.js";`).join("\n");
  const text = [m.header ? `/* ${m.header} */` : "", imp, "", dedent(m.body), "", exportsUsedLater.length ? `export { ${exportsUsedLater.join(", ")} };` : "", ""].filter((x, i) => x !== "" || i > 1).join("\n");
  out.push({ name: m.name, text, exports: exportsUsedLater, bad });
  report.push(`${m.name}: ${m.decl.length} declarations, exports ${exportsUsedLater.length}${bad.length ? "  REASSIGNED FROM OUTSIDE: " + bad.join(",") : ""}`);
});
function dedent(s) { return s.split("\n").map((l) => (l.startsWith("  ") ? l.slice(2) : l)).join("\n"); }
console.log(report.join("\n"));
if (out.some((o) => o.bad.length)) { console.error("refusing: some exports are assigned from outside (they would become read-only)"); process.exit(1); }
if (process.argv.includes("--dry")) process.exit(0);
const dir = path.dirname(spec.file);
out.forEach((o) => fs.writeFileSync(path.join(dir, o.name + ".js"), o.text));
const importLines = out.filter((o) => o.exports.length).map((o) => `  import { ${o.exports.join(", ")} } from "./${o.name}.js";`);
// the IIFE wrapper stays for now: imports must be top-level, so move them above it
const mainText = [...before, ...after].join("\n");
fs.writeFileSync(spec.file, out.filter((o) => o.exports.length).map((o) => `import { ${o.exports.join(", ")} } from "./${o.name}.js";`).join("\n") + "\n" + mainText);
console.log("wrote " + out.map((o) => o.name + ".js").join(", "));
