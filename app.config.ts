import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Split highlight.js into its own chunk
            if (id.includes("highlight.js")) {
              return "highlight";
            }
            // Split other large vendor libraries
            if (id.includes("node_modules")) {
              if (id.includes("@solidjs") || id.includes("solid-js")) {
                return "solid";
              }
              if (id.includes("@trpc")) {
                return "trpc";
              }
              return "vendor";
            }
          }
        }
      }
    }
  },
  server: {
    preset: "vercel"
  }
});
