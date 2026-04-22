'use strict';

const router = require('express').Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate, requireRole } = require('../../middleware/auth');
const userRepo = require('../users/userRepository');
const tripRepo = require('../trips/tripRepository');
const bookingRepo = require('../bookings/bookingRepository');
const paymentRepo = require('../payments/paymentRepository');
const reviewRepo = require('../reviews/reviewRepository');

router.use('/admin', authenticate(), requireRole('admin'));

router.get('/admin/metrics', asyncHandler(async (req, res) => {
  const [users, trips, bookings, payments] = await Promise.all([
    userRepo.count(),
    tripRepo.count(),
    bookingRepo.count(),
    paymentRepo.count(),
  ]);

  const heldPayments = await paymentRepo.find({ status: 'held' }, { limit: 10000 });
  const releasedPayments = await paymentRepo.find({ status: 'released' }, { limit: 10000 });
  const heldAmount = heldPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const released = releasedPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const feeRevenue = releasedPayments.reduce((s, p) => s + (p.platformFee || 0), 0);

  res.json({
    users,
    trips,
    bookings,
    payments,
    amounts: {
      held: heldAmount,
      released,
      platformRevenue: Math.round(feeRevenue * 100) / 100,
      currency: 'ARS',
    },
  });
}));

router.get('/admin/verifications/pending', asyncHandler(async (req, res) => {
  const all = await userRepo.find({}, { limit: 500 });
  const pending = all.filter((u) => {
    const v = u.verification || {};
    return ['identity', 'license', 'insurance'].some((k) => v[k] && v[k].status === 'pending');
  });
  res.json(pending.map((u) => ({
    id: u._id,
    email: u.email,
    fullName: u.fullName,
    verification: u.verification,
  })));
}));

router.get('/admin/heatmap/routes', asyncHandler(async (req, res) => {
  // Top rutas más demandadas (origen -> destino)
  const trips = await tripRepo.find({}, { limit: 10000 });
  const bookings = await bookingRepo.find({}, { limit: 10000 });

  const tripRoute = new Map();
  for (const t of trips) {
    tripRoute.set(t._id, `${t.origin && t.origin.city} → ${t.destination && t.destination.city}`);
  }

  const counter = new Map();
  for (const b of bookings) {
    const route = tripRoute.get(b.tripId);
    if (!route) continue;
    counter.set(route, (counter.get(route) || 0) + (b.seats || 1));
  }

  const top = [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([route, demand]) => ({ route, demand }));

  res.json(top);
}));

router.post('/admin/users/:id/disable', asyncHandler(async (req, res) => {
  const u = await userRepo.update(req.params.id, { disabled: true });
  res.json({ ok: true, id: u._id });
}));

router.post('/admin/users/:id/enable', asyncHandler(async (req, res) => {
  const u = await userRepo.update(req.params.id, { disabled: false });
  res.json({ ok: true, id: u._id });
}));

router.post('/admin/users/:id/grant-admin', asyncHandler(async (req, res) => {
  const u = await userRepo.getById(req.params.id);
  const roles = [...new Set([...(u.roles || []), 'admin'])];
  await userRepo.update(req.params.id, { roles });
  res.json({ ok: true });
}));

module.exports = router;
