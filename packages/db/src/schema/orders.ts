import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { timestamps } from './_shared.js';
import { adminUsers } from './admin.js';
import { productVariants } from './catalog.js';
import { carts, discountCodes } from './commerce.js';
import { deliveryOptions, deliveryZones, states } from './delivery.js';
import {
  orderChannelEnum,
  orderStatusEnum,
  paymentMethodEnum,
  paymentStatusEnum,
} from './enums.js';

/**
 * Pedidos.
 *
 * Todos los montos quedan congelados al confirmar: si Gillary cambia un
 * precio o archiva un producto después, el pedido tiene que seguir contando
 * la verdad de cuando se hizo. Por eso `exchangeRateUsed` y `totalBs` se
 * guardan, en vez de recalcularse al mostrar.
 */
export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    /** Formato VIB-2026-0001, generado desde una secuencia de Postgres. */
    orderNumber: text('order_number').notNull().unique(),
    cartId: integer('cart_id').references(() => carts.id, { onDelete: 'set null' }),

    status: orderStatusEnum('status').notNull().default('pending_payment'),
    channel: orderChannelEnum('channel').notNull().default('web'),

    // Datos del cliente
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text('phone').notNull(),
    /** Cédula. Dato personal: nunca debe salir en una respuesta pública. */
    nationalId: text('national_id').notNull(),
    email: text('email').notNull(),

    // Entrega
    deliveryOptionId: integer('delivery_option_id')
      .notNull()
      .references(() => deliveryOptions.id, { onDelete: 'restrict' }),
    deliveryZoneId: integer('delivery_zone_id').references(() => deliveryZones.id, {
      onDelete: 'restrict',
    }),
    deliveryAddress: text('delivery_address'),
    stateId: integer('state_id').references(() => states.id, { onDelete: 'restrict' }),
    agencyName: text('agency_name'),
    agencyAddress: text('agency_address'),

    // Montos, todos congelados
    subtotalUsd: numeric('subtotal_usd', { precision: 10, scale: 2 }).notNull(),
    discountCodeId: integer('discount_code_id').references(() => discountCodes.id, {
      onDelete: 'set null',
    }),
    discountAmountUsd: numeric('discount_amount_usd', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    deliveryFeeUsd: numeric('delivery_fee_usd', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    totalUsd: numeric('total_usd', { precision: 10, scale: 2 }).notNull(),
    /** Tasa del euro BCV aplicada, para poder reconstruir el monto en Bs. */
    exchangeRateUsed: numeric('exchange_rate_used', { precision: 18, scale: 8 }).notNull(),
    totalBs: numeric('total_bs', { precision: 18, scale: 2 }).notNull(),

    // Pago: sin pasarela, el cliente reporta y Gillary verifica
    paymentMethod: paymentMethodEnum('payment_method'),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('unpaid'),
    paymentReference: text('payment_reference'),
    paymentProofUrl: text('payment_proof_url'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    verifiedBy: integer('verified_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),

    notes: text('notes'),
    ...timestamps,
  },
  (t) => [
    index('orders_status_idx').on(t.status),
    index('orders_payment_status_idx').on(t.paymentStatus),
    index('orders_created_idx').on(t.createdAt),
  ],
);

/**
 * Líneas del pedido. Los campos con sufijo de instantánea guardan el estado
 * del producto al momento de la compra, así el pedido sobrevive a cambios
 * de precio y a productos archivados o borrados.
 */
export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    variantId: integer('variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),

    productName: text('product_name').notNull(),
    /** Cómo se leía la variante, por ejemplo "Pequeña / Dorada". */
    variantLabel: text('variant_label'),
    sku: text('sku').notNull(),

    unitPriceUsd: numeric('unit_price_usd', { precision: 10, scale: 2 }).notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalUsd: numeric('line_total_usd', { precision: 10, scale: 2 }).notNull(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
);

/**
 * Canjes de cupones. Guardar la cédula permite aplicar el límite de usos
 * por persona sin necesidad de cuentas de usuario.
 */
export const discountRedemptions = pgTable(
  'discount_redemptions',
  {
    id: serial('id').primaryKey(),
    discountCodeId: integer('discount_code_id')
      .notNull()
      .references(() => discountCodes.id, { onDelete: 'cascade' }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    customerIdentifier: text('customer_identifier').notNull(),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('discount_redemptions_customer_idx').on(t.discountCodeId, t.customerIdentifier)],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  cart: one(carts, { fields: [orders.cartId], references: [carts.id] }),
  deliveryOption: one(deliveryOptions, {
    fields: [orders.deliveryOptionId],
    references: [deliveryOptions.id],
  }),
  deliveryZone: one(deliveryZones, {
    fields: [orders.deliveryZoneId],
    references: [deliveryZones.id],
  }),
  state: one(states, { fields: [orders.stateId], references: [states.id] }),
  discountCode: one(discountCodes, {
    fields: [orders.discountCodeId],
    references: [discountCodes.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const discountCodesRelations = relations(discountCodes, ({ many }) => ({
  redemptions: many(discountRedemptions),
}));

export const discountRedemptionsRelations = relations(discountRedemptions, ({ one }) => ({
  discountCode: one(discountCodes, {
    fields: [discountRedemptions.discountCodeId],
    references: [discountCodes.id],
  }),
  order: one(orders, { fields: [discountRedemptions.orderId], references: [orders.id] }),
}));
