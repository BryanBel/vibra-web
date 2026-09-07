import { customType, timestamp } from 'drizzle-orm/pg-core';

/** Columna `tsvector` de Postgres, para la búsqueda de texto completo. */
export const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});

/** Marcas de tiempo con zona horaria, iguales en todas las tablas. */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};
