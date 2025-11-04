import React, { useState } from 'react';
import { signup } from '../api';

export default function Signup({ onSignup }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      const res = await signup(name, email, password);
      onSignup(res.token, res.user);
    } catch (e) {
      setErr(e?.error || 'Signup failed');
    }
  }

  return (
    <form onSubmit={submit} style={{ border: '1px solid #ddd', padding: 16, borderRadius: 6, width: 320 }}>
      <h3>Sign Up</h3>
      <div><input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} /></div>
      <div><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
      <div style={{ marginTop: 8 }}>
        <button type="submit">Sign Up</button>
        {err && <div style={{ color: 'red' }}>{err}</div>}
      </div>
    </form>
  );
}
