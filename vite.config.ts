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
      // `auth` and `access` are ready-made platform screens; they're separate
      // entries so apps using only the components never load the platform.
      entry: {
        index: resolve(root, "src/index.ts"),
        auth: resolve(root, "src/auth/index.ts"),
        access: resolve(root, "src/access/index.ts"),
      },
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
      cssFileName: "style",
    },
    rollupOptions: {
      // The app provides these, one copy each: React contexts (react-query,
      // module-host's host, vault-service's client) only work if the screens
      // and the app share the same module instance.
      external: (id) =>
        ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"].includes(id) ||
        id.startsWith("@hakeee/module-host") ||
        id.startsWith("@hakeee/vault-service-react"),
    },
    // index.ts's own `import "./styles.css"` is what Tailwind's plugin
    // scans (and everything it transitively pulls in, i.e. every
    // component) - Vite extracts that into one dist/style.css here
    // rather than inlining it into the JS, since cssCodeSplit is off.
    cssCodeSplit: false,
  },
});
