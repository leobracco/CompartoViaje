'use strict';

const BaseRepository = require('../../repositories/baseRepository');

class UserRepository extends BaseRepository {
  constructor() {
    super({ dbName: 'users', type: 'user', idPrefix: 'usr' });
  }

  findByEmail(email) {
    return this.findOne({ email: email.toLowerCase() });
  }
}

module.exports = new UserRepository();
