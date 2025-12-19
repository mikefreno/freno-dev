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
              // Keep all solid-related packages together to avoid circular deps
              if (
                id.includes("@solidjs") ||
                id.includes("solid-js") ||
                id.includes("seroval")
              ) {
                return "solid";
              }
              if (id.includes("@trpc")) {
                return "trpc";
              }
              // Don't create a generic vendor chunk - let Vite handle it
              // to avoid circular dependencies with solid
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
