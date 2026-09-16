# Loading reliability update

Idle recovery: dashboard polling pauses while the tab is hidden or offline and
resumes when visible/online. The production proxy retries temporary Google
HTTP/network failures up to three times within ONE 55-second deadline. The
browser makes only one request, so a recovered Google 404 does not become a
browser network error. Exhausted failures still report an honest error.

After deployment, reload existing tabs. In browser Network tools, data requests
must go to `/api/sheet`, not directly to `script.google.com`. Old console entries
remain until cleared; a successful retry cannot remove those historical errors.

Production requests now use the Vercel function at `/api/sheet`. Google redirects
are followed on the server. Deploy the `api` directory and `vercel.json` along
with the frontend (deploying only `dist` will not include the function).
The function reads the existing `VITE_SHEET_API_URL` and
`VITE_SHEET_API_ACCESS_CODE` Vercel environment variables, so no new service is
required. `SHEET_API_URL` and `SHEET_API_ACCESS_CODE` are optional server overrides;
the access code must still match the frontend code. Local Vite development keeps
using Google directly; `vite preview` alone does not run the production function.

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
