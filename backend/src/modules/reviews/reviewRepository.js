'use strict';

const BaseRepository = require('../../repositories/baseRepository');

class ReviewRepository extends BaseRepository {
  constructor() {
    super({ dbName: 'reviews', type: 'review', idPrefix: 'rev' });
  }

  byTarget(targetUserId) {
    return this.find({ targetUserId }, { limit: 200 });
  }

  byBooking(bookingId) {
    return this.find({ bookingId });
  }
}

module.exports = new ReviewRepository();
