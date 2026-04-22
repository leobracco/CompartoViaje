'use strict';

// Servicio de pagos para el flujo de split/escrow con Mercado Pago.
//
// Flujo:
// 1. Pasajero reserva -> createPreferenceForBooking crea la preferencia de pago.
// 2. Pasajero paga en MP -> init_point abre el checkout.
// 3. Webhook llega -> handleWebhook marca el payment como "held" y el booking
//    queda en pending aprobación del conductor.
// 4. Conductor aprueba + viaje se completa -> release() captura el cobro y se
//    descuenta la comisión de la plataforma.
// 5. Cancelación -> refund() o partialRefund() según política.

const paymentRepo = require('./paymentRepository');
const mp = require('./mpClient');
const config = require('../../config');
const logger = require('../../utils/logger');
const { NotFound, BadRequest } = require('../../utils/errors');

function platformFee(amount) {
  return Math.round(amount * (config.mp.platformFeePercent / 100) * 100) / 100;
}

async function createPreferenceForBooking(booking, trip) {
  const feeAmount = platformFee(booking.totalAmount);
  const pref = {
    items: [
      {
        id: booking._id,
        title: `Viaje ${trip.origin.city} → ${trip.destination.city}`,
        description: `${booking.seats} asiento(s) · ${new Date(trip.departureAt).toLocaleDateString('es-AR')}`,
        quantity: 1,
        unit_price: booking.totalAmount,
        currency_id: 'ARS',
      },
    ],
    external_reference: booking._id,
    metadata: { bookingId: booking._id, tripId: trip._id, driverId: trip.driverId, passengerId: booking.passengerId },
    payment_methods: {
      excluded_payment_types: [],
      installments: 3,
    },
    back_urls: {
      success: `${config.appUrl}/bookings/${booking._id}?status=success`,
      failure: `${config.appUrl}/bookings/${booking._id}?status=failure`,
      pending: `${config.appUrl}/bookings/${booking._id}?status=pending`,
    },
    auto_return: 'approved',
    notification_url: `${config.appUrl}/api/payments/webhook`,
    // Captura manual -> la plataforma retiene el dinero hasta completar el viaje
    binary_mode: false,
    marketplace_fee: feeAmount,
  };

  const mpPref = await mp.createPreference(pref);

  return paymentRepo.create({
    bookingId: booking._id,
    tripId: trip._id,
    passengerId: booking.passengerId,
    driverId: trip.driverId,
    amount: booking.totalAmount,
    platformFee: feeAmount,
    driverPayout: booking.totalAmount - feeAmount,
    currency: 'ARS',
    status: 'pending',
    mpPreferenceId: mpPref.id,
    initPoint: mpPref.init_point || mpPref.sandbox_init_point,
  });
}

async function handleWebhook(payload) {
  // MP envía { type: "payment", data: { id } } entre otros
  if (!payload || payload.type !== 'payment' || !payload.data || !payload.data.id) {
    logger.info('Webhook MP ignorado:', payload && payload.type);
    return { ok: true, ignored: true };
  }
  const mpPaymentId = String(payload.data.id);
  const mpPay = await mp.getPayment(mpPaymentId);
  const external = mpPay.external_reference;
  let payment = await paymentRepo.byMpPaymentId(mpPaymentId);
  if (!payment && external) {
    payment = await paymentRepo.byBookingId(external);
  }
  if (!payment) {
    logger.warn('No se encontró payment para MP id', mpPaymentId);
    return { ok: true, unknown: true };
  }

  const status = mpPay.status; // approved, pending, rejected, cancelled, refunded
  const mapped = {
    approved: 'held', // dinero retenido hasta completar viaje
    pending: 'pending',
    in_process: 'pending',
    rejected: 'rejected',
    cancelled: 'cancelled',
    refunded: 'refunded',
  }[status] || status;

  await paymentRepo.update(payment._id, {
    mpPaymentId,
    mpStatus: status,
    status: mapped,
    lastEvent: { at: new Date().toISOString(), type: payload.type, status },
  });

  // Lazy require para evitar ciclo
  if (mapped === 'held') {
    const bookingService = require('../bookings/bookingService');
    await bookingService.markPaid(payment.bookingId);
  }

  return { ok: true, status: mapped };
}

async function release(paymentId) {
  const p = await paymentRepo.getById(paymentId);
  if (!p.mpPaymentId) throw BadRequest('Pago no tiene id de MP');
  if (p.status !== 'held') return p;
  await mp.capturePayment(p.mpPaymentId);
  return paymentRepo.update(paymentId, {
    status: 'released',
    releasedAt: new Date().toISOString(),
  });
}

async function refund(paymentId) {
  const p = await paymentRepo.getById(paymentId);
  if (!p.mpPaymentId) return paymentRepo.update(paymentId, { status: 'refunded' });
  await mp.refundPayment(p.mpPaymentId);
  return paymentRepo.update(paymentId, {
    status: 'refunded',
    refundedAt: new Date().toISOString(),
  });
}

async function partialRefund(paymentId, fraction) {
  const p = await paymentRepo.getById(paymentId);
  const amount = Math.round(p.amount * fraction * 100) / 100;
  if (p.mpPaymentId) await mp.refundPayment(p.mpPaymentId, amount);
  return paymentRepo.update(paymentId, {
    status: 'partial_refund',
    refundedAmount: amount,
    refundedAt: new Date().toISOString(),
  });
}

async function getByBooking(bookingId) {
  return paymentRepo.byBookingId(bookingId);
}

module.exports = {
  createPreferenceForBooking,
  handleWebhook,
  release,
  refund,
  partialRefund,
  getByBooking,
  platformFee,
};
