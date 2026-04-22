import { el, mount, toast, formatARS, formatDate } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { navigate } from '../router.js';

export async function bookingsView() {
  if (!store.token) {
    navigate('/login?next=/bookings');
    return;
  }
  const tabs = el('div', { class: 'row', style: 'margin-bottom:12px' }, [
    el('button', { class: 'btn secondary', onclick: () => show('passenger') }, 'Como pasajero'),
    el('button', { class: 'btn secondary', onclick: () => show('driver') }, 'Como conductor'),
  ]);
  const content = el('div', {});
  mount(el('div', {}, [el('h1', {}, 'Mis reservas'), tabs, content]));

  async function show(kind) {
    content.innerHTML = 'Cargando...';
    try {
      const list = kind === 'passenger' ? await api.myBookings() : await api.receivedBookings();
      if (!list.length) {
        content.innerHTML = '<div class="empty">Sin reservas.</div>';
        return;
      }
      content.innerHTML = '';
      for (const b of list) content.appendChild(bookingCard(b, kind));
    } catch (err) {
      toast(err.message || 'Error');
      content.innerHTML = '<div class="empty">No pudimos cargar.</div>';
    }
  }

  show('passenger');
}

function bookingCard(b, kind) {
  const actions = el('div', { class: 'row', style: 'margin-top:8px;gap:6px' });
  if (kind === 'driver' && b.status === 'pending_payment' && b.paymentStatus === 'approved') {
    actions.appendChild(el('button', {
      onclick: async () => { try { await api.approveBooking(b._id); location.reload(); } catch (e) { alert(e.message); } },
    }, 'Aprobar'));
    actions.appendChild(el('button', {
      class: 'btn danger',
      onclick: async () => {
        const reason = prompt('Motivo (opcional)');
        try { await api.rejectBooking(b._id, reason); location.reload(); } catch (e) { alert(e.message); }
      },
    }, 'Rechazar'));
  }
  if (kind === 'driver' && b.status === 'confirmed') {
    actions.appendChild(el('button', {
      onclick: async () => { try { await api.completeBooking(b._id); location.reload(); } catch (e) { alert(e.message); } },
    }, 'Marcar completado'));
  }
  if (kind === 'passenger' && ['pending_payment', 'confirmed'].includes(b.status)) {
    actions.appendChild(el('button', {
      class: 'btn danger',
      onclick: async () => {
        if (!confirm('¿Cancelar reserva?')) return;
        try { await api.cancelBooking(b._id, ''); location.reload(); } catch (e) { alert(e.message); }
      },
    }, 'Cancelar'));
  }
  if (b.status === 'completed') {
    actions.appendChild(el('a', { class: 'btn secondary', href: `#/review/${b._id}` }, 'Dejar reseña'));
  }

  return el('div', { class: 'card' }, [
    el('div', { class: 'trip-row' }, [
      el('div', {}, [
        el('a', { class: 'trip-route', href: `#/trip/${b.tripId}` }, `Reserva ${b._id.slice(-6)}`),
        el('div', { class: 'trip-meta' }, `${b.seats} asiento(s) · ${formatDate(b.createdAt)}`),
      ]),
      el('div', { class: 'trip-price' }, formatARS(b.totalAmount)),
    ]),
    el('div', {}, [
      el('span', { class: `badge ${statusBadge(b.status)}` }, b.status),
      ' ',
      el('span', { class: 'badge' }, `Pago: ${b.paymentStatus || 'pending'}`),
    ]),
    actions,
  ]);
}

function statusBadge(s) {
  if (['confirmed', 'completed'].includes(s)) return 'ok';
  if (['cancelled', 'rejected', 'refunded'].includes(s)) return 'danger';
  return 'warn';
}
