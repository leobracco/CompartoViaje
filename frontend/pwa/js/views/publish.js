import { el, mount, toast } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { navigate } from '../router.js';

export async function publishView() {
  if (!store.token) { navigate('/login?next=/publish'); return; }
  let me;
  try { me = await api.me(); } catch { navigate('/login'); return; }

  const warnings = [];
  if (!me.roles.includes('driver')) warnings.push('Necesitás habilitar el rol de conductor.');
  if (!me.vehicle) warnings.push('Tenés que cargar tu vehículo.');
  const v = me.verification || {};
  if (v.identity !== 'approved') warnings.push('Verificación de identidad pendiente.');
  if (v.license !== 'approved') warnings.push('Licencia de conducir pendiente.');
  if (v.insurance !== 'approved') warnings.push('Seguro del vehículo pendiente.');

  if (warnings.length) {
    mount(el('div', {}, [
      el('section', { class: 'hero conductor-hero' }, [
        el('span', { class: 'kicker' }, 'Conductor'),
        el('h1', {}, 'Publicar viaje'),
      ]),
      el('div', { class: 'card stack' }, [
        el('div', { class: 'muted' }, 'Para publicar, primero completá:'),
        el('ul', { style: 'padding-left:18px;margin:0' }, warnings.map((w) => el('li', {}, w))),
        el('a', { class: 'btn conductor block', href: '#/me' }, 'Ir a mi cuenta'),
      ]),
    ]));
    return;
  }

  const stepper = el('div', { class: 'stepper' }, [
    el('div', { class: 'seg active' }),
    el('div', { class: 'seg active' }),
    el('div', { class: 'seg' }),
  ]);

  const form = el('form', { class: 'stack' }, [
    el('section', { class: 'hero conductor-hero' }, [
      el('span', { class: 'kicker' }, 'Conductor'),
      el('h1', {}, 'Publicar viaje'),
    ]),
    el('div', { class: 'card stack' }, [
      el('div', { class: 'label' }, 'Paso 2 de 3 · Detalles'),
      stepper,
      el('div', { class: 'label' }, 'Ruta'),
      el('div', { class: 'stack', style: 'gap:6px' }, [
        el('div', { class: 'field' }, [el('input', { name: 'originCity', placeholder: 'Buenos Aires', required: true })]),
        el('div', { class: 'field' }, [el('input', { name: 'destinationCity', placeholder: 'Mar del Plata', required: true })]),
      ]),
      el('div', { class: 'row' }, [
        el('div', { class: 'field' }, [el('label', {}, 'Provincia origen'), el('input', { name: 'originProvince', placeholder: 'CABA', required: true })]),
        el('div', { class: 'field' }, [el('label', {}, 'Provincia destino'), el('input', { name: 'destinationProvince', placeholder: 'Buenos Aires', required: true })]),
      ]),
      el('div', { class: 'row' }, [
        el('div', { class: 'field' }, [el('label', {}, 'Fecha y hora'), el('input', { name: 'departureAt', type: 'datetime-local', required: true })]),
        el('div', { class: 'field' }, [el('label', {}, 'Asientos'), el('input', { name: 'seatsTotal', type: 'number', min: '1', max: String(me.vehicle.seats), value: '3', required: true })]),
      ]),
      el('div', { class: 'label' }, 'Precio por asiento'),
      el('div', { class: 'field' }, [el('input', { name: 'pricePerSeat', type: 'number', min: '1', step: '100', placeholder: '4800', required: true })]),
      el('div', { class: 'field' }, [
        el('label', {}, 'Política de cancelación'),
        el('select', { name: 'cancellationPolicy' }, [
          el('option', { value: 'flexible' }, 'Flexible'),
          el('option', { value: 'moderate', selected: 'selected' }, 'Moderada'),
          el('option', { value: 'strict' }, 'Estricta'),
        ]),
      ]),
      el('div', { class: 'field' }, [el('label', {}, 'Descripción (opcional)'), el('textarea', { name: 'description', rows: '3', maxlength: '500', placeholder: '"Viaje cómodo, salgo desde Palermo"' })]),
      el('button', { type: 'submit', class: 'conductor block' }, 'Publicar viaje →'),
    ]),
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
      toast('¡Viaje publicado!');
      navigate(`/trip/${trip._id}`);
    } catch (err) {
      toast(err.message || 'No se pudo publicar');
    }
  });

  mount(form);
}
