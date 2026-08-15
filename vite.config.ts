import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

// Extract a clean Supabase anon key. The managed env value can arrive with a
// trailing shell fragment (e.g. `...signature' >> .env.local`), which breaks
// the JWT. We prefer the clean `JWT` var, then fall back to sanitizing the
// VITE_ value by matching the strict `header.payload.signature` JWT shape.
function cleanJwt(...candidates: (string | undefined)[]): string {
  const jwtShape = /[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;
  for (const c of candidates) {
    if (!c) continue;
    const match = c.match(jwtShape);
    if (match) return match[0];
  }
  return "";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseAnonKey = cleanJwt(env.JWT, env.VITE_SUPABASE_ANON_KEY);

  return {
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
    // Inject the sanitized anon key so client code always receives a valid JWT
    // even when the managed VITE_SUPABASE_ANON_KEY value is corrupted.
    define: {
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
    },
  };
});
