// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
          {assets}
        </head>
        <body>
          <noscript>
            <div style="position: fixed; top: 0; left: 0; right: 0; z-index: 9999; background-color: var(--color-yellow); color: var(--color-crust); padding: 1rem; text-align: center; font-weight: 600; border-bottom: 2px solid var(--color-text);">
              JavaScript is disabled. Features will be limited.
            </div>
          </noscript>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
