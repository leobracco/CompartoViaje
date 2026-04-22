'use strict';

const BaseRepository = require('../../repositories/baseRepository');

class MessageRepository extends BaseRepository {
  constructor() {
    super({ dbName: 'messages', type: 'message', idPrefix: 'msg' });
  }

  async byThread(threadId, { limit = 100, skip = 0 } = {}) {
    const docs = await this.find({ threadId }, { limit, skip });
    return docs.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  }
}

module.exports = new MessageRepository();
