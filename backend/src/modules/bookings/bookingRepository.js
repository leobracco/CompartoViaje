'use strict';

const BaseRepository = require('../../repositories/baseRepository');

class BookingRepository extends BaseRepository {
  constructor() {
    super({ dbName: 'bookings', type: 'booking', idPrefix: 'bkg' });
  }

  byPassenger(passengerId) {
    return this.find({ passengerId });
  }

  byDriver(driverId) {
    return this.find({ driverId });
  }

  byTrip(tripId) {
    return this.find({ tripId });
  }
}

module.exports = new BookingRepository();
