import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart({ server: { entry: "server" } }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    // The React app calls the Express API through the same origin in development.
    proxy: {
      "/api": {
        target: process.env["VITE_API_PROXY"] ?? "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
