import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps } from './_shared.js';
import { productVariants } from './catalog.js';
import { cartStatusEnum, discountTypeEnum } from './enums.js';

/**
 * Carrito de invitado.
 *
 * No hay cuentas de usuario: el carrito se ata a un token anónimo guardado
 * en una cookie httpOnly. Vive en la base de datos y no en el navegador,
 * así se recupera al volver y se pueden medir los carritos abandonados.
 */
export const carts = pgTable(
  'carts',
  {
    id: serial('id').primaryKey(),
    token: uuid('token').notNull().unique().defaultRandom(),
    status: cartStatusEnum('status').notNull().default('active'),
    /** Se llena si el cliente lo deja en el checkout, para poder recordarle. */
    customerEmail: text('customer_email'),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [index('carts_status_activity_idx').on(t.status, t.lastActivityAt)],
);

export const cartItems = pgTable(
  'cart_items',
  {
    id: serial('id').primaryKey(),
    cartId: integer('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    variantId: integer('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    /**
     * Precio al momento de agregar. Se revalida contra el precio vigente al
     * confirmar el pedido, pero sirve para avisar si algo cambió mientras
     * el carrito estuvo guardado.
     */
    unitPriceUsd: numeric('unit_price_usd', { precision: 10, scale: 2 }).notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('cart_items_unique').on(t.cartId, t.variantId)],
);

/**
 * Cupones de descuento.
 *
 * Gillary los reparte por distintos motivos — referidos, compras
 * anteriores, dinámicas de redes — y `notes` guarda ese motivo para que
 * después se pueda medir qué campaña funcionó.
 */
export const discountCodes = pgTable(
  'discount_codes',
  {
    id: serial('id').primaryKey(),
    /** Siempre en mayúsculas; la API normaliza antes de comparar. */
    code: text('code').notNull().unique(),
    type: discountTypeEnum('type').notNull(),
    /** Porcentaje (0-100) o monto fijo en dólares, según `type`. */
    value: numeric('value', { precision: 10, scale: 2 }).notNull(),
    minSubtotalUsd: numeric('min_subtotal_usd', { precision: 10, scale: 2 }),

    maxUses: integer('max_uses'),
    usesCount: integer('uses_count').notNull().default(0),
    maxUsesPerCustomer: integer('max_uses_per_customer').notNull().default(1),

    startsAt: timestamp('starts_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),

    /** Por qué se otorgó, para el propio registro de Gillary. */
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [index('discount_codes_active_idx').on(t.isActive, t.expiresAt)],
);

/*
 * `discount_redemptions` vive en orders.ts: necesita apuntar tanto a
 * `discount_codes` como a `orders`, y declararla aquí crearía un ciclo de
 * importación entre los dos archivos.
 */

export const cartsRelations = relations(carts, ({ many }) => ({
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

