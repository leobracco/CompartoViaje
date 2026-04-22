'use strict';

const { z } = require('zod');

// Documento CouchDB: trip
// {
//   _id, _rev, type: "trip",
//   driverId,
//   origin: { city, province, address?, lat?, lng? },
//   destination: { city, province, address?, lat?, lng? },
//   stops: [ { city, province, priceFromOrigin } ],
//   departureAt (ISO), estimatedArrivalAt,
//   seatsTotal, seatsAvailable,
//   pricePerSeat, currency: "ARS",
//   vehicleSnapshot: { brand, model, plate, color },
//   preferences: { smoking, pets, music, luggage },
//   status: "published|full|ongoing|completed|cancelled",
//   cancellationPolicy: "flexible|moderate|strict",
//   description,
//   createdAt, updatedAt
// }

const placeSchema = z.object({
  city: z.string().min(2),
  province: z.string().min(2),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const createTripSchema = z.object({
  origin: placeSchema,
  destination: placeSchema,
  stops: z.array(placeSchema.extend({ priceFromOrigin: z.number().nonnegative().optional() })).default([]),
  departureAt: z.string().datetime(),
  estimatedArrivalAt: z.string().datetime().optional(),
  seatsTotal: z.number().int().min(1).max(8),
  pricePerSeat: z.number().positive(),
  currency: z.literal('ARS').default('ARS'),
  preferences: z.object({
    smoking: z.boolean().default(false),
    pets: z.boolean().default(false),
    music: z.boolean().default(true),
    luggage: z.enum(['small', 'medium', 'large']).default('medium'),
  }).default({}),
  cancellationPolicy: z.enum(['flexible', 'moderate', 'strict']).default('moderate'),
  description: z.string().max(500).optional(),
});

const searchTripsSchema = z.object({
  originCity: z.string().optional(),
  destinationCity: z.string().optional(),
  date: z.string().optional(), // YYYY-MM-DD
  maxPrice: z.coerce.number().optional(),
  minSeats: z.coerce.number().int().min(1).default(1),
  minDriverRating: z.coerce.number().min(0).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  skip: z.coerce.number().int().min(0).default(0),
});

module.exports = { createTripSchema, searchTripsSchema, placeSchema };
