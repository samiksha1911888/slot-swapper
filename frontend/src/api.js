const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(()=>null);
  if (!res.ok) throw json || { error: 'Request failed' };
  return json;
}

// auth
export async function signup(name, email, password) {
  return api('/api/auth/signup', { method: 'POST', body: { name, email, password } });
}
export async function login(email, password) {
  return api('/api/auth/login', { method: 'POST', body: { email, password } });
}

export async function getMe(token) {
  // attempt to get events (protected) and echo user from token by calling events route.
  try {
    const events = await api('/api/events', { token });
    // we don't have endpoint /me; instead rely on login response. return empty.
    return { ok: true };
  } catch (e) {
    throw e;
  }
}

// events
export async function getEvents(token, status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return api(`/api/events${q}`, { token });
}
export async function createEvent(token, data) {
  return api('/api/events', { method: 'POST', token, body: data });
}
export async function updateEvent(token, id, data) {
  return api(`/api/events/${id}`, { method: 'PATCH', token, body: data });
}
export async function deleteEvent(token, id) {
  return api(`/api/events/${id}`, { method: 'DELETE', token });
}

// swaps
export async function getSwappableSlots(token) {
  return api('/api/swappable-slots', { token });
}
export async function createSwapRequest(token, mySlotId, theirSlotId) {
  return api('/api/swap-request', { method: 'POST', token, body: { mySlotId, theirSlotId } });
}
export async function respondSwapRequest(token, requestId, accept) {
  return api(`/api/swap-response/${requestId}`, { method: 'POST', token, body: { accept } });
}
export async function getIncomingRequests(token) {
  return api('/api/requests/incoming', { token });
}
export async function getOutgoingRequests(token) {
  return api('/api/requests/outgoing', { token });
}
