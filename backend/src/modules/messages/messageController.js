'use strict';

const router = require('express').Router();
const { z } = require('zod');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const service = require('./messageService');

const sendSchema = z.object({
  tripId: z.string().min(1),
  toUserId: z.string().min(1),
  body: z.string().min(1).max(2000),
});

router.post('/messages', authenticate(), validate(sendSchema), asyncHandler(async (req, res) => {
  const m = await service.sendMessage(req.user.sub, req.body);
  res.status(201).json(m);
}));

router.get('/messages/thread', authenticate(), asyncHandler(async (req, res) => {
  const { tripId, otherUserId } = req.query;
  const msgs = await service.listThread(tripId, req.user.sub, otherUserId);
  res.json(msgs);
}));

router.post('/messages/thread/read', authenticate(), asyncHandler(async (req, res) => {
  const { tripId, otherUserId } = req.body;
  const r = await service.markThreadRead(tripId, req.user.sub, otherUserId);
  res.json(r);
}));

module.exports = router;
