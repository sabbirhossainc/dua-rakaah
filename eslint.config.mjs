import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    // The service worker files run in a worker, not a window.
    files: ["app/sw.js", "app/sw-kill.js"],
    languageOptions: {
      globals: { self: "readonly", caches: "readonly", clients: "readonly" },
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
