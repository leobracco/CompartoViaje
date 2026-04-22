'use strict';

module.exports = (schema, source = 'body') => (req, res, next) => {
  try {
    const data = schema.parse(req[source]);
    req[source] = data;
    next();
  } catch (err) {
    next(err);
  }
};
