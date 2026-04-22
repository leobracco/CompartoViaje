'use strict';

const tripRepo = require('./tripRepository');
const userRepo = require('../users/userRepository');
const { BadRequest, Forbidden, NotFound } = require('../../utils/errors');

function ensureDriverReady(user) {
  if (!user.roles || !user.roles.includes('driver')) throw Forbidden('Requiere rol conductor');
  if (!user.vehicle) throw BadRequest('Debés registrar un vehículo antes de publicar viajes');
  const v = user.verification || {};
  const needsApproved = ['identity', 'license', 'insurance'];
  for (const k of needsApproved) {
    if (!v[k] || v[k].status !== 'approved') {
      throw Forbidden(`Verificación ${k} pendiente de aprobación`);
    }
  }
}

async function createTrip(driverId, data) {
  const driver = await userRepo.getById(driverId);
  ensureDriverReady(driver);

  if (new Date(data.departureAt).getTime() < Date.now()) {
    throw BadRequest('La fecha de salida debe ser futura');
  }
  if (data.seatsTotal > driver.vehicle.seats) {
    throw BadRequest('La cantidad de asientos supera el vehículo');
  }

  const trip = await tripRepo.create({
    driverId,
    origin: data.origin,
    destination: data.destination,
    stops: data.stops || [],
    departureAt: data.departureAt,
    estimatedArrivalAt: data.estimatedArrivalAt,
    seatsTotal: data.seatsTotal,
    seatsAvailable: data.seatsTotal,
    pricePerSeat: data.pricePerSeat,
    currency: data.currency || 'ARS',
    vehicleSnapshot: {
      brand: driver.vehicle.brand,
      model: driver.vehicle.model,
      plate: driver.vehicle.plate,
      color: driver.vehicle.color,
    },
    preferences: data.preferences,
    cancellationPolicy: data.cancellationPolicy,
    description: data.description,
    status: 'published',
  });

  return trip;
}

async function getTrip(tripId) {
  const trip = await tripRepo.getById(tripId);
  const driver = await userRepo.findById(trip.driverId);
  return {
    ...trip,
    driver: driver
      ? {
          id: driver._id,
          fullName: driver.fullName,
          photoUrl: driver.photoUrl,
          rating: driver.rating || { average: 0, count: 0 },
        }
      : null,
  };
}

async function searchTrips(filters) {
  const trips = await tripRepo.search(filters);
  // Hidratar drivers
  const driverIds = [...new Set(trips.map((t) => t.driverId))];
  const drivers = await Promise.all(driverIds.map((id) => userRepo.findById(id)));
  const byId = new Map(drivers.filter(Boolean).map((d) => [d._id, d]));

  let result = trips.map((t) => {
    const d = byId.get(t.driverId);
    return {
      ...t,
      driver: d
        ? { id: d._id, fullName: d.fullName, photoUrl: d.photoUrl, rating: d.rating || { average: 0, count: 0 } }
        : null,
    };
  });

  if (filters.minDriverRating) {
    result = result.filter((t) => t.driver && t.driver.rating.average >= filters.minDriverRating);
  }
  return result;
}

async function listByDriver(driverId) {
  return tripRepo.byDriver(driverId);
}

async function cancelTrip(tripId, userId) {
  const trip = await tripRepo.getById(tripId);
  if (trip.driverId !== userId) throw Forbidden('Solo el conductor puede cancelar');
  if (['cancelled', 'completed'].includes(trip.status)) {
    throw BadRequest(`Viaje ya está ${trip.status}`);
  }
  return tripRepo.update(tripId, { status: 'cancelled', cancelledAt: new Date().toISOString() });
}

async function markOngoing(tripId, userId) {
  const trip = await tripRepo.getById(tripId);
  if (trip.driverId !== userId) throw Forbidden();
  if (trip.status !== 'published' && trip.status !== 'full') throw BadRequest('Estado inválido');
  return tripRepo.update(tripId, { status: 'ongoing', startedAt: new Date().toISOString() });
}

async function markCompleted(tripId, userId) {
  const trip = await tripRepo.getById(tripId);
  if (trip.driverId !== userId) throw Forbidden();
  if (trip.status !== 'ongoing') throw BadRequest('El viaje debe estar en curso');
  return tripRepo.update(tripId, { status: 'completed', completedAt: new Date().toISOString() });
}

async function reserveSeats(tripId, n) {
  const trip = await tripRepo.getById(tripId);
  if (trip.status !== 'published') throw BadRequest('Viaje no disponible');
  if (trip.seatsAvailable < n) throw BadRequest('No hay asientos suficientes');
  const seatsAvailable = trip.seatsAvailable - n;
  const status = seatsAvailable === 0 ? 'full' : 'published';
  return tripRepo.update(tripId, { seatsAvailable, status });
}

async function releaseSeats(tripId, n) {
  const trip = await tripRepo.getById(tripId);
  const seatsAvailable = Math.min(trip.seatsTotal, trip.seatsAvailable + n);
  const status = trip.status === 'full' ? 'published' : trip.status;
  return tripRepo.update(tripId, { seatsAvailable, status });
}

module.exports = {
  createTrip,
  getTrip,
  searchTrips,
  listByDriver,
  cancelTrip,
  markOngoing,
  markCompleted,
  reserveSeats,
  releaseSeats,
};
