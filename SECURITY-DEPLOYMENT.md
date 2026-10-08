Security hardening deployment
=============================

These repository changes are not active on the live site until deployed.

1. Generate two independent random secrets (at least 32 characters each). Set SESSION_SECRET and SHEET_API_ACCESS_CODE in the host's server environment. Never use VITE_ for either secret. Rotating SESSION_SECRET signs everyone out.
2. Set API_ACCESS_CODE in Apps Script Script Properties to the same value as SHEET_API_ACCESS_CODE. The backend now refuses every request when this property is missing. Rotate any previously exposed access code.
3. Update Code.gs in the existing Apps Script project and update its web app deployment to a new version. Deploy the site with vercel.json headers. Keep the existing stable deployment URL.
4. Verify sign-in, account requests, super-admin user management, record filtering, refresh, PDF export, and sign-out in the deployed browser. The build and automated tests do not replace this deployment check.
5. Enable a shared rate limit in the host firewall for login, submitAccountRequest, and prepareRecords. The added per-instance limiter provides only local protection and resets on cold starts. Restrict spreadsheet and Apps Script editor access to trusted administrators.

Protections added: independent production secrets, fail-closed Apps Script access checks, exact-origin and Fetch Metadata checks based on OWASP's CSRF guidance, body/field/filter bounds, session token validation, formula-injection protection, production browser headers, logout snapshot cleanup, ignored local environment files, and patched production dependencies.

Remaining authentication limitations
------------------------------------

The existing Users sheet still stores plaintext passwords, and account approval emails include initial passwords. Replacing this with a managed identity provider or a reviewed password-hashing and reset-token design requires an account migration. Do not regard this hardening as complete authentication security.

Signed sessions last eight hours. Account deletion, password changes, and role changes do not immediately revoke every existing session. Apps Script rechecks super-admin permissions for user management, but other authenticated reads use the signed session until expiry. Rotate SESSION_SECRET for immediate global revocation.

Browser data snapshots remain stored for the existing fast-loading flow; confirmed logout removes the app snapshots and reloads to discard memory caches. Avoid shared browser profiles for sensitive data.

The production dependency audit is clean after patching React Router and DOMPurify. Development-only Tailwind 3 dependencies retain advisories for braces and postcss-selector-parser. Their reported fix requires a Tailwind 4 migration, which was not forced because it changes the styling pipeline. Keep the development server local and do not build untrusted styles or glob patterns.

CSRF reference: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
