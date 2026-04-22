'use strict';

const router = require('express').Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const service = require('./paymentService');

router.post('/payments/webhook', asyncHandler(async (req, res) => {
  const result = await service.handleWebhook(req.body);
  res.json(result);
}));

router.get('/payments/booking/:bookingId', authenticate(), asyncHandler(async (req, res) => {
  const p = await service.getByBooking(req.params.bookingId);
  res.json(p);
}));

module.exports = router;
