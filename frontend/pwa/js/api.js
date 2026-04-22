import { store } from './store.js';

const BASE = '/api';

async function request(method, path, body, opts = {}) {
  const headers = { 'Accept': 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (store.token && !opts.noAuth) headers['Authorization'] = `Bearer ${store.token}`;

  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    throw { code: 'offline', message: 'Sin conexión' };
  }
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) {
    const err = (data && data.error) || { code: `http_${res.status}`, message: res.statusText };
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  patch: (p, b) => request('PATCH', p, b),
  put: (p, b) => request('PUT', p, b),
  del: (p) => request('DELETE', p),

  // auth
  register: (body) => request('POST', '/auth/register', body, { noAuth: true }),
  login: (body) => request('POST', '/auth/login', body, { noAuth: true }),
  refresh: (refreshToken) => request('POST', '/auth/refresh', { refreshToken }, { noAuth: true }),
  me: () => request('GET', '/users/me'),
  updateMe: (body) => request('PATCH', '/users/me', body),
  becomeDriver: () => request('POST', '/users/me/become-driver'),
  setVehicle: (body) => request('PUT', '/users/me/vehicle', body),
  submitIdentity: (body) => request('POST', '/users/me/verify/identity', body),
  submitLicense: (body) => request('POST', '/users/me/verify/license', body),
  submitInsurance: (body) => request('POST', '/users/me/verify/insurance', body),

  // trips
  createTrip: (body) => request('POST', '/trips', body),
  searchTrips: (params) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return request('GET', `/trips/search${qs ? `?${qs}` : ''}`);
  },
  tripsMine: () => request('GET', '/trips/mine'),
  getTrip: (id) => request('GET', `/trips/${id}`),
  cancelTrip: (id) => request('POST', `/trips/${id}/cancel`),
  startTrip: (id) => request('POST', `/trips/${id}/start`),
  completeTrip: (id) => request('POST', `/trips/${id}/complete`),

  // bookings
  createBooking: (body) => request('POST', '/bookings', body),
  myBookings: () => request('GET', '/bookings/mine'),
  receivedBookings: () => request('GET', '/bookings/received'),
  bookingsForTrip: (tripId) => request('GET', `/bookings/trip/${tripId}`),
  approveBooking: (id) => request('POST', `/bookings/${id}/approve`),
  rejectBooking: (id, reason) => request('POST', `/bookings/${id}/reject`, { reason }),
  cancelBooking: (id, reason) => request('POST', `/bookings/${id}/cancel`, { reason }),
  completeBooking: (id) => request('POST', `/bookings/${id}/complete`),

  // reviews
  createReview: (body) => request('POST', '/reviews', body),
  reviewsForUser: (userId) => request('GET', `/reviews/user/${userId}`),

  // messages
  sendMessage: (body) => request('POST', '/messages', body),
  thread: (tripId, otherUserId) => request('GET', `/messages/thread?tripId=${tripId}&otherUserId=${otherUserId}`),
  markThreadRead: (tripId, otherUserId) => request('POST', '/messages/thread/read', { tripId, otherUserId }),

  // notifications
  notifications: () => request('GET', '/notifications'),
  readNotif: (id) => request('POST', `/notifications/${id}/read`),

  // matching
  suggest: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return request('GET', `/matching/suggest${qs ? `?${qs}` : ''}`);
  },

  // admin
  adminMetrics: () => request('GET', '/admin/metrics'),
  adminPendingVerifications: () => request('GET', '/admin/verifications/pending'),
  adminReviewVerification: (userId, kind, approved) => request('POST', `/admin/verifications/${userId}/${kind}`, { approved }),
  adminHeatmap: () => request('GET', '/admin/heatmap/routes'),
};
