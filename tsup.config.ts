import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: {
    // tsup sets `baseUrl` internally, which TypeScript 6 reports as deprecated.
    compilerOptions: { ignoreDeprecations: "6.0" },
  },
  target: "es2018",
  platform: "neutral",
  clean: true,
  sourcemap: false,
  minify: false,
  treeshake: true,
});
