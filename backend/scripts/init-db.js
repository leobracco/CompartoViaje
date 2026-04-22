'use strict';

const { initAll } = require('../src/db/couch');

(async () => {
  try {
    await initAll();
    console.log('OK: bases creadas/verificadas');
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
