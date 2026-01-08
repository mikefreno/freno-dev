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
            if (id.includes("motion") || id.includes("@motionone")) {
              return "motion";
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
