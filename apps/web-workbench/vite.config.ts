import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import packageJson from "./package.json";

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  define: {
    __WORKBENCH_VERSION__: JSON.stringify(packageJson.version),
  },
  server: {
    proxy: {
      "/api/copilotkit": {
        changeOrigin: true,
        target: "http://127.0.0.1:4801",
      },
    },
  },
  build: {
    sourcemap: true,
  },
});
