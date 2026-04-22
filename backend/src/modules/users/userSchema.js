'use strict';

const { z } = require('zod');

// Documento CouchDB: user
// {
//   _id, _rev, type: "user",
//   email, passwordHash, fullName, phone, photoUrl, dni,
//   roles: ["passenger", "driver", "admin"],
//   verification: {
//     email: { verified: bool, verifiedAt },
//     phone: { verified: bool },
//     identity: { status: "pending|approved|rejected", dniFrontUrl, dniBackUrl, selfieUrl, reviewedAt, reviewedBy },
//     license: { status, number, expiresAt, imageUrl },
//     insurance: { status, policy, expiresAt, imageUrl }
//   },
//   vehicle: { plate, brand, model, year, color, seats },
//   rating: { average, count },
//   mpUserId, bankAccount,
//   createdAt, updatedAt, disabled
// }

const registerSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase()),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  fullName: z.string().min(2).max(100),
  phone: z.string().min(8).max(20).optional(),
  roles: z.array(z.enum(['passenger', 'driver'])).min(1).default(['passenger']),
});

const loginSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase()),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
  photoUrl: z.string().url().optional(),
  dni: z.string().regex(/^\d{7,9}$/, 'DNI inválido').optional(),
});

const vehicleSchema = z.object({
  plate: z.string().min(6).max(10),
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
  color: z.string().min(1),
  seats: z.number().int().min(1).max(8),
});

const verifyIdentitySchema = z.object({
  dniFrontUrl: z.string().url(),
  dniBackUrl: z.string().url(),
  selfieUrl: z.string().url(),
});

const verifyLicenseSchema = z.object({
  number: z.string().min(5),
  expiresAt: z.string().datetime(),
  imageUrl: z.string().url(),
});

const verifyInsuranceSchema = z.object({
  policy: z.string().min(3),
  expiresAt: z.string().datetime(),
  imageUrl: z.string().url(),
});

function publicUser(u) {
  if (!u) return null;
  return {
    id: u._id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    photoUrl: u.photoUrl,
    roles: u.roles,
    rating: u.rating || { average: 0, count: 0 },
    vehicle: u.vehicle || null,
    verification: {
      email: !!(u.verification && u.verification.email && u.verification.email.verified),
      phone: !!(u.verification && u.verification.phone && u.verification.phone.verified),
      identity: (u.verification && u.verification.identity && u.verification.identity.status) || 'none',
      license: (u.verification && u.verification.license && u.verification.license.status) || 'none',
      insurance: (u.verification && u.verification.insurance && u.verification.insurance.status) || 'none',
    },
    createdAt: u.createdAt,
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  vehicleSchema,
  verifyIdentitySchema,
  verifyLicenseSchema,
  verifyInsuranceSchema,
  publicUser,
};
