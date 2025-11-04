import React, { useEffect, useState } from 'react';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../api';

export default function Dashboard({ token }) {
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const res = await getEvents(token);
      setEvents(res || []);
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(()=>{ load(); }, []);

  async function add(e) {
    e.preventDefault();
    try {
      await createEvent(token, { title, startTime, endTime });
      setTitle(''); setStartTime(''); setEndTime('');
      setMsg('Created');
      load();
    } catch (err) {
      setMsg(err?.error || 'Error');
    }
  }

  async function toggleSwappable(ev) {
    const newStatus = ev.status === 'SWAPPABLE' ? 'BUSY' : 'SWAPPABLE';
    await updateEvent(token, ev.id, { status: newStatus });
    load();
  }

  async function remove(ev) {
    await deleteEvent(token, ev.id);
    load();
  }

  return (
    <div>
      <h2>My Events</h2>
      <form onSubmit={add} style={{ marginBottom: 12 }}>
        <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
        <input placeholder="Start ISO (e.g. 2025-11-04T10:00)" value={startTime} onChange={e=>setStartTime(e.target.value)} />
        <input placeholder="End ISO" value={endTime} onChange={e=>setEndTime(e.target.value)} />
        <button type="submit">Create</button>
      </form>
      {msg && <div>{msg}</div>}
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
        <thead><tr><th>Title</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {events.map(ev => (
            <tr key={ev.id}>
              <td>{ev.title}</td>
              <td>{ev.startTime}</td>
              <td>{ev.endTime}</td>
              <td>{ev.status}</td>
              <td>
                <button onClick={()=>toggleSwappable(ev)}>{ev.status === 'SWAPPABLE' ? 'Unmark Swappable' : 'Make Swappable'}</button>
                <button onClick={()=>remove(ev)} style={{ marginLeft:8 }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
