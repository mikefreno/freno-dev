// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import { getSiteFromEvent } from "~/server/site-context-server";
import { setServerSite } from "~/context/SiteContext";

export default createHandler((event) => {
  // Resolve the active site from the request Host header once per SSR pass,
  // then bind it so the SiteContext provider returns the right value during
  // the initial server render. Also serialized into the document shell
  // (`<html data-site>` + `window.__SITE__`) so client hydration matches.
  const site = getSiteFromEvent(event);
  setServerSite(site);

  return (
    <StartServer
      document={({ assets, children, scripts }) => (
        <html lang="en" data-site={site.id}>
          <head>
            <meta charset="utf-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1, maximum-scale=1"
            />
            <link rel="icon" href={site.faviconPath} />
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
            {/* Hydration data for SiteContext — must run before the app bundle. */}
            <script>{`window.__SITE__=${JSON.stringify(site.id)};`}</script>
            {assets}
          </head>
          <body>
            <div id="app">{children}</div>
            {scripts}
          </body>
        </html>
      )}
    />
  );
});
