import { useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event) {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const response = await fetch('/api/sheet?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }), credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok || !result.success || !result.user) throw new Error(result.message || 'Unable to sign in.');
      onLogin(result.user);
    } catch (cause) { setError(cause.message || 'Unable to sign in. Please retry.'); }
    finally { setLoading(false); }
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
            <em>Development</em> Dashboard
          </h1>
          <p>A single, reliable view of institutions and programs supporting Filipino families.</p>
      </div>
      <div className="login-intro-meta">
        <span>
          <CheckCircle2 size={16} /> 
          Secure internal platform
        </span>
        <span>
          Data-informed public service
        </span>
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
          <p className="login-eyebrow">Secure access</p>
          <h2>Welcome back</h2>
          <p className="login-description">Sign in with your authorized CHED account to continue.</p>
        <form className="login-form" onSubmit={submit}>
          <div className="login-field">
            <label htmlFor="login-email">CHED email address</label>
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
          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : <>Sign in securely <ArrowRight size={18} aria-hidden="true" /></>}
          </button>
        </form>
        <p className="login-security-note">
          <LockKeyhole size={14} aria-hidden="true" /> 
          Your access is protected and monitored.
        </p>
      </div>
      <p className="login-panel-footer">© {new Date().getFullYear()} Commission on Higher Education</p>
    </section>
  </div></main>;
}
