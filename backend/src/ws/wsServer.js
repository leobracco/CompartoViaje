'use strict';

const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const notifService = require('../modules/notifications/notificationService');
const messageService = require('../modules/messages/messageService');

function attach(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (!token) {
      ws.close(4401, 'missing token');
      return;
    }
    let user;
    try {
      user = jwt.verify(token, config.jwt.secret);
    } catch {
      ws.close(4401, 'invalid token');
      return;
    }
    const userId = user.sub;
    notifService.subscribe(userId, ws);
    ws.send(JSON.stringify({ event: 'connected', data: { userId } }));

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.event === 'chat.send') {
        try {
          const saved = await messageService.sendMessage(userId, {
            tripId: msg.data.tripId,
            toUserId: msg.data.toUserId,
            body: msg.data.body,
          });
          ws.send(JSON.stringify({ event: 'chat.ack', data: saved }));
          notifService.pushRealtime(msg.data.toUserId, { event: 'chat.message', data: saved });
        } catch (err) {
          ws.send(JSON.stringify({ event: 'error', data: { code: err.code || 'error', message: err.message } }));
        }
      } else if (msg.event === 'ping') {
        ws.send(JSON.stringify({ event: 'pong', t: Date.now() }));
      }
    });

    ws.on('close', () => notifService.unsubscribe(userId, ws));
    ws.on('error', (err) => logger.warn('WS error', err.message));
  });

  logger.info('WebSocket server montado en /ws');
  return wss;
}

module.exports = { attach };
