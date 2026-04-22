'use strict';

const router = require('express').Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const service = require('./notificationService');

router.get('/notifications', authenticate(), asyncHandler(async (req, res) => {
  const list = await service.listForUser(req.user.sub);
  res.json(list);
}));

router.post('/notifications/:id/read', authenticate(), asyncHandler(async (req, res) => {
  const n = await service.markRead(req.user.sub, req.params.id);
  res.json(n);
}));

router.post('/notifications/read-all', authenticate(), asyncHandler(async (req, res) => {
  const r = await service.markAllRead(req.user.sub);
  res.json(r);
}));

module.exports = router;
