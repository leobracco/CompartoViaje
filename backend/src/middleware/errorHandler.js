'use strict';

const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

function notFound(req, res, next) {
  res.status(404).json({ error: { code: 'not_found', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` } });
}

function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err && err.name === 'ZodError') {
    return res.status(422).json({
      error: { code: 'validation_error', message: 'Datos inválidos', details: err.issues },
    });
  }

  logger.error('Error no manejado:', err);
  res.status(500).json({ error: { code: 'internal_error', message: 'Error interno del servidor' } });
}

module.exports = { notFound, errorHandler };
