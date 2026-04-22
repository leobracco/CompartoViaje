'use strict';

const router = require('express').Router();

router.use('/api', require('./modules/users/userController'));
router.use('/api', require('./modules/trips/tripController'));
router.use('/api', require('./modules/bookings/bookingController'));
router.use('/api', require('./modules/payments/paymentController'));
router.use('/api', require('./modules/reviews/reviewController'));
router.use('/api', require('./modules/messages/messageController'));
router.use('/api', require('./modules/notifications/notificationController'));
router.use('/api', require('./modules/matching/matchingController'));
router.use('/api', require('./modules/admin/adminController'));

router.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'compartoviaje-api', time: new Date().toISOString() });
});

module.exports = router;
