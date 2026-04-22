'use strict';

require('dotenv').config();

const env = (key, fallback) => {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
};

const config = {
  env: env('NODE_ENV', 'development'),
  port: parseInt(env('PORT', '3000'), 10),
  appUrl: env('APP_URL', 'http://localhost:3000'),

  couch: {
    url: env('COUCHDB_URL', 'http://admin:admin@localhost:5984'),
    prefix: env('COUCHDB_DB_PREFIX', 'compartoviaje'),
  },

  jwt: {
    secret: env('JWT_SECRET', 'dev-secret-change-me'),
    expiresIn: env('JWT_EXPIRES_IN', '7d'),
    refreshExpiresIn: env('JWT_REFRESH_EXPIRES_IN', '30d'),
  },

  mp: {
    accessToken: env('MP_ACCESS_TOKEN', ''),
    publicKey: env('MP_PUBLIC_KEY', ''),
    webhookSecret: env('MP_WEBHOOK_SECRET', ''),
    platformFeePercent: parseFloat(env('MP_PLATFORM_FEE_PERCENT', '10')),
  },

  oauth: {
    googleClientId: env('GOOGLE_CLIENT_ID', ''),
    appleClientId: env('APPLE_CLIENT_ID', ''),
  },

  smtp: {
    host: env('SMTP_HOST', ''),
    port: parseInt(env('SMTP_PORT', '587'), 10),
    user: env('SMTP_USER', ''),
    pass: env('SMTP_PASS', ''),
    from: env('SMTP_FROM', 'no-reply@compartoviaje.ar'),
  },

  push: {
    vapidPublic: env('VAPID_PUBLIC_KEY', ''),
    vapidPrivate: env('VAPID_PRIVATE_KEY', ''),
    vapidSubject: env('VAPID_SUBJECT', 'mailto:admin@compartoviaje.ar'),
  },

  admin: {
    email: env('ADMIN_EMAIL', 'admin@compartoviaje.ar'),
    password: env('ADMIN_PASSWORD', 'changeme'),
  },
};

module.exports = config;
