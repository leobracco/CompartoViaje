'use strict';

const { z } = require('zod');

// Documento CouchDB: review
// { _id, type: "review", bookingId, tripId, authorId, targetUserId,
//   role: "passenger"|"driver", stars: 1..5, comment, createdAt }

const createReviewSchema = z.object({
  bookingId: z.string().min(1),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

module.exports = { createReviewSchema };
