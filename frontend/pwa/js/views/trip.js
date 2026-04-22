import { el, mount, toast, formatARS, formatDate, ratingStars } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { navigate } from '../router.js';

export async function tripView({ params }) {
  mount(el('div', {}, 'Cargando viaje...'));
  try {
    const t = await api.getTrip(params.id);
    renderTrip(t);
  } catch (err) {
    toast(err.message || 'Error');
    mount(el('div', { class: 'empty' }, 'No encontramos este viaje.'));
  }
}

function renderTrip(t) {
  const isDriver = store.user && store.user.id === t.driverId;

  const header = el('div', { class: 'card' }, [
    el('div', { class: 'trip-row' }, [
      el('div', {}, [
        el('div', { class: 'trip-route' }, [
          document.createTextNode(t.origin.city),
          el('span', { class: 'arrow' }, '→'),
          document.createTextNode(t.destination.city),
        ]),
        el('div', { class: 'trip-meta' }, `${formatDate(t.departureAt)} · ${t.seatsAvailable}/${t.seatsTotal} disponibles`),
      ]),
      el('div', { class: 'trip-price' }, formatARS(t.pricePerSeat) + ' / asiento'),
    ]),
    el('div', { class: 'muted' }, t.description || ''),
    el('div', { class: 'muted' }, `Vehículo: ${t.vehicleSnapshot ? `${t.vehicleSnapshot.brand} ${t.vehicleSnapshot.model} (${t.vehicleSnapshot.color})` : 'N/D'}`),
    el('div', {}, [
      statusBadge(t.status),
      ' ',
      el('span', { class: 'badge' }, `Política: ${t.cancellationPolicy}`),
    ]),
    t.driver ? el('div', { class: 'trip-driver' }, [
      el('span', {}, `Conductor: ${t.driver.fullName || 'N/D'}`),
      el('span', { class: 'rating' }, ratingStars(t.driver.rating)),
    ]) : null,
  ]);

  const actions = el('div', { class: 'stack' });

  if (isDriver) {
    if (t.status === 'published' || t.status === 'full') {
      actions.appendChild(el('button', {
        onclick: async () => {
          await api.startTrip(t._id).catch((e) => toast(e.message));
          toast('Viaje iniciado');
          renderAfterMutation(t._id);
        },
      }, 'Iniciar viaje'));
    }
    if (t.status === 'ongoing') {
      actions.appendChild(el('button', {
        onclick: async () => {
          await api.completeTrip(t._id).catch((e) => toast(e.message));
          toast('Viaje completado');
          renderAfterMutation(t._id);
        },
      }, 'Completar viaje'));
    }
    if (!['cancelled', 'completed'].includes(t.status)) {
      actions.appendChild(el('button', {
        class: 'btn danger',
        onclick: async () => {
          if (!confirm('¿Cancelar viaje?')) return;
          await api.cancelTrip(t._id).catch((e) => toast(e.message));
          toast('Viaje cancelado');
          renderAfterMutation(t._id);
        },
      }, 'Cancelar viaje'));
    }
    actions.appendChild(el('a', { class: 'btn secondary', href: `#/trip/${t._id}/bookings` }, 'Ver reservas'));
  } else {
    if (!store.token) {
      actions.appendChild(el('a', { class: 'btn', href: '#/login' }, 'Ingresar para reservar'));
    } else if (t.status === 'published' && t.seatsAvailable > 0) {
      const seatInput = el('input', { type: 'number', min: '1', max: String(t.seatsAvailable), value: '1' });
      const msgInput = el('textarea', { rows: '3', placeholder: 'Mensaje para el conductor (opcional)' });
      actions.appendChild(el('div', { class: 'card stack' }, [
        el('label', {}, `Cuántos asientos (máx ${t.seatsAvailable})`),
        seatInput,
        el('label', {}, 'Mensaje'),
        msgInput,
        el('button', {
          onclick: async () => {
            const seats = parseInt(seatInput.value, 10) || 1;
            try {
              const res = await api.createBooking({ tripId: t._id, seats, passengerMessage: msgInput.value });
              toast('Reserva creada. Redirigiendo al pago...');
              if (res.payment && res.payment.initPoint) {
                location.href = res.payment.initPoint;
              } else {
                navigate(`/bookings`);
              }
            } catch (e) {
              toast(e.message || 'No se pudo reservar');
            }
          },
        }, `Reservar (${formatARS(t.pricePerSeat)} × asiento)`),
      ]));
    } else {
      actions.appendChild(el('div', { class: 'muted' }, 'El viaje no acepta reservas.'));
    }
    if (store.token && t.driver) {
      actions.appendChild(el('a', { class: 'btn secondary', href: `#/chat/${t._id}/${t.driverId}` }, 'Chatear con el conductor'));
    }
  }

  mount(el('div', {}, [header, actions]));
}

async function renderAfterMutation(id) {
  try {
    const fresh = await api.getTrip(id);
    renderTrip(fresh);
  } catch {}
}

function statusBadge(status) {
  const map = {
    published: ['ok', 'Publicado'],
    full: ['warn', 'Completo'],
    ongoing: ['warn', 'En curso'],
    completed: ['ok', 'Finalizado'],
    cancelled: ['danger', 'Cancelado'],
  };
  const [cls, label] = map[status] || ['', status];
  return el('span', { class: `badge ${cls}` }, label);
}
