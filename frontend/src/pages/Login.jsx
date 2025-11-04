import React, { useState } from 'react';
import { login } from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      const res = await login(email, password);
      onLogin(res.token, res.user);
    } catch (e) {
      setErr(e?.error || 'Login failed');
    }
  }

  return (
    <form onSubmit={submit} style={{ border: '1px solid #ddd', padding: 16, borderRadius: 6, width: 320 }}>
      <h3>Login</h3>
      <div><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
      <div style={{ marginTop: 8 }}>
        <button type="submit">Login</button>
        {err && <div style={{ color: 'red' }}>{err}</div>}
      </div>
    </form>
  );
}
