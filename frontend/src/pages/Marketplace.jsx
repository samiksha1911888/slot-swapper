import React, { useEffect, useState } from 'react';
import { getSwappableSlots, getEvents, createSwapRequest } from '../api';

export default function Marketplace({ token }) {
  const [slots, setSlots] = useState([]);
  const [mySwappables, setMySwappables] = useState([]);
  const [selectedTheir, setSelectedTheir] = useState(null);
  const [selectedMy, setSelectedMy] = useState(null);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const s = await getSwappableSlots(token);
      setSlots(s || []);
      const mine = await getEvents(token, 'SWAPPABLE');
      setMySwappables(mine || []);
    } catch (e) { console.error(e); }
  }
  useEffect(()=>{ load(); }, []);

  async function requestSwap() {
    if (!selectedTheir || !selectedMy) return setMsg('Select both slots');
    try {
      await createSwapRequest(token, selectedMy, selectedTheir);
      setMsg('Swap request sent');
      // refresh lists
      load();
      setSelectedTheir(null);
      setSelectedMy(null);
    } catch (e) {
      setMsg(e?.error || 'Error');
    }
  }

  return (
    <div>
      <h2>Marketplace</h2>
      <div style={{ display:'flex', gap:20 }}>
        <div style={{ flex:1 }}>
          <h4>Available Slots (others)</h4>
          <table border="1" cellPadding="6" style={{ borderCollapse:'collapse' }}>
            <thead><tr><th>Title</th><th>Owner</th><th>Start</th><th>End</th><th>Select</th></tr></thead>
            <tbody>
              {slots.map(s => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td>{s.ownerName}</td>
                  <td>{s.startTime}</td>
                  <td>{s.endTime}</td>
                  <td><input type="radio" name="their" checked={selectedTheir===s.id} onChange={()=>setSelectedTheir(s.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ flex:1 }}>
          <h4>My SWAPPABLE Slots</h4>
          <table border="1" cellPadding="6" style={{ borderCollapse:'collapse' }}>
            <thead><tr><th>Title</th><th>Start</th><th>End</th><th>Select</th></tr></thead>
            <tbody>
              {mySwappables.map(m => (
                <tr key={m.id}>
                  <td>{m.title}</td>
                  <td>{m.startTime}</td>
                  <td>{m.endTime}</td>
                  <td><input type="radio" name="my" checked={selectedMy===m.id} onChange={()=>setSelectedMy(m.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={requestSwap}>Request Swap</button>
        <button onClick={load} style={{ marginLeft:8 }}>Refresh</button>
        {msg && <div style={{ marginTop:8 }}>{msg}</div>}
      </div>
    </div>
  );
}
