'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(routes);

  // Static PWA
  const pwaDir = path.resolve(__dirname, '..', '..', 'frontend', 'pwa');
  app.use(express.static(pwaDir));
  app.get('/', (req, res) => res.sendFile(path.join(pwaDir, 'index.html')));
  app.get('/app/*', (req, res) => res.sendFile(path.join(pwaDir, 'index.html')));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
