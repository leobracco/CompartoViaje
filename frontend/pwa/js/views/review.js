import { el, mount, toast } from '../ui.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { navigate } from '../router.js';

export async function reviewView({ params }) {
  if (!store.token) { navigate('/login'); return; }

  let stars = 5;
  const starsEl = el('div', { class: 'row', style: 'gap:4px;font-size:28px' });
  function render() {
    starsEl.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      starsEl.appendChild(el('span', {
        style: `cursor:pointer;color:${i <= stars ? '#00aff5' : '#d3dee1'}`,
        onclick: () => { stars = i; render(); },
      }, '★'));
    }
  }
  render();

  const commentEl = el('textarea', { rows: '4', placeholder: '¿Cómo fue el viaje?' });
  const form = el('form', { class: 'card stack' }, [
    el('h1', {}, 'Dejá tu reseña'),
    starsEl,
    commentEl,
    el('button', { type: 'submit' }, 'Publicar reseña'),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.createReview({ bookingId: params.bookingId, stars, comment: commentEl.value });
      toast('¡Gracias por tu reseña!');
      navigate('/bookings');
    } catch (err) { toast(err.message || 'Error'); }
  });

  mount(form);
}
