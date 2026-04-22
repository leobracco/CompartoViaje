'use strict';

const router = require('express').Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const service = require('./matchingService');

router.get('/matching/suggest', authenticate(), asyncHandler(async (req, res) => {
  const prefs = {
    originCity: req.query.originCity,
    destinationCity: req.query.destinationCity,
    aroundDate: req.query.date,
    maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
    minSeats: req.query.minSeats ? Number(req.query.minSeats) : 1,
  };
  const list = await service.suggestForUser(req.user.sub, prefs);
  res.json(list);
}));

module.exports = router;
