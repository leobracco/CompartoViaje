import { el, mount, formatARS, formatDate, ratingStars } from '../ui.js';
import { api } from '../api.js';
import { store, localDb } from '../store.js';
import { navigate } from '../router.js';

export async function homeView() {
  const hero = el('div', { class: 'hero' }, [
    el('h1', {}, 'Compartí viaje, compartí el camino'),
    el('p', {}, 'Conectamos conductores y pasajeros en toda la Argentina.'),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const form = el('form', { class: 'card stack' }, [
    el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [
        el('label', {}, 'Origen'),
        el('input', { name: 'originCity', placeholder: 'Ej: Buenos Aires' }),
      ]),
      el('div', { class: 'field' }, [
        el('label', {}, 'Destino'),
        el('input', { name: 'destinationCity', placeholder: 'Ej: Rosario' }),
      ]),
    ]),
    el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [
        el('label', {}, 'Fecha'),
        el('input', { name: 'date', type: 'date', min: today }),
      ]),
      el('div', { class: 'field' }, [
        el('label', {}, 'Asientos'),
        el('input', { name: 'minSeats', type: 'number', min: '1', max: '8', value: '1' }),
      ]),
    ]),
    el('button', { type: 'submit' }, 'Buscar viajes'),
  ]);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const qs = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (v) qs.set(k, v);
    navigate('/search?' + qs.toString());
  });

  const upcoming = el('div', {}, 'Cargando viajes cercanos...');
  const container = el('div', {}, [hero, form, el('h2', {}, 'Próximos viajes'), upcoming]);
  mount(container);

  try {
    const { results } = await api.searchTrips({ limit: 10 });
    await localDb.putAll('trips', results).catch(() => {});
    renderTrips(upcoming, results);
  } catch (err) {
    // Fallback a cache local
    try {
      const cached = await localDb.getAll('trips');
      if (cached && cached.length) {
        renderTrips(upcoming, cached);
        upcoming.prepend(el('div', { class: 'muted' }, 'Mostrando viajes guardados (sin conexión).'));
      } else {
        upcoming.innerHTML = '<div class="empty">No pudimos cargar viajes. Revisá tu conexión.</div>';
      }
    } catch {
      upcoming.innerHTML = '<div class="empty">Sin conexión.</div>';
    }
  }

  if (store.token) {
    try {
      const sug = await api.suggest({});
      if (sug && sug.length) {
        container.appendChild(el('h2', {}, 'Sugeridos para vos'));
        const sugWrap = el('div');
        renderTrips(sugWrap, sug);
        container.appendChild(sugWrap);
      }
    } catch {}
  }
}

function renderTrips(container, trips) {
  if (!trips || !trips.length) {
    container.innerHTML = '<div class="empty">No hay viajes publicados todavía.</div>';
    return;
  }
  container.innerHTML = '';
  for (const t of trips) {
    const card = el('div', { class: 'card trip-card', onclick: () => navigate(`/trip/${t._id}`) }, [
      el('div', { class: 'trip-row' }, [
        el('div', {}, [
          el('div', { class: 'trip-route' }, [
            document.createTextNode(t.origin.city),
            el('span', { class: 'arrow' }, '→'),
            document.createTextNode(t.destination.city),
          ]),
          el('div', { class: 'trip-meta' }, `${formatDate(t.departureAt)} · ${t.seatsAvailable}/${t.seatsTotal} lugares`),
        ]),
        el('div', { class: 'trip-price' }, formatARS(t.pricePerSeat)),
      ]),
      t.driver ? el('div', { class: 'trip-driver' }, [
        el('span', {}, t.driver.fullName || 'Conductor'),
        el('span', { class: 'rating' }, ratingStars(t.driver.rating)),
      ]) : null,
    ]);
    container.appendChild(card);
  }
}
