'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const service = require('./userService');
const schemas = require('./userSchema');
const validate = require('../../middleware/validate');
const { authenticate, requireRole } = require('../../middleware/auth');

const router = require('express').Router();

router.post('/auth/register', validate(schemas.registerSchema), asyncHandler(async (req, res) => {
  const result = await service.register(req.body);
  res.status(201).json(result);
}));

router.post('/auth/login', validate(schemas.loginSchema), asyncHandler(async (req, res) => {
  const result = await service.login(req.body.email, req.body.password);
  res.json(result);
}));

router.post('/auth/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  const result = await service.refresh(refreshToken);
  res.json(result);
}));

router.get('/users/me', authenticate(), asyncHandler(async (req, res) => {
  const u = await service.getProfile(req.user.sub);
  res.json(u);
}));

router.patch('/users/me', authenticate(), validate(schemas.updateProfileSchema), asyncHandler(async (req, res) => {
  const u = await service.updateProfile(req.user.sub, req.body);
  res.json(u);
}));

router.post('/users/me/become-driver', authenticate(), asyncHandler(async (req, res) => {
  const u = await service.addDriverRole(req.user.sub);
  res.json(u);
}));

router.put('/users/me/vehicle', authenticate(), validate(schemas.vehicleSchema), asyncHandler(async (req, res) => {
  const u = await service.setVehicle(req.user.sub, req.body);
  res.json(u);
}));

router.post('/users/me/verify/identity', authenticate(), validate(schemas.verifyIdentitySchema), asyncHandler(async (req, res) => {
  const r = await service.submitIdentityVerification(req.user.sub, req.body);
  res.json(r);
}));

router.post('/users/me/verify/license', authenticate(), validate(schemas.verifyLicenseSchema), asyncHandler(async (req, res) => {
  const r = await service.submitLicenseVerification(req.user.sub, req.body);
  res.json(r);
}));

router.post('/users/me/verify/insurance', authenticate(), validate(schemas.verifyInsuranceSchema), asyncHandler(async (req, res) => {
  const r = await service.submitInsuranceVerification(req.user.sub, req.body);
  res.json(r);
}));

router.get('/users/:id', authenticate(false), asyncHandler(async (req, res) => {
  const u = await service.getPublicProfile(req.params.id);
  res.json(u);
}));

// Admin: revisión de verificaciones
router.post('/admin/verifications/:userId/:kind', authenticate(), requireRole('admin'), asyncHandler(async (req, res) => {
  const { approved } = req.body || {};
  const u = await service.adminReviewVerification(req.params.userId, req.params.kind, !!approved, req.user.sub);
  res.json(u);
}));

module.exports = router;
