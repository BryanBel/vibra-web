import { oc } from '@orpc/contract';
import { z } from 'zod';
import { ADMIN_ROLES } from '../enums.js';

/**
 * Usuario del panel tal como sale de la API.
 *
 * Nunca incluye el hash de la contraseña: el esquema de salida es lo que
 * impide que se filtre por descuido al agregar campos más adelante.
 */
export const adminUserSchema = z.object({
  id: z.number().int().positive(),
  email: z.email(),
  name: z.string(),
  role: z.enum(ADMIN_ROLES),
});

export type AdminUserPublic = z.infer<typeof adminUserSchema>;

export const loginInputSchema = z.object({
  email: z.email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

const sessionOutput = z.object({ user: adminUserSchema });

/**
 * Sesión del panel.
 *
 * Los tokens no viajan en el cuerpo: van en cookies httpOnly, para que el
 * JavaScript de la página no pueda leerlos. Por eso las respuestas solo
 * traen el usuario.
 */
export const authContract = {
  login: oc
    .route({ method: 'POST', path: '/auth/login', summary: 'Iniciar sesión', tags: ['Auth'] })
    .input(loginInputSchema)
    .output(sessionOutput),

  refresh: oc
    .route({
      method: 'POST',
      path: '/auth/refresh',
      summary: 'Renovar el token de acceso',
      tags: ['Auth'],
    })
    .output(sessionOutput),

  logout: oc
    .route({ method: 'POST', path: '/auth/logout', summary: 'Cerrar sesión', tags: ['Auth'] })
    .output(z.object({ ok: z.literal(true) })),

  me: oc
    .route({ method: 'GET', path: '/auth/me', summary: 'Sesión actual', tags: ['Auth'] })
    .output(sessionOutput),
};
