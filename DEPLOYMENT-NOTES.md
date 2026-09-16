# Loading reliability update

The frontend keeps the last saved dashboard visible when refresh fails, shows
its update time, and allows a 60-second request without automatically retrying
a timeout. First visits still require a successful Google response.

The Apps Script cache now stores large JSON datasets in chunks below the
per-entry size limit. Nested builds use one outer script lock. Cache keys use
a new version so existing entries cannot be misread.

## Publish

1. Copy the updated `apps-script/Utils.gs` into the matching Apps Script project.
2. Update the existing Web App deployment to a new version. Keeping the same
   deployment preserves its `/exec` URL.
3. Deploy this frontend through the existing Vercel workflow.
4. Load the dashboard once, then simulate a failed/offline refresh. Existing
   figures should remain visible with a refresh warning and last-update time.

Local verification: `node scripts/cache-check.mjs` and `npm run build`.

No shared Vercel cache is configured in this update. That requires a chosen
persistent cache service and server-side access configuration; browser-local
saved data only helps browsers that have already loaded the dashboard.
