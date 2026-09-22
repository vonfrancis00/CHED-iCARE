import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slowLogin, setSlowLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
          {loading && slowLogin && <p className="login-description" role="status">Sign-in is taking longer than usual. Please keep this page open; your request is still processing.</p>}
          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : <>Continue <ArrowRight size={18} aria-hidden="true" /></>}
          </button>
        </form>
        <p className="login-security-note">
          <LockKeyhole size={14} aria-hidden="true" /> 
          Authorized personnel only.
        </p>
      </div>
      <p className="login-panel-footer">© {new Date().getFullYear()} Commission on Higher Education</p>
    </section>
  </div></main>;
}
