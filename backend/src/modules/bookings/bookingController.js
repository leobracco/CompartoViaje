'use strict';

const router = require('express').Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const service = require('./bookingService');
const schemas = require('./bookingSchema');

router.post('/bookings', authenticate(), validate(schemas.createBookingSchema), asyncHandler(async (req, res) => {
  const result = await service.createBooking(req.user.sub, req.body);
  res.status(201).json(result);
}));

router.get('/bookings/mine', authenticate(), asyncHandler(async (req, res) => {
  const docs = await service.listMineAsPassenger(req.user.sub);
  res.json(docs);
}));

router.get('/bookings/received', authenticate(), asyncHandler(async (req, res) => {
  const docs = await service.listMineAsDriver(req.user.sub);
  res.json(docs);
}));

router.get('/bookings/trip/:tripId', authenticate(), asyncHandler(async (req, res) => {
  const docs = await service.listForTrip(req.params.tripId, req.user.sub);
  res.json(docs);
}));

router.get('/bookings/:id', authenticate(), asyncHandler(async (req, res) => {
  const b = await service.getBooking(req.params.id, req.user.sub);
  res.json(b);
}));

router.post('/bookings/:id/approve', authenticate(), asyncHandler(async (req, res) => {
  const b = await service.approveBooking(req.params.id, req.user.sub);
  res.json(b);
}));

router.post('/bookings/:id/reject', authenticate(), asyncHandler(async (req, res) => {
  const b = await service.rejectBooking(req.params.id, req.user.sub, req.body && req.body.reason);
  res.json(b);
}));

router.post('/bookings/:id/cancel', authenticate(), validate(schemas.cancelBookingSchema), asyncHandler(async (req, res) => {
  const b = await service.cancelBooking(req.params.id, req.user.sub, req.body.reason);
  res.json(b);
}));

router.post('/bookings/:id/complete', authenticate(), asyncHandler(async (req, res) => {
  const b = await service.completeBooking(req.params.id, req.user.sub);
  res.json(b);
}));

module.exports = router;
