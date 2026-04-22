'use strict';

// Cliente minimalista para la API de Mercado Pago (Argentina).
// Docs: https://www.mercadopago.com.ar/developers/es/reference
//
// Usa fetch nativo de Node 18+. En modo sin credenciales, funciona en modo
// sandbox local devolviendo datos simulados para desarrollo.

const config = require('../../config');
const logger = require('../../utils/logger');

const BASE = 'https://api.mercadopago.com';

function isConfigured() {
  return Boolean(config.mp.accessToken);
}

async function call(method, path, body) {
  if (!isConfigured()) {
    logger.warn(`[MP][SIMULADO] ${method} ${path}`);
    return simulate(method, path, body);
  }
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${config.mp.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(`Mercado Pago ${res.status}: ${data.message || text}`);
    err.status = res.status;
    err.mp = data;
    throw err;
  }
  return data;
}

function simulate(method, path, body) {
  if (method === 'POST' && path === '/checkout/preferences') {
    const id = `mp_pref_sim_${Date.now()}`;
    return {
      id,
      init_point: `${config.appUrl}/checkout/simulated/${id}`,
      sandbox_init_point: `${config.appUrl}/checkout/simulated/${id}`,
      items: body.items,
      external_reference: body.external_reference,
    };
  }
  if (method === 'GET' && path.startsWith('/v1/payments/')) {
    return { id: path.split('/').pop(), status: 'approved', transaction_amount: 0 };
  }
  if (method === 'POST' && path.endsWith('/refunds')) {
    return { id: `refund_sim_${Date.now()}`, status: 'approved' };
  }
  if (method === 'POST' && path.endsWith('/capture')) {
    return { status: 'approved' };
  }
  return { simulated: true };
}

async function createPreference(pref) {
  return call('POST', '/checkout/preferences', pref);
}

async function getPayment(mpPaymentId) {
  return call('GET', `/v1/payments/${mpPaymentId}`);
}

async function capturePayment(mpPaymentId) {
  return call('POST', `/v1/payments/${mpPaymentId}/capture`);
}

async function refundPayment(mpPaymentId, amount) {
  return call('POST', `/v1/payments/${mpPaymentId}/refunds`, amount ? { amount } : undefined);
}

module.exports = { createPreference, getPayment, capturePayment, refundPayment, isConfigured };
