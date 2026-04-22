'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const userRepo = require('./userRepository');
const { BadRequest, Unauthorized, NotFound, Conflict } = require('../../utils/errors');
const { publicUser } = require('./userSchema');

function signTokens(user) {
  const payload = { sub: user._id, email: user.email, roles: user.roles };
  const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  const refreshToken = jwt.sign({ sub: user._id, kind: 'refresh' }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
}

async function register(input) {
  const existing = await userRepo.findByEmail(input.email);
  if (existing) throw Conflict('El email ya está registrado');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await userRepo.create({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
    phone: input.phone,
    roles: input.roles,
    rating: { average: 0, count: 0 },
    verification: {
      email: { verified: false },
      phone: { verified: false },
      identity: { status: 'none' },
      license: { status: 'none' },
      insurance: { status: 'none' },
    },
    disabled: false,
  });

  return { user: publicUser(user), ...signTokens(user) };
}

async function login(email, password) {
  const user = await userRepo.findByEmail(email);
  if (!user) throw Unauthorized('Credenciales inválidas');
  if (user.disabled) throw Unauthorized('Cuenta deshabilitada');

  const ok = await bcrypt.compare(password, user.passwordHash || '');
  if (!ok) throw Unauthorized('Credenciales inválidas');

  return { user: publicUser(user), ...signTokens(user) };
}

async function refresh(refreshToken) {
  try {
    const payload = jwt.verify(refreshToken, config.jwt.secret);
    if (payload.kind !== 'refresh') throw new Error('bad kind');
    const user = await userRepo.findById(payload.sub);
    if (!user || user.disabled) throw Unauthorized();
    return { user: publicUser(user), ...signTokens(user) };
  } catch {
    throw Unauthorized('Refresh token inválido');
  }
}

async function getProfile(userId) {
  const user = await userRepo.getById(userId);
  return publicUser(user);
}

async function getPublicProfile(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw NotFound('Usuario no encontrado');
  const p = publicUser(user);
  delete p.email;
  delete p.phone;
  return p;
}

async function updateProfile(userId, patch) {
  const user = await userRepo.update(userId, patch);
  return publicUser(user);
}

async function addDriverRole(userId) {
  const user = await userRepo.getById(userId);
  if (user.roles.includes('driver')) return publicUser(user);
  const updated = await userRepo.update(userId, { roles: [...user.roles, 'driver'] });
  return publicUser(updated);
}

async function setVehicle(userId, vehicle) {
  const user = await userRepo.getById(userId);
  if (!user.roles.includes('driver')) {
    await userRepo.update(userId, { roles: [...user.roles, 'driver'] });
  }
  const updated = await userRepo.update(userId, { vehicle });
  return publicUser(updated);
}

async function submitIdentityVerification(userId, data) {
  const user = await userRepo.getById(userId);
  const verification = { ...user.verification };
  verification.identity = {
    status: 'pending',
    dniFrontUrl: data.dniFrontUrl,
    dniBackUrl: data.dniBackUrl,
    selfieUrl: data.selfieUrl,
    submittedAt: new Date().toISOString(),
  };
  await userRepo.update(userId, { verification });
  return { status: 'pending' };
}

async function submitLicenseVerification(userId, data) {
  const user = await userRepo.getById(userId);
  const verification = { ...user.verification };
  verification.license = {
    status: 'pending',
    number: data.number,
    expiresAt: data.expiresAt,
    imageUrl: data.imageUrl,
    submittedAt: new Date().toISOString(),
  };
  await userRepo.update(userId, { verification });
  return { status: 'pending' };
}

async function submitInsuranceVerification(userId, data) {
  const user = await userRepo.getById(userId);
  const verification = { ...user.verification };
  verification.insurance = {
    status: 'pending',
    policy: data.policy,
    expiresAt: data.expiresAt,
    imageUrl: data.imageUrl,
    submittedAt: new Date().toISOString(),
  };
  await userRepo.update(userId, { verification });
  return { status: 'pending' };
}

async function adminReviewVerification(userId, kind, approved, reviewerId) {
  if (!['identity', 'license', 'insurance'].includes(kind)) throw BadRequest('Tipo inválido');
  const user = await userRepo.getById(userId);
  const verification = { ...user.verification };
  if (!verification[kind]) throw NotFound('No hay verificación pendiente');
  verification[kind] = {
    ...verification[kind],
    status: approved ? 'approved' : 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewerId,
  };
  const updated = await userRepo.update(userId, { verification });
  return publicUser(updated);
}

async function updateRatingAggregate(userId, newStars) {
  const user = await userRepo.getById(userId);
  const current = user.rating || { average: 0, count: 0 };
  const count = current.count + 1;
  const average = (current.average * current.count + newStars) / count;
  await userRepo.update(userId, { rating: { average: Math.round(average * 100) / 100, count } });
}

module.exports = {
  register,
  login,
  refresh,
  getProfile,
  getPublicProfile,
  updateProfile,
  addDriverRole,
  setVehicle,
  submitIdentityVerification,
  submitLicenseVerification,
  submitInsuranceVerification,
  adminReviewVerification,
  updateRatingAggregate,
  signTokens,
};
