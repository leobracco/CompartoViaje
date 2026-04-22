'use strict';

const messageRepo = require('./messageRepository');
const tripService = require('../trips/tripService');
const { Forbidden, BadRequest } = require('../../utils/errors');

function threadIdFor(tripId, a, b) {
  const [x, y] = [a, b].sort();
  return `thr:${tripId}:${x}:${y}`;
}

async function authorizeThread(tripId, userId, otherUserId) {
  const trip = await tripService.getTrip(tripId);
  if (trip.driverId !== userId && trip.driverId !== otherUserId) {
    throw Forbidden('Uno de los participantes debe ser el conductor');
  }
  if (userId !== trip.driverId && otherUserId !== trip.driverId) {
    throw Forbidden('Solo pasajero-conductor del viaje');
  }
  return trip;
}

async function sendMessage(senderId, { tripId, toUserId, body }) {
  if (!body || !body.trim()) throw BadRequest('Mensaje vacío');
  await authorizeThread(tripId, senderId, toUserId);
  const threadId = threadIdFor(tripId, senderId, toUserId);
  return messageRepo.create({
    threadId,
    tripId,
    fromUserId: senderId,
    toUserId,
    body: body.trim().slice(0, 2000),
    read: false,
  });
}

async function listThread(tripId, userId, otherUserId) {
  await authorizeThread(tripId, userId, otherUserId);
  const threadId = threadIdFor(tripId, userId, otherUserId);
  return messageRepo.byThread(threadId);
}

async function markThreadRead(tripId, userId, otherUserId) {
  await authorizeThread(tripId, userId, otherUserId);
  const threadId = threadIdFor(tripId, userId, otherUserId);
  const msgs = await messageRepo.find({ threadId, toUserId: userId, read: false });
  for (const m of msgs) {
    await messageRepo.update(m._id, { read: true, readAt: new Date().toISOString() });
  }
  return { updated: msgs.length };
}

module.exports = { sendMessage, listThread, markThreadRead, threadIdFor };
