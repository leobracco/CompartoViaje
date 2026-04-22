import { el, mount, toast } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { onEvent, send } from '../ws.js';
import { navigate } from '../router.js';

export async function chatView({ params }) {
  if (!store.token) { navigate('/login'); return; }
  const { tripId, userId: otherUserId } = params;
  const thread = el('div', { class: 'chat-thread' });
  const input = el('input', { placeholder: 'Escribir mensaje...', autocomplete: 'off' });
  const form = el('form', { class: 'row', style: 'margin-top:10px' }, [input, el('button', { type: 'submit' }, 'Enviar')]);

  mount(el('div', {}, [
    el('a', { href: `#/trip/${tripId}`, class: 'btn ghost' }, '← Volver al viaje'),
    el('h1', {}, 'Chat del viaje'),
    el('div', { class: 'card' }, [thread, form]),
  ]));

  function render(msgs) {
    thread.innerHTML = '';
    for (const m of msgs) {
      const mine = m.fromUserId === store.user.id;
      thread.appendChild(el('div', { class: `chat-bubble ${mine ? 'me' : 'them'}` }, m.body));
    }
    thread.scrollTop = thread.scrollHeight;
  }

  try {
    const msgs = await api.thread(tripId, otherUserId);
    render(msgs);
    await api.markThreadRead(tripId, otherUserId).catch(() => {});
  } catch (err) { toast(err.message || 'Error cargando chat'); }

  const off = onEvent((ev) => {
    if (ev.event === 'chat.message' && ev.data && ev.data.tripId === tripId) {
      thread.appendChild(el('div', { class: 'chat-bubble them' }, ev.data.body));
      thread.scrollTop = thread.scrollHeight;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = input.value.trim();
    if (!body) return;
    input.value = '';
    // Intenta WebSocket primero, fallback a REST
    const sent = send({ event: 'chat.send', data: { tripId, toUserId: otherUserId, body } });
    thread.appendChild(el('div', { class: 'chat-bubble me' }, body));
    thread.scrollTop = thread.scrollHeight;
    if (!sent) {
      try { await api.sendMessage({ tripId, toUserId: otherUserId, body }); }
      catch (err) { toast(err.message || 'No se pudo enviar'); }
    }
  });

  window.addEventListener('hashchange', off, { once: true });
}
