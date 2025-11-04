import React, { useEffect, useState } from 'react';
import { getIncomingRequests, getOutgoingRequests, respondSwapRequest } from '../api';

export default function Requests({ token }) {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const inc = await getIncomingRequests(token);
      const out = await getOutgoingRequests(token);
      setIncoming(inc || []);
      setOutgoing(out || []);
    } catch (e) { console.error(e); }
  }
  useEffect(()=>{ load(); }, []);

  async function respond(id, accept) {
    try {
      await respondSwapRequest(token, id, accept);
      setMsg(accept ? 'Accepted' : 'Rejected');
      load();
    } catch (e) {
      setMsg(e?.error || 'Error');
    }
  }

  return (
    <div>
      <h2>Requests</h2>
      <div style={{ display:'flex', gap: 24 }}>
        <div style={{ flex:1 }}>
          <h4>Incoming</h4>
          {incoming.map(r => (
            <div key={r.id} style={{ border:'1px solid #ccc', padding:8, marginBottom:8 }}>
              <div><b>{r.requesterName}</b> requests your slot <b>{r.responderTitle}</b></div>
              <div>They offer: {r.requesterTitle}</div>
              <div>Status: {r.status}</div>
              {r.status === 'PENDING' && (
                <div style={{ marginTop:8 }}>
                  <button onClick={()=>respond(r.id, true)}>Accept</button>
                  <button onClick={()=>respond(r.id, false)} style={{ marginLeft:8 }}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ flex:1 }}>
          <h4>Outgoing</h4>
          {outgoing.map(r => (
            <div key={r.id} style={{ border:'1px solid #ccc', padding:8, marginBottom:8 }}>
              <div>To: <b>{r.responderName}</b></div>
              <div>Your offer: {r.requesterTitle}</div>
              <div>Their slot: {r.responderTitle}</div>
              <div>Status: {r.status}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop:8 }}>{msg}</div>
    </div>
  );
}
