import { el, mount, toast, formatDate, ratingStars, initials } from '../ui.js';
import { api } from '../api.js';
import { navigate } from '../router.js';

export async function searchView({ search }) {
  const form = el('form', { class: 'card stack' }, [
    el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Origen'), el('input', { name: 'originCity', value: search.originCity || '', placeholder: 'Buenos Aires' })]),
      el('div', { class: 'field' }, [el('label', {}, 'Destino'), el('input', { name: 'destinationCity', value: search.destinationCity || '', placeholder: 'Mar del Plata' })]),
    ]),
    el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Fecha'), el('input', { name: 'date', type: 'date', value: search.date || '' })]),
      el('div', { class: 'field' }, [el('label', {}, 'Precio máx'), el('input', { name: 'maxPrice', type: 'number', min: '0', value: search.maxPrice || '', placeholder: '10.000' })]),
      el('div', { class: 'field' }, [el('label', {}, 'Asientos'), el('input', { name: 'minSeats', type: 'number', min: '1', max: '8', value: search.minSeats || '1' })]),
    ]),
    el('div', { class: 'field' }, [
      el('label', {}, 'Calificación mínima'),
      el('select', { name: 'minDriverRating' }, [
        el('option', { value: '' }, 'Cualquiera'),
        el('option', { value: '3' }, '3+ estrellas'),
        el('option', { value: '4' }, '4+ estrellas'),
        el('option', { value: '4.5' }, '4.5+ estrellas'),
      ]),
    ]),
    el('button', { type: 'submit', class: 'block' }, 'Buscar'),
  ]);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const qs = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (v) qs.set(k, v);
    navigate('/search?' + qs.toString());
  });

  // Filter chips (price / rating / pets)
  const chips = el('div', { class: 'row tight', style: 'flex-wrap:wrap;margin:4px 0 10px' }, [
    el('span', { class: 'badge celeste' }, 'Precio ↕'),
    el('span', { class: 'badge' }, 'Calificación ★'),
    el('span', { class: 'badge' }, 'Mascotas 🐾'),
  ]);

  const results = el('div', {}, el('div', { class: 'empty' }, 'Buscando...'));
  mount(el('div', {}, [
    el('h1', {}, 'Buscar viaje'),
    form,
    chips,
    results,
  ]));

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
    results.appendChild(el('div', { class: 'label', style: 'margin-bottom:8px' }, `${data.count} resultado(s)`));
    const first = data.results[0];
    if (first) results.appendChild(recommendedBanner());
    for (const t of data.results) results.appendChild(tripCard(t));
  } catch (err) {
    toast(err.message || 'Error al buscar');
    results.innerHTML = '';
    results.appendChild(el('div', { class: 'empty' }, 'No pudimos cargar resultados.'));
  }
}

function recommendedBanner() {
  return el('div', {
    class: 'badge celeste',
    style: 'width:100%;text-align:center;padding:8px;margin-bottom:10px;display:block',
  }, '★ MÁS RECOMENDADO');
}

function tripCard(t) {
  return el('div', { class: 'card trip-card', onclick: () => navigate(`/trip/${t._id}`) }, [
    el('div', { class: 'trip-row' }, [
      el('div', { style: 'display:flex;gap:10px;flex:1;min-width:0' }, [
        t.driver ? el('span', { class: 'avatar', style: 'width:42px;height:42px;border-radius:50%;background:var(--celeste-dark);color:white;display:inline-flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0' }, initials(t.driver.fullName)) : null,
        el('div', { style: 'flex:1;min-width:0' }, [
          el('div', { style: 'font-weight:700;color:var(--noche)' }, t.driver ? t.driver.fullName || 'Conductor' : 'Conductor'),
          el('div', { class: 'rating', style: 'font-size:13px' }, t.driver ? ratingStars(t.driver.rating) : ''),
        ]),
      ]),
      el('div', { class: 'price' }, [
        el('span', { class: 'sign' }, '$'),
        document.createTextNode(new Intl.NumberFormat('es-AR').format(t.pricePerSeat)),
        el('span', { class: 'unit' }, 'por asiento'),
      ]),
    ]),
    el('div', { class: 'trip-meta', style: 'margin-top:10px' }, [
      el('div', { class: 'trip-route' }, [
        document.createTextNode(`${formatDate(t.departureAt)}`),
      ]),
      el('div', { style: 'margin-top:2px' }, `${t.origin.city} → ${t.destination.city}`),
      el('div', { style: 'margin-top:2px' }, `${t.seatsAvailable}/${t.seatsTotal} lugares libres`),
    ]),
    el('div', { class: 'row tight', style: 'margin-top:10px;flex-wrap:wrap' }, [
      t.preferences && t.preferences.pets ? el('span', { class: 'badge' }, 'Mascotas OK') : null,
      t.preferences && t.preferences.smoking === false ? el('span', { class: 'badge' }, 'No fumador') : null,
      el('span', { class: 'badge ok check' }, 'Verificado'),
    ]),
  ]);
}
