import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Bundle highlight.js and lowlight together
            if (id.includes("highlight.js") || id.includes("lowlight")) {
              return "highlight";
            }

            // Bundle Mermaid separately (large library, only used on some posts)
            if (id.includes("mermaid")) {
              return "mermaid";
            }

            // Bundle all Tiptap extensions together (only used in editor)
            if (id.includes("@tiptap") || id.includes("solid-tiptap")) {
              return "tiptap";
            }

            // Bundle motion libraries
            if (id.includes("motion") || id.includes("@motionone")) {
              return "motion";
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
