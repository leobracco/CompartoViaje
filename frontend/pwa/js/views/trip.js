import { el, mount, toast, formatARS, formatDate, ratingStars, initials } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { navigate } from '../router.js';

export async function tripView({ params }) {
  mount(el('div', { class: 'empty' }, 'Cargando viaje...'));
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

  const heroCard = el('section', { class: 'hero' }, [
    el('p', { class: 'greeting' }, 'Reservar asiento'),
    el('h1', {}, 'Confirmá tu viaje'),
  ]);

  const driverCard = el('div', { class: 'card', style: 'display:flex;gap:12px;align-items:center' }, [
    el('span', { class: 'avatar', style: 'width:56px;height:56px;border-radius:50%;background:var(--celeste-dark);color:white;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:18px' }, t.driver ? initials(t.driver.fullName) : 'CV'),
    el('div', { style: 'flex:1' }, [
      el('div', { style: 'font-family:var(--font-serif);font-size:20px;color:var(--noche);font-weight:600' }, t.driver ? t.driver.fullName || 'Conductor' : 'Conductor'),
      el('div', { class: 'rating', style: 'font-size:13px' }, t.driver ? ratingStars(t.driver.rating) : ''),
    ]),
    store.token && !isDriver && t.driver ? el('a', {
      class: 'btn secondary',
      style: 'padding:8px 12px',
      href: `#/chat/${t._id}/${t.driverId}`,
      title: 'Chatear',
    }, '💬') : null,
  ]);

  const tripCard = el('div', { class: 'card stack' }, [
    el('div', { class: 'trip-route', style: 'font-size:17px' }, [
      document.createTextNode(t.origin.city),
      el('span', { class: 'arrow' }, '→'),
      document.createTextNode(t.destination.city),
    ]),
    el('div', { class: 'trip-meta' }, `🚗 ${t.vehicleSnapshot ? `${t.vehicleSnapshot.brand} ${t.vehicleSnapshot.model} · ${t.vehicleSnapshot.color} · ${t.vehicleSnapshot.plate}` : 'Vehículo N/D'}`),
    el('div', { class: 'row tight', style: 'flex-wrap:wrap' }, [
      el('span', { class: 'badge ok check' }, 'DNI'),
      el('span', { class: 'badge ok check' }, 'Licencia'),
      el('span', { class: 'badge ok check' }, 'Seguro'),
      statusBadge(t.status),
      el('span', { class: 'badge' }, `Política: ${t.cancellationPolicy}`),
    ]),
    t.description ? el('div', { class: 'muted', style: 'font-size:14px' }, t.description) : null,
  ]);

  const seats = t.seatsAvailable > 0 ? 1 : 0;
  const baseTotal = t.pricePerSeat * seats;
  const commission = Math.round(baseTotal * 0.05);

  const summary = el('div', { class: 'summary' }, [
    el('div', { class: 'label', style: 'margin-bottom:6px' }, 'Resumen'),
    el('div', { class: 'line' }, [
      el('span', { class: 'k' }, `${t.origin.city} → ${t.destination.city}`),
      el('span', {}, formatDate(t.departureAt)),
    ]),
    el('div', { class: 'line' }, [
      el('span', { class: 'k' }, `${seats} asiento(s)`),
      el('span', {}, formatARS(baseTotal)),
    ]),
    el('div', { class: 'line' }, [
      el('span', { class: 'k' }, 'Comisión servicio'),
      el('span', {}, formatARS(commission)),
    ]),
    el('div', { class: 'line total' }, [
      el('span', { class: 'k' }, 'Total'),
      el('span', { class: 'v' }, formatARS(baseTotal + commission)),
    ]),
  ]);

  const paymentMethod = el('div', { class: 'card' }, [
    el('div', { class: 'label', style: 'margin-bottom:6px' }, 'Método de pago'),
    el('div', { class: 'between' }, [
      el('div', { style: 'display:flex;gap:10px;align-items:center' }, [
        el('span', { style: 'padding:4px 8px;background:#009ee3;color:white;border-radius:6px;font-weight:800;font-size:12px' }, 'MP'),
        el('span', {}, 'Mercado Pago'),
      ]),
      el('span', { class: 'check', style: 'width:22px;height:22px;border-radius:50%;background:var(--confirmado);color:white;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px' }, '✓'),
    ]),
  ]);

  const actions = el('div', { class: 'stack' });

  if (isDriver) {
    if (t.status === 'published' || t.status === 'full') {
      actions.appendChild(el('button', {
        class: 'conductor block',
        onclick: async () => {
          await api.startTrip(t._id).catch((e) => toast(e.message));
          toast('Viaje iniciado');
          renderAfterMutation(t._id);
        },
      }, 'Iniciar viaje'));
    }
    if (t.status === 'ongoing') {
      actions.appendChild(el('button', {
        class: 'conductor block',
        onclick: async () => {
          await api.completeTrip(t._id).catch((e) => toast(e.message));
          toast('Viaje completado');
          renderAfterMutation(t._id);
        },
      }, 'Completar viaje'));
    }
    if (!['cancelled', 'completed'].includes(t.status)) {
      actions.appendChild(el('button', {
        class: 'btn danger block',
        onclick: async () => {
          if (!confirm('¿Cancelar viaje?')) return;
          await api.cancelTrip(t._id).catch((e) => toast(e.message));
          toast('Viaje cancelado');
          renderAfterMutation(t._id);
        },
      }, 'Cancelar viaje'));
    }
    actions.appendChild(el('a', { class: 'btn secondary block', href: `#/trip/${t._id}/bookings` }, 'Ver reservas'));
  } else if (!store.token) {
    actions.appendChild(el('a', { class: 'btn block', href: '#/login' }, 'Ingresar para reservar'));
  } else if (t.status === 'published' && t.seatsAvailable > 0) {
    const seatInput = el('input', { type: 'number', min: '1', max: String(t.seatsAvailable), value: '1' });
    const msgInput = el('textarea', { rows: '2', placeholder: 'Mensaje para el conductor (opcional)' });
    actions.appendChild(el('div', { class: 'card stack' }, [
      el('div', { class: 'row' }, [
        el('div', { class: 'field' }, [el('label', {}, `Asientos (máx ${t.seatsAvailable})`), seatInput]),
        el('div', { class: 'field' }, [el('label', {}, 'Mensaje'), msgInput]),
      ]),
      el('button', {
        class: 'block',
        onclick: async () => {
          const seats = parseInt(seatInput.value, 10) || 1;
          try {
            const res = await api.createBooking({ tripId: t._id, seats, passengerMessage: msgInput.value });
            toast('Reserva creada. Redirigiendo al pago...');
            if (res.payment && res.payment.initPoint) location.href = res.payment.initPoint;
            else navigate(`/bookings`);
          } catch (e) { toast(e.message || 'No se pudo reservar'); }
        },
      }, `Reservar · ${formatARS(t.pricePerSeat)} x asiento`),
    ]));
  } else {
    actions.appendChild(el('div', { class: 'empty' }, 'El viaje no acepta reservas.'));
  }

  mount(el('div', {}, [heroCard, driverCard, tripCard, summary, paymentMethod, actions]));
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
