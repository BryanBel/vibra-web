import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export interface CreateDbOptions {
  /**
   * Máximo de conexiones. En la API conviene dejarlo bajo y apuntar a la
   * URL con pooler de Neon; en scripts de una sola pasada, 1 basta.
   */
  max?: number;
}

/**
 * Crea el cliente de Drizzle. Recibe la cadena de conexión en vez de leer
 * el entorno por su cuenta, para que la API la inyecte desde su propia
 * configuración y los scripts puedan apuntar a otro branch de Neon.
 */
export function createDb(connectionString: string, options: CreateDbOptions = {}) {
  const client = postgres(connectionString, {
    ssl: 'require',
    max: options.max ?? 10,
  });

  return drizzle(client, { schema, casing: 'snake_case' });
}

export type Database = ReturnType<typeof createDb>;
