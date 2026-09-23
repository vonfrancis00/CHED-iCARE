# Deployment and timeout handling

Deploy the repository to Vercel, including `api/`, `lib/`, and `vercel.json`.
A static `dist` upload or `vite preview` alone cannot run the authenticated API.
Local `npm run dev` uses the same API handler as production.

Set these environment variables before building:

- `VITE_SHEET_API_URL`: the stable Apps Script `/exec` deployment URL.
- `SHEET_API_ACCESS_CODE`: the server-only code matching the Apps Script configuration.
- `SESSION_SECRET`: a long, random server-only signing secret.
- Optional `SHEET_API_URL`: server override for the same deployment.

Do not put the access code or session secret in a `VITE_` variable. Existing
`VITE_SHEET_API_ACCESS_CODE` is supported for compatibility; migrate it to
`SHEET_API_ACCESS_CODE` and rebuild. Restart Vite after changing `.env`.

The Vercel function has a 60-second maximum duration. Reads have a shared
55-second deadline. Account submissions reserve 15 seconds of that budget for
read-back verification after an uncertain write. Writes are not automatically
repeated. Google result downloads retry the completed response without
re-executing the spreadsheet operation. Settings requests stop waiting after
60 seconds and show an error with a retry option.

Authenticated duplicate data reads share an in-flight request. Duplicate account
reads share only while running, keyed by action and actor email; account results
are not cached. Dashboard/record data is cached for five minutes. Polling pauses
for hidden/offline tabs, and notification requests do not overlap.

## Publish

1. If the deployed Apps Script differs from `apps-script/`, replace the matching
   `Code.gs`, `Config.gs`, `Dashboard.gs`, and `Utils.gs` files and update the
   existing Web App deployment to a new version, retaining its `/exec` URL.
2. Confirm that the deployment runs as its owner and permits the server to call
   it, with the configured access code enforced by the script.
3. Set the environment variables in Vercel and deploy the whole repository.
4. Reload the site, sign in, and verify dashboard, Settings directory, office
   reports and PDF export. Reload existing local tabs after restarting Vite.

Run `npm test` and `npm run build` before publishing. Automated tests mock Google;
live Google availability and deployment credentials must also be checked.
A successful build cannot guarantee that an external Google service never times out.
