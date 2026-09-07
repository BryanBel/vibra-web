import { relations } from 'drizzle-orm';
import { index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { adminUsers } from './admin.js';
import { productVariants } from './catalog.js';
import { stockMovementReasonEnum } from './enums.js';
import { orders } from './orders.js';

/**
 * Bitácora de inventario.
 *
 * Cada cambio de existencias deja una fila con su motivo, así el stock
 * actual siempre se puede explicar y reconstruir si algo se descuadra.
 * `delta` es negativo cuando sale mercancía y positivo cuando entra.
 */
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: serial('id').primaryKey(),
    variantId: integer('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),
    reason: stockMovementReasonEnum('reason').notNull(),
    /** Presente cuando el movimiento vino de una compra o su cancelación. */
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    /** Presente cuando fue un ajuste manual desde el panel. */
    adminUserId: integer('admin_user_id').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('stock_movements_variant_idx').on(t.variantId, t.createdAt),
    index('stock_movements_order_idx').on(t.orderId),
  ],
);

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  variant: one(productVariants, {
    fields: [stockMovements.variantId],
    references: [productVariants.id],
  }),
  order: one(orders, { fields: [stockMovements.orderId], references: [orders.id] }),
  adminUser: one(adminUsers, {
    fields: [stockMovements.adminUserId],
    references: [adminUsers.id],
  }),
}));
