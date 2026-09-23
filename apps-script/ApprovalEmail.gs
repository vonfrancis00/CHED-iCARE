// Enable the advanced Gmail API service (identifier: Gmail) before setup.
// Editor-only setup helper: not exposed by doGet/doPost. Safe to remove after setup.
function setupApprovalEmail() {
  const SENDER_EMAIL = "commissionerapag@ched.gov.ph"; // Run once to list addresses, then paste your chosen address here.
  const DASHBOARD_URL = "https://ched-icare.vercel.app/"; // Paste the website's HTTPS login URL here.
  const aliases = Gmail.Users.Settings.SendAs.list("me").sendAs || [];
  const allowed = aliases.filter(item => item.isPrimary || item.verificationStatus === "accepted");
  console.log("Available sender addresses: " + allowed.map(item => item.sendAsEmail).join(", "));
  if (!SENDER_EMAIL) {
    console.log("Set SENDER_EMAIL and DASHBOARD_URL in setupApprovalEmail, then run again.");
    return;
  }
  const sender = SENDER_EMAIL.trim().toLowerCase();
  if (!allowed.some(item => item.sendAsEmail.toLowerCase() === sender)) {
    throw new Error("Choose a listed sender belonging to the account that runs this web app.");
  }
  if (!/^https:\/\/[^\s]+$/i.test(DASHBOARD_URL)) throw new Error("Set the HTTPS dashboard login URL first.");
  // Save configuration only after Gmail accepts a harmless test email to the sender.
  sendApprovalGmail_(sender, sender, "Dashboard email setup test",
    "Approval emails are configured to use this sender.\nDashboard: " + DASHBOARD_URL);
  PropertiesService.getScriptProperties().setProperties({
    APPROVAL_EMAIL_SENDER: sender,
    APPROVAL_EMAIL_DASHBOARD_URL: DASHBOARD_URL
  });
  console.log("Setup saved. Check the sender's inbox for the test email, then update the web app deployment.");
}

function sendAccountApprovalEmail_(account) {
  const recipient = String(account.email || "").trim().toLowerCase();
  try {
    const properties = PropertiesService.getScriptProperties();
    const sender = properties.getProperty("APPROVAL_EMAIL_SENDER");
    const dashboardUrl = properties.getProperty("APPROVAL_EMAIL_DASHBOARD_URL");
    if (!sender || !dashboardUrl) return { emailSent: false, message: "Request approved and account created. Email is not configured; run setupApprovalEmail in Apps Script." };
    const body = [
      "Hello " + account.name + ",", "",
      "Your Childcare Dashboard account request has been approved.", "",
      "Login email: " + recipient,
      "Initial password: " + account.password,
      "Dashboard: " + dashboardUrl, "",
      "Keep your login credentials private."
    ].join("\n");
    assertApprovalSender_(sender);
    sendApprovalGmail_(sender, recipient, "Your CHED iCare Dashboard account is approved", body,
      approvalEmailHtml_({ name: account.name, email: recipient, password: account.password }, dashboardUrl));
    return { emailSent: true, message: "Request approved and account created. Login credentials sent to " + recipient + "." };
  } catch (error) {
    // Classify locally; never return/log raw Gmail errors or encoded credentials.
    return { emailSent: false, message: "Request approved and account created, but email to " + recipient + " was not confirmed. " + approvalEmailError_(error) };
  }
}

function assertApprovalSender_(sender) {
  const aliases = Gmail.Users.Settings.SendAs.list("me").sendAs || [];
  if (!aliases.some(item => (item.isPrimary || item.verificationStatus === "accepted") &&
    String(item.sendAsEmail).toLowerCase() === String(sender).trim().toLowerCase())) {
    throw new Error("APPROVAL_SENDER_MISMATCH");
  }
}

function approvalEmailError_(error) {
  const message = String(error && error.message || "");
  if (/APPROVAL_SENDER_MISMATCH/.test(message)) return "The live deployment cannot use the configured office sender. Deploy using the office account with Execute as: Me, or configure its verified alias.";
  if (/Gmail is not defined|accessNotConfigured|has not been used|API.*disabled/i.test(message)) return "Enable Gmail API in Services with identifier Gmail, then update the deployment.";
  if (/authorization|permission|scope|access denied|unauthenticated|credentials|not authorized/i.test(message)) return "Gmail access is missing for the account executing the live deployment. Run setupApprovalEmail as that account, grant Gmail access, and update the deployment.";
  if (/quota|rate limit|limit exceeded|too many times/i.test(message)) return "Gmail's sending limit was reached. Check the sender's Sent folder before trying again later.";
  if (/Invalid email headers/i.test(message)) return "Check the configured sender and the CHED email entered in the approval form.";
  return "Check the office sender's Sent folder and the live deployment's executing account. Run testApprovalEmailRecipient to test delivery without creating another account.";
}

// Optional editor-only test. Sends no password and does not modify any account.
function testApprovalEmailRecipient() {
  const CHED_EMAIL = ""; // Enter the same CHED email shown in the approval form.
  const recipient = CHED_EMAIL.trim().toLowerCase();
  if (!/^[^\s@]+@ched\.gov\.ph$/.test(recipient)) throw new Error("Fill in CHED_EMAIL with the recipient's CHED address first.");
  try {
    const sender = PropertiesService.getScriptProperties().getProperty("APPROVAL_EMAIL_SENDER");
    if (!sender) throw new Error("Run setupApprovalEmail first.");
    assertApprovalSender_(sender);
    sendApprovalGmail_(sender, recipient, "Dashboard recipient email test", "This is a delivery test for your CHED email. No account or password has been changed.");
    console.log("Gmail accepted the test email to " + recipient + ". Check the recipient's inbox and spam folder.");
  } catch (error) {
    throw new Error(approvalEmailError_(error));
  }
}

function approvalEmailHtml_(account, dashboardUrl, preview) {
  if (!/^https:\/\/[^\s]+$/i.test(dashboardUrl)) throw new Error("Invalid dashboard URL.");
  const escape = value => String(value == null ? "" : value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const url = escape(dashboardUrl);
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#edf2f7;color:#243650;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${preview ? "Template preview only. No account has been created." : "Your account is ready. Sign in to the CHED iCare Dashboard."}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#edf2f7;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dce4ee;border-radius:16px;overflow:hidden;">
<tr><td style="padding:30px 28px;background:#0b2c5b;border-bottom:4px solid #e4b64a;">
<p style="margin:0 0 10px;color:#c9dcf4;font-size:11px;letter-spacing:2px;font-weight:bold;">COMMISSION ON HIGHER EDUCATION</p>
<p style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">CHED iCare Dashboard</p>
<p style="margin:9px 0 0;color:#dce8f7;font-size:13px;">Childcare Development Monitoring</p></td></tr>
<tr><td style="padding:30px 28px;">
<span style="display:inline-block;padding:7px 12px;background:#e7f5ee;color:#166347;font-size:11px;font-weight:bold;border-radius:20px;letter-spacing:1px;">${preview ? "TEMPLATE PREVIEW" : "ACCOUNT APPROVED"}</span>
<h1 style="margin:20px 0 16px;color:#0b2c5b;font-size:25px;line-height:1.3;">${preview ? "A preview of your welcome email" : "Welcome to CHED iCare"}</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:1.7;">Hello ${escape(account.name)},</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.7;">${preview ? "This is a design preview with sample credentials. No account or password has been changed." : "Your account request has been approved. Use the credentials below to sign in to your dashboard."}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;border:1px solid #dce4ee;border-radius:10px;table-layout:fixed;">
<tr><td style="padding:20px 20px 8px;color:#60718b;font-size:11px;font-weight:bold;letter-spacing:1px;">LOGIN EMAIL</td></tr>
<tr><td style="padding:0 20px 20px;color:#0b2c5b;font-size:16px;word-break:break-all;">${escape(account.email)}</td></tr>
<tr><td style="padding:16px 20px 8px;border-top:1px solid #dce4ee;color:#60718b;font-size:11px;font-weight:bold;letter-spacing:1px;">INITIAL PASSWORD</td></tr>
<tr><td style="padding:0 20px 20px;color:#0b2c5b;font-family:Consolas,'Courier New',monospace;font-size:17px;white-space:pre-wrap;word-break:break-all;">${escape(account.password)}</td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 20px;"><tr><td bgcolor="#0b2c5b" style="border-radius:8px;text-align:center;"><a href="${url}" style="display:inline-block;border:14px solid #0b2c5b;border-left-width:24px;border-right-width:24px;border-radius:8px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;">Open your dashboard &rarr;</a></td></tr></table>
<p style="margin:0 0 24px;color:#60718b;font-size:12px;line-height:1.7;">If the button does not work, open this link:<br><a href="${url}" style="color:#175fa3;word-break:break-all;">${url}</a></p>
<p style="margin:0;padding:14px 16px;background:#fff8e7;border-left:3px solid #e4b64a;color:#705825;font-size:12px;line-height:1.7;">Keep this email and your login credentials private. Do not forward them to others.</p>
</td></tr><tr><td style="padding:22px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#0b2c5b;font-size:12px;font-weight:bold;line-height:1.7;">Office of Commissioner Desiderio R. Apag III</p>
<p style="margin:5px 0 0;color:#748198;font-size:11px;line-height:1.7;">Commission on Higher Education<br>CHED iCare Dashboard &middot; Account notification</p>
</td></tr></table></td></tr></table></body></html>`;
}

// Editor-only preview: uses sample credentials and sends to the configured office sender.
function previewApprovalEmailTemplate() {
  const properties = PropertiesService.getScriptProperties();
  const sender = properties.getProperty("APPROVAL_EMAIL_SENDER");
  const url = properties.getProperty("APPROVAL_EMAIL_DASHBOARD_URL");
  if (!sender || !url) throw new Error("Run setupApprovalEmail first.");
  assertApprovalSender_(sender);
  sendApprovalGmail_(sender, sender, "Preview: CHED iCare approval email",
    "Template preview only. No account or password has been changed. Sample login: sample@ched.gov.ph. Sample password: SAMPLE-ONLY.",
    approvalEmailHtml_({ name: "Sample User", email: "sample@ched.gov.ph", password: "SAMPLE-ONLY" }, url, true));
  console.log("Template preview sent to the configured office sender.");
}

function sendApprovalGmail_(sender, recipient, subject, body, htmlBody) {
  const emailPattern = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
  if (!emailPattern.test(sender) || !emailPattern.test(recipient) || /[\r\n]/.test(subject)) {
    throw new Error("Invalid email headers.");
  }
  const encode = value => (Utilities.base64Encode(value, Utilities.Charset.UTF_8).match(/.{1,76}/g) || []).join("\r\n");
  const boundary = "ched_icare_alternative"; // Underscores cannot occur in base64 parts.
  const content = htmlBody ? [
    'Content-Type: multipart/alternative; boundary="' + boundary + '"', "",
    "--" + boundary, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", encode(body),
    "--" + boundary, "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "", encode(htmlBody),
    "--" + boundary + "--", ""
  ] : ["Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", encode(body)];
  const mime = [
    'From: "Office of Commissioner Desiderio R. Apag III" <' + sender + '>',
    "To: " + recipient, "Subject: " + subject,
    "MIME-Version: 1.0", ...content
  ].join("\r\n");
  const result = Gmail.Users.Messages.send({ raw: Utilities.base64EncodeWebSafe(mime, Utilities.Charset.UTF_8) }, "me");
  if (!result || !result.id) throw new Error("Gmail did not confirm sending.");
}
