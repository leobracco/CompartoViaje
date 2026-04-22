'use strict';

const BaseRepository = require('../../repositories/baseRepository');

class NotificationRepository extends BaseRepository {
  constructor() {
    super({ dbName: 'notifications', type: 'notification', idPrefix: 'ntf' });
  }

  async byUser(userId, { limit = 50 } = {}) {
    const docs = await this.find({ userId }, { limit });
    return docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }
}

module.exports = new NotificationRepository();
