'use strict';

const { z } = require('zod');

// Documento CouchDB: booking
// {
//   _id, _rev, type: "booking",
//   tripId, passengerId, driverId,
//   seats, pricePerSeat, totalAmount, currency,
//   status: "pending_payment|confirmed|rejected|cancelled|completed|refunded",
//   passengerMessage,
//   paymentId, paymentStatus,
//   confirmedAt, cancelledAt, completedAt,
//   createdAt, updatedAt
// }

const createBookingSchema = z.object({
  tripId: z.string().min(1),
  seats: z.number().int().min(1).max(8),
  passengerMessage: z.string().max(300).optional(),
});

const cancelBookingSchema = z.object({
  reason: z.string().max(300).optional(),
});

module.exports = { createBookingSchema, cancelBookingSchema };
