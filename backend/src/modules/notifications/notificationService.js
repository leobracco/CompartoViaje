'use strict';

const notifRepo = require('./notificationRepository');
const logger = require('../../utils/logger');

// Hub in-memory para WebSocket. En producción, reemplazar por Redis pub/sub
// para permitir múltiples instancias del backend.
const subscribers = new Map(); // userId -> Set<ws>

function subscribe(userId, ws) {
  if (!subscribers.has(userId)) subscribers.set(userId, new Set());
  subscribers.get(userId).add(ws);
}

function unsubscribe(userId, ws) {
  const s = subscribers.get(userId);
  if (s) {
    s.delete(ws);
    if (s.size === 0) subscribers.delete(userId);
  }
}

function pushRealtime(userId, payload) {
  const set = subscribers.get(userId);
  if (!set) return 0;
  const raw = JSON.stringify(payload);
  let count = 0;
  for (const ws of set) {
    try {
      if (ws.readyState === 1) {
        ws.send(raw);
        count += 1;
      }
    } catch (err) {
      logger.warn('WS send failed', err.message);
    }
  }
  return count;
}

async function enqueue(userId, { kind, title, body, data }) {
  const doc = await notifRepo.create({
    userId,
    kind,
    title,
    body,
    data: data || {},
    read: false,
  });
  pushRealtime(userId, { event: 'notification', data: doc });
  // Hook de push (web-push/FCM/APNs) iría acá
  return doc;
}

async function listForUser(userId) {
  return notifRepo.byUser(userId);
}

async function markRead(userId, notifId) {
  const n = await notifRepo.getById(notifId);
  if (n.userId !== userId) return null;
  return notifRepo.update(notifId, { read: true, readAt: new Date().toISOString() });
}

async function markAllRead(userId) {
  const pend = await notifRepo.find({ userId, read: false }, { limit: 500 });
  for (const n of pend) {
    await notifRepo.update(n._id, { read: true, readAt: new Date().toISOString() });
  }
  return { updated: pend.length };
}

module.exports = {
  enqueue,
  listForUser,
  markRead,
  markAllRead,
  subscribe,
  unsubscribe,
  pushRealtime,
};
