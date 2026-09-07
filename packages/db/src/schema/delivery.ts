import { relations } from 'drizzle-orm';
import { boolean, integer, numeric, pgTable, serial, text } from 'drizzle-orm/pg-core';
import { deliveryKindEnum } from './enums.js';

/** Los 24 estados de Venezuela, para el envío nacional por agencia. */
export const states = pgTable('states', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

/**
 * Modalidades de entrega.
 *
 * Punto de encuentro y retiro son gratuitos. El delivery en Caracas cobra
 * según la zona, en `delivery_zones`. El envío nacional va con flete por
 * cobrar: el cliente paga en la agencia al retirar, así que aquí la tarifa
 * es cero y lo que se guarda del pedido son el estado y los datos de agencia.
 */
export const deliveryOptions = pgTable('delivery_options', {
  id: serial('id').primaryKey(),
  kind: deliveryKindEnum('kind').notNull(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  feeUsd: numeric('fee_usd', { precision: 10, scale: 2 }).notNull().default('0'),
  /** El cliente debe escribir una dirección de entrega. */
  requiresAddress: boolean('requires_address').notNull().default(false),
  /** El cliente debe indicar estado, agencia y dirección de la agencia. */
  requiresAgency: boolean('requires_agency').notNull().default(false),
  /** El cliente debe elegir una zona de `delivery_zones`. */
  requiresZone: boolean('requires_zone').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

/** Zonas de Caracas con su tarifa, para las opciones de tipo `delivery`. */
export const deliveryZones = pgTable('delivery_zones', {
  id: serial('id').primaryKey(),
  deliveryOptionId: integer('delivery_option_id')
    .notNull()
    .references(() => deliveryOptions.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  feeUsd: numeric('fee_usd', { precision: 10, scale: 2 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const deliveryOptionsRelations = relations(deliveryOptions, ({ many }) => ({
  zones: many(deliveryZones),
}));

export const deliveryZonesRelations = relations(deliveryZones, ({ one }) => ({
  deliveryOption: one(deliveryOptions, {
    fields: [deliveryZones.deliveryOptionId],
    references: [deliveryOptions.id],
  }),
}));
