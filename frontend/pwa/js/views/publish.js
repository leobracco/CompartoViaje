import { el, mount, toast } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { navigate } from '../router.js';

export async function publishView() {
  if (!store.token) {
    navigate('/login?next=/publish');
    return;
  }
  let me;
  try {
    me = await api.me();
  } catch {
    navigate('/login');
    return;
  }

  const warnings = [];
  if (!me.roles.includes('driver')) warnings.push('Necesitás habilitar el rol de conductor.');
  if (!me.vehicle) warnings.push('Tenés que cargar tu vehículo.');
  const v = me.verification || {};
  if (v.identity !== 'approved') warnings.push('Verificación de identidad pendiente.');
  if (v.license !== 'approved') warnings.push('Licencia de conducir pendiente.');
  if (v.insurance !== 'approved') warnings.push('Seguro del vehículo pendiente.');

  if (warnings.length) {
    mount(el('div', {}, [
      el('h1', {}, 'Publicar un viaje'),
      el('div', { class: 'card stack' }, [
        el('div', { class: 'muted' }, 'Para publicar, primero completá:'),
        el('ul', {}, warnings.map((w) => el('li', {}, w))),
        el('a', { class: 'btn', href: '#/me' }, 'Ir a mi cuenta'),
      ]),
    ]));
    return;
  }

  const form = el('form', { class: 'card stack' }, [
    el('h1', {}, 'Publicar viaje'),
    el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Ciudad origen'), el('input', { name: 'originCity', required: true })]),
      el('div', { class: 'field' }, [el('label', {}, 'Provincia'), el('input', { name: 'originProvince', required: true })]),
    ]),
    el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Ciudad destino'), el('input', { name: 'destinationCity', required: true })]),
      el('div', { class: 'field' }, [el('label', {}, 'Provincia'), el('input', { name: 'destinationProvince', required: true })]),
    ]),
    el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Fecha y hora'), el('input', { name: 'departureAt', type: 'datetime-local', required: true })]),
      el('div', { class: 'field' }, [el('label', {}, 'Asientos'), el('input', { name: 'seatsTotal', type: 'number', min: '1', max: String(me.vehicle.seats), required: true })]),
    ]),
    el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Precio por asiento (ARS)'), el('input', { name: 'pricePerSeat', type: 'number', min: '1', required: true })]),
      el('div', { class: 'field' }, [
        el('label', {}, 'Política de cancelación'),
        el('select', { name: 'cancellationPolicy' }, [
          el('option', { value: 'flexible' }, 'Flexible'),
          el('option', { value: 'moderate', selected: 'selected' }, 'Moderada'),
          el('option', { value: 'strict' }, 'Estricta'),
        ]),
      ]),
    ]),
    el('div', { class: 'field' }, [el('label', {}, 'Descripción (opcional)'), el('textarea', { name: 'description', rows: '3', maxlength: '500' })]),
    el('button', { type: 'submit' }, 'Publicar'),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    try {
      const trip = await api.createTrip({
        origin: { city: data.originCity, province: data.originProvince },
        destination: { city: data.destinationCity, province: data.destinationProvince },
        departureAt: new Date(data.departureAt).toISOString(),
        seatsTotal: parseInt(data.seatsTotal, 10),
        pricePerSeat: parseFloat(data.pricePerSeat),
        cancellationPolicy: data.cancellationPolicy,
        description: data.description,
      });
      toast('Viaje publicado');
      navigate(`/trip/${trip._id}`);
    } catch (err) {
      toast(err.message || 'No se pudo publicar');
    }
  });

  mount(form);
}
