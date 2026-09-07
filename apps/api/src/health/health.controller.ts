import { Controller, Get, Inject } from '@nestjs/common';
import { type Database } from '@vibra/db';
import { sql } from 'drizzle-orm';
import { DB } from '../db/db.module.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Sonda de salud para Railway. Toca la base a propósito: un proceso vivo
   * que no puede consultar Postgres no sirve de nada.
   *
   * Responde igual aunque la base falle, con `status: "degraded"` y el
   * motivo, para que el problema se pueda leer en vez de tener que
   * deducirlo de un proceso que no arranca.
   */
  @Get()
  async check() {
    const startedAt = Date.now();

    try {
      await this.db.execute(sql`select 1`);
      return {
        status: 'ok',
        database: 'ok',
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Drizzle envuelve el error del driver, y el mensaje de afuera solo
      // repite la consulta. La causa es la que dice algo útil, como que
      // falló la autenticación o que no se pudo resolver el host.
      const err = error as Error & { cause?: Error };

      return {
        status: 'degraded',
        database: 'error',
        reason: err.cause?.message ?? err.message,
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
