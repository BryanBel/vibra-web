import type { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE = 'vibra_admin_access';
export const REFRESH_COOKIE = 'vibra_admin_refresh';

/**
 * Las cookies de sesión son httpOnly para que el JavaScript de la página no
 * pueda leerlas, y `sameSite: 'lax'` para que no viajen en peticiones que
 * origine otro sitio.
 */
function baseOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  };
}

export function setSessionCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  isProduction: boolean,
): void {
  const base = baseOptions(isProduction);
  res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    // Solo se envía a las rutas que la necesitan, para que no ande
    // circulando en cada petición del panel.
    path: '/api/auth',
  });
}

export function clearSessionCookies(res: Response, isProduction: boolean): void {
  const base = baseOptions(isProduction);
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, { ...base, path: '/api/auth' });
}
