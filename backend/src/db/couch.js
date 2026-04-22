'use strict';

const nano = require('nano');
const config = require('../config');
const logger = require('../utils/logger');

let server;
const dbs = new Map();

function getServer() {
  if (!server) server = nano(config.couch.url);
  return server;
}

function dbName(suffix) {
  return `${config.couch.prefix}_${suffix}`;
}

async function ensureDb(suffix) {
  const name = dbName(suffix);
  const srv = getServer();
  try {
    await srv.db.get(name);
  } catch (err) {
    if (err.statusCode === 404) {
      logger.info(`Creando base de datos: ${name}`);
      await srv.db.create(name);
    } else {
      throw err;
    }
  }
  const db = srv.use(name);
  dbs.set(suffix, db);
  return db;
}

function getDb(suffix) {
  if (!dbs.has(suffix)) {
    dbs.set(suffix, getServer().use(dbName(suffix)));
  }
  return dbs.get(suffix);
}

async function ensureIndex(db, index) {
  try {
    await db.createIndex(index);
  } catch (err) {
    if (err.statusCode !== 409) throw err;
  }
}

const DATABASES = ['users', 'trips', 'bookings', 'reviews', 'payments', 'messages', 'notifications'];

async function initAll() {
  for (const name of DATABASES) {
    await ensureDb(name);
  }

  const users = getDb('users');
  await ensureIndex(users, { index: { fields: ['type', 'email'] }, name: 'by-email' });
  await ensureIndex(users, { index: { fields: ['type', 'roles'] }, name: 'by-roles' });

  const trips = getDb('trips');
  await ensureIndex(trips, { index: { fields: ['type', 'origin.city', 'destination.city', 'departureAt'] }, name: 'by-route-date' });
  await ensureIndex(trips, { index: { fields: ['type', 'driverId', 'departureAt'] }, name: 'by-driver' });
  await ensureIndex(trips, { index: { fields: ['type', 'status', 'departureAt'] }, name: 'by-status' });

  const bookings = getDb('bookings');
  await ensureIndex(bookings, { index: { fields: ['type', 'tripId'] }, name: 'by-trip' });
  await ensureIndex(bookings, { index: { fields: ['type', 'passengerId', 'createdAt'] }, name: 'by-passenger' });
  await ensureIndex(bookings, { index: { fields: ['type', 'driverId', 'createdAt'] }, name: 'by-driver' });

  const reviews = getDb('reviews');
  await ensureIndex(reviews, { index: { fields: ['type', 'targetUserId', 'createdAt'] }, name: 'by-target' });

  const payments = getDb('payments');
  await ensureIndex(payments, { index: { fields: ['type', 'bookingId'] }, name: 'by-booking' });
  await ensureIndex(payments, { index: { fields: ['type', 'mpPaymentId'] }, name: 'by-mp-id' });

  const messages = getDb('messages');
  await ensureIndex(messages, { index: { fields: ['type', 'threadId', 'createdAt'] }, name: 'by-thread' });

  const notifications = getDb('notifications');
  await ensureIndex(notifications, { index: { fields: ['type', 'userId', 'createdAt'] }, name: 'by-user' });

  logger.info('CouchDB inicializado correctamente');
}

module.exports = {
  getServer,
  getDb,
  ensureDb,
  initAll,
  dbName,
  DATABASES,
};
