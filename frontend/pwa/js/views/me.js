import { el, mount, toast, ratingStars } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { navigate } from '../router.js';

export async function meView() {
  if (!store.token) { navigate('/login?next=/me'); return; }
  let me;
  try { me = await api.me(); }
  catch { store.logout(); navigate('/login'); return; }

  const verif = me.verification;
  const verifCard = el('div', { class: 'card stack' }, [
    el('h2', {}, 'Verificaciones'),
    verifRow('Email', verif.email ? 'ok' : 'pendiente'),
    verifRow('Identidad', verif.identity),
    verifRow('Licencia', verif.license),
    verifRow('Seguro', verif.insurance),
    el('div', { class: 'row' }, [
      el('a', { class: 'btn secondary', href: '#/me/verify' }, 'Enviar documentos'),
      el('a', { class: 'btn secondary', href: '#/me/vehicle' }, 'Mi vehículo'),
    ]),
  ]);

  const roles = me.roles.join(', ');

  const isAdmin = me.roles.includes('admin');

  mount(el('div', {}, [
    el('h1', {}, `Hola, ${me.fullName}`),
    el('div', { class: 'card' }, [
      el('div', {}, `Email: ${me.email}`),
      el('div', {}, `Teléfono: ${me.phone || '(sin cargar)'}`),
      el('div', {}, `Roles: ${roles}`),
      el('div', { class: 'rating' }, ratingStars(me.rating)),
    ]),
    verifCard,
    !me.roles.includes('driver') ? el('div', { class: 'card' }, [
      el('div', {}, 'Querés ser conductor?'),
      el('button', {
        onclick: async () => { await api.becomeDriver(); toast('Rol conductor agregado'); location.reload(); },
      }, 'Convertirme en conductor'),
    ]) : null,
    isAdmin ? el('a', { class: 'btn secondary', href: '#/admin' }, 'Panel de administración') : null,
    el('button', { class: 'btn ghost', onclick: () => { store.logout(); navigate('/'); location.reload(); } }, 'Cerrar sesión'),
  ]));
}

function verifRow(label, status) {
  const map = {
    ok: ['ok', 'Aprobado'],
    approved: ['ok', 'Aprobado'],
    pending: ['warn', 'En revisión'],
    rejected: ['danger', 'Rechazado'],
    none: ['', 'Sin enviar'],
    pendiente: ['warn', 'Pendiente'],
  };
  const [cls, text] = map[status] || ['', status];
  return el('div', { class: 'row', style: 'align-items:center' }, [
    el('div', {}, label),
    el('span', { class: `badge ${cls}` }, text),
  ]);
}

export async function verifyView() {
  if (!store.token) { navigate('/login'); return; }
  const form = (fields, submit, label) => {
    const f = el('form', { class: 'card stack' }, [
      ...fields.map((n) => el('div', { class: 'field' }, [el('label', {}, n.label), el('input', { name: n.name, type: n.type || 'text', required: true })])),
      el('button', { type: 'submit' }, label),
    ]);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(f).entries());
      try {
        await submit(data);
        toast('Enviado para revisión');
        navigate('/me');
      } catch (err) { toast(err.message || 'Error'); }
    });
    return f;
  };

  mount(el('div', {}, [
    el('h1', {}, 'Enviar verificaciones'),
    el('h2', {}, 'Identidad'),
    form(
      [
        { label: 'URL foto DNI frente', name: 'dniFrontUrl', type: 'url' },
        { label: 'URL foto DNI dorso', name: 'dniBackUrl', type: 'url' },
        { label: 'URL selfie', name: 'selfieUrl', type: 'url' },
      ],
      (d) => api.submitIdentity(d),
      'Enviar identidad',
    ),
    el('h2', {}, 'Licencia de conducir'),
    form(
      [
        { label: 'Número', name: 'number' },
        { label: 'Vence el (YYYY-MM-DD)', name: 'expiresAt' },
        { label: 'URL imagen', name: 'imageUrl', type: 'url' },
      ],
      (d) => api.submitLicense({ ...d, expiresAt: new Date(d.expiresAt).toISOString() }),
      'Enviar licencia',
    ),
    el('h2', {}, 'Seguro'),
    form(
      [
        { label: 'Número de póliza', name: 'policy' },
        { label: 'Vence el (YYYY-MM-DD)', name: 'expiresAt' },
        { label: 'URL imagen', name: 'imageUrl', type: 'url' },
      ],
      (d) => api.submitInsurance({ ...d, expiresAt: new Date(d.expiresAt).toISOString() }),
      'Enviar seguro',
    ),
  ]));
}

export async function vehicleView() {
  if (!store.token) { navigate('/login'); return; }
  let me;
  try { me = await api.me(); } catch { navigate('/login'); return; }
  const v = me.vehicle || {};

  const form = el('form', { class: 'card stack' }, [
    el('h1', {}, 'Mi vehículo'),
    ...['plate', 'brand', 'model', 'color'].map((n) => el('div', { class: 'field' }, [
      el('label', {}, n),
      el('input', { name: n, value: v[n] || '', required: true }),
    ])),
    el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Año'), el('input', { name: 'year', type: 'number', min: '1980', value: v.year || '' })]),
      el('div', { class: 'field' }, [el('label', {}, 'Asientos'), el('input', { name: 'seats', type: 'number', min: '1', max: '8', value: v.seats || '4' })]),
    ]),
    el('button', { type: 'submit' }, 'Guardar'),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries());
    try {
      await api.setVehicle({ ...d, year: parseInt(d.year, 10), seats: parseInt(d.seats, 10) });
      toast('Vehículo guardado');
      navigate('/me');
    } catch (err) { toast(err.message || 'Error'); }
  });

  mount(form);
}
