import { defineConfig } from "vite";
import { dependencies, devDependencies } from "./package.json";

const external = [
  ...Object.keys(dependencies || {}),
  ...Object.keys(devDependencies || {}),
  "fs",
  "path",
  "child_process",
  "os",
  "module",
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
});
