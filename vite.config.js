// Build: src/ -> dist/index.html as ONE self-contained file (CSS, JS and the embedded fonts inlined), so "just open it" still works.
// `npm run build` then copies it to ./index.html, which is committed on purpose (open it by double-click, GitHub Pages, tests).
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: "src",
  base: "./",
  plugins: [viteSingleFile()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2019",
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    minify: false              // readable output: a diff of index.html still means something
  },
  server: { open: false }
});
