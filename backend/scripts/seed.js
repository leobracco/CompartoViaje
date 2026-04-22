'use strict';

// Carga datos de demo: admin, pasajero, conductor verificado y un viaje.

const { initAll } = require('../src/db/couch');
const userService = require('../src/modules/users/userService');
const tripService = require('../src/modules/trips/tripService');
const userRepo = require('../src/modules/users/userRepository');

async function approveAllVerifications(userId) {
  const u = await userRepo.getById(userId);
  const v = u.verification || {};
  const now = new Date().toISOString();
  v.email = { verified: true, verifiedAt: now };
  v.phone = { verified: true };
  v.identity = { status: 'approved', reviewedAt: now };
  v.license = { status: 'approved', reviewedAt: now, number: 'AR12345678', expiresAt: '2030-01-01T00:00:00Z' };
  v.insurance = { status: 'approved', reviewedAt: now, policy: 'SEG-001', expiresAt: '2030-01-01T00:00:00Z' };
  await userRepo.update(userId, { verification: v });
}

(async () => {
  try {
    await initAll();

    const admin = await userService.register({
      email: 'admin@compartoviaje.ar',
      password: 'admin1234',
      fullName: 'Administrador',
      roles: ['passenger'],
    }).catch((e) => (e.status === 409 ? null : Promise.reject(e)));
    if (admin) {
      const u = await userRepo.findByEmail('admin@compartoviaje.ar');
      await userRepo.update(u._id, { roles: [...new Set([...(u.roles || []), 'admin'])] });
    }

    const driverAuth = await userService.register({
      email: 'conductor@compartoviaje.ar',
      password: 'conductor1234',
      fullName: 'Martín Gómez',
      phone: '+5491112345678',
      roles: ['passenger', 'driver'],
    }).catch((e) => (e.status === 409 ? null : Promise.reject(e)));

    const driver = driverAuth ? driverAuth.user : await userService.getProfile(
      (await userRepo.findByEmail('conductor@compartoviaje.ar'))._id,
    );

    await userService.setVehicle(driver.id, {
      plate: 'AB123CD',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2021,
      color: 'Gris',
      seats: 4,
    });
    await approveAllVerifications(driver.id);

    const pax = await userService.register({
      email: 'pasajero@compartoviaje.ar',
      password: 'pasajero1234',
      fullName: 'Lucía Fernández',
      phone: '+5491198765432',
      roles: ['passenger'],
    }).catch((e) => (e.status === 409 ? null : Promise.reject(e)));

    const departure = new Date(Date.now() + 86400000 * 3).toISOString();
    await tripService.createTrip(driver.id, {
      origin: { city: 'Buenos Aires', province: 'CABA' },
      destination: { city: 'Rosario', province: 'Santa Fe' },
      stops: [],
      departureAt: departure,
      seatsTotal: 3,
      pricePerSeat: 15000,
      currency: 'ARS',
      preferences: { smoking: false, pets: false, music: true, luggage: 'medium' },
      cancellationPolicy: 'moderate',
      description: 'Viaje por Ruta 9, salida desde Palermo.',
    });

    console.log('Seed listo. Credenciales:');
    console.log('  admin@compartoviaje.ar / admin1234');
    console.log('  conductor@compartoviaje.ar / conductor1234');
    console.log('  pasajero@compartoviaje.ar / pasajero1234');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
})();
