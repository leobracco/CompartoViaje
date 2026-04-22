'use strict';

const BaseRepository = require('../../repositories/baseRepository');

class PaymentRepository extends BaseRepository {
  constructor() {
    super({ dbName: 'payments', type: 'payment', idPrefix: 'pay' });
  }

  byBookingId(bookingId) {
    return this.findOne({ bookingId });
  }

  byMpPaymentId(mpPaymentId) {
    return this.findOne({ mpPaymentId });
  }

  byMpPreferenceId(mpPreferenceId) {
    return this.findOne({ mpPreferenceId });
  }
}

module.exports = new PaymentRepository();
