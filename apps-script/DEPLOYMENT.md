# Apps Script deployment

Copy `Code.gs`, `Config.gs`, `Dashboard.gs`, and `Utils.gs` into the matching
Apps Script project. Preserve the correct spreadsheet ID and access-code
configuration. Update the existing Web App deployment to a new version so the
stable `/exec` URL does not change.

Deploy the website with `api/`, `lib/`, and `vercel.json`; see
[deployment notes](../DEPLOYMENT-NOTES.md) for environment variables and checks.

Dashboard data is cached for five minutes in the browser, server process, and
Apps Script. Account results are never cached. Cache refresh invalidates the
current server process; other instances can retain data until their cache expires.
Apps Script uses generation-specific chunks for large cached datasets and does
not hold the account-write lock while building read-only caches.

Run `npm test` and `npm run build` before publishing.
