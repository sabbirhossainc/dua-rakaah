import { withSerwist } from "@serwist/turbopack";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The content database is read with better-sqlite3 at request time by the category pages.
  // Next traces it today because lib/db.js builds the path with path.join(process.cwd(), ...),
  // but a file read that way is easy to break by accident, so ship it explicitly.
  outputFileTracingIncludes: {
    "/duas/**": ["./data/dua_main.sqlite"],
    "/bn/duas/**": ["./data/dua_main.sqlite"],
  },
  // Lets the page know it is a SW_KILL build, so it stops registering the worker (design D9).
  env: {
    NEXT_PUBLIC_SW_KILL: process.env.SW_KILL === "1" ? "1" : "0",
  },
  // The browser must always ask the server for the worker file, so a bad worker can be replaced (design D2).
  async headers() {
    return [
      {
        source: "/serwist/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default withSerwist(nextConfig);
