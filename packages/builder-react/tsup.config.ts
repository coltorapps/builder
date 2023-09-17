import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  treeshake: true,
  minify: true,
  dts: true,
});
