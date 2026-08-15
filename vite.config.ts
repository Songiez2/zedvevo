import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Ensure only a single copy of React is ever bundled (prevents HMR useState=null)
    dedupe: ["react", "react-dom"],
  },
  // Force React (and its JSX runtime) to be pre-bundled up front so every
  // optimized dependency chunk (Radix, etc.) shares the exact same React
  // instance. Prevents the "Cannot read properties of null (reading 'useRef')"
  // dispatcher error caused by a stale/mismatched dep pre-bundle.
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
});
