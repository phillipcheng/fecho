import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `vite dev`, calls to /api/* are proxied to the echo backend on :3000
// with the /api prefix stripped, so the browser never hits CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.ECHO_API ?? "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
