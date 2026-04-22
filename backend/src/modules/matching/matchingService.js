'use strict';

// Sistema de sugerencias de viajes.
// Heurística simple (proxy de "IA de matching"): puntúa cada viaje según
// coincidencia de rutas, cercanía de fecha, reputación del conductor y precio.

const tripRepo = require('../trips/tripRepository');
const userRepo = require('../users/userRepository');
const bookingRepo = require('../bookings/bookingRepository');

function normalizeCity(s) {
  return (s || '').toLowerCase().trim();
}

function scoreTrip(trip, driver, prefs) {
  let score = 0;
  if (prefs.originCity && normalizeCity(trip.origin.city) === normalizeCity(prefs.originCity)) score += 30;
  if (prefs.destinationCity && normalizeCity(trip.destination.city) === normalizeCity(prefs.destinationCity)) score += 30;

  if (prefs.aroundDate) {
    const diffDays = Math.abs(
      (new Date(trip.departureAt).getTime() - new Date(prefs.aroundDate).getTime()) / 86400000,
    );
    score += Math.max(0, 15 - diffDays * 3);
  } else {
    score += 5; // soon departures
  }

  if (driver && driver.rating) {
    score += driver.rating.average * 4;
    if (driver.rating.count >= 10) score += 5;
  }

  if (prefs.maxPrice && trip.pricePerSeat <= prefs.maxPrice) score += 10;

  if (trip.seatsAvailable >= (prefs.minSeats || 1)) score += 5;

  return score;
}

async function suggestForUser(userId, prefs = {}) {
  const userBookings = await bookingRepo.byPassenger(userId);
  const recent = userBookings.slice(0, 10);

  // Heurística: si no se especifica origen/destino, usar rutas históricas
  if (!prefs.originCity && !prefs.destinationCity && recent.length) {
    const tripIds = [...new Set(recent.map((b) => b.tripId))];
    const trips = await Promise.all(tripIds.map((id) => tripRepo.findById(id)));
    const origins = {};
    const dests = {};
    for (const t of trips) {
      if (!t) continue;
      origins[t.origin.city] = (origins[t.origin.city] || 0) + 1;
      dests[t.destination.city] = (dests[t.destination.city] || 0) + 1;
    }
    prefs.originCity = Object.entries(origins).sort((a, b) => b[1] - a[1])[0]?.[0];
    prefs.destinationCity = Object.entries(dests).sort((a, b) => b[1] - a[1])[0]?.[0];
  }

  const trips = await tripRepo.search({
    originCity: prefs.originCity,
    destinationCity: prefs.destinationCity,
    minSeats: prefs.minSeats || 1,
    maxPrice: prefs.maxPrice,
    limit: 50,
  });

  const driverIds = [...new Set(trips.map((t) => t.driverId))];
  const drivers = await Promise.all(driverIds.map((id) => userRepo.findById(id)));
  const driverMap = new Map(drivers.filter(Boolean).map((d) => [d._id, d]));

  const scored = trips
    .map((t) => ({
      trip: t,
      driver: driverMap.get(t.driverId),
      score: scoreTrip(t, driverMap.get(t.driverId), prefs),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return scored.map(({ trip, driver, score }) => ({
    ...trip,
    driver: driver && {
      id: driver._id,
      fullName: driver.fullName,
      photoUrl: driver.photoUrl,
      rating: driver.rating,
    },
    matchScore: Math.round(score),
  }));
}

module.exports = { suggestForUser };
