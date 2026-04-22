'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { Unauthorized, Forbidden } = require('../utils/errors');

function authenticate(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      if (required) return next(Unauthorized('Token requerido'));
      return next();
    }

    try {
      const payload = jwt.verify(token, config.jwt.secret);
      req.user = payload;
      return next();
    } catch {
      return next(Unauthorized('Token inválido o expirado'));
    }
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(Unauthorized());
    const userRoles = req.user.roles || [];
    const ok = roles.some((r) => userRoles.includes(r));
    if (!ok) return next(Forbidden(`Requiere rol: ${roles.join(', ')}`));
    next();
  };
}

module.exports = { authenticate, requireRole };
