import React, { useState, useEffect } from 'react';
import Nav from './components/Nav';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import Requests from './pages/Requests';
import { getMe } from './api';

export default function App(){
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      // optionally fetch /me by validating token - here we decode by calling a protected endpoint (events)
      getMe(token).then(data => {
        if (data && data.user) setUser(data.user);
      }).catch(()=> {
        setUser(null);
      });
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const logout = () => {
    setToken(null);
  };

  // simple router state
  const [route, setRoute] = useState('dashboard');

  if (!token) {
    return (
      <div style={{ padding: 20 }}>
        <h1>SlotSwapper</h1>
        <div style={{ display: 'flex', gap: 20 }}>
          <Login onLogin={(token, u) => { setToken(token); setUser(u); }} />
          <Signup onSignup={(token, u) => { setToken(token); setUser(u); }} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Nav user={user} onLogout={logout} setRoute={setRoute} />
      <div style={{ padding: 16 }}>
        {route === 'dashboard' && <Dashboard token={token} />}
        {route === 'marketplace' && <Marketplace token={token} />}
        {route === 'requests' && <Requests token={token} />}
      </div>
    </div>
  );
}
