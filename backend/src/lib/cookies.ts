import { Response } from 'express';
import { config } from './config';

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const COOKIE_PATH = '/api/auth';

export function setRefreshTokenCookie(res: Response, token: string): void {
  const maxAge = config.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const isProduction = config.NODE_ENV === 'production';

  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: COOKIE_PATH,
    maxAge,
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  const isProduction = config.NODE_ENV === 'production';

  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: COOKIE_PATH,
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  });
}
