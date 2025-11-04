import React from 'react';

export default function Nav({ user, onLogout, setRoute }) {
  return (
    <nav style={{ display: 'flex', gap: 12, padding: 12, borderBottom: '1px solid #ddd', alignItems:'center' }}>
      <strong style={{ marginRight: 12 }}>SlotSwapper</strong>
      <button onClick={() => setRoute('dashboard')}>Dashboard</button>
      <button onClick={() => setRoute('marketplace')}>Marketplace</button>
      <button onClick={() => setRoute('requests')}>Requests</button>
      <div style={{ marginLeft: 'auto' }}>
        {user ? <span style={{ marginRight: 12 }}>Hi, {user.name || 'User'}</span> : null}
        <button onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}
