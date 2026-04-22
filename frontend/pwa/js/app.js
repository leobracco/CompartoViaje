import { route, dispatch } from './router.js';
import { store } from './store.js';
import { connect } from './ws.js';
import { homeView } from './views/home.js';
import { searchView } from './views/search.js';
import { tripView } from './views/trip.js';
import { publishView } from './views/publish.js';
import { bookingsView } from './views/bookings.js';
import { meView, verifyView, vehicleView } from './views/me.js';
import { loginView, registerView } from './views/auth.js';
import { chatView } from './views/chat.js';
import { adminView } from './views/admin.js';
import { reviewView } from './views/review.js';

route('/', homeView);
route('/search', searchView);
route('/trip/:id', tripView);
route('/publish', publishView);
route('/bookings', bookingsView);
route('/me', meView);
route('/me/verify', verifyView);
route('/me/vehicle', vehicleView);
route('/login', loginView);
route('/register', registerView);
route('/chat/:tripId/:userId', chatView);
route('/admin', adminView);
route('/review/:bookingId', reviewView);

function refreshNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = '';
  if (store.token) {
    const name = store.user && store.user.fullName ? store.user.fullName.split(' ')[0] : 'Perfil';
    nav.innerHTML = `<a href="#/me">${name}</a>`;
  } else {
    nav.innerHTML = '<a href="#/login">Ingresar</a><a href="#/register" class="active">Registrarme</a>';
  }
}

function refreshActive() {
  const path = (location.hash || '#/').slice(1).split('?')[0];
  for (const a of document.querySelectorAll('.bottombar a')) {
    const href = a.getAttribute('href');
    const segment = href.slice(1);
    const isActive = segment === path || (segment === '/' && path === '/') ||
      (segment !== '/' && path.startsWith(segment));
    a.classList.toggle('active', isActive);
  }
}

refreshNav();
refreshActive();
window.addEventListener('hashchange', () => {
  refreshNav();
  refreshActive();
});
connect();
dispatch();
