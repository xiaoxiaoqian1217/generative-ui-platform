import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import packageJson from "./package.json";

export default defineConfig({
  plugins: [vue()],
  define: {
    __WORKBENCH_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    sourcemap: true,
  },
});
