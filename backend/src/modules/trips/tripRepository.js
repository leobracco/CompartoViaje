'use strict';

const BaseRepository = require('../../repositories/baseRepository');

class TripRepository extends BaseRepository {
  constructor() {
    super({ dbName: 'trips', type: 'trip', idPrefix: 'trp' });
  }

  async byDriver(driverId, { limit = 50, skip = 0 } = {}) {
    const docs = await this.find({ driverId }, { limit, skip });
    return docs.sort((a, b) => (b.departureAt || '').localeCompare(a.departureAt || ''));
  }

  async search({ originCity, destinationCity, date, maxPrice, minSeats = 1, limit = 20, skip = 0 }) {
    const selector = {
      status: 'published',
      seatsAvailable: { $gte: minSeats },
    };
    if (originCity) selector['origin.city'] = originCity;
    if (destinationCity) selector['destination.city'] = destinationCity;
    if (date) {
      const start = new Date(`${date}T00:00:00`).toISOString();
      const end = new Date(`${date}T23:59:59`).toISOString();
      selector.departureAt = { $gte: start, $lte: end };
    } else {
      selector.departureAt = { $gte: new Date().toISOString() };
    }
    if (maxPrice) selector.pricePerSeat = { $lte: maxPrice };

    const docs = await this.find(selector, { limit, skip });
    return docs.sort((a, b) => (a.departureAt || '').localeCompare(b.departureAt || ''));
  }
}

module.exports = new TripRepository();
