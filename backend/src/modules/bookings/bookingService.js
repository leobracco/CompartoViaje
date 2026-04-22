'use strict';

const bookingRepo = require('./bookingRepository');
const tripService = require('../trips/tripService');
const paymentService = require('../payments/paymentService');
const notificationService = require('../notifications/notificationService');
const { BadRequest, Forbidden, NotFound } = require('../../utils/errors');

async function createBooking(passengerId, data) {
  const trip = await tripService.getTrip(data.tripId);
  if (trip.driverId === passengerId) throw BadRequest('No podés reservar tu propio viaje');
  if (trip.status !== 'published') throw BadRequest('El viaje no acepta reservas');
  if (trip.seatsAvailable < data.seats) throw BadRequest('No hay asientos suficientes');

  // Reservar cupo antes de crear booking
  await tripService.reserveSeats(data.tripId, data.seats);

  const totalAmount = trip.pricePerSeat * data.seats;
  const booking = await bookingRepo.create({
    tripId: data.tripId,
    passengerId,
    driverId: trip.driverId,
    seats: data.seats,
    pricePerSeat: trip.pricePerSeat,
    totalAmount,
    currency: trip.currency || 'ARS',
    status: 'pending_payment',
    passengerMessage: data.passengerMessage,
  });

  // Crear preferencia de pago en Mercado Pago
  const payment = await paymentService.createPreferenceForBooking(booking, trip);
  const updated = await bookingRepo.update(booking._id, {
    paymentId: payment._id,
    paymentStatus: 'pending',
  });

  await notificationService.enqueue(trip.driverId, {
    kind: 'booking.pending',
    title: 'Nueva reserva',
    body: `Pasajero reservó ${data.seats} asiento(s)`,
    data: { bookingId: booking._id, tripId: trip._id },
  });

  return { booking: updated, payment };
}

async function getBooking(id, userId) {
  const b = await bookingRepo.getById(id);
  if (b.passengerId !== userId && b.driverId !== userId) {
    throw Forbidden('No tenés acceso a esta reserva');
  }
  return b;
}

async function listMineAsPassenger(userId) {
  const docs = await bookingRepo.byPassenger(userId);
  return docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

async function listMineAsDriver(userId) {
  const docs = await bookingRepo.byDriver(userId);
  return docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

async function listForTrip(tripId, userId) {
  const trip = await tripService.getTrip(tripId);
  if (trip.driverId !== userId) throw Forbidden();
  return bookingRepo.byTrip(tripId);
}

async function approveBooking(bookingId, driverId) {
  const b = await bookingRepo.getById(bookingId);
  if (b.driverId !== driverId) throw Forbidden();
  if (b.status !== 'pending_payment' && b.paymentStatus !== 'approved') {
    throw BadRequest('El pasajero todavía no pagó');
  }
  const updated = await bookingRepo.update(bookingId, {
    status: 'confirmed',
    confirmedAt: new Date().toISOString(),
  });
  await notificationService.enqueue(b.passengerId, {
    kind: 'booking.confirmed',
    title: 'Reserva confirmada',
    body: 'Tu reserva fue confirmada por el conductor',
    data: { bookingId: b._id, tripId: b.tripId },
  });
  return updated;
}

async function rejectBooking(bookingId, driverId, reason) {
  const b = await bookingRepo.getById(bookingId);
  if (b.driverId !== driverId) throw Forbidden();
  if (b.status === 'completed' || b.status === 'cancelled') throw BadRequest('Estado inválido');

  await tripService.releaseSeats(b.tripId, b.seats);
  const updated = await bookingRepo.update(bookingId, {
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
    rejectReason: reason,
  });

  // Reembolso si ya pagó
  if (b.paymentStatus === 'approved') {
    await paymentService.refund(b.paymentId);
    await bookingRepo.update(bookingId, { paymentStatus: 'refunded', status: 'refunded' });
  }

  await notificationService.enqueue(b.passengerId, {
    kind: 'booking.rejected',
    title: 'Reserva rechazada',
    body: reason || 'El conductor rechazó la reserva',
    data: { bookingId: b._id },
  });
  return updated;
}

function feeByPolicy(trip, hoursBefore) {
  // flexible: sin penalización si cancela +24hs antes
  // moderate: 50% si cancela -48hs, 0% sino
  // strict: 100% si cancela -24hs, 50% si -7 días, 0% sino
  const policy = trip.cancellationPolicy || 'moderate';
  if (policy === 'flexible') return hoursBefore >= 24 ? 0 : 0.5;
  if (policy === 'moderate') return hoursBefore >= 48 ? 0 : 0.5;
  if (policy === 'strict') {
    if (hoursBefore >= 24 * 7) return 0;
    if (hoursBefore >= 24) return 0.5;
    return 1.0;
  }
  return 0;
}

async function cancelBooking(bookingId, userId, reason) {
  const b = await bookingRepo.getById(bookingId);
  if (b.passengerId !== userId) throw Forbidden('Solo el pasajero puede cancelar');
  if (['cancelled', 'rejected', 'completed', 'refunded'].includes(b.status)) {
    throw BadRequest('Estado inválido');
  }

  const trip = await tripService.getTrip(b.tripId);
  const hoursBefore = (new Date(trip.departureAt).getTime() - Date.now()) / 3600000;
  const penalty = feeByPolicy(trip, hoursBefore);

  await tripService.releaseSeats(b.tripId, b.seats);

  const updated = await bookingRepo.update(bookingId, {
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    cancelReason: reason,
    cancellationPenalty: penalty,
  });

  if (b.paymentStatus === 'approved' && penalty < 1) {
    await paymentService.partialRefund(b.paymentId, 1 - penalty);
  }

  await notificationService.enqueue(b.driverId, {
    kind: 'booking.cancelled',
    title: 'Reserva cancelada',
    body: 'Un pasajero canceló su reserva',
    data: { bookingId: b._id },
  });

  return updated;
}

async function markPaid(bookingId) {
  return bookingRepo.update(bookingId, { paymentStatus: 'approved' });
}

async function completeBooking(bookingId, driverId) {
  const b = await bookingRepo.getById(bookingId);
  if (b.driverId !== driverId) throw Forbidden();
  if (b.status !== 'confirmed') throw BadRequest('La reserva no está confirmada');

  // Liberar fondos al conductor (captura del pago retenido)
  if (b.paymentId) await paymentService.release(b.paymentId);

  return bookingRepo.update(bookingId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
}

module.exports = {
  createBooking,
  getBooking,
  listMineAsPassenger,
  listMineAsDriver,
  listForTrip,
  approveBooking,
  rejectBooking,
  cancelBooking,
  markPaid,
  completeBooking,
};
