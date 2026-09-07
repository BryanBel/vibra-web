import { boolean, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { timestamps } from './_shared.js';
import { adminRoleEnum } from './enums.js';

/**
 * Usuarios del panel. No hay cuentas de clientes — las compras son de
 * invitado — así que esta tabla es solo para Gillary y quien la ayude.
 */
export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  /** Hash argon2. La clave en claro nunca toca la base de datos. */
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: adminRoleEnum('role').notNull().default('staff'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  ...timestamps,
});
