import { el, mount, toast, initials } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { onEvent, send } from '../ws.js';
import { navigate } from '../router.js';

export async function chatView({ params }) {
  if (!store.token) { navigate('/login'); return; }
  const { tripId, userId: otherUserId } = params;
  const thread = el('div', { class: 'chat-thread' });
  const input = el('input', { placeholder: 'Escribí un mensaje...', autocomplete: 'off' });
  const form = el('form', { class: 'chat-input' }, [input, el('button', { type: 'submit' }, '→')]);

  let otherName = 'Conductor';
  try {
    const t = await api.getTrip(tripId);
    if (t.driver && t.driverId === otherUserId) otherName = t.driver.fullName || 'Conductor';
  } catch {}

  const hero = el('section', { class: 'hero', style: 'padding:16px 20px' }, [
    el('div', { style: 'display:flex;gap:12px;align-items:center;position:relative' }, [
      el('span', {
        style: 'width:44px;height:44px;border-radius:50%;background:white;color:var(--celeste-dark);display:inline-flex;align-items:center;justify-content:center;font-weight:800',
      }, initials(otherName)),
      el('div', { style: 'flex:1;color:white' }, [
        el('div', { style: 'font-family:var(--font-serif);font-size:18px;font-weight:600' }, otherName),
        el('div', { style: 'opacity:.9;font-size:12px' }, 'Chat del viaje'),
      ]),
      el('span', { style: 'background:rgba(255,255,255,0.2);padding:4px 10px;border-radius:999px;color:white;font-size:11px;font-weight:700' }, '🛡 Protegido'),
    ]),
  ]);

  const notice = el('div', { class: 'chat-notice' }, 'No compartas datos personales · Chat protegido');

  mount(el('div', {}, [
    el('a', { href: `#/trip/${tripId}`, class: 'btn ghost' }, '← Volver al viaje'),
    hero,
    el('div', { class: 'card' }, [thread, notice, form]),
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
