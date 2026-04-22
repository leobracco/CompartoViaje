'use strict';

const router = require('express').Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const service = require('./tripService');
const schemas = require('./tripSchema');

router.post('/trips', authenticate(), validate(schemas.createTripSchema), asyncHandler(async (req, res) => {
  const t = await service.createTrip(req.user.sub, req.body);
  res.status(201).json(t);
}));

router.get('/trips/search', validate(schemas.searchTripsSchema, 'query'), asyncHandler(async (req, res) => {
  const trips = await service.searchTrips(req.query);
  res.json({ count: trips.length, results: trips });
}));

router.get('/trips/mine', authenticate(), asyncHandler(async (req, res) => {
  const trips = await service.listByDriver(req.user.sub);
  res.json(trips);
}));

router.get('/trips/:id', asyncHandler(async (req, res) => {
  const t = await service.getTrip(req.params.id);
  res.json(t);
}));

router.post('/trips/:id/cancel', authenticate(), asyncHandler(async (req, res) => {
  const t = await service.cancelTrip(req.params.id, req.user.sub);
  res.json(t);
}));

router.post('/trips/:id/start', authenticate(), asyncHandler(async (req, res) => {
  const t = await service.markOngoing(req.params.id, req.user.sub);
  res.json(t);
}));

router.post('/trips/:id/complete', authenticate(), asyncHandler(async (req, res) => {
  const t = await service.markCompleted(req.params.id, req.user.sub);
  res.json(t);
}));

module.exports = router;
