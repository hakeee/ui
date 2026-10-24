import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // rollupTypes: true would consolidate these into one dist/index.d.ts,
    // but API Extractor's bundled TS version (5.9.x) silently produces an
    // empty declaration file against this project's TS 6.0 - so
    // declarations stay per-file, mirrored under dist/src/... (see
    // package.json's "types"/exports paths, which point there directly).
    dts({
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**"],
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: resolve(root, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
      cssFileName: "style",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
    // index.ts's own `import "./styles.css"` is what Tailwind's plugin
    // scans (and everything it transitively pulls in, i.e. every
    // component) - Vite extracts that into one dist/style.css here
    // rather than inlining it into the JS, since cssCodeSplit is off.
    cssCodeSplit: false,
  },
});
