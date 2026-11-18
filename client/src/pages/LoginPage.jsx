import { useState } from 'react';
import { useAuth } from '../auth';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={onSubmit}>
        <p className="brand-kicker">Day 4 practical</p>
        <h1>Support Desk</h1>
        <p className="lede">Sign in to report an IT problem or to work the support queue.</p>
        {error ? <p className="form-error">{error}</p> : null}
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button className="button" type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="fine-print">Fictional demo accounts are listed in the README. No real staff records are used.</p>
      </form>
    </div>
  );
}
