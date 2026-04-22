import { el, mount, toast, formatARS } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { navigate } from '../router.js';

export async function adminView() {
  if (!store.token || !store.roles.includes('admin')) {
    toast('Requiere admin');
    navigate('/');
    return;
  }

  mount(el('div', {}, [el('h1', {}, 'Panel de administración'), el('div', { class: 'muted' }, 'Cargando...')]));

  try {
    const [metrics, pending, heatmap] = await Promise.all([
      api.adminMetrics(),
      api.adminPendingVerifications(),
      api.adminHeatmap(),
    ]);

    const verifList = el('div', {}, pending.length ? pending.map(verifCard) : [el('div', { class: 'muted' }, 'Sin pendientes')]);

    mount(el('div', {}, [
      el('h1', {}, 'Panel de administración'),
      el('div', { class: 'card' }, [
        el('h2', {}, 'Métricas'),
        el('div', {}, `Usuarios: ${metrics.users}`),
        el('div', {}, `Viajes: ${metrics.trips}`),
        el('div', {}, `Reservas: ${metrics.bookings}`),
        el('div', {}, `Pagos: ${metrics.payments}`),
        el('div', {}, `Retenido: ${formatARS(metrics.amounts.held)}`),
        el('div', {}, `Liberado: ${formatARS(metrics.amounts.released)}`),
        el('div', {}, `Ingresos plataforma: ${formatARS(metrics.amounts.platformRevenue)}`),
      ]),
      el('div', { class: 'card' }, [
        el('h2', {}, 'Rutas más demandadas'),
        ...(heatmap.length ? heatmap.map((r) => el('div', {}, `${r.route}  ·  ${r.demand} asientos`)) : [el('div', { class: 'muted' }, 'Sin datos aún')]),
      ]),
      el('h2', {}, 'Verificaciones pendientes'),
      verifList,
    ]));
  } catch (err) {
    toast(err.message || 'Error');
  }
}

function verifCard(u) {
  const rows = [];
  for (const k of ['identity', 'license', 'insurance']) {
    const v = u.verification && u.verification[k];
    if (v && v.status === 'pending') {
      rows.push(el('div', { class: 'row', style: 'align-items:center' }, [
        el('div', {}, k),
        el('button', {
          onclick: async () => { try { await api.adminReviewVerification(u.id, k, true); location.reload(); } catch (e) { alert(e.message); } },
        }, 'Aprobar'),
        el('button', {
          class: 'btn danger',
          onclick: async () => { try { await api.adminReviewVerification(u.id, k, false); location.reload(); } catch (e) { alert(e.message); } },
        }, 'Rechazar'),
      ]));
    }
  }
  return el('div', { class: 'card' }, [el('h3', {}, `${u.fullName} — ${u.email}`), ...rows]);
}
