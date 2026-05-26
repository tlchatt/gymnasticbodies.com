'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import s from './login.module.css';

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res?.error) {
        setError(res.error.message ?? JSON.stringify(res.error));
        return;
      }
      // Verify role after sign-in
      const session = await authClient.getSession();
      if (session?.data?.user?.role !== 'admin') {
        await authClient.signOut();
        setError('This account does not have admin access.');
        return;
      }
      const from = params.get('from') ?? '/admin/inbox';
      router.push(from);
    } catch (err) {
      console.error('Login error:', err);
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={s.card} onSubmit={handleSubmit}>
      <div className={s.logo}>Gymfit</div>
      <div className={s.subtitle}>Admin Access</div>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.field}>
        <label className={s.label}>Email</label>
        <input
          className={s.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className={s.field}>
        <label className={s.label}>Password</label>
        <div style={{ position: 'relative' }}>
          <input
            className={s.input}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ paddingRight: '2.5rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: 'absolute', right: '0.75rem', top: '50%',
              transform: 'translateY(-50%)', background: 'none',
              border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '0.8rem',
              padding: 0,
            }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <button className={s.btn} type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}
