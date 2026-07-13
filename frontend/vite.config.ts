import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { localApiPlugin } from "./vite.local-api";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Prefer local serverless handlers on localhost. Set VITE_API_PROXY to hit a remote API instead.
  const useRemoteApi = Boolean(env.VITE_API_PROXY);
  const apiTarget = env.VITE_API_PROXY || "https://uxguard.studio";

  return {
    plugins: [react(), ...(useRemoteApi ? [] : [localApiPlugin()])],
    server: {
      port: 5174,
      proxy: useRemoteApi
        ? {
            "/api": {
              target: apiTarget,
              changeOrigin: true,
            },
            "/uploads": {
              target: apiTarget,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
});
