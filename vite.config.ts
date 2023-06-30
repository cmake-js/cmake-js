import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

import { dependencies, devDependencies } from "./package.json";

const external = [
  ...Object.keys(dependencies || {}),
  ...Object.keys(devDependencies || {}),
  "fs",
  "path",
  "child_process",
  "assert",
  "util",
  "os",
  "module",
  "zlib",
  "crypto",
];

export default defineConfig({
  build: {
    outDir: "build",
    modulePreload: false,
    lib: {
      entry: "src/index.ts",
      name: "cmake-js",
      formats: ["es", "cjs"],
      fileName: "cmake-js",
    },
    rollupOptions: {
      external,
    },
    minify: false,
  },
  plugins: [
    dts({ tsconfigPath: "./tsconfig.types.json", outDir: "build/types" }),
  ],
});
