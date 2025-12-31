// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1"
          />
          <link rel="icon" href="/favicon.ico" />
          <script>
            {`
              (function() {
                const STORAGE_KEY = 'theme-override';
                const stored = localStorage.getItem(STORAGE_KEY);
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isDark = stored !== null ? stored === 'dark' : systemDark;
                document.documentElement.classList.add(isDark ? 'dark' : 'light');
              })();
            `}
          </script>
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
