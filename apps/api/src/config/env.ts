import { z } from 'zod';

/**
 * Validación del entorno.
 *
 * Se corre al arrancar: si falta una variable o viene mal, la API no
 * levanta y dice cuál. Es preferible fallar en el despliegue que
 * descubrirlo cuando un cliente intenta pagar.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  /**
   * Conexión de Neon. En la API conviene la URL con pooler, porque atiende
   * muchas peticiones cortas.
   */
  DATABASE_URL: z.string().min(1, 'Falta la cadena de conexión de Postgres'),

  /** Firma de los tokens del panel. En producción, mínimo 32 caracteres. */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  /** Origen del sitio, para CORS y para las cookies. */
  WEB_ORIGIN: z.string().url().default('http://localhost:4321'),

  /** Número al que van los pedidos que se cierran por chat. */
  WHATSAPP_NUMBER: z.string().default('584125589119'),

  /**
   * Fuente de la tasa. El euro oficial del BCV, que es el que se usa para
   * convertir los precios a bolívares.
   */
  EXCHANGE_RATE_API_URL: z.string().url().default('https://ve.dolarapi.com/v1/euros'),
  /** Respaldo si la API falla: se lee el bloque del euro de esta página. */
  EXCHANGE_RATE_SCRAPE_URL: z.string().url().default('https://www.bcv.org.ve/'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((i) => `  ${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuración inválida:\n${detalle}`);
  }

  return parsed.data;
}
