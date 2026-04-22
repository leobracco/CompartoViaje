'use strict';

const reviewRepo = require('./reviewRepository');
const bookingRepo = require('../bookings/bookingRepository');
const userService = require('../users/userService');
const { BadRequest, Forbidden } = require('../../utils/errors');

async function createReview(authorId, data) {
  const booking = await bookingRepo.getById(data.bookingId);
  if (booking.status !== 'completed') throw BadRequest('Solo podés reseñar viajes completados');

  let targetUserId, role;
  if (authorId === booking.passengerId) {
    targetUserId = booking.driverId;
    role = 'passenger';
  } else if (authorId === booking.driverId) {
    targetUserId = booking.passengerId;
    role = 'driver';
  } else {
    throw Forbidden('No participaste en este viaje');
  }

  const existing = await reviewRepo.find({ bookingId: data.bookingId, authorId });
  if (existing.length) throw BadRequest('Ya reseñaste esta reserva');

  const review = await reviewRepo.create({
    bookingId: booking._id,
    tripId: booking.tripId,
    authorId,
    targetUserId,
    role,
    stars: data.stars,
    comment: data.comment,
  });

  await userService.updateRatingAggregate(targetUserId, data.stars);
  return review;
}

async function getForUser(userId) {
  const docs = await reviewRepo.byTarget(userId);
  return docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

module.exports = { createReview, getForUser };
