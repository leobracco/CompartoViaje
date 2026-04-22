'use strict';

const { v4: uuid } = require('uuid');

function id(prefix) {
  return `${prefix}_${uuid()}`;
}

module.exports = { id, uuid };
