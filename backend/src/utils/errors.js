'use strict';

class AppError extends Error {
  constructor(message, status = 500, code = 'internal_error', details) {
    super(message);
    this.status = status;
    this.code = code;
    if (details) this.details = details;
  }
}

const BadRequest = (msg, details) => new AppError(msg || 'Solicitud inválida', 400, 'bad_request', details);
const Unauthorized = (msg) => new AppError(msg || 'No autenticado', 401, 'unauthorized');
const Forbidden = (msg) => new AppError(msg || 'Acceso denegado', 403, 'forbidden');
const NotFound = (msg) => new AppError(msg || 'No encontrado', 404, 'not_found');
const Conflict = (msg) => new AppError(msg || 'Conflicto', 409, 'conflict');
const Unprocessable = (msg, details) => new AppError(msg || 'No procesable', 422, 'unprocessable', details);

module.exports = { AppError, BadRequest, Unauthorized, Forbidden, NotFound, Conflict, Unprocessable };
