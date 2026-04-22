'use strict';

const http = require('http');
const config = require('./config');
const { createApp } = require('./app');
const { attach } = require('./ws/wsServer');
const { initAll } = require('./db/couch');
const logger = require('./utils/logger');

async function main() {
  try {
    await initAll();
  } catch (err) {
    logger.error('No se pudo inicializar CouchDB:', err.message);
    logger.warn('El servidor arrancará de todos modos; asegurate de ejecutar `npm run init-db`.');
  }

  const app = createApp();
  const server = http.createServer(app);
  attach(server);

  server.listen(config.port, () => {
    logger.info(`CompartoViaje API escuchando en http://localhost:${config.port}`);
    logger.info(`Entorno: ${config.env}`);
    logger.info(`PWA: http://localhost:${config.port}/`);
  });
}

main();
