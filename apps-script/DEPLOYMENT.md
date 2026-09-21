# Deploy the loading improvements

1. Copy the current `Code.gs`, `Config.gs`, `Dashboard.gs`, and `Utils.gs` into the existing Apps Script project, replacing their matching contents.
2. Update the existing web app deployment to a new version. Keep its existing `/exec` URL and access settings.
3. Rebuild and deploy the website, including `api/sheet.js`.
4. Use the dashboard refresh button to clear cached data and load a fresh snapshot.

The browser reuses dashboard and record responses for five minutes. Apps Script caches the dataset and derived responses for five minutes. Each running website server also reuses successful data responses for 15 seconds and combines identical in-flight requests. Authentication is checked before serving this server cache; account operations are never cached.

Refresh invalidates browser and current-server caches before and after the backend clear. Apps Script clears under its build lock so an older build cannot overwrite a refresh. Other server instances may retain their cached results for up to 15 seconds. Automatic cache expiration is per layer, so sheet edits are not guaranteed to appear within exactly five minutes; use refresh when immediate updates matter.

Small Apps Script results now use a single cache entry; large results retain chunked storage. A cold load still depends on Google's execution and spreadsheet latency. Local tests verify cache behavior, authorization, refresh races, and pagination; they do not measure live Google response times.

Run local verification with `node --test scripts/data-performance.test.mjs` and `npm run build`.
