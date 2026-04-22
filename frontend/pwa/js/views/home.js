import { el, mount, formatARS, formatDate, ratingStars, initials } from '../ui.js';
import { api } from '../api.js';
import { store, localDb } from '../store.js';
import { navigate } from '../router.js';

export async function homeView() {
  const today = new Date().toISOString().slice(0, 10);
  const first = store.user ? (store.user.fullName || '').split(' ')[0] : null;

  const heroForm = el('form', { class: 'hero-form' }, [
    el('div', { class: 'field' }, [
      el('label', {}, 'Origen'),
      el('input', { name: 'originCity', placeholder: 'Ej: Buenos Aires', autocomplete: 'off' }),
    ]),
    el('div', { class: 'field' }, [
      el('label', {}, 'Destino'),
      el('input', { name: 'destinationCity', placeholder: 'Ej: Mar del Plata', autocomplete: 'off' }),
    ]),
    el('div', { class: 'row' }, [
      el('div', { class: 'field', style: 'flex:2' }, [
        el('label', {}, 'Fecha'),
        el('input', { name: 'date', type: 'date', min: today }),
      ]),
      el('div', { class: 'field', style: 'flex:1' }, [
        el('label', {}, 'Asientos'),
        el('input', { name: 'minSeats', type: 'number', min: '1', max: '8', value: '1' }),
      ]),
    ]),
    el('button', { type: 'submit', class: 'submit block' }, 'Buscar viajes'),
  ]);

  heroForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(heroForm);
    const qs = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (v) qs.set(k, v);
    navigate('/search?' + qs.toString());
  });

  const hero = el('section', { class: 'hero' }, [
    el('p', { class: 'greeting' }, first ? `¡Buenas, ${first}!` : '¡Hola, viajero!'),
    el('h1', {}, '¿A dónde vas hoy?'),
    heroForm,
  ]);

  const popular = el('section', { class: 'card' }, [
    el('div', { class: 'between' }, [
      el('h2', { style: 'margin:0' }, 'Rutas populares'),
      el('span', { class: 'label' }, 'AR'),
    ]),
    el('div', { id: 'popular-list' }, 'Cargando...'),
  ]);

  const upcomingSection = el('section', {}, [
    el('h2', {}, 'Próximos viajes'),
    el('div', { id: 'upcoming' }, el('div', { class: 'empty' }, 'Buscando viajes...')),
  ]);

  const container = el('div', {}, [hero, popular, upcomingSection]);
  mount(container);

  try {
    const { results } = await api.searchTrips({ limit: 10 });
    await localDb.putAll('trips', results).catch(() => {});
    renderUpcoming(document.getElementById('upcoming'), results);
    renderPopular(document.getElementById('popular-list'), results);
  } catch (err) {
    try {
      const cached = await localDb.getAll('trips');
      if (cached && cached.length) {
        renderUpcoming(document.getElementById('upcoming'), cached);
        renderPopular(document.getElementById('popular-list'), cached);
      } else {
        document.getElementById('upcoming').innerHTML = '';
        document.getElementById('upcoming').appendChild(el('div', { class: 'empty' }, 'Sin viajes disponibles. Revisá tu conexión.'));
        document.getElementById('popular-list').innerHTML = '';
        document.getElementById('popular-list').appendChild(defaultRoutes());
      }
    } catch {
      document.getElementById('popular-list').innerHTML = '';
      document.getElementById('popular-list').appendChild(defaultRoutes());
    }
  }

  if (store.token) {
    try {
      const sug = await api.suggest({});
      if (sug && sug.length) {
        const suggested = el('section', {}, [
          el('div', { class: 'between' }, [
            el('h2', {}, 'Sugeridos para vos'),
            el('span', { class: 'badge celeste' }, 'IA'),
          ]),
          el('div', {}, sug.map(tripCard)),
        ]);
        container.appendChild(suggested);
      }
    } catch {}
  }
}

function renderUpcoming(container, trips) {
  container.innerHTML = '';
  if (!trips || !trips.length) {
    container.appendChild(el('div', { class: 'empty' }, 'Todavía no hay viajes publicados. ¡Sé el primero!'));
    return;
  }
  for (const t of trips.slice(0, 8)) container.appendChild(tripCard(t));
}

function renderPopular(container, trips) {
  container.innerHTML = '';
  if (!trips || !trips.length) {
    container.appendChild(defaultRoutes());
    return;
  }
  const counter = new Map();
  for (const t of trips) {
    const key = `${t.origin.city}|${t.destination.city}`;
    const prev = counter.get(key) || { origin: t.origin.city, destination: t.destination.city, minPrice: t.pricePerSeat, count: 0 };
    prev.count += 1;
    prev.minPrice = Math.min(prev.minPrice, t.pricePerSeat);
    counter.set(key, prev);
  }
  const top = [...counter.values()].sort((a, b) => b.count - a.count).slice(0, 4);
  if (!top.length) {
    container.appendChild(defaultRoutes());
    return;
  }
  for (const r of top) container.appendChild(routeRow(r));
}

function defaultRoutes() {
  const frag = document.createDocumentFragment();
  const suggestions = [
    { origin: 'Buenos Aires', destination: 'Mar del Plata', approx: '5h de viaje' },
    { origin: 'Buenos Aires', destination: 'Córdoba', approx: '8h de viaje' },
    { origin: 'Rosario', destination: 'Buenos Aires', approx: '3h 30 de viaje' },
  ];
  for (const s of suggestions) frag.appendChild(routeRow({ ...s, onclick: true }));
  return frag;
}

function routeRow(r) {
  return el('div', {
    class: 'route-row',
    style: 'cursor:pointer',
    onclick: () => navigate(`/search?originCity=${encodeURIComponent(r.origin)}&destinationCity=${encodeURIComponent(r.destination)}`),
  }, [
    el('div', { class: 'route-icon' }, [el('span', { html: carSvg() })]),
    el('div', { class: 'route-info' }, [
      el('div', { class: 'name' }, `${r.origin} → ${r.destination}`),
      el('div', { class: 'sub' }, r.approx || `${r.count || ''} viajes disponibles`),
    ]),
    r.minPrice ? el('div', { class: 'price' }, [
      el('span', { class: 'sign' }, '$'),
      document.createTextNode(formatMoney(r.minPrice)),
      el('span', { class: 'unit' }, 'desde'),
    ]) : null,
  ]);
}

function tripCard(t) {
  return el('div', { class: 'card trip-card', onclick: () => navigate(`/trip/${t._id}`) }, [
    el('div', { class: 'trip-row' }, [
      el('div', { style: 'flex:1;min-width:0' }, [
        el('div', { class: 'trip-route' }, [
          document.createTextNode(t.origin.city),
          el('span', { class: 'arrow' }, '→'),
          document.createTextNode(t.destination.city),
        ]),
        el('div', { class: 'trip-meta' }, `${formatDate(t.departureAt)} · ${t.seatsAvailable}/${t.seatsTotal} lugares`),
      ]),
      el('div', { class: 'price' }, [
        el('span', { class: 'sign' }, '$'),
        document.createTextNode(formatMoney(t.pricePerSeat)),
        el('span', { class: 'unit' }, 'por asiento'),
      ]),
    ]),
    t.driver ? el('div', { class: 'trip-driver' }, [
      el('span', { class: 'avatar' }, initials(t.driver.fullName)),
      el('div', { style: 'flex:1;min-width:0' }, [
        el('div', { style: 'font-weight:700;color:var(--noche)' }, t.driver.fullName || 'Conductor'),
        el('div', { class: 'rating' }, ratingStars(t.driver.rating)),
      ]),
      t.driver.verification && t.driver.verification.identity === 'approved'
        ? el('span', { class: 'badge ok check' }, 'Verificado')
        : null,
    ]) : null,
  ]);
}

function formatMoney(n) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n || 0);
}

function carSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-5zm3 3a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 8 16zm8 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z"/></svg>`;
}
