import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/sheet.js';

const env = { SESSION_SECRET: 'regression-secret', SHEET_API_URL: 'https://script.google.com/macros/s/regression/exec' };
function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; return this; } };
}

test('Vercel parsed login bodies issue usable cookies; invalid credentials stay rejected', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => Response.json(JSON.parse(options.body).password === 'correct'
    ? { success: true, user: { email: 'test@example.com' } }
    : { success: false, message: 'Invalid email or password.' });
  try {
    for (const body of [{ password: 'correct' }, JSON.stringify({ password: 'correct' }), Buffer.from('{"password":"correct"}')]) {
      const res = response();
      await handler({ url: '/api/sheet?action=login', method: 'POST', body }, res, env);
      assert.equal(res.code, 200);
      const cookie = res.headers['Set-Cookie'].split(';')[0];
      const check = response();
      await handler({ url: '/api/sheet?action=session', method: 'GET', headers: { cookie: `other=value;${cookie}` } }, check, env);
      assert.equal(check.payload.user.email, 'test@example.com');
    }
    const rejected = response();
    await handler({ url: '/api/sheet?action=login', method: 'POST', body: { password: 'wrong' } }, rejected, env);
    assert.equal(rejected.code, 401);
    assert.equal(rejected.headers['Set-Cookie'], undefined);
    for (const body of ['{', null, []]) {
      const invalid = response();
      await handler({ url: '/api/sheet?action=login', method: 'POST', body }, invalid, env);
      assert.equal(invalid.code, 400);
    }
  } finally { globalThis.fetch = original; }
});

test('a cold data read can finish after 30 seconds without restarting Google', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    await new Promise((resolve, reject) => {
      setTimeout(resolve, 30000);
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
    return Response.json({ success: true, offices: ['Central'] });
  };
  try {
    const res = response();
    const pending = handler({ url: '/api/sheet?action=listRequestOffices', method: 'GET' }, res, env);
    t.mock.timers.tick(30000);
    await pending;
    assert.equal(res.code, 200);
    assert.deepEqual(res.payload.offices, ['Central']);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test('duplicate account reads share only in flight and remain isolated by actor', async () => {
  const { createHmac } = await import('node:crypto');
  const config = {...env, SHEET_API_ACCESS_CODE:'test-code', SHEET_API_URL:'https://script.google.com/macros/s/account-concurrency/exec'};
  const original = globalThis.fetch;
  let calls = 0;
  let release;
  const gate = new Promise(resolve => {release=resolve;});
  globalThis.fetch = async () => {calls++; await gate; return Response.json({success:true,users:[]});};
  const request = async email => {
    const data=Buffer.from(JSON.stringify({expires:Date.now()+60000,user:{email,role:'super_admin'}})).toString('base64url');
    const cookie='childcare_session='+data+'.'+createHmac('sha256',config.SESSION_SECRET).update(data).digest('hex');
    const res=response();
    await handler({url:'/api/sheet?action=listUsers',method:'GET',headers:{cookie}},res,config);
    return res;
  };
  try {
    const first=request('one@example.com');
    const duplicate=request('one@example.com');
    const other=request('two@example.com');
    assert.equal(calls,2);
    release();
    const results=await Promise.all([first,duplicate,other]);
    assert.ok(results.every(result=>result.code===200));
    await request('one@example.com');
    assert.equal(calls,3,'Completed account results must not be cached');
  } finally {release();globalThis.fetch=original;}
});
