import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin as sentryPlugin } from "@sentry/vite-plugin";

export default defineConfig({
  middleware: "./src/middleware.ts",
  vite: {
    plugins: [
      tailwindcss(),
      sentryPlugin({
        org: "mikefreno",
        project: "freno-dev",
        authToken: process.env.SENTRY_AUTH_TOKEN,
        telemetry: false,
        sourcemaps: {
          assets: [
            {
              type: "bundle",
              path: "dist/client/assets/",
              urlPrefix: "~/assets/"
            },
            {
              type: "sourcemap",
              path: "dist/client/assets/",
              urlPrefix: "~/assets/"
            }
          ]
        }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
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
