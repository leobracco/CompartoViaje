import { el, mount, toast, formatARS, formatDate, ratingStars } from '../ui.js';
import { api } from '../api.js';
import { navigate } from '../router.js';

export async function searchView({ search }) {
  const form = el('form', { class: 'card stack' }, [
    el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [
        el('label', {}, 'Origen'),
        el('input', { name: 'originCity', value: search.originCity || '' }),
      ]),
      el('div', { class: 'field' }, [
        el('label', {}, 'Destino'),
        el('input', { name: 'destinationCity', value: search.destinationCity || '' }),
      ]),
    ]),
    el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [
        el('label', {}, 'Fecha'),
        el('input', { name: 'date', type: 'date', value: search.date || '' }),
      ]),
      el('div', { class: 'field' }, [
        el('label', {}, 'Precio máx'),
        el('input', { name: 'maxPrice', type: 'number', min: '0', value: search.maxPrice || '' }),
      ]),
      el('div', { class: 'field' }, [
        el('label', {}, 'Asientos'),
        el('input', { name: 'minSeats', type: 'number', min: '1', max: '8', value: search.minSeats || '1' }),
      ]),
    ]),
    el('div', { class: 'field' }, [
      el('label', {}, 'Calificación mínima conductor'),
      el('select', { name: 'minDriverRating' }, [
        el('option', { value: '' }, 'Cualquiera'),
        el('option', { value: '3' }, '3+ estrellas'),
        el('option', { value: '4' }, '4+ estrellas'),
        el('option', { value: '4.5' }, '4.5+ estrellas'),
      ]),
    ]),
    el('button', { type: 'submit' }, 'Buscar'),
  ]);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const qs = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (v) qs.set(k, v);
    navigate('/search?' + qs.toString());
  });

  const results = el('div', {}, 'Buscando...');
  mount(el('div', {}, [el('h1', {}, 'Buscar viaje'), form, results]));

  try {
    const data = await api.searchTrips({
      originCity: search.originCity,
      destinationCity: search.destinationCity,
      date: search.date,
      maxPrice: search.maxPrice,
      minSeats: search.minSeats || 1,
      minDriverRating: search.minDriverRating,
    });
    results.innerHTML = '';
    if (!data.results || !data.results.length) {
      results.appendChild(el('div', { class: 'empty' }, 'Sin resultados para esos criterios.'));
      return;
    }
    results.appendChild(el('div', { class: 'muted' }, `${data.count} resultado(s)`));
    for (const t of data.results) {
      results.appendChild(tripCard(t));
    }
  } catch (err) {
    toast(err.message || 'Error al buscar');
    results.innerHTML = '<div class="empty">No pudimos cargar resultados.</div>';
  }
}

function tripCard(t) {
  return el('div', { class: 'card trip-card', onclick: () => navigate(`/trip/${t._id}`) }, [
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
}
