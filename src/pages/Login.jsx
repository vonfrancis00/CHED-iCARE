import { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserPlus, X } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slowLogin, setSlowLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [request, setRequest] = useState({ name: '', email: '', office: '' });
  const [requestLoading, setRequestLoading] = useState(false);
  const [slowRequest, setSlowRequest] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');
  const [offices, setOffices] = useState([]);

  useEffect(() => {
    if (!requestSuccess) return undefined;
    const closeTimer = window.setTimeout(() => {
      setShowRequest(false);
      setRequestSuccess('');
    }, 3500);
    return () => window.clearTimeout(closeTimer);
  }, [requestSuccess]);

  async function openRequest() {
    setShowRequest(true); setRequestError(''); setRequestSuccess('');
    if (offices.length) return;
    try {
      const response = await fetch('/api/sheet?action=listRequestOffices', { credentials: 'same-origin' });
      const result = await response.json();
      if (result.success) setOffices(result.offices || []);
    } catch { /* The form remains usable while offices load. */ }
  }

  async function submitRequest(event) {
    event.preventDefault();
    if (requestLoading || requestSuccess) return;
    setRequestError('');
    const details = { name: request.name.trim(), email: request.email.trim().toLowerCase(), office: request.office.trim() };
    if (!details.name || !details.office || !/^[^\s@]+@ched\.gov\.ph$/.test(details.email)) {
      setRequestError('Enter your name, a valid @ched.gov.ph email, and office.');
      return;
    }
    setRequestLoading(true); setSlowRequest(false);
    const controller = new AbortController();
    const slowTimer = window.setTimeout(() => {
      setSlowRequest(true);
      setShowRequest(false);
    }, 3000);
    const timeout = window.setTimeout(() => controller.abort(), 75000);
    try {
      const response = await fetch('/api/sheet?action=submitAccountRequest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(details), signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to send request.');
      setRequestSuccess(`${result.message || 'Your account request has been sent to the Super Admin.'} Your login credentials will be emailed to you.`); setRequest({ name: '', email: '', office: '' });
    } catch (cause) { setRequestError(cause.name === 'AbortError' ? 'We could not confirm your request in time. It may already have been received. Wait a moment before retrying.' : cause.message || 'Unable to send request.'); }
    finally { window.clearTimeout(timeout); window.clearTimeout(slowTimer); setRequestLoading(false); setSlowRequest(false); }
  }

  async function submit(event) {
    event.preventDefault();
    if (loading) return;
    setError(''); setLoading(true); setSlowLogin(false);
    const controller = new AbortController();
    const slowTimer = window.setTimeout(() => setSlowLogin(true), 8000);
    // Leave time for the server's 55-second deadline and its response.
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch('/api/sheet?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }), credentials: 'same-origin', signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !result.success || !result.user) throw new Error(result.message || 'Unable to sign in.');
      onLogin(result.user);
    } catch (cause) { setError(cause.name === 'AbortError' ? 'Sign-in took too long. Please try again.' : cause.message || 'Unable to sign in. Please retry.'); }
    finally { window.clearTimeout(timeout); window.clearTimeout(slowTimer); setLoading(false); setSlowLogin(false); }
  }

  return <main className="login-page"><div className="login-shell">
    <section className="login-intro" aria-label="Childcare Development Dashboard">
      <div className="login-intro-brand">
        <img src="/ched-logo.png" alt="CHED logo" />
        <span>
          Republic of the Philippines
          <br />
          <strong>
            Commission on Higher Education
          </strong>
        </span>
      </div>
      <div className="login-intro-copy">
        <span className="login-kicker">
          CHED Central Office
          </span>
          <h1>
            Childcare
            <br />
            <em>Development</em>
            <br />
            Dashboard
          </h1>
          <p>Monitor childcare institutions and programs in one place.</p>
      </div>
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />
    </section>
    <section className="login-panel">
      <div className="login-mobile-brand">
        <img src="/ched-logo.png" alt="CHED logo" />
        <span>Childcare Development Dashboard</span>
      </div>
      <div className="login-card">
        <div className="login-icon">
          <ShieldCheck size={26} />
        </div>
          <h2>Sign in</h2>
          <p className="login-description">Use your CHED account to access the dashboard.</p>
        <form className="login-form" onSubmit={submit}>
          <div className="login-field">
            <label htmlFor="login-email">Email address</label>
          <div className="login-input-wrap">
            <Mail size={18} aria-hidden="true" />
            <input id="login-email" type="email" autoComplete="username" required value={email} 
              onChange={event => setEmail(event.target.value)} placeholder="name@ched.gov.ph" />
          </div>
          </div>
          <div className="login-field">
            <label htmlFor="login-password">
              Password
            </label>
          <div className="login-input-wrap">
            <LockKeyhole size={18} aria-hidden="true" />
            <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required 
            value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" />
            <button className="login-password-toggle" type="button" 
            onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            </div>
            </div>
          {error && <p className="login-error" role="alert">{error}</p>}
          {loading && slowLogin && <p className="login-description" role="status">Verifying your account… You will be signed in automatically when verification finishes.</p>}
          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : <>Continue <ArrowRight size={18} aria-hidden="true" /></>}
          </button>
        </form>
        <p className="login-security-note">
          <LockKeyhole size={14} aria-hidden="true" /> 
          Authorized personnel only.
        </p>
        {!showRequest && requestLoading && slowRequest && <p className="login-description" role="status">Your account request is being processed. Once approved, your login credentials will be emailed to you.</p>}
        {!showRequest && requestSuccess && <p className="login-request-success" role="status">{requestSuccess}</p>}
        {!showRequest && requestError && <p className="login-error" role="alert">{requestError}</p>}
        <button type="button" className="login-request-link" onClick={openRequest} disabled={requestLoading}><UserPlus size={15} />{requestLoading ? 'Processing request…' : 'Request an account'}</button>
      </div>
      <p className="login-panel-footer">© {new Date().getFullYear()} Commission on Higher Education</p>
    </section>
  {showRequest && <div className="login-request-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !requestLoading) setShowRequest(false); }}>
    <section className="login-request-modal" role="dialog" aria-modal="true" aria-labelledby="request-account-title">
      <button type="button" className="login-request-close" onClick={() => setShowRequest(false)} disabled={requestLoading} aria-label="Close"><X size={20} /></button>
      <div className="login-icon"><UserPlus size={24} /></div><h2 id="request-account-title">Request an account</h2>
      <p className="login-description">Your request will be reviewed by a Super Admin.</p>
      <form className="login-form" onSubmit={submitRequest}>
        <div className="login-field"><label htmlFor="request-name">Name</label><div className="login-input-wrap"><input id="request-name" required maxLength={120} value={request.name} onChange={e => setRequest(v => ({ ...v, name: e.target.value }))} placeholder="Enter your full name" /></div></div>
        <div className="login-field"><label htmlFor="request-email">CHED Email</label><div className="login-input-wrap"><Mail size={18} /><input id="request-email" type="email" required value={request.email} onChange={e => setRequest(v => ({ ...v, email: e.target.value }))} placeholder="name@ched.gov.ph" /></div></div>
        <div className="login-field"><label htmlFor="request-office">Office</label><select id="request-office" required value={request.office} onChange={e => setRequest(v => ({ ...v, office: e.target.value }))}><option value="">Select an office</option>{offices.map(office => <option key={office} value={office}>{office}</option>)}</select></div>
        {requestError && <p className="login-error" role="alert">{requestError}</p>}{requestSuccess && <p className="login-request-success" role="status">{requestSuccess}</p>}
        {requestLoading && slowRequest && <p className="login-description" role="status">Your request is still being processed. Please keep this window open.</p>}
        <button className="login-submit" disabled={requestLoading || Boolean(requestSuccess)} type="submit">{requestLoading ? 'Sending…' : requestSuccess ? 'Request sent' : 'Send request'}</button>
      </form>
    </section>
  </div>}
  </div></main>;
}
