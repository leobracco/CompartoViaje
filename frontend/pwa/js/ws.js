import { store } from './store.js';

let ws = null;
const listeners = new Set();

export function connect() {
  if (!store.token) return;
  if (ws && ws.readyState <= 1) return;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(store.token)}`);
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      for (const fn of listeners) fn(msg);
    } catch {}
  };
  ws.onclose = () => {
    ws = null;
    setTimeout(connect, 3000);
  };
  ws.onerror = () => {};
}

export function onEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function send(obj) {
  if (!ws || ws.readyState !== 1) return false;
  ws.send(JSON.stringify(obj));
  return true;
}
