import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { registerSchema, loginSchema } from '../lib/schemas';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from '../lib/cookies';
import { AuthTokenInvalidError } from '../lib/errors';
import * as authService from '../services/authService';

const router = Router();

// Rate limiting for auth endpoints
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many registration attempts, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many refresh attempts, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/register
router.post(
  '/register',
  registerLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;
    const result = await authService.register(email, password, name);

    setRefreshTokenCookie(res, result.rawRefreshToken);

    res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    setRefreshTokenCookie(res, result.rawRefreshToken);

    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  })
);

// POST /api/auth/refresh — reads refresh token from httpOnly cookie
router.post(
  '/refresh',
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (!rawRefreshToken) {
      throw new AuthTokenInvalidError('No refresh token provided');
    }

    const result = await authService.refreshAccessToken(rawRefreshToken);

    setRefreshTokenCookie(res, result.newRawRefreshToken);

    res.json({
      accessToken: result.accessToken,
    });
  })
);

// POST /api/auth/logout — revoke current refresh token
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (rawRefreshToken) {
      await authService.logout(rawRefreshToken);
    }

    clearRefreshTokenCookie(res);

    res.json({ success: true });
  })
);

// POST /api/auth/logout-all — revoke all refresh tokens for the user
router.post(
  '/logout-all',
  authenticate,
  asyncHandler(async (req, res) => {
    await authService.logoutAll(req.user!.userId);

    clearRefreshTokenCookie(res);

    res.json({ success: true });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user!.userId);
    res.json({ user });
  })
);

export default router;
