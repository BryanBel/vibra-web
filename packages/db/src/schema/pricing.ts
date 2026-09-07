import { boolean, date, index, numeric, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';
import { exchangeRateSourceEnum } from './enums.js';

/**
 * Historial de la tasa de cambio.
 *
 * Los precios se cargan en dólares y se muestran también en bolívares,
 * multiplicando por la tasa del euro del BCV. Cada consulta del cron guarda
 * una fila, así que siempre hay una última tasa buena a la que caer si la
 * API y el scraping fallan, y los pedidos viejos pueden explicar con qué
 * tasa se calcularon.
 *
 * Gillary puede insertar una fila con `isManualOverride` desde el panel para
 * forzar una tasa distinta a la que trae el cron.
 */
export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: serial('id').primaryKey(),
    source: exchangeRateSourceEnum('source').notNull().default('bcv_eur'),
    /** Bolívares por unidad de la moneda de origen. */
    rate: numeric('rate', { precision: 18, scale: 8 }).notNull(),
    /** Fecha de vigencia según el BCV, que no siempre es la de consulta. */
    effectiveDate: date('effective_date').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    isManualOverride: boolean('is_manual_override').notNull().default(false),
  },
  (t) => [index('exchange_rates_lookup_idx').on(t.source, t.effectiveDate, t.fetchedAt)],
);
