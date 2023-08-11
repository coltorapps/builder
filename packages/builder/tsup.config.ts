import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/utils.ts"],
  format: ["cjs", "esm"],
  external: ["react"],
  treeshake: true,
  splitting: false,
  minify: true,
  dts: true,
});
