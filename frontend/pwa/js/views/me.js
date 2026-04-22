import { el, mount, toast, ratingStars, initials } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { navigate } from '../router.js';

export async function meView() {
  if (!store.token) { navigate('/login?next=/me'); return; }
  let me;
  try { me = await api.me(); } catch { store.logout(); navigate('/login'); return; }

  const verif = me.verification;
  const isDriver = me.roles.includes('driver');
  const isAdmin = me.roles.includes('admin');
  const memberYear = me.createdAt ? new Date(me.createdAt).getFullYear() : new Date().getFullYear();
  const yearsMember = Math.max(0, new Date().getFullYear() - memberYear);

  const hero = el('section', { class: 'hero' }, [
    el('div', { style: 'display:flex;gap:14px;align-items:center;position:relative' }, [
      el('span', {
        style: 'width:64px;height:64px;border-radius:50%;background:white;color:var(--celeste-dark);display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;flex-shrink:0',
      }, initials(me.fullName)),
      el('div', { style: 'flex:1;color:white' }, [
        el('div', { style: 'font-family:var(--font-serif);font-size:24px;font-weight:600' }, me.fullName),
        el('div', { style: 'opacity:.9;font-size:13px' }, [
          isDriver ? 'Conductor · ' : 'Pasajero · ',
          me.phone ? 'Argentina' : 'Perfil',
        ]),
        el('div', { style: 'margin-top:4px' }, [el('span', { class: 'rating' }, ratingStars(me.rating))]),
      ]),
    ]),
    el('div', { class: 'row', style: 'margin-top:16px;position:relative' }, [
      stat('Email', me.email ? '✓' : '—'),
      stat('Rating', me.rating && me.rating.count ? me.rating.average.toFixed(1) + '★' : '—'),
      stat('Miembro', `${yearsMember} año${yearsMember === 1 ? '' : 's'}`),
    ]),
  ]);

  const verifCard = el('div', { class: 'card' }, [
    el('div', { class: 'label', style: 'margin-bottom:10px' }, 'Verificaciones'),
    el('div', { class: 'verif-list' }, [
      verifRow('DNI verificado', 'Identidad confirmada', verif.identity),
      verifRow('Email verificado', me.email, verif.email ? 'approved' : 'none'),
      verifRow('Licencia de conducir', isDriver ? 'Vigente hasta 2026' : 'No aplica', verif.license),
      verifRow('Seguro del vehículo', me.vehicle ? `${me.vehicle.brand || ''} ${me.vehicle.model || ''}` : 'No aplica', verif.insurance),
      verifRow('Teléfono verificado', me.phone || '—', verif.phone ? 'approved' : 'none'),
    ]),
    el('div', { class: 'row', style: 'margin-top:12px' }, [
      el('a', { class: 'btn secondary block', href: '#/me/verify' }, 'Enviar documentos'),
      el('a', { class: 'btn secondary block', href: '#/me/vehicle' }, 'Mi vehículo'),
    ]),
  ]);

  mount(el('div', {}, [
    hero,
    verifCard,
    !isDriver ? el('div', { class: 'card center' }, [
      el('div', { style: 'margin-bottom:8px' }, '¿Querés ofrecer viajes?'),
      el('button', {
        class: 'conductor',
        onclick: async () => { await api.becomeDriver(); toast('Rol conductor agregado'); location.reload(); },
      }, 'Convertirme en conductor'),
    ]) : null,
    isAdmin ? el('a', { class: 'btn secondary block', href: '#/admin' }, 'Panel de administración') : null,
    el('button', { class: 'btn ghost block', onclick: () => { store.logout(); location.hash = '#/'; location.reload(); } }, 'Cerrar sesión'),
  ]));
}

function stat(label, value) {
  return el('div', {
    style: 'background:rgba(255,255,255,0.18);border-radius:14px;padding:10px;text-align:center;color:white;backdrop-filter:blur(8px)',
  }, [
    el('div', { style: 'font-family:var(--font-serif);font-size:20px;font-weight:600' }, value),
    el('div', { style: 'font-size:11px;font-weight:700;letter-spacing:0.12em;opacity:.85' }, label.toUpperCase()),
  ]);
}

function verifRow(title, subtitle, status) {
  const map = { approved: 'ok', pending: 'pending', rejected: 'rejected', none: 'none' };
  const cls = map[status] || 'none';
  const icon = status === 'approved' ? '✓' : status === 'pending' ? '…' : status === 'rejected' ? '✗' : '–';
  return el('div', { class: `verif-item ${cls}` }, [
    el('span', { class: 'check' }, icon),
    el('div', { class: 'info' }, [
      el('div', { class: 't' }, title),
      el('div', { class: 's' }, subtitle || '—'),
    ]),
  ]);
}

export async function verifyView() {
  if (!store.token) { navigate('/login'); return; }
  const form = (title, fields, submit, label) => {
    const f = el('form', { class: 'card stack' }, [
      el('h2', { style: 'margin-top:0' }, title),
      ...fields.map((n) => el('div', { class: 'field' }, [el('label', {}, n.label), el('input', { name: n.name, type: n.type || 'text', required: true })])),
      el('button', { type: 'submit', class: 'block' }, label),
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
    form('Identidad',
      [
        { label: 'URL foto DNI frente', name: 'dniFrontUrl', type: 'url' },
        { label: 'URL foto DNI dorso', name: 'dniBackUrl', type: 'url' },
        { label: 'URL selfie', name: 'selfieUrl', type: 'url' },
      ],
      (d) => api.submitIdentity(d),
      'Enviar identidad',
    ),
    form('Licencia de conducir',
      [
        { label: 'Número', name: 'number' },
        { label: 'Vence el (YYYY-MM-DD)', name: 'expiresAt' },
        { label: 'URL imagen', name: 'imageUrl', type: 'url' },
      ],
      (d) => api.submitLicense({ ...d, expiresAt: new Date(d.expiresAt).toISOString() }),
      'Enviar licencia',
    ),
    form('Seguro',
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
    el('h1', { style: 'margin-top:0' }, 'Mi vehículo'),
    ...['plate', 'brand', 'model', 'color'].map((n) => el('div', { class: 'field' }, [
      el('label', {}, n),
      el('input', { name: n, value: v[n] || '', required: true }),
    ])),
    el('div', { class: 'row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Año'), el('input', { name: 'year', type: 'number', min: '1980', value: v.year || '' })]),
      el('div', { class: 'field' }, [el('label', {}, 'Asientos'), el('input', { name: 'seats', type: 'number', min: '1', max: '8', value: v.seats || '4' })]),
    ]),
    el('button', { type: 'submit', class: 'conductor block' }, 'Guardar'),
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
