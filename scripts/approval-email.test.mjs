import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function fixture({ fail = false, configured = true } = {}) {
  const sent = [];
  const properties = configured ? { APPROVAL_EMAIL_SENDER: 'sender@gmail.com', APPROVAL_EMAIL_DASHBOARD_URL: 'https://dashboard.example/login' } : {};
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties[key] }) },
    Utilities: { Charset: { UTF_8: 'utf8' }, base64Encode: value => Buffer.from(value).toString('base64'), base64EncodeWebSafe: value => Buffer.from(value).toString('base64url') },
    Gmail: { Users: { Settings: { SendAs: { list: () => ({ sendAs: [{ sendAsEmail: 'sender@gmail.com', isPrimary: true }] }) } }, Messages: { send(message, user) { sent.push({ message, user }); if (fail) throw new Error('private upstream error'); return { id: 'accepted' }; } } } }
  });
  for (const file of ['Code.gs', 'ApprovalEmail.gs']) vm.runInContext(readFileSync(new URL('../apps-script/' + file, import.meta.url), 'utf8'), context);
  let created = 0, removed = false, released = false;
  context.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() { released = true; } }) };
  context.getUsersRegister_ = () => ({ rows: [], columns: { email: 0, password: 1, name: 2, office: 3, role: 4 }, sheet: {
    getLastColumn: () => 5, getLastRow: () => created + 1,
    getRange: () => ({ setNumberFormat() { return this; }, setValues() { created++; } })
  } });
  context.assertSuperAdmin_ = () => {};
  context.getAccountRequestsSheet_ = () => ({ getLastRow: () => removed ? 1 : 2, getRange: () => ({ getDisplayValue: () => 'new@ched.gov.ph' }), deleteRow() { removed = true; } });
  context.jsonResponse = value => value;
  return { context, sent, state: () => ({ created, removed, released }) };
}
const account = { requestRow: 2, email: 'new@ched.gov.ph', name: 'José', office: 'Office', password: 'Päss+word123', role: 'admin' };

test('approval sends exact UTF-8 credentials once and preserves the account response', () => {
  const f = fixture();
  const result = f.context.approveAccountRequest_(account);
  assert.equal(result.success, true);
  assert.equal(result.emailSent, true);
  assert.equal(result.user.email, account.email);
  assert.equal(JSON.stringify(result).includes(account.password), false);
  assert.deepEqual(f.state(), { created: 1, removed: true, released: true });
  const mime = Buffer.from(f.sent[0].message.raw, 'base64url').toString();
  assert.match(mime, /From: "Office of Commissioner Desiderio R. Apag III" <sender@gmail.com>\r\nTo: new@ched.gov.ph\r\n/);
  assert.match(mime, /Content-Type: multipart\/alternative/);
  const body = Buffer.from(mime.split('--ched_icare_alternative')[1].split('\r\n\r\n')[1].trim(), 'base64').toString();
  assert.ok(body.includes(account.name));
  assert.ok(body.includes(account.password));
  assert.ok(body.includes('https://dashboard.example/login'));
  const html = Buffer.from(mime.split('--ched_icare_alternative')[2].split('\r\n\r\n')[1].trim(), 'base64').toString();
  assert.ok(html.includes(account.name));
  assert.ok(html.includes(account.password));
  assert.match(html, /href="https:\/\/dashboard.example\/login"/);
  assert.equal(f.context.approveAccountRequest_(account).success, false);
  assert.equal(f.sent.length, 1);
});

test('HTML escapes names and passwords and rejects unsafe dashboard links', () => {
  const f = fixture();
  const html = f.context.approvalEmailHtml_({ name: '<img src=x>', email: 'user@ched.gov.ph', password: '<>&"\'' }, 'https://example.com/?a=1&b=2');
  assert.ok(html.includes('&lt;img src=x&gt;'));
  assert.ok(html.includes('&lt;&gt;&amp;&quot;&#39;'));
  assert.ok(html.includes('href="https://example.com/?a=1&amp;b=2"'));
  assert.equal(html.includes('<img src=x>'), false);
  assert.throws(() => f.context.approvalEmailHtml_(account, 'javascript:alert(1)'), /Invalid dashboard URL/);
});

test('template preview goes to the office sender with sample credentials only', () => {
  const f = fixture();
  f.context.previewApprovalEmailTemplate();
  const mime = Buffer.from(f.sent[0].message.raw, 'base64url').toString();
  assert.match(mime, /To: sender@gmail.com/);
  const html = Buffer.from(mime.split('--ched_icare_alternative')[2].split('\r\n\r\n')[1].trim(), 'base64').toString();
  assert.ok(html.includes('TEMPLATE PREVIEW'));
  assert.ok(html.includes('SAMPLE-ONLY'));
  assert.equal(f.state().created, 0);
});

test('Gmail failure or missing setup preserves approval and reports email status', () => {
  for (const options of [{ fail: true }, { configured: false }]) {
    const f = fixture(options);
    const result = f.context.approveAccountRequest_(account);
    assert.equal(result.success, true);
    assert.equal(result.emailSent, false);
    assert.deepEqual(f.state(), { created: 1, removed: true, released: true });
    assert.equal(JSON.stringify(result).includes('private upstream error'), false);
  }
});

test('unauthorized approvals and invalid headers never send mail', () => {
  const f = fixture();
  f.context.assertSuperAdmin_ = () => { throw new Error('Unauthorized'); };
  assert.throws(() => f.context.approveAccountRequest_(account), /Unauthorized/);
  assert.throws(() => f.context.sendApprovalGmail_('sender@gmail.com', 'user@example.com\r\nBcc: other@example.com', 'Subject', 'Body'), /Invalid email headers/);
  assert.equal(f.sent.length, 0);
  assert.equal(f.state().created, 0);
});

test('the entered CHED email is normalized and used as the recipient', () => {
  const f = fixture();
  const result = f.context.sendAccountApprovalEmail_({ ...account, email: ' ATRINIDAD@ched.gov.ph ' });
  assert.equal(result.emailSent, true);
  const mime = Buffer.from(f.sent[0].message.raw, 'base64url').toString();
  assert.match(mime, /\r\nTo: atrinidad@ched.gov.ph\r\n/);
  assert.ok(result.message.includes('atrinidad@ched.gov.ph'));
});

test('sender mismatch preserves approval and does not fall back to a personal sender', () => {
  const f = fixture();
  f.context.Gmail.Users.Settings.SendAs.list = () => ({ sendAs: [{ sendAsEmail: 'personal@gmail.com', isPrimary: true }] });
  const result = f.context.approveAccountRequest_(account);
  assert.equal(result.success, true);
  assert.equal(result.emailSent, false);
  assert.match(result.message, /configured office sender/);
  assert.equal(f.sent.length, 0);
});

test('permission failures return useful guidance without raw errors or credentials', () => {
  const f = fixture();
  f.context.Gmail.Users.Messages.send = () => { throw new Error('Insufficient permission: ' + account.password); };
  const result = f.context.approveAccountRequest_(account);
  assert.equal(result.success, true);
  assert.equal(result.emailSent, false);
  assert.match(result.message, /Gmail access is missing/);
  assert.equal(JSON.stringify(result).includes(account.password), false);
});
