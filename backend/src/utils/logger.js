'use strict';

const levels = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = levels[process.env.LOG_LEVEL] || levels.info;

function ts() {
  return new Date().toISOString();
}

function log(level, ...args) {
  if (levels[level] < threshold) return;
  const line = `[${ts()}] ${level.toUpperCase()}`;
  if (level === 'error') console.error(line, ...args);
  else if (level === 'warn') console.warn(line, ...args);
  else console.log(line, ...args);
}

module.exports = {
  debug: (...a) => log('debug', ...a),
  info: (...a) => log('info', ...a),
  warn: (...a) => log('warn', ...a),
  error: (...a) => log('error', ...a),
};
