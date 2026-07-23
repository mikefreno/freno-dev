import { defineConfig } from "@solidjs/start/vite";
import sentryPlugin from "@sentry/vite-plugin";

export default defineConfig({
  plugins: [
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
  ]
});
