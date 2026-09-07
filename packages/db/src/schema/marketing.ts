import { boolean, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

/** Suscriptores del newsletter. Hoy el formulario del sitio no guarda nada. */
export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  /** De dónde vino: footer, checkout, campaña. */
  source: text('source'),
  subscribedAt: timestamp('subscribed_at', { withTimezone: true }).notNull().defaultNow(),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
});

/** Mensajes del formulario de contacto. */
export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
