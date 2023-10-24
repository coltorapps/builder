import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    minify: true,
    dts: true,
    esbuildOptions(options) {
      options.banner = {
        js: '"use client";',
      };
    },
  },
  {
    entry: ["src/server.tsx"],
    format: ["cjs", "esm"],
    minify: true,
    dts: true,
    esbuildOptions(options) {
      options.banner = {
        js: '"use server";',
      };
    },
  },
]);
