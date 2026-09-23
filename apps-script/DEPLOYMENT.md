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

## Users sheet protection setup

If user management reports "You are trying to edit a protected cell or object":

1. Copy the updated `Code.gs` into the Apps Script project.
2. As the spreadsheet owner (or an account allowed to manage all Users sheet
   protections), select `setupUsersSheetPermissions` in the editor and run it.
3. Keep the web app executing as **Me**, using an account with spreadsheet edit
   access.

This removes sheet and range protections only from the Users sheet. Other
spreadsheet editors will also be able to edit these cells directly. Dashboard
user management still checks the current super admin role, including the
self-deletion and last-super-admin safeguards. The setup function is not a web
API action. Running it changes the spreadsheet immediately; no new web app
version is needed solely for this setup.

## Approval emails (Gmail API)

1. Copy the updated `Code.gs` and new `ApprovalEmail.gs` into the existing
   Apps Script project. Keep the other files and configuration.
2. In **Services > +**, add **Gmail API**, version **v1**, identifier **Gmail**.
   If using a standard Google Cloud project, also enable Gmail API there.
3. Sign in as the account that executes the web app. Select
   `setupApprovalEmail` in the editor's function dropdown and click **Run**.
   Authorize Gmail access. The execution log lists the account's primary
   address and verified send-as aliases. This first run sends no email.
4. In that function, fill in `SENDER_EMAIL` with a listed address and
   `DASHBOARD_URL` with the website's HTTPS login URL. Run it again.
   It sends a test email to the chosen sender and saves Script Properties
   only after Gmail accepts the message. Check the inbox/Sent folder.
5. Update the existing web app deployment to a **New version**, executing as
   **Me**, using that same Google account. Preserve the deployment URL and
   existing access settings. No frontend deployment is required.

Selecting an account during editor authorization does not change who executes
an existing web app deployment. To use a different mailbox, it must be a verified
send-as alias of the executing account, or that account must deploy the web app
and have access to the spreadsheet. A new deployment URL also requires updating
the website's server configuration.

If the manifest has explicit `oauthScopes`, preserve existing scopes and add
`https://www.googleapis.com/auth/gmail.send` and
`https://www.googleapis.com/auth/gmail.settings.basic`. Reauthorize afterward.

Only successful request approvals send credentials; ordinary user creation and
edits retain their existing behavior. Email failure does not undo the account or
restore the request. The existing success banner reports whether Gmail accepted
the email; acceptance does not guarantee inbox delivery. There is no automatic
retry, which avoids duplicate credentials emails after an ambiguous send failure.
The assigned password is sent exactly as entered; this does not add password
expiry or a forced password change.

`setupApprovalEmail` is a temporary editor-only helper and can be removed after
setup; retain the other functions in `ApprovalEmail.gs`. Configuration persists
in Script Properties. Delete `APPROVAL_EMAIL_SENDER` there to disable sending.

References: [Advanced Gmail service](https://developers.google.com/apps-script/advanced/gmail),
[sender aliases](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/list),
[web app execution identity](https://developers.google.com/apps-script/guides/web).

### Troubleshooting recipient delivery

The recipient comes from the approval form's CHED email field, not from the
configured sender. The setup test intentionally sends only to the sender.
To test a requester separately, set `CHED_EMAIL` in `testApprovalEmailRecipient`
inside `ApprovalEmail.gs` and run that function under the office account.
It sends a harmless test without credentials or account changes. An editor test
does not prove that the deployed web app uses the same identity or version.

Copy the latest `ApprovalEmail.gs` to the deployed project and publish a new
version to get recipient-specific success messages and categorized failure
messages. Approval verifies that the executing account can use the configured
sender before sending. Missing Gmail authorization, disabled API, sender mismatch,
and sending limits have separate guidance; raw API errors are never displayed.
Already approved accounts do not automatically receive a new credentials email.

### Styled approval template

Approval messages include HTML and a plain-text fallback, with the display name
`Office of Commissioner Desiderio R. Apag III` in the From header. The actual
sender mailbox remains the configured, authorized office address. Recipient mail
apps may display a saved contact name instead of the supplied name.

Copy the updated `ApprovalEmail.gs` into Apps Script. Existing Script Properties
remain configured; there is no need to rerun setup. Run
`previewApprovalEmailTemplate` to send a sample-only preview to the office sender
without creating or changing an account. Then publish a new deployment version
to use the template for future approvals. Keep all sending and template helper
functions; the editor-only preview function may be removed after review.
