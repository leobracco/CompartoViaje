'use strict';

const router = require('express').Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const service = require('./reviewService');
const schemas = require('./reviewSchema');

router.post('/reviews', authenticate(), validate(schemas.createReviewSchema), asyncHandler(async (req, res) => {
  const r = await service.createReview(req.user.sub, req.body);
  res.status(201).json(r);
}));

router.get('/reviews/user/:userId', asyncHandler(async (req, res) => {
  const docs = await service.getForUser(req.params.userId);
  res.json(docs);
}));

module.exports = router;
